# agents/src/app/utils/sse_emitter.py
#
# Each helper returns a dict { "event": str, "data": str } ready to be
# sent as a Server-Sent Event by a FastAPI StreamingResponse.
#
# Convention:
#   event type      → what kind of update this is
#   data (JSON str) → structured payload the frontend consumes
#
# NO agent logic here — pure formatting only.

import json
from typing import Any, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Worker Node Status Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_worker_status_event(worker_name: str, status: str, details: Optional[dict] = None) -> dict:
    """
    Streams which worker node is working and its current state.

    Args:
        worker_name — e.g., "memory_worker" | "task_worker" | "automation_creator" | etc.
        status      — e.g., "starting" | "running" | "completed" | "error"
        details     — optional extra details dictionary
    """
    payload = {"worker": worker_name, "status": status}
    if details is not None:
        payload["details"] = details
    return {
        "event": "worker_status",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Worker Node Actions Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_worker_action_event(worker_name: str, action: str, details: Optional[dict] = None) -> dict:
    """
    Streams details of specific actions taken by a worker node.

    Args:
        worker_name — which worker is performing the action
        action      — description of the action being performed (e.g. "fetching_tasks", "creating_flow")
        details     — optional extra parameters or metadata
    """
    payload = {"worker": worker_name, "action": action}
    if details is not None:
        payload["details"] = details
    return {
        "event": "worker_action",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Worker Node Responses Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_worker_response_event(worker_name: str, output: Any, error: Optional[str] = None) -> dict:
    """
    Streams the output / response payload returned by a worker node.

    Args:
        worker_name — name of the worker node
        output      — the result data returned by the worker
        error       — error message string if the worker encountered a failure
    """
    payload = {
        "worker": worker_name,
        "output": output,
        "error": error
    }
    return {
        "event": "worker_response",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Supervisor Data Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_supervisor_data_event(
    intent: str,
    planned_workers: list[str],
    final_response: Optional[str] = None,
    turn_count: int = 1,
    status: str = "running"
) -> dict:
    """
    Streams supervisor planning, decisions, and overall execution status.

    Args:
        intent          — IntentName classification from the supervisor
        planned_workers — list of worker nodes planned to be invoked next
        final_response  — final natural-language response if conversation is complete
        turn_count      — current turn sequence number
        status          — lifecycle status ("running", "waiting_for_human", "done", "error")
    """
    payload = {
        "intent": intent,
        "planned_workers": planned_workers,
        "final_response": final_response,
        "turn_count": turn_count,
        "status": status
    }
    return {
        "event": "supervisor_data",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Tool Results Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_tool_result_event(
    tool_name: str,
    arguments: Optional[dict] = None,
    result: Optional[Any] = None,
    error: Optional[str] = None,
    status: str = "success"
) -> dict:
    """
    Streams when a tool is called, including arguments, result, and execution status.

    Args:
        tool_name — name of the tool being executed
        arguments — parameters supplied to the tool
        result    — output payload of the tool
        error     - error message if tool failed
        status    - "success" | "error"
    """
    payload = {
        "tool": tool_name,
        "arguments": arguments,
        "result": result,
        "error": error,
        "status": status
    }
    return {
        "event": "tool_result",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Background Memory Ingest Worker Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_memory_ingest_event(status: str, message: Optional[str] = None, details: Optional[dict] = None) -> dict:
    """
    Streams background memory ingestion updates (Pinecone / Neo4j vector/graph indexing).

    Args:
        status  - "started" | "running" | "completed" | "error"
        message - human-readable description of the progress
        details - optional details like message IDs processed or entities extracted
    """
    payload = {"status": status}
    if message is not None:
        payload["message"] = message
    if details is not None:
        payload["details"] = details
    return {
        "event": "memory_ingest",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Memorable Info Flag Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_memorable_info_event(detected: bool, info_summary: Optional[str] = None, details: Optional[dict] = None) -> dict:
    """
    Streams when the supervisor identifies and sets `contains_memorable_info`.

    Args:
        detected     — True if memorable info is flagged in the current turn
        info_summary — brief summary of what memorable info is identified
        details      — optional dictionary containing structured info
    """
    payload = {
        "contains_memorable_info": detected,
        "info_summary": info_summary
    }
    if details is not None:
        payload["details"] = details
    return {
        "event": "memorable_info",
        "data": json.dumps(payload),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Handoff Trigger Event
# ─────────────────────────────────────────────────────────────────────────────

def sse_handoff_event(target: str, reason: str, query: Optional[str] = None) -> dict:
    """
    Streams when a conversation is dynamically handed off to a different agent/subgraph.

    Args:
        target — target subgraph ("agent_subgraph" | "brain_subgraph")
        reason — explanation for why handoff was triggered
        query  — optional forwarded user query
    """
    payload = {
        "target": target,
        "reason": reason
    }
    if query is not None:
        payload["query"] = query
    return {
        "event": "handoff",
        "data": json.dumps(payload),
    }

