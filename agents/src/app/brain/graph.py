"""
brain/graph.py
──────────────
Defines the BrainGraph subgraph structure.
Contains the supervisor node and clean placeholder workers.
"""

from loguru import logger
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from ..schema.state import BrainState, WorkerResult


# ── Supervisor Node ───────────────────────────────────────────────────────────
def brain_supervisor_node(state: BrainState) -> Command:
    """
    Supervisor node inside the BrainGraph.
    Decides which worker to execute or handles handoff.
    """
    messages = state.get("messages", [])
    if not messages:
        return Command(
            update={"status": "done", "final_response": "No messages to process."},
            goto=END
        )

    last_msg = str(messages[-1].content).lower()
    logger.info(f"[Brain Supervisor] Processing query: '{last_msg}'")

    # ── Check for Agent handoff ──────────────────────────────────────────────
    if "workflow" in last_msg or "automate" in last_msg:
        logger.info("[Brain Supervisor] Detected workflow/automation intent. Requesting handoff.")
        return Command(
            update={
                "transfer_to_agent": True,
                "transfer_query": messages[-1].content,
                "final_response": "Handing this task off to the Agent subgraph to build workflows.",
                "status": "done"
            },
            goto=END
        )

    # ── Check for completion ──────────────────────────────────────────────────
    if state.get("worker_results"):
        logger.info("[Brain Supervisor] Workers completed. Exiting subgraph turn.")
        return Command(
            update={
                "status": "done",
                "final_response": "Brain completed task."
            },
            goto=END
        )

    # ── Simple routing decisions ──────────────────────────────────────────────
    if "task" in last_msg:
        intent = "task_crud"
        workers = ["task_worker"]
    elif "upload" in last_msg or "document" in last_msg:
        intent = "upload"
        workers = ["upload_worker"]
    elif "read" in last_msg or "email" in last_msg or "calendar" in last_msg:
        intent = "read_connectors"
        workers = ["composio_worker"]
    elif "suggest" in last_msg or "reflect" in last_msg:
        intent = "suggest"
        workers = ["reflect_worker"]
    else:
        intent = "reflect"
        workers = ["memory_worker"]

    logger.info(f"[Brain Supervisor] Selected worker(s) {workers} for intent '{intent}'")
    return Command(
        update={
            "current_intent": intent,
            "planned_workers": workers,
            "turn_count": state.get("turn_count", 0) + 1
        },
        goto=workers[0]
    )


# ── Worker Node Placeholders ──────────────────────────────────────────────────
def memory_worker_node(state: BrainState) -> dict:
    logger.info("[memory_worker] Running...")
    return {
        "memory_context": None,
        "worker_results": [
            WorkerResult(
                worker="memory_worker",
                output=None,
                error=None
            )
        ]
    }


def task_worker_node(state: BrainState) -> dict:
    logger.info("[task_worker] Running...")
    return {
        "tasks": None,
        "last_created_task_id": None,
        "worker_results": [
            WorkerResult(
                worker="task_worker",
                output=None,
                error=None
            )
        ]
    }


def upload_worker_node(state: BrainState) -> dict:
    logger.info("[upload_worker] Running...")
    return {
        "worker_results": [
            WorkerResult(
                worker="upload_worker",
                output=None,
                error=None
            )
        ]
    }


def reflect_worker_node(state: BrainState) -> dict:
    logger.info("[reflect_worker] Running...")
    return {
        "daily_summary": None,
        "worker_results": [
            WorkerResult(
                worker="reflect_worker",
                output=None,
                error=None
            )
        ]
    }


def composio_worker_node(state: BrainState) -> dict:
    logger.info("[composio_worker] Running...")
    return {
        "connector_data": None,
        "worker_results": [
            WorkerResult(
                worker="composio_worker",
                output=None,
                error=None
            )
        ]
    }


# ── Graph Builder ─────────────────────────────────────────────────────────────
def build_brain_graph(checkpointer=None) -> StateGraph:
    """
    Constructs and returns the StateGraph for BrainGraph.
    """
    builder = StateGraph(BrainState)

    # Register nodes
    builder.add_node("supervisor", brain_supervisor_node)
    builder.add_node("memory_worker", memory_worker_node)
    builder.add_node("task_worker", task_worker_node)
    builder.add_node("upload_worker", upload_worker_node)
    builder.add_node("reflect_worker", reflect_worker_node)
    builder.add_node("composio_worker", composio_worker_node)

    # Define edges
    builder.add_edge(START, "supervisor")

    # All workers loop back to supervisor
    builder.add_edge("memory_worker", "supervisor")
    builder.add_edge("task_worker", "supervisor")
    builder.add_edge("upload_worker", "supervisor")
    builder.add_edge("reflect_worker", "supervisor")
    builder.add_edge("composio_worker", "supervisor")

    return builder
