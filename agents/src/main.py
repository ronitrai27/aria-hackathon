"""
main.py
───────
Entry point for the backend FastAPI application.
Handles CORS, configures ParentGraph checkpointer, and hosts the SSE streaming /api/chat route.
"""

import sys
import os
import json
import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver

# Add app package to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.parent.graph import build_parent_graph
from app.utils.sse_emitter import (
    sse_worker_status_event,
    sse_worker_action_event,
    sse_worker_response_event,
    sse_supervisor_data_event,
    sse_handoff_event,
)

# Initialize FastAPI application
app = FastAPI(title="Aria Dual-Agent Backend Server")

# Enable CORS for Next.js frontend calls on other ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent checkpointer for parent graphs
checkpointer = MemorySaver()
parent_graph = build_parent_graph().compile(checkpointer=checkpointer)


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    """
    Streams LangGraph step-by-step updates in real-time as Server-Sent Events (SSE).
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    message_text = body.get("message")
    thread_id = body.get("thread_id", "default_thread")

    if not message_text:
        raise HTTPException(status_code=400, detail="Message field is required.")

    async def event_generator():
        config = {"configurable": {"thread_id": thread_id}}
        state_input = {
            "messages": [HumanMessage(content=message_text)],
            "turn_count": 0,
            "status": "running"
        }

        # 1. Signal that Parent Router is starting intent check
        router_start = sse_worker_status_event(
            worker_name="router",
            status="running",
            details={"message": "Analyzing query and checking user intent..."}
        )
        yield f"event: {router_start['event']}\ndata: {router_start['data']}\n\n"
        await asyncio.sleep(0.1)

        try:
            # 2. Iterate graph updates (including internal subgraph updates)
            async for path, chunk in parent_graph.astream(
                state_input, config, stream_mode="updates", subgraphs=True
            ):
                # ── Parent Router Route Decision ──────────────────────────────
                if not path:
                    if "router" in chunk:
                        router_out = chunk["router"]
                        next_rt = router_out.get("next_route", "brain_subgraph")

                        router_done = sse_worker_status_event(
                            worker_name="router",
                            status="completed",
                            details={"next_route": next_rt}
                        )
                        yield f"event: {router_done['event']}\ndata: {router_done['data']}\n\n"
                        await asyncio.sleep(0.1)

                        # Signal subgraph starting
                        sub_start = sse_worker_status_event(
                            worker_name=next_rt,
                            status="starting",
                            details={"message": f"Initializing {next_rt.replace('_subgraph', '').title()} agent..."}
                        )
                        yield f"event: {sub_start['event']}\ndata: {sub_start['data']}\n\n"
                        await asyncio.sleep(0.1)

                # ── Brain Subgraph Real-Time Execution ────────────────────────
                elif path == ("brain_subgraph",):
                    if "supervisor" in chunk:
                        brain_super = chunk["supervisor"]
                        # Check for user context handoff
                        if brain_super.get("transfer_to_agent"):
                            handoff = sse_handoff_event(
                                target="agent_subgraph",
                                reason="workflow_creation",
                                query=message_text
                            )
                            yield f"event: {handoff['event']}\ndata: {handoff['data']}\n\n"
                            await asyncio.sleep(0.1)
                        else:
                            super_data = sse_supervisor_data_event(
                                intent=brain_super.get("current_intent", "unknown"),
                                planned_workers=brain_super.get("planned_workers", []),
                                status=brain_super.get("status", "running")
                            )
                            yield f"event: {super_data['event']}\ndata: {super_data['data']}\n\n"
                            await asyncio.sleep(0.1)

                    # Handle individual brain workers
                    for worker in ["memory_worker", "task_worker", "upload_worker", "reflect_worker", "composio_worker"]:
                        if worker in chunk:
                            worker_run = sse_worker_status_event(
                                worker_name=worker,
                                status="running",
                                details={"message": f"{worker.replace('_', ' ').title()} is executing..."}
                            )
                            yield f"event: {worker_run['event']}\ndata: {worker_run['data']}\n\n"
                            await asyncio.sleep(0.4)

                            # Stream worker outputs/footprints
                            worker_val = chunk[worker].get("worker_results", [{}])[0].get("output")
                            worker_resp = sse_worker_response_event(
                                worker_name=worker,
                                output=worker_val
                            )
                            yield f"event: {worker_resp['event']}\ndata: {worker_resp['data']}\n\n"
                            await asyncio.sleep(0.1)

                # ── Agent Subgraph Real-Time Execution ────────────────────────
                elif path == ("agent_subgraph",):
                    if "supervisor" in chunk:
                        agent_super = chunk["supervisor"]
                        super_data = sse_supervisor_data_event(
                            intent=agent_super.get("current_intent", "unknown"),
                            planned_workers=agent_super.get("planned_workers", []),
                            status=agent_super.get("status", "running")
                        )
                        yield f"event: {super_data['event']}\ndata: {super_data['data']}\n\n"
                        await asyncio.sleep(0.1)

                    # Workflow Builder Node details
                    if "workflow_builder" in chunk:
                        builder_out = chunk["workflow_builder"]
                        builder_run = sse_worker_status_event(
                            worker_name="workflow_builder",
                            status="running",
                            details={"message": "Designing workflow steps, nodes, and edges..."}
                        )
                        yield f"event: {builder_run['event']}\ndata: {builder_run['data']}\n\n"
                        await asyncio.sleep(0.4)

                        # Emit live Composio metadata lookups
                        if builder_out.get("workflow_schema"):
                            composio_schema = sse_worker_action_event(
                                worker_name="workflow_builder",
                                action="fetching_composio_schemas",
                                details={"message": "Loading live API parameter schemas from Composio..."}
                            )
                            yield f"event: {composio_schema['event']}\ndata: {composio_schema['data']}\n\n"
                            await asyncio.sleep(0.4)

                            # Stream final React Flow workflow schema to client for graph rendering
                            schema_data = sse_worker_response_event(
                                worker_name="workflow_builder",
                                output=builder_out["workflow_schema"]
                            )
                            yield f"event: {schema_data['event']}\ndata: {schema_data['data']}\n\n"
                            await asyncio.sleep(0.1)

                    # Handle other agent workers
                    for worker in ["composio_worker", "ai_node_worker", "scheduler_worker"]:
                        if worker in chunk:
                            worker_run = sse_worker_status_event(
                                worker_name=worker,
                                status="running",
                                details={"message": f"{worker.replace('_', ' ').title()} is executing..."}
                            )
                            yield f"event: {worker_run['event']}\ndata: {worker_run['data']}\n\n"
                            await asyncio.sleep(0.4)

                            worker_val = chunk[worker].get("worker_results", [{}])[0].get("output")
                            worker_resp = sse_worker_response_event(
                                worker_name=worker,
                                output=worker_val
                            )
                            yield f"event: {worker_resp['event']}\ndata: {worker_resp['data']}\n\n"
                            await asyncio.sleep(0.1)

            # 3. Retrieve and stream the final natural language response
            final_state = parent_graph.get_state(config).values
            final_reply = final_state.get("final_response") or "Processing complete."

            done_event = sse_supervisor_data_event(
                intent="create_workflow",
                planned_workers=[],
                final_response=final_reply,
                status="done"
            )
            yield f"event: {done_event['event']}\ndata: {done_event['data']}\n\n"

        except Exception as e:
            logger.error(f"Error during graph execution stream: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Aria Backend Server on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
