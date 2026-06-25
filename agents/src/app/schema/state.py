"""
schema/state.py
───────────────
The state definitions for ParentGraph, BrainGraph, and AgentGraph.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from .types import (
    AgentIntentName,
    AgentWorkerName,
    BrainIntentName,
    BrainWorkerName,
    ParentWorkerName,
    StatusName,
)


def reduce_completed_steps(left: list[str] | None, right: list[str] | None) -> list[str]:
    """
    Resettable list reducer. If right is empty list [], returns empty list [] to reset/clear.
    Otherwise, appends unique items.
    """
    if right is None:
        return left or []
    if not right:  # If right is empty list [], it signals a reset
        return []
    res = list(left or [])
    for val in right:
        if val not in res:
            res.append(val)
    return res


class WorkerResult(TypedDict):
    """
    Standard envelope returned by any worker node in worker_results.
    """
    worker: str  # The name of the worker that executed.
    output: Any  # The computed payload output of the worker.
    error: str | None  # Error message if the worker execution failed.


class ParentState(TypedDict):
    """
    Global top-level state managed by ParentGraph.
    """
    messages: Annotated[list[BaseMessage], add_messages]  # Complete conversation history shared across graphs.
    next_route: ParentWorkerName  # Target subgraph name or termination marker (__end__).
    final_response: str | None  # Natural-language text response returned to the user interface.
    status: StatusName  # Current lifecycle execution status of the graph run.
    error_message: str | None  # Last caught error traceback or message if a step failed.
    turn_count: int  # Cumulative step count across graphs to check against recursion limits.
    worker_results: Annotated[list[WorkerResult], operator.add]  # Safe parallel-accumulated checklist of execution steps.
    completed_steps: Annotated[list[str], reduce_completed_steps]  # Resettable list of completed workers in current query.
    tasks: list[dict] | None  # Task list retrieved or modified from the database.
    last_created_task_id: str | None  # ID of the task most recently created to link as workflow triggers.
    automations: list[dict] | None  # Active workflow templates configured for the workspace.
    workflow_schema: dict | None  # React Flow diagram structural definition (nodes/edges).
    memory_context: str | None  # Recalled user context or profile constraints from long-term memory.
    contains_memorable_info: bool | None  # Ingestion flag triggering background memory vector+graph updates.
    transfer_to_agent: bool  # Handoff flag signaling request should switch to Agent workflow builder.
    transfer_query: str | None  # Raw query forwarded to the Agent subgraph after handoff.


class BrainState(TypedDict):
    """
    State dictionary managed inside BrainGraph.
    """
    # Shared with parent (automatically synchronized)
    messages: Annotated[list[BaseMessage], add_messages]  # Synced conversation history thread.
    turn_count: int  # Current step sequence counter.
    status: StatusName  # Lifecyle execution status of the brain graph.
    error_message: str | None  # Captured node error messages.
    final_response: str | None  # Subgraph final computed natural language response.
    worker_results: Annotated[list[WorkerResult], operator.add]  # Accumulator for brain worker traces.
    completed_steps: Annotated[list[str], reduce_completed_steps]  # Resettable list of completed workers in current query.
    tasks: list[dict] | None  # Active task lists returned from database.
    last_created_task_id: str | None  # Tracked target task ID.
    memory_context: str | None  # Summarized memory facts fetched from vectors/graphs.
    contains_memorable_info: bool | None  # Memorable data signal for background worker.
    transfer_to_agent: bool  # Flag to trigger handoff to AgentGraph.
    transfer_query: str | None  # Extracted query for AgentGraph to process.

    # Brain internal specific fields
    current_intent: BrainIntentName  # The categorized intent of the user request.
    planned_workers: list[BrainWorkerName]  # Workers chosen by the supervisor to process the query.
    daily_summary: str | None  # Generated summary of yesterday's workload and research logs.
    connector_data: dict | None  # Inbox or Calendar events read from integrations.


class AgentState(TypedDict):
    """
    State dictionary managed inside AgentGraph.
    """
    # Shared with parent (automatically synchronized)
    messages: Annotated[list[BaseMessage], add_messages]  # Synced conversation history thread.
    turn_count: int  # Current step sequence counter.
    status: StatusName  # Lifecycle execution status of the agent graph.
    error_message: str | None  # Captured node error messages.
    final_response: str | None  # Subgraph final computed natural language response.
    worker_results: Annotated[list[WorkerResult], operator.add]  # Accumulator for agent worker traces.
    completed_steps: Annotated[list[str], reduce_completed_steps]  # Resettable list of completed workers in current query.
    automations: list[dict] | None  # Generated or fetched workspace automation flows.
    workflow_schema: dict | None  # Output React Flow nodes and edges definition.

    # Agent internal specific fields
    current_intent: AgentIntentName  # The categorized intent of the workflow request.
    planned_workers: list[AgentWorkerName]  # Workers chosen by the supervisor to build or run workflow.
    pending_workflow_plan: dict | None  # Built plan staging area waiting for user approval.
    connected_apps: list[str] | None  # List of integrations (like LinkedIn, Slack) verified for user.
    composio_action_results: list[dict] | None  # Results of executing tools through Composio actions.
    ai_node_configs: list[dict] | None  # Configuration settings for AI research/summarize pipeline nodes.
    schedule_config: dict | None  # Active trigger rules or cron settings for the workflow.
