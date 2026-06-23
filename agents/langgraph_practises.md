# LangGraph Practises & Project Architecture
> **Purpose:** Learning reference + binding architecture spec for this project.
> Lock this before writing any node code.

---

## Table of Contents
1. [What is LangGraph — The Mental Model](#1-what-is-langgraph--the-mental-model)
2. [Critical Concepts You Must Understand](#2-critical-concepts-you-must-understand)
3. [The Architecture We Follow](#3-the-architecture-we-follow)
4. [The State — Backbone of Everything](#4-the-state--backbone-of-everything)
5. [Supervisor Node — How It Actually Works](#5-supervisor-node--how-it-actually-works)
6. [Worker Nodes — Unified State Write](#6-worker-nodes--unified-state-write)
7. [Graph Wiring — Edges, Routing, Parallelism](#7-graph-wiring--edges-routing-parallelism)
8. [HITL + Checkpointing](#8-hitl--checkpointing)
9. [The Project Plan](#9-the-project-plan)
10. [What NOT to Do (Anti-Patterns)](#10-what-not-to-do-anti-patterns)
11. [Long-Term Memory & Background Ingest](#11-long-term-memory--background-ingest)

---

## 1. What is LangGraph — The Mental Model

LangGraph is NOT a pipeline. It is a **cyclic state machine** where:

- **State** is a shared typed dictionary that every node can read from and write to.
- **Nodes** are Python functions (or LLM calls) that receive the current State and return an update (a partial dict).
- **Edges** define which node runs next — they can be static (`add_edge`) or dynamic (`add_conditional_edges`).
- The graph runs in **super-steps**: all nodes scheduled for the same step run, then state merges, then the next step begins.

```
User Input
    │
    ▼
[StateGraph]
    │
    ├── Node A reads State, does work, returns {"key": value}
    │         │
    │         ▼  ← LangGraph merges this partial dict into State
    ├── Node B reads the updated State (includes Node A's output)
    │
    ▼
  END
```

> **Key insight:** No node passes data directly to another node. They all read/write the **same shared State object**. This is why there is no glue code.

---

## 2. Critical Concepts You Must Understand

### 2.1 State is THE Source of Truth

Every node receives the full current state. Every node returns a **partial state update** (only the keys it changed). LangGraph merges these updates automatically.

```python
# Node receives FULL state
def my_worker(state: AriaState) -> dict:
    task_id = state["last_created_task_id"]  # read from state
    result  = do_some_work(task_id)
    return {"worker_results": [result]}      # partial update — only this key changes
```

### 2.2 Reducers — The Parallel-Write Contract

When multiple workers write to the same state key **in parallel**, you need a **reducer** to tell LangGraph how to merge the values. Without it: crash (`INVALID_CONCURRENT_GRAPH_UPDATE`).

```python
from typing import Annotated, TypedDict
import operator

class State(TypedDict):
    # Without reducer: last-writer-wins (overwrite). Fine for single writes.
    current_intent: str

    # With reducer: all parallel writes are APPENDED together. Safe for fan-in.
    worker_results: Annotated[list, operator.add]
```

| Scenario | Use |
|---|---|
| Single node writes this key | Plain type, no reducer |
| Multiple nodes write this key in parallel | `Annotated[list, operator.add]` |
| Messages (chat history) | `Annotated[list, add_messages]` (LangGraph built-in) |

### 2.3 `Command` — The Modern Routing Primitive

Forget `if/else` routing functions. In 2026, nodes return a `Command` object that contains BOTH the state update AND the next node to go to.

```python
from langgraph.types import Command

def supervisor_node(state: AriaState) -> Command:
    decision = llm.invoke(...)               # LLM decides what to do
    return Command(
        update={"current_intent": decision.intent},
        goto=decision.next_worker            # dynamic routing in one return
    )
```

### 2.4 `Send()` — The Parallel Dispatch API

When the supervisor wants to fan-out to multiple workers **in parallel**, it returns a list of `Send` objects. Each `Send` carries an independent state slice for that worker.

```python
from langgraph.types import Send

def supervisor_node(state: AriaState):
    # Fan-out: task_worker and browser_worker run IN PARALLEL
    return [
        Send("task_worker",   {"worker_input": "get task list"}),
        Send("browser_worker", {"worker_input": "get current page"})
    ]
    # Both write back to state.worker_results (reducer merges them)
```

### 2.5 Subgraphs — Hierarchy When You Scale

Each "team" of workers can be its own `StateGraph`, compiled and mounted as a single node inside the parent graph. This keeps the main supervisor clean.

```
Main Graph
  └── Supervisor
        ├── memory_worker          ← simple node
        ├── task_worker            ← simple node
        └── automation_team        ← this is itself a subgraph
              ├── task_worker (local)
              └── automation_creator
```

### 2.6 `interrupt()` — Human in the Loop

Call `interrupt(value)` inside any node to PAUSE the entire graph. The graph state is checkpointed. Execution resumes when a human provides input via `.invoke()` again.

```python
from langgraph.types import interrupt

def automation_creator_node(state: AriaState):
    plan = build_automation_plan(state)
    # Pause and ask the human for approval
    human_decision = interrupt({"message": "Approve this automation?", "plan": plan})
    if human_decision["approved"]:
        return {"automations": [execute_plan(plan)]}
    return {"status": "automation_cancelled"}
```

> **Requires:** Graph compiled with a checkpointer. Without it, `interrupt()` throws.

---

## 3. The Architecture We Follow

**Name:** Hierarchical Orchestrator-Worker Pattern (Supervisor Pattern on LangGraph StateGraph)

### Why This Pattern

| Problem | Solution |
|---|---|
| Complex user intent can't be one hardcoded mapping | LLM Supervisor decomposes intent dynamically |
| Workers need each other's output | Unified State — Worker A writes, Worker B reads same State |
| Need parallel execution | `Send()` API for fan-out, reducers for fan-in |
| Need to pause for approval | `interrupt()` + checkpointer |
| Need to add workers without changing core logic | Workers are registered; Supervisor discovers them |

### Graph Shape

```
User Message
     │
     ▼
┌────────────┐
│ Supervisor │  ←─────────────────────────────────────┐
│  (LLM Node)│                                         │
└────────────┘                                         │
     │                                                 │
     │  Command / Send()                               │
     ▼                                                 │
┌─────────────────────────────────────────┐            │
│          Worker Layer (parallel ok)     │            │
│                                         │            │
│  ┌──────────────┐  ┌─────────────────┐  │            │
│  │ memory_worker│  │  task_worker    │  │            │
│  └──────────────┘  └─────────────────┘  │            │
│  ┌──────────────┐  ┌─────────────────┐  │            │
│  │browser_worker│  │automation_creator│ │            │
│  └──────────────┘  └─────────────────┘  │            │
│           ┌──────────────┐              │            │
│           │connector_wkr │              │            │
│           └──────────────┘              │            │
└─────────────────────────────────────────┘            │
     │                                                 │
     │  All workers → back to Supervisor               │
     └─────────────────────────────────────────────────┘
     │
     ▼ (when Supervisor decides task is done)
   END
```

---

## 4. The State — Backbone of Everything

> This is the **exact TypedDict** we will use in this project. Every node reads from this. Every node writes partial updates to this.

```python
from __future__ import annotations

import operator
from typing import Annotated, Any, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


# ── Literal types for strict typing ──────────────────────────────────────────

WorkerName = Literal[
    "memory_worker",
    "task_worker",
    "automation_creator",
    "browser_worker",
    "connector_worker",
]

IntentName = Literal[
    "reflect",
    "task_status",
    "summarize",
    "create_task",
    "create_automation",
    "edit_automation",
    "prioritize",
    "suggest",
    "unknown",
]

StatusName = Literal[
    "running",
    "waiting_for_human",
    "done",
    "error",
]


# ── Intermediate result that each worker produces ────────────────────────────

class WorkerResult(TypedDict):
    worker: WorkerName          # which worker produced this
    output: Any                 # the actual payload
    error: str | None           # None if success


# ── The Unified State ─────────────────────────────────────────────────────────

class AriaState(TypedDict):

    # ── Conversation ──────────────────────────────────────────────────────────
    # add_messages is LangGraph's built-in reducer that appends new messages
    # and deduplicates by message id. Never overwrite this directly.
    messages: Annotated[list[BaseMessage], add_messages]

    # ── Supervisor fields ─────────────────────────────────────────────────────
    # Set by Supervisor before dispatching workers.
    current_intent: IntentName
    # Which workers the Supervisor has decided to invoke this turn.
    planned_workers: list[WorkerName]
    # Final natural language response to surface to the user.
    final_response: str | None

    # ── Worker results (parallel-safe) ───────────────────────────────────────
    # operator.add = list append. Multiple workers writing in parallel are safe.
    # After fan-in this contains one WorkerResult per invoked worker.
    worker_results: Annotated[list[WorkerResult], operator.add]

    # ── Domain-specific state written by workers ──────────────────────────────

    # task_worker writes this after any task operation.
    tasks: list[dict] | None
    # The ID of the most recently created or modified task.
    last_created_task_id: str | None

    # automation_creator writes this.
    automations: list[dict] | None
    # Pending plan waiting for HITL approval before execution.
    pending_automation_plan: dict | None

    # memory_worker writes this.
    memory_context: str | None

    # memory_ingest_worker writes these.
    ingested_message_ids: list[str] | None
    contains_memorable_info: bool | None
    long_term_memory_stats: dict | None  # {facts_stored, last_ingest_ts, entities_count}

    # browser_worker writes this.
    browser_content: str | None

    # connector_worker writes this.
    connector_data: dict | None

    # ── Control ───────────────────────────────────────────────────────────────
    status: StatusName
    # Error message if any node failed.
    error_message: str | None
    # Turn counter — Supervisor increments each loop to detect infinite loops.
    turn_count: int
```

### State Field Ownership Table

| Field | Written by | Reducer? | Notes |
|---|---|---|---|
| `messages` | Any node | ✅ `add_messages` | Append-only, dedup by id |
| `current_intent` | Supervisor | ❌ overwrite | Single writer |
| `planned_workers` | Supervisor | ❌ overwrite | Reset each turn |
| `final_response` | Supervisor | ❌ overwrite | Last thing set before END |
| `worker_results` | ALL workers | ✅ `operator.add` | Fan-in aggregation point |
| `tasks` | task_worker | ❌ overwrite | Single writer |
| `last_created_task_id` | task_worker | ❌ overwrite | Single writer |
| `automations` | automation_creator | ❌ overwrite | Single writer |
| `pending_automation_plan` | automation_creator | ❌ overwrite | HITL staging area |
| `memory_context` | memory_worker | ❌ overwrite | Single writer |
| `browser_content` | browser_worker | ❌ overwrite | Single writer |
| `connector_data` | connector_worker | ❌ overwrite | Single writer |
| `status` | Supervisor | ❌ overwrite | Graph lifecycle |
| `error_message` | any node | ❌ overwrite | Last error wins |
| `turn_count` | Supervisor | ❌ overwrite | Loop guard |
| `ingested_message_ids` | Ingest worker | ❌ overwrite | Deduplication tracker |
| `contains_memorable_info` | Supervisor | ❌ overwrite | Immediate memory ingest trigger |
| `long_term_memory_stats` | Ingest worker | ❌ overwrite | Ingest statistics for UI |

---

## 5. Supervisor Node — How It Actually Works

> **Critical clarification:** The Supervisor is NOT a class, NOT a manager process, NOT a separate server. It is a **single Python function** registered as a node in the StateGraph. It runs, returns a `Command`, and LangGraph routes to the next node.

### What the Supervisor Does (in order)

1. **Reads** the full `AriaState` — especially `messages` and `worker_results` from previous workers.
2. **Calls the LLM** with the current state to decide: what is the intent? Which workers are needed? Is the task done?
3. **Returns a `Command`** that contains:
   - A state update (`current_intent`, `planned_workers`, `turn_count`)
   - A routing instruction (`goto`) — either a single worker name, a list of `Send()` for parallel, or `END`

### Supervisor is NOT:
- ❌ A rule-based if/else router
- ❌ A `create_supervisor()` wrapper (we build it custom)
- ❌ A process that calls workers as functions — it just says "go to this node next"

### Supervisor skeleton (exact pattern we follow)

```python
from langgraph.types import Command, Send
from langchain_core.messages import SystemMessage
from pydantic import BaseModel

class SupervisorDecision(BaseModel):
    """Structured output from the Supervisor LLM."""
    intent: IntentName
    workers_to_invoke: list[WorkerName]
    reasoning: str
    task_complete: bool
    final_response: str | None  # only set if task_complete is True
    contains_memorable_info: bool  # True if user shared new/important context to persist

MAX_TURNS = 10

def supervisor_node(state: AriaState) -> Command:
    # ── Guard: infinite loop protection ──────────────────────────────────────
    if state["turn_count"] >= MAX_TURNS:
        return Command(
            update={"status": "error", "error_message": "Max turns exceeded"},
            goto="__end__"
        )

    # ── Build context for LLM ─────────────────────────────────────────────────
    system_prompt = SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT)
    context = format_state_for_supervisor(state)   # helper that summarizes state

    # ── LLM call with structured output ──────────────────────────────────────
    decision: SupervisorDecision = llm.with_structured_output(
        SupervisorDecision
    ).invoke([system_prompt, *state["messages"], context])

    # ── Task complete: go to END ──────────────────────────────────────────────
    if decision.task_complete:
        return Command(
            update={
                "final_response": decision.final_response,
                "status": "done",
                "turn_count": state["turn_count"] + 1,
            },
            goto="__end__"
        )

    # ── Single worker ─────────────────────────────────────────────────────────
    if len(decision.workers_to_invoke) == 1:
        return Command(
            update={
                "current_intent": decision.intent,
                "planned_workers": decision.workers_to_invoke,
                "worker_results": [],       # clear previous turn results
                "turn_count": state["turn_count"] + 1,
            },
            goto=decision.workers_to_invoke[0]
        )

    # ── Multiple workers: fan-out in parallel with Send() ─────────────────────
    return Command(
        update={
            "current_intent": decision.intent,
            "planned_workers": decision.workers_to_invoke,
            "worker_results": [],           # clear previous turn results
            "turn_count": state["turn_count"] + 1,
        },
        goto=[
            Send(worker, {"worker_input": decision.intent})
            for worker in decision.workers_to_invoke
        ]
    )
```

---

## 6. Worker Nodes — Unified State Write

> **Critical clarification:** Workers do NOT call each other. Workers do NOT return data to the Supervisor by passing arguments. Workers READ the shared `AriaState`, do their work, and WRITE back a partial state update. When Worker B runs after Worker A, Worker B automatically has access to everything Worker A wrote — because they both share the same State.

### Why There Is No Glue Code

```
Traditional approach (BAD):
  supervisor → calls task_worker() → gets return value → manually passes to automation_creator()

LangGraph approach (GOOD):
  task_worker runs → writes {"last_created_task_id": "abc123"} to State
  automation_creator runs → reads state["last_created_task_id"] directly
  No hand-off code. No argument passing. State is the bus.
```

### Worker Skeleton (exact pattern for every worker)

```python
def task_worker(state: AriaState) -> dict:
    """
    Reads from State, performs Convex DB operations, writes results back.
    Returns ONLY the keys this worker changes — LangGraph merges the rest.
    """
    # ── Read inputs from State (Worker A's output is already here) ────────────
    intent   = state["current_intent"]
    messages = state["messages"]

    # ── Do actual work ────────────────────────────────────────────────────────
    try:
        if intent == "create_task":
            task = convex_client.create_task(extract_task_from_messages(messages))
            return {
                # Domain-specific field — single writer, direct overwrite
                "tasks": [task],
                "last_created_task_id": task["id"],
                # Parallel-safe aggregation field — reducer appends this
                "worker_results": [WorkerResult(
                    worker="task_worker",
                    output=task,
                    error=None
                )]
            }

        elif intent in ("task_status", "prioritize", "summarize"):
            tasks = convex_client.get_all_tasks()
            return {
                "tasks": tasks,
                "worker_results": [WorkerResult(
                    worker="task_worker",
                    output=tasks,
                    error=None
                )]
            }

    except Exception as e:
        return {
            "worker_results": [WorkerResult(
                worker="task_worker",
                output=None,
                error=str(e)
            )],
            "error_message": str(e)
        }
```

### How Worker A Feeds Worker B (Concrete Example)

```
Turn 1:
  Supervisor decides → intent="create_automation", workers=["task_worker", "automation_creator"]
  But these are sequential (automation needs the task ID first).

  So Supervisor routes to task_worker FIRST (single Send).

Turn 2:
  task_worker runs.
  Writes to State: {"last_created_task_id": "task_xyz", "tasks": [...], "worker_results": [...]}

  Supervisor runs again.
  Reads state["last_created_task_id"] = "task_xyz" — it's already there.
  Decides → route to automation_creator next.

Turn 3:
  automation_creator runs.
  Reads state["last_created_task_id"] = "task_xyz"  ← from task_worker, automatically.
  Builds the automation using that task ID.
  Writes: {"automations": [...], "worker_results": [...]}
  No argument passing. No glue code. The State IS the data bus.
```

---

## 7. Graph Wiring — Edges, Routing, Parallelism

```python
from langgraph.graph import StateGraph, START, END

def build_graph(checkpointer) -> CompiledGraph:
    builder = StateGraph(AriaState)

    # ── Register all nodes ────────────────────────────────────────────────────
    builder.add_node("supervisor",         supervisor_node)
    builder.add_node("memory_worker",      memory_worker_node)
    builder.add_node("task_worker",        task_worker_node)
    builder.add_node("automation_creator", automation_creator_node)
    builder.add_node("browser_worker",     browser_worker_node)
    builder.add_node("connector_worker",   connector_worker_node)

    # ── Entry point ───────────────────────────────────────────────────────────
    builder.add_edge(START, "supervisor")

    # ── All workers loop back to supervisor ───────────────────────────────────
    # Supervisor then decides: invoke more workers, or go to END.
    for worker in ["memory_worker", "task_worker", "automation_creator",
                   "browser_worker", "connector_worker"]:
        builder.add_edge(worker, "supervisor")

    # ── Supervisor routing is handled inside supervisor_node via Command() ────
    # No conditional_edges needed — Command.goto handles dynamic routing.

    # ── Compile with checkpointer (REQUIRED for interrupt/HITL) ──────────────
    return builder.compile(checkpointer=checkpointer)
```

---

## 8. HITL + Checkpointing

### Checkpointing

- **Dev:** `MemorySaver()` — in-memory, lost on restart.
- **Prod:** `PostgresSaver` or `RedisSaver` — persistent across restarts and deployments.
- **Rule:** Always compile with a checkpointer, even in dev. Not optional.

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
graph = build_graph(checkpointer)

# thread_id = one conversation session
config = {"configurable": {"thread_id": "user_session_abc"}}
result = graph.invoke({"messages": [HumanMessage("Create a task")]}, config)
```

### HITL (Human-in-the-Loop)

Use `interrupt()` when a worker is about to do something irreversible (send email, create automation, delete data).

```python
from langgraph.types import interrupt

def automation_creator_node(state: AriaState) -> dict:
    plan = build_plan(state)

    # ── PAUSE here, surface plan to user ─────────────────────────────────────
    human_input = interrupt({
        "message": "Review this automation plan before I create it.",
        "plan": plan
    })

    # ── Execution resumes HERE after human responds ───────────────────────────
    if human_input.get("approved"):
        result = execute_automation(plan)
        return {"automations": [result], "pending_automation_plan": None}

    return {"status": "done", "pending_automation_plan": None,
            "final_response": "Automation cancelled."}

# To resume after interrupt:
graph.invoke(Command(resume={"approved": True}), config)
```

---

## 9. The Project Plan

### Workers & Their Responsibilities

| Worker | Data Sources | Operations |
|---|---|---|
| `memory_worker` | Pinecone (vector) + Neo4j (graph) | Semantic search, retrieve context, store memories |
| `task_worker` | Convex DB | CRUD on tasks, prioritization queries |
| `automation_creator` | React Flow (nodes/edges in Convex) | Create, update, delete automations |
| `browser_worker` | Browser content stored in DB | Read current page context |
| `connector_worker` | Gmail / Outlook / Slack / Calendar | Read/write via Compose APIs |



---

## 10. What NOT to Do (Anti-Patterns)

| ❌ Don't Do This | ✅ Do This Instead |
|---|---|
| `create_supervisor()` wrapper | Custom `supervisor_node` function |
| Workers calling each other directly | Workers write to State; next worker reads State |
| Hardcoded `INTENT_TO_WORKERS` dict | Supervisor LLM decides dynamically |
| `if/else` routing in conditional edges | Return `Command(goto=...)` from node |
| Forgetting reducer on parallel-write fields | `Annotated[list, operator.add]` on `worker_results` |
| Compiling without checkpointer | Always `build_graph(checkpointer)` |
| Passing data as function arguments between nodes | All data lives in `AriaState` |
| Global mutable state outside StateGraph | All state is inside `AriaState` |

---

## 11. Long-Term Memory & Background Ingest

To avoid latency in the blocking user response loop (the hot path), fact extraction and database ingestion are offloaded to a background task running asynchronously.

```
┌───────────────────────────────────────────────────────────┐
│                      HOT PATH                             │
│  User ──► Supervisor (sets contains_memorable_info)       │
│               │                                           │
│               ├──► Workers ──► Response                   │
│               └──► memory_worker (retrieval only)         │
└───────────────────────────────────────────────────────────┘
                     │
                     │ (asyncio.create_task)
                     ▼
┌───────────────────────────────────────────────────────────┐
│                    BACKGROUND PATH                        │
│  memory_ingest_worker (runs if contains_memorable_info)   │
│       │                                                   │
│       ├──► spaCy en_core_web_md (local NER & triples)     │
│       ├──► Nano LLM (structured fact extraction JSON)     │
│       ├──► Vector Store (Pinecone embeddings)             │
│       ├──► Graph DB (Neo4j Cypher upsert relationships)    │
│       └──► SSE events push (memory_ingest_done -> UI)     │
└───────────────────────────────────────────────────────────┘
```

### Ingestion Pipeline Flow (Background Worker)
1. **Trigger Check:** Executed after the supervisor returns a response. Triggered immediately if `contains_memorable_info` is `True` OR if turn count difference `(turn_count - last_ingest_turn) >= 5`.
2. **Filter & Deduplicate:** Compare message list against `ingested_message_ids` to find new unsaved content.
3. **spaCy (NER & Dependency Parser):** Pass raw text through local spaCy model (`spacy.load("en_core_web_md")`) to discover named entities (`PERSON`, `ORG`, `PRODUCT`, `GPE`, etc.) and grammatical relationships at zero cost.
4. **Structured Fact Extraction (Nano LLM):** Call a lightweight LLM (e.g., Gemini Flash or GPT-4o-mini) with the context and entities to extract formal facts, relationships, and metadata.
5. **Dual Write:**
   - **Pinecone:** Compute embeddings for the facts and upsert with metadata (`user_id`, `thread_id`).
   - **Neo4j:** Run Cypher commands to `MERGE` entities and relationships to build/update the user knowledge graph.
6. **SSE Streaming:** Throughout execution, broadcast events (e.g., `memory_ingest_start`, `memory_entities_found`, `memory_ingest_done`) to updates the UI dynamically.

---

> **Last updated:** 2026-06-23
> **Architecture decision:** Locked. Hierarchical Orchestrator-Worker Pattern on LangGraph StateGraph.
> **State schema:** `AriaState` TypedDict above is the single source of truth.
