"""
schema/state.py
───────────────
The single source of truth for all data flowing through the graph.

HOW STATE WORKS (read this once):
  - Every node receives the FULL AriaState.
  - Every node returns a PARTIAL dict (only the keys it changes).
  - LangGraph merges that partial dict into the shared state automatically.
  - Workers never call each other. They just read state and write state.
  - Worker A's output is available to Worker B because they share this object.
  - No argument-passing. No glue code. State IS the data bus.

REDUCERS (parallel-write safety):
  - Fields with `Annotated[list, operator.add]` are safe for multiple
    parallel workers to write simultaneously — LangGraph appends all writes.
  - Fields WITHOUT a reducer use last-writer-wins (overwrite). These must
    only be written by a single node per turn.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from .types import IntentName, StatusName, WorkerName


# ── Intermediate result produced by every worker ───────────────────────────────
class WorkerResult(TypedDict):
    """
    Standardised envelope every worker must return inside `worker_results`.

    Fields:
        worker  — which worker produced this result (for the Supervisor to read)
        output  — the actual payload (task list, memory context, etc.)
        error   — None on success; error string on failure
    """
    worker: WorkerName
    output: Any
    error: str | None


# ── The Unified State ──────────────────────────────────────────────────────────
class AriaState(TypedDict):
    """
    Single shared state object for the entire Aria graph.

    Passed into every node. Every node returns a partial update.
    LangGraph merges the update — no manual state management needed.
    """

    # ── Conversation ───────────────────────────────────────────────────────────
    # `add_messages` is LangGraph's built-in reducer.
    # It APPENDS new messages and deduplicates by message.id.
    # NEVER overwrite this field with a plain assignment.
    messages: Annotated[list[BaseMessage], add_messages]

    # ── Supervisor fields ──────────────────────────────────────────────────────
    # `current_intent` — label the Supervisor LLM assigns to the user's request.
    # This is a TRACKING label only. It does NOT look up workers.
    # The LLM outputs `planned_workers` separately and freely.
    current_intent: IntentName

    # `planned_workers` — list of worker node names the Supervisor decided to
    # invoke this turn. Set by Supervisor, read by workers for context.
    planned_workers: list[WorkerName]

    # `final_response` — the natural-language reply to surface to the user.
    # Set by the Supervisor when it decides the task is complete.
    final_response: str | None

    # ── Worker results (PARALLEL-SAFE) ────────────────────────────────────────
    # `operator.add` = list append reducer.
    # Multiple workers running in parallel can all write to this field safely.
    # After fan-in, this contains one WorkerResult entry per invoked worker.
    # The Supervisor reads this on the next turn to understand what happened.
    worker_results: Annotated[list[WorkerResult], operator.add]

    # ── Domain-specific fields (single-writer, no reducer needed) ─────────────

    # Written by: task_worker
    # Contains the full list of tasks returned from Convex DB.
    tasks: list[dict] | None

    # Written by: task_worker
    # The ID of the task most recently created or modified.
    # automation_creator reads this to link automations to tasks.
    last_created_task_id: str | None

    # Written by: automation_creator
    # The React Flow graph definitions (nodes + edges) for active automations.
    automations: list[dict] | None

    # Written by: automation_creator (staging area for HITL)
    # Holds an unexecuted automation plan waiting for human approval.
    # Cleared after interrupt() resolves (approved or cancelled).
    pending_automation_plan: dict | None

    # Written by: memory_worker
    # Semantic context retrieved from Pinecone / Neo4j for the current query.
    memory_context: str | None

    # Written by: browser_worker
    # Raw content of the current browser page stored in DB.
    browser_content: str | None

    # Written by: connector_worker
    # Data retrieved from Gmail / Outlook / Slack / Calendar.
    connector_data: dict | None

    # ── Control ────────────────────────────────────────────────────────────────
    # Graph lifecycle status — set by Supervisor.
    status: StatusName

    # Last error message. Set by any node on exception.
    # The Supervisor reads this to decide whether to retry or abort.
    error_message: str | None

    # Turn counter incremented by the Supervisor on every cycle.
    # Used to detect and break infinite loops (see MAX_TURNS in supervisor).
    turn_count: int
