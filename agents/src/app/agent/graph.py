"""
agent/graph.py
──────────────
Defines the AgentGraph subgraph structure.
Contains the supervisor node and clean placeholder workers.
"""

from loguru import logger
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from ..schema.state import AgentState, WorkerResult


# ── Supervisor Node ───────────────────────────────────────────────────────────
def agent_supervisor_node(state: AgentState) -> Command:
    """
    Supervisor node inside the AgentGraph.
    Decides which worker to execute.
    """
    messages = state.get("messages", [])
    if not messages:
        return Command(
            update={"status": "done", "final_response": "No messages to process."},
            goto=END
        )

    last_msg = str(messages[-1].content).lower()
    logger.info(f"[Agent Supervisor] Processing query: '{last_msg}'")

    # ── Check for completion ──────────────────────────────────────────────────
    if state.get("worker_results"):
        logger.info("[Agent Supervisor] Workers completed. Exiting subgraph turn.")
        return Command(
            update={
                "status": "done",
                "final_response": "Agent completed task."
            },
            goto=END
        )

    # ── Normal routing decisions ──────────────────────────────────────────────
    if "schedule" in last_msg:
        intent = "schedule"
        workers = ["scheduler_worker"]
    elif "run" in last_msg or "execute" in last_msg:
        intent = "run"
        workers = ["composio_worker"]
    else:
        intent = "create_workflow"
        workers = ["workflow_builder"]

    logger.info(f"[Agent Supervisor] Selected worker(s) {workers} for intent '{intent}'")
    return Command(
        update={
            "current_intent": intent,
            "planned_workers": workers,
            "turn_count": state.get("turn_count", 0) + 1
        },
        goto=workers[0]
    )


# ── Worker Node Placeholders ──────────────────────────────────────────────────
def workflow_builder_node(state: AgentState) -> dict:
    logger.info("[workflow_builder] Running...")
    return {
        "workflow_schema": None,
        "worker_results": [
            WorkerResult(
                worker="workflow_builder",
                output=None,
                error=None
            )
        ]
    }


def composio_worker_node(state: AgentState) -> dict:
    logger.info("[composio_worker] Running...")
    return {
        "composio_action_results": None,
        "worker_results": [
            WorkerResult(
                worker="composio_worker",
                output=None,
                error=None
            )
        ]
    }


def ai_node_worker_node(state: AgentState) -> dict:
    logger.info("[ai_node_worker] Running...")
    return {
        "ai_node_configs": None,
        "worker_results": [
            WorkerResult(
                worker="ai_node_worker",
                output=None,
                error=None
            )
        ]
    }


def scheduler_worker_node(state: AgentState) -> dict:
    logger.info("[scheduler_worker] Running...")
    return {
        "schedule_config": None,
        "worker_results": [
            WorkerResult(
                worker="scheduler_worker",
                output=None,
                error=None
            )
        ]
    }


# ── Graph Builder ─────────────────────────────────────────────────────────────
def build_agent_graph(checkpointer=None) -> StateGraph:
    """
    Constructs and returns the StateGraph for AgentGraph.
    """
    builder = StateGraph(AgentState)

    # Register nodes
    builder.add_node("supervisor", agent_supervisor_node)
    builder.add_node("workflow_builder", workflow_builder_node)
    builder.add_node("composio_worker", composio_worker_node)
    builder.add_node("ai_node_worker", ai_node_worker_node)
    builder.add_node("scheduler_worker", scheduler_worker_node)

    # Define edges
    builder.add_edge(START, "supervisor")

    # All workers loop back to supervisor
    builder.add_edge("workflow_builder", "supervisor")
    builder.add_edge("composio_worker", "supervisor")
    builder.add_edge("ai_node_worker", "supervisor")
    builder.add_edge("scheduler_worker", "supervisor")

    return builder
