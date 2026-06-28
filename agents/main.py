"""
Central FastAPI Server for AI Agents (Workflow Designer / Brain)
Exposes /agent and /brain endpoints, acting as a gateway to our LangGraph instances.
"""

import os
import sys
import threading
from pathlib import Path

# Add project root to sys.path to allow absolute imports
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from composio import Composio
from composio_langchain import LangchainProvider

from src.app.agent.graph import run_workflow_agent_stream
from src.app.agent.sse_emitter import format_sse
from src.app.brain.graph import run_brain_agent_stream
from src.app.brain.brain_sse_emitter import map_brain_stream_to_sse
from src.utils.checkpointer import get_checkpointer
from src.config import settings

# Load environment variables
from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=True)

app = FastAPI(title="Aria Agents Central Server")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database to store chat histories by thread_id
# Format: { thread_id: [ {"role": "user"|"assistant", "content": "..."} ] }
THREAD_HISTORY: Dict[str, List[Dict[str, str]]] = {}

# Toolkit configurations matching R:\python\ai_flow\src\agents\composio_agent.py
TOOLKIT_CATALOG = [
    {"slug": "jira", "name": "Jira", "icon": "📋"},
    {"slug": "linear", "name": "Linear", "icon": "📐"},
    {"slug": "gmail", "name": "Gmail", "icon": "✉️"},
    {"slug": "googlecalendar", "name": "Google Calendar", "icon": "📅"},
    {"slug": "notion", "name": "Notion", "icon": "📝"},
    {"slug": "github", "name": "GitHub", "icon": "🐙"},
    {"slug": "typeform", "name": "Typeform", "icon": "📊"},
    {"slug": "apollo", "name": "Apollo", "icon": "🚀"},
    {"slug": "todoist", "name": "Todoist", "icon": "✅"},
    {"slug": "slack", "name": "Slack", "icon": "💬"},
    {"slug": "reddit", "name": "Reddit", "icon": "🤖"},
    {"slug": "linkedin", "name": "LinkedIn", "icon": "💼"},
    {"slug": "googlemeet", "name": "Google Meet", "icon": "📹"},
]
TOOLKITS = [t["slug"] for t in TOOLKIT_CATALOG]


def get_composio() -> Composio:
    """Helper to initialize the Composio client using the API Key."""
    api_key = os.getenv("COMPOSIO_API_KEY")
    if api_key:
        return Composio(api_key=api_key, provider=LangchainProvider())
    return Composio(provider=LangchainProvider())


def create_user_session(user_id: str):
    """Scoped Composio session for oauth/connections."""
    return get_composio().create(
        user_id=user_id,
        toolkits=TOOLKITS,
        manage_connections={"enable": True},
        workbench={"enable": False},
    )


class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None
    mode: Optional[str] = "agent"
    userId: Optional[str] = None
    user_id: Optional[str] = None
    userName: Optional[str] = None
    user_name: Optional[str] = None



@app.get("/health")
def health_check():
    return {"status": "ok", "mode": "central_gateway"}


