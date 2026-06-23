"""
schema/types.py
───────────────
Literal type aliases used across the entire graph.

IMPORTANT — READ THIS:
  These Literals are purely for type-safety and IDE auto-complete.
  They are NOT used to look up workers. The Supervisor LLM outputs
  both `intent` (a label) and `workers_to_invoke` (a free list) as
  separate fields in SupervisorDecision. No hardcoded mapping exists.

  IntentName  → label the LLM attaches to the user's request
  WorkerName  → names of nodes registered in the StateGraph
  StatusName  → lifecycle status of the current graph run
"""

from typing import Literal

# ── Worker node names ──────────────────────────────────────────────────────────
# These must match the string names used in builder.add_node() exactly.
WorkerName = Literal[
    "memory_worker",       # Pinecone (vector) + Neo4j (graph) — reflect / context
    "task_worker",         # Convex DB — CRUD on tasks
    "automation_creator",  # React Flow nodes/edges — create/edit automations
    "browser_worker",      # Browser content stored in DB — page context
    "connector_worker",    # Gmail / Outlook / Slack / Calendar via Compose
]

# ── Intent labels ──────────────────────────────────────────────────────────────
# The LLM picks the CLOSEST label for tracking purposes only.
# If no label fits (multi-intent or novel request), it returns "unknown".
# The LLM then SEPARATELY outputs workers_to_invoke — no lookup table needed.
IntentName = Literal[
    "reflect",            # recall memories, past context
    "task_status",        # read / query existing tasks
    "summarize",          # summarize browser content or task list
    "create_task",        # write a new task to Convex
    "create_automation",  # build a new React Flow automation
    "edit_automation",    # modify an existing automation
    "prioritize",         # rank tasks / suggest priority order
    "suggest",            # proactive suggestions from context + connectors
    "unknown",            # multi-intent or novel — LLM still picks workers freely
]

# ── Graph lifecycle status ─────────────────────────────────────────────────────
StatusName = Literal[
    "running",            # graph is actively executing
    "waiting_for_human",  # interrupt() was called, awaiting human input
    "done",               # supervisor decided task is complete
    "error",              # an unrecoverable error occurred
]
