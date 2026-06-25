"""
main.py
───────
Entry point for the backend FastAPI application.

KEY ARCHITECTURE NOTE:
  LangGraph compiles subgraphs as black-box nodes inside the parent graph.
  When you stream the parent graph, it yields the entire agent_subgraph run
  as ONE atomic chunk — internal worker steps (workflow_builder, ai_node_worker,
  composio_worker) are never surfaced.

  FIX: Use the parent graph only to get the routing decision. When the router
  says "agent_subgraph", immediately stream the agent graph directly via its
  own astream() call. This gives us per-worker SSE events in real-time.
"""

import sys
import os
import json
import asyncio
from dotenv import load_dotenv

# Load environment variables from workspace .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=env_path, override=True)

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver

from app.parent.router import router_node
from app.agent.graph import build_agent_graph
from app.brain.graph import build_brain_graph
from app.utils.sse_emitter import (
    sse_worker_status_event,
    sse_worker_action_event,
    sse_worker_response_event,
    sse_supervisor_data_event,
    sse_handoff_event,
)

# ── Startup verification ──────────────────────────────────────────────────────
api_key = os.environ.get("OPENAI_API_KEY", "")
if api_key:
    logger.info(f"OPENAI_API_KEY loaded — ending: ...{api_key[-8:]}")
else:
    logger.warning("OPENAI_API_KEY not found in environment!")

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="Aria Dual-Agent Backend Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Compile graphs once at startup ────────────────────────────────────────────
# Agent graph compiled separately so we can stream it directly.
agent_graph = build_agent_graph().compile()
brain_graph  = build_brain_graph().compile()

logger.info("Agent and Brain graphs compiled and ready.")


# ── Helpers: extract output from WorkerResult (handles dict or Pydantic) ─────
def _get_output(res):
    if isinstance(res, dict):
        return res.get("output")
    return getattr(res, "output", None)

def _get_error(res):
    if isinstance(res, dict):
        return res.get("error")
    return getattr(res, "error", None)

def _get_worker(res):
    if isinstance(res, dict):
        return res.get("worker")
    return getattr(res, "worker", None)


# ── SSE helper: yield a formatted SSE line ────────────────────────────────────
def _sse(evt: dict) -> str:
    return f"event: {evt['event']}\ndata: {evt['data']}\n\n"