@app.post("/agent")
@app.post("/api/chat")
def agent_chat_endpoint(body: ChatRequest, request: Request):
    """
    POST route for streaming Workflow Designer (/agent) completions via SSE.
    """
    message = body.message
    thread_id = body.thread_id or f"thread_default"
    uid = body.userId or body.user_id or "default_user"
    route_path = request.url.path

    print(f"\n[POST {route_path}] Match /agent Route. userId: {uid}, query: '{message}', thread_id: {thread_id}", flush=True)

    def event_stream():
        try:
            # 1. Create Composio user session
            print(f"[event_stream] Initializing Composio session for user: {uid}", flush=True)
            session = create_user_session(uid)

            # 2. Setup/retrieve chat history
            history = THREAD_HISTORY.setdefault(thread_id, [])
            history.append({"role": "user", "content": message})

            # 3. Yield initial trace log and start workflow builder status
            yield format_sse("trace_log", {
                "message": f"[event_stream] Initializing Composio session for user: {uid}"
            })
            yield format_sse("worker_status", {
                "worker": "workflow_builder",
                "status": "running",
                "details": {"message": "Designing workflow structure..."}
            })

            workflow_holder = {}

            # 4. Stream graph node execution
            raw_stream = run_workflow_agent_stream(
                session=session,
                chat_history=history,
                thread_id=thread_id,
                workflow_holder=workflow_holder
            )

            final_text = ""
            final_response = ""
            for event in raw_stream:
                event_type = event.get("type")

                if event_type == "trace":
                    content = event.get("content", "")
                    yield format_sse("trace_log", {
                        "message": content
                    })

                elif event_type == "thought":
                    content = event.get("content", "")
                    # Match verifier outputs
                    if "[Verifier Warning]" in content or "validation failed" in content.lower():
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "tool_validation",
                            "details": {
                                "action_slug": "verifier",
                                "status": "failed",
                                "message": content
                            }
                        })
                    elif "[Verifier Success]" in content or "verified and registered" in content.lower():
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "tool_validation",
                            "details": {
                                "action_slug": "verifier",
                                "status": "ready",
                                "message": content
                            }
                        })
                    else:
                        # Stream general thinking output to the chat
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "thought",
                            "details": {"message": content}
                        })

                elif event_type == "tool_call":
                    name = event.get("name", "")
                    args = event.get("args", {})
                    
                    if name == "COMPOSIO_SEARCH_TOOLS":
                        query = args.get("query", "")
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "fetching_composio_schemas",
                            "details": {"message": f"Searching for Composio tool matching '{query}'..."}
                        })
                    elif name == "COMPOSIO_GET_TOOL_SCHEMAS":
                        slug = args.get("tool_slug", "")
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "fetching_composio_schemas",
                            "details": {"message": f"Loading live parameter schemas for {slug}..."}
                        })
                    elif name == "set_workflow":
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "tool_validation",
                            "details": {
                                "action_slug": "workflow",
                                "status": "running",
                                "message": "Validating proposed workflow structure..."
                            }
                        })
                    else:
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "tool_call",
                            "details": {"tool_name": name, "args": args}
                        })

                elif event_type == "tool_output":
                    name = event.get("name", "")
                    content = event.get("content", "")
                    
                    if name == "COMPOSIO_GET_TOOL_SCHEMAS":
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "composio_schema_fetched",
                            "details": {"action_slug": name}
                        })
                    else:
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "tool_output",
                            "details": {"tool_name": name, "content": content}
                        })

                elif event_type == "workflow":
                    nodes = event.get("nodes", [])
                    edges = event.get("edges", [])
                    
                    ai_nodes = [n for n in nodes if n.get("type") == "ai" or str(n.get("id", "")).startswith("ai_")]
                    if ai_nodes:
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "configuring_ai_nodes",
                            "details": {"message": f"Configuring {len(ai_nodes)} AI nodes..."}
                        })
                        for node in ai_nodes:
                            yield format_sse("worker_action", {
                                "worker": "workflow_builder",
                                "action": "node_configured",
                                "details": {
                                    "node_id": node.get("id"),
                                    "type": node.get("type", "ai"),
                                    "model": "gpt-4.1-mini"
                                }
                            })

                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_validation",
                        "details": {
                            "action_slug": "workflow",
                            "status": "ready",
                            "message": "Workflow successfully verified and built!"
                        }
                    })

                    yield format_sse("worker_response", {
                        "worker": "workflow_builder",
                        "output": {
                            "nodes": nodes,
                            "edges": edges
                        }
                    })

                elif event_type == "final_answer":
                    final_response = event.get("content", "")
                    yield format_sse("supervisor_data", {
                        "status": "done",
                        "final_response": final_response
                    })
                    yield format_sse("worker_status", {
                        "worker": "workflow_builder",
                        "status": "completed",
                        "details": {"message": "Workflow successfully generated."}
                    })

            # Save assistant response in history
            if final_response:
                history.append({"role": "assistant", "content": final_response})

        except Exception as err:
            import traceback
            traceback.print_exc()
            yield format_sse("error", {"error": str(err)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ── Brain session cancel registry ──────────────────────────────────────────────
# Maps thread_id → threading.Event. The brain event_stream checks this flag
# on every iteration and stops cleanly when set.
BRAIN_STOP_FLAGS: Dict[str, threading.Event] = {}


class BrainApproveRequest(BaseModel):
    thread_id: str
    approved: bool
    userId: Optional[str] = "default_user"
    user_id: Optional[str] = "default_user"
    userName: Optional[str] = "User"
    user_name: Optional[str] = "User"


@app.post("/brain")
def brain_chat_endpoint(body: ChatRequest, request: Request):
    """
    POST /brain — streaming Brain Agent endpoint (SSE).
    Accepts a message + thread_id + userId + userName, streams events from the brain
    LangGraph (tasks tools, inbox sub-agent, memory search, etc.).
    """
    message = body.message
    thread_id = body.thread_id or "brain_default"
    uid = body.userId or body.user_id or "default_user"
    uname = body.userName or body.user_name or "User"

    print(
        f"\n[POST /brain] userId: {uid}, userName: {uname}, thread_id: {thread_id}, query: '{message}'",
        flush=True,
    )

    # Register a fresh stop flag for this thread; clear any stale one
    stop_event = threading.Event()
    BRAIN_STOP_FLAGS[thread_id] = stop_event

    async def brain_event_stream():
        try:
            # Setup/retrieve chat history for this brain thread
            history = THREAD_HISTORY.setdefault(thread_id, [])
            if message:
                history.append({"role": "user", "content": message})

            # 1. Initialize Redis checkpointer
            print(f"[brain_chat] Getting checkpointer for redis: {settings.redis_url}", flush=True)
            checkpointer = await get_checkpointer(settings.redis_url)

            # 2. Run graph stream generator
            async def run_generator():
                final_answer = ""
                async for event in run_brain_agent_stream(
                    message=message,
                    user_id=uid,
                    user_name=uname,
                    thread_id=thread_id,
                    checkpointer=checkpointer
                ):
                    if stop_event.is_set():
                        print(f"[brain_chat] Stop flag detected. Halting stream for thread_id={thread_id}", flush=True)
                        yield {"type": "trace", "content": "[brain_chat] Session stopped cleanly."}
                        break
                    
                    # Capture final answer for history mapping
                    if event.get("type") == "final_answer":
                        final_answer = event.get("content", "")
                        
                    yield event
                
                # Append assistant answer to history
                if final_answer:
                    history.append({"role": "assistant", "content": final_answer})

            # 3. Stream mapped SSE events
            async for sse_str in map_brain_stream_to_sse(run_generator()):
                yield sse_str

        except Exception as err:
            import traceback
            traceback.print_exc()
            yield format_sse("error", {"error": str(err)})
        finally:
            # Clean up stop flag after stream ends
            BRAIN_STOP_FLAGS.pop(thread_id, None)

    return StreamingResponse(
        brain_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/brain/approve")
def brain_approve_endpoint(body: BrainApproveRequest):
    """
    POST /brain/approve — Approve or reject pending HITL tasks.
    Updates the LangGraph checkpointer state for the thread and resumes the graph execution stream.
    """
    thread_id = body.thread_id
    approved = body.approved
    uid = body.userId or body.user_id or "default_user"
    uname = body.userName or body.user_name or "User"

    print(
        f"\n[POST /brain/approve] thread_id: {thread_id}, approved: {approved}, user: {uname} ({uid})",
        flush=True,
    )

    # Register a fresh stop flag for this thread
    stop_event = threading.Event()
    BRAIN_STOP_FLAGS[thread_id] = stop_event

    async def approve_event_stream():
        try:
            # 1. Initialize checkpointer and update the HITL state variables
            checkpointer = await get_checkpointer(settings.redis_url)
            config = {"configurable": {"thread_id": thread_id}}
            
            print(f"[brain/approve] Setting hitl_approved={approved} for thread={thread_id}", flush=True)
            from src.app.brain.graph import compile_brain_graph
            graph = compile_brain_graph(checkpointer)
            await graph.aupdate_state(config, {
                "hitl_approved": approved
            })

            # Setup history for appending final result
            history = THREAD_HISTORY.setdefault(thread_id, [])

            # 2. Run stream generator (resuming since inputs=None)
            async def run_generator():
                final_answer = ""
                async for event in run_brain_agent_stream(
                    message="",  # Empty string since it's a resume
                    user_id=uid,
                    user_name=uname,
                    thread_id=thread_id,
                    checkpointer=checkpointer
                ):
                    if stop_event.is_set():
                        print(f"[brain/approve] Stop flag detected. Halting stream for thread_id={thread_id}", flush=True)
                        yield {"type": "trace", "content": "[brain/approve] Session stopped cleanly."}
                        break
                    
                    if event.get("type") == "final_answer":
                        final_answer = event.get("content", "")
                        
                    yield event
                
                # Append final response to local thread history
                if final_answer:
                    history.append({"role": "assistant", "content": final_answer})

            # 3. Stream mapped SSE events
            async for sse_str in map_brain_stream_to_sse(run_generator()):
                yield sse_str

        except Exception as err:
            import traceback
            traceback.print_exc()
            yield format_sse("error", {"error": str(err)})
        finally:
            BRAIN_STOP_FLAGS.pop(thread_id, None)

    return StreamingResponse(
        approve_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/brain/stop")
def brain_stop_endpoint(body: ChatRequest):
    """
    POST /brain/stop — cancel an active brain agent session.
    Pass the same thread_id used when calling /brain.
    The running event_stream will detect the stop flag and exit cleanly.
    Returns { stopped: true } if a session was found, { stopped: false } otherwise.
    """
    thread_id = body.thread_id or "brain_default"
    stop_event = BRAIN_STOP_FLAGS.get(thread_id)

    if stop_event:
        stop_event.set()
        print(f"[POST /brain/stop] Stop signal sent for thread_id: {thread_id}", flush=True)
        return {"stopped": True, "thread_id": thread_id}

    print(f"[POST /brain/stop] No active brain session for thread_id: {thread_id}", flush=True)
    return {"stopped": False, "thread_id": thread_id, "message": "No active session found."}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
