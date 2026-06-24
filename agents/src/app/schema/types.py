"""
schema/types.py
───────────────
Literal type aliases used across Parent, Brain, and Agent graphs.
"""

from typing import Literal

# ── Parent Graph Nodes ────────────────────────────────────────────────────────
ParentWorkerName = Literal[
    "router",
    "brain_subgraph",
    "agent_subgraph",
    "__end__",
]

# ── Brain Subgraph Workers ───────────────────────────────────────────────────
BrainWorkerName = Literal[
    "memory_worker",      # Pinecone (vector) + Neo4j (graph) retrieval
    "task_worker",        # Convex DB CRUD operations (bulk actions, update, get)
    "upload_worker",      # Parse and split doc text using LlamaCloud
    "reflect_worker",     # Recall context, past reflections, suggest next steps
    "composio_worker",    # Read emails (Gmail/Outlook), Calendar, etc.
]

# ── Agent Subgraph Workers ───────────────────────────────────────────────────
AgentWorkerName = Literal[
    "workflow_builder",   # React Flow node/edge builder
    "composio_worker",    # Write/perform actions (send email, post LinkedIn)
    "ai_node_worker",     # Parameters for AI nodes (summarize, research, classify, extract)
    "scheduler_worker",   # Set cron job / run configuration
]

# ── Brain Subgraph Intents ───────────────────────────────────────────────────
BrainIntentName = Literal[
    "reflect",            # Past reflections and general queries
    "task_crud",          # CRUD on tasks (get tasks, create task, update task)
    "suggest",            # Suggest tasks or context based on past days
    "upload",             # Upload document to build tasks from it
    "read_connectors",    # Read from Gmail/Outlook/Calendar
    "unknown",            # Default fallback
]

# ── Agent Subgraph Intents ───────────────────────────────────────────────────
AgentIntentName = Literal[
    "create_workflow",    # Generate a workflow structure (React Flow)
    "edit_workflow",      # Customize an existing workflow
    "add_ai_node",        # Add AI summarization/classification/research parameters
    "schedule",           # Define trigger or run schedule
    "run",                # Execute workflow immediately
    "unknown",            # Default fallback
]

# ── Graph Lifecycle Status ───────────────────────────────────────────────────
StatusName = Literal[
    "running",            # Graph is actively executing
    "waiting_for_human",  # interrupt() called, awaiting human input
    "done",               # Supervisor / parent completed execution
    "error",              # Unrecoverable error occurred
]