# ── Agent Subgraph Direct Streamer ────────────────────────────────────────────
async def stream_agent(messages: list, thread_id: str):
    """
    Streams the agent graph directly, yielding formatted SSE strings.
    Each worker node (workflow_builder, ai_node_worker, composio_worker)
    emits its own real-time events as the graph executes step-by-step.
    """
    config = {"configurable": {"thread_id": f"{thread_id}_agent"}}
    state_input = {
        "messages": messages,
        "turn_count": 0,
        "status": "running",
        "completed_steps": [],
    }

    final_response = None
    workflow_schema = None

    async for chunk in agent_graph.astream(state_input, config, stream_mode="updates"):
        logger.info(f"[agent_stream] chunk keys: {list(chunk.keys())}")

        # ── workflow_builder ──────────────────────────────────────────────────
        if "workflow_builder" in chunk:
            out = chunk["workflow_builder"]
            results = out.get("worker_results") or []

            # Check for error
            error = next((_get_error(r) for r in results if _get_worker(r) == "workflow_builder" and _get_error(r)), None)
            if error:
                yield _sse({"event": "error", "data": json.dumps({"error": f"Workflow builder failed: {error}"})})
                continue

            # Status: running
            yield _sse(sse_worker_status_event("workflow_builder", "running", {"message": "Designing workflow DAG with GPT-4o-mini..."}))
            await asyncio.sleep(0.05)

            wf_schema = out.get("workflow_schema")
            if wf_schema:
                workflow_schema = wf_schema

                # Composio schema fetch action
                yield _sse(sse_worker_action_event("workflow_builder", "fetching_composio_schemas", {"message": "Loading live API parameter schemas from Composio..."}))
                await asyncio.sleep(0.05)

                # Per-node composio schema events
                for node in wf_schema.get("nodes", []):
                    if node.get("type") == "composio_app":
                        slug = node.get("data", {}).get("composio_config", {}).get("action_slug", "")
                        has_schema = bool(node.get("data", {}).get("parameter_schema"))
                        yield _sse(sse_worker_action_event("workflow_builder", "composio_schema_fetched", {
                            "action_slug": slug,
                            "schema_loaded": has_schema,
                            "message": f"Schema ready for {slug}"
                        }))
                        await asyncio.sleep(0.05)

                # ★ THE KEY EVENT: emit full workflow schema JSON to frontend
                logger.info(f"[agent_stream] Emitting workflow_schema — {len(json.dumps(wf_schema))} chars")
                yield _sse(sse_worker_response_event("workflow_builder", wf_schema))
                await asyncio.sleep(0.05)
            else:
                # No schema built — still mark as done
                yield _sse(sse_worker_response_event("workflow_builder", None))

        # ── ai_node_worker ────────────────────────────────────────────────────
        if "ai_node_worker" in chunk:
            out = chunk["ai_node_worker"]

            yield _sse(sse_worker_status_event("ai_node_worker", "running", {"message": "Configuring AI node parameters (model, prompts, settings)..."}))
            await asyncio.sleep(0.05)

            for cfg in (out.get("ai_node_configs") or []):
                yield _sse(sse_worker_action_event("ai_node_worker", "node_configured", {
                    "node_id": cfg.get("node_id"),
                    "type": cfg.get("type"),
                    "model": cfg.get("model"),
                    "message": f"Node {cfg.get('node_id')} ({cfg.get('type')}) configured with {cfg.get('model')}"
                }))
                await asyncio.sleep(0.05)

            result_output = next((_get_output(r) for r in (out.get("worker_results") or []) if _get_worker(r) == "ai_node_worker"), None)
            yield _sse(sse_worker_response_event("ai_node_worker", result_output))
            await asyncio.sleep(0.05)

        # ── composio_worker ───────────────────────────────────────────────────
        if "composio_worker" in chunk:
            out = chunk["composio_worker"]

            yield _sse(sse_worker_status_event("composio_worker", "running", {"message": "Validating Composio integration nodes and parameter mappings..."}))
            await asyncio.sleep(0.05)

            # Per-node validation events
            for r in (out.get("worker_results") or []):
                if _get_worker(r) == "composio_worker":
                    output = _get_output(r)
                    if isinstance(output, dict):
                        for vr in output.get("results", []):
                            slug = vr.get("action_slug", "")
                            status = vr.get("status", "unknown")
                            missing = vr.get("missing_params", [])
                            yield _sse(sse_worker_action_event("composio_worker", "tool_validation", {
                                "action_slug": slug,
                                "status": status,
                                "missing_params": missing,
                                "message": f"{slug}: ready" if status == "ready" else f"{slug}: needs params {missing}"
                            }))
                            await asyncio.sleep(0.05)

            comp_output = next((_get_output(r) for r in (out.get("worker_results") or []) if _get_worker(r) == "composio_worker"), None)
            yield _sse(sse_worker_response_event("composio_worker", comp_output))
            await asyncio.sleep(0.05)

        # ── scheduler_worker ──────────────────────────────────────────────────
        if "scheduler_worker" in chunk:
            out = chunk["scheduler_worker"]
            yield _sse(sse_worker_status_event("scheduler_worker", "running", {"message": "Configuring workflow trigger and schedule settings..."}))
            await asyncio.sleep(0.05)
            sched_output = next((_get_output(r) for r in (out.get("worker_results") or []) if _get_worker(r) == "scheduler_worker"), None)
            yield _sse(sse_worker_response_event("scheduler_worker", sched_output))
            await asyncio.sleep(0.05)

        # ── supervisor final state ────────────────────────────────────────────
        if "supervisor" in chunk:
            sup = chunk["supervisor"]
            if sup.get("status") == "done" and sup.get("final_response"):
                final_response = sup["final_response"]

    # Pull final response from graph state if not captured above
    if not final_response:
        try:
            state = agent_graph.get_state(config).values
            final_response = state.get("final_response") or "Workflow built successfully."
            if not workflow_schema:
                workflow_schema = state.get("workflow_schema")
        except Exception as e:
            logger.warning(f"[agent_stream] Could not get final state: {e}")
            final_response = "Workflow built successfully."

    # Yield the done event
    yield _sse(sse_supervisor_data_event(
        intent="create_workflow",
        planned_workers=[],
        final_response=final_response,
        status="done"
    ))


# ── Brain Subgraph Direct Streamer ────────────────────────────────────────────
async def stream_brain(messages: list, thread_id: str, original_message: str):
    """
    Streams the brain graph directly, yielding formatted SSE strings.
    """
    config = {"configurable": {"thread_id": f"{thread_id}_brain"}}
    state_input = {
        "messages": messages,
        "turn_count": 0,
        "status": "running",
        "completed_steps": [],
    }

    final_response = None

    async for chunk in brain_graph.astream(state_input, config, stream_mode="updates"):
        logger.info(f"[brain_stream] chunk keys: {list(chunk.keys())}")

        if "supervisor" in chunk:
            sup = chunk["supervisor"]
            if sup.get("transfer_to_agent"):
                yield _sse(sse_handoff_event("agent_subgraph", "workflow_creation", original_message))
                await asyncio.sleep(0.05)
                return  # Handoff — caller handles agent routing
            if sup.get("final_response"):
                final_response = sup["final_response"]

        for worker in ["memory_worker", "task_worker", "upload_worker", "reflect_worker", "composio_worker"]:
            if worker in chunk:
                out = chunk[worker]
                yield _sse(sse_worker_status_event(worker, "running", {"message": f"{worker.replace('_', ' ').title()} is executing..."}))
                await asyncio.sleep(0.1)
                result_output = None
                results = out.get("worker_results") or []
                if results:
                    first = results[0]
                    result_output = _get_output(first)
                yield _sse(sse_worker_response_event(worker, result_output))
                await asyncio.sleep(0.05)

    if not final_response:
        try:
            state = brain_graph.get_state(config).values
            final_response = state.get("final_response") or "Done."
        except Exception:
            final_response = "Done."

    yield _sse(sse_supervisor_data_event(
        intent="brain_task",
        planned_workers=[],
        final_response=final_response,
        status="done"
    ))


# ── Main Chat Endpoint ────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat_endpoint(request: Request):
    """
    Streams LangGraph step-by-step updates in real-time as Server-Sent Events (SSE).
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    message_text = body.get("message", "").strip()
    thread_id    = body.get("thread_id", "default_thread")

    if not message_text:
        raise HTTPException(status_code=400, detail="Message field is required.")

    async def event_generator():
        messages = [HumanMessage(content=message_text)]

        # ── Step 1: Emit router starting ──────────────────────────────────────
        yield _sse(sse_worker_status_event("router", "running", {"message": "Analyzing query and checking user intent..."}))
        await asyncio.sleep(0.05)

        try:
            # ── Step 2: Get routing decision from router_node directly ────────
            # We call the router function directly instead of streaming the full
            # parent graph, so we get the decision instantly without waiting for
            # the whole subgraph to complete.
            from app.schema.state import ParentState
            router_state: ParentState = {
                "messages": messages,
                "turn_count": 0,
                "status": "running",
                "next_route": "brain_subgraph",
                "final_response": None,
                "error_message": None,
                "worker_results": [],
                "completed_steps": [],
                "tasks": None,
                "last_created_task_id": None,
                "automations": None,
                "workflow_schema": None,
                "memory_context": None,
                "contains_memorable_info": None,
                "transfer_to_agent": False,
                "transfer_query": None,
            }

            router_result = router_node(router_state)
            next_route = router_result.get("next_route", "brain_subgraph")
            logger.info(f"[chat] Router decision: {next_route}")

            # ── Step 3: Emit router done ──────────────────────────────────────
            yield _sse(sse_worker_status_event("router", "completed", {"next_route": next_route}))
            await asyncio.sleep(0.05)

            # ── Step 4: Stream the correct subgraph ───────────────────────────
            if next_route == "agent_subgraph":
                yield _sse(sse_worker_status_event("agent_subgraph", "starting", {"message": "Initializing Agent workflow builder..."}))
                await asyncio.sleep(0.05)

                async for sse_line in stream_agent(messages, thread_id):
                    yield sse_line

            elif next_route == "brain_subgraph":
                yield _sse(sse_worker_status_event("brain_subgraph", "starting", {"message": "Initializing Brain agent..."}))
                await asyncio.sleep(0.05)

                async for sse_line in stream_brain(messages, thread_id, message_text):
                    yield sse_line

            else:
                # __end__ or unknown — just send done
                yield _sse(sse_supervisor_data_event("none", [], "Nothing to do.", status="done"))

        except Exception as e:
            logger.error(f"[chat] Stream error: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Dev server entry ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Aria Backend Server on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
