"""
Agent Tools — /agent route
LangChain tools that the Workflow Designer Agent can call.

Each tool hits the Convex HTTP API (http.ts) to read/write application data.
The CONVEX_SITE_URL env var must point to the Convex deployment's HTTP base URL.
e.g. https://wandering-antelope-3.convex.site
"""

from __future__ import annotations

import os
from typing import Optional

import httpx
from langchain_core.tools import tool

# ─── Config ───────────────────────────────────────────────────────────────────

CONVEX_SITE_URL = os.getenv(
    "CONVEX_SITE_URL", "https://wandering-antelope-3.convex.site"
)


# ─── Tool: get_task_by_name ───────────────────────────────────────────────────
# NOT USED NOW
# @tool
# def get_task_by_name(user_id: str, title: str) -> dict:
#     """
#     Look up a single task by its title for a given user.

#     Calls GET /api/agent/get-task on the Convex HTTP router which runs the
#     getTaskByName query against the tasks table.

#     Args:
#         user_id: The Clerk user ID (e.g. "user_2abc...").
#         title:   The exact (case-insensitive) title of the task to find.

#     Returns:
#         A dict with:
#           - message (str): human-readable result summary
#           - task (dict | None): {id, title, description, status} or null
#     """
#     url = f"{CONVEX_SITE_URL}/api/agent/get-task"
#     params = {"userId": user_id, "title": title}

#     try:
#         response = httpx.get(url, params=params, timeout=10)
#         response.raise_for_status()
#         return response.json()
#     except httpx.HTTPStatusError as e:
#         return {
#             "message": f"HTTP error {e.response.status_code}: {e.response.text}",
#             "task": None,
#         }
#     except Exception as e:
#         return {
#             "message": f"Failed to reach Convex: {str(e)}",
#             "task": None,
#         }


# ─── Tool: get_tasks ──────────────────────────────────────────────────────────

@tool
async def get_tasks(user_id: str, limit: Optional[int] = 10) -> list[dict]:
    """
    Fetch the list of recent tasks for a given user.

    Calls GET /api/brain/get-tasks on the Convex HTTP router.

    Args:
        user_id: The Clerk user ID (e.g. "").
        limit:   The maximum number of tasks to return (1-10, defaults to 10).

    Returns:
        A list of dicts, each containing:
          - title (str): the task title
          - description (str): the task description (truncated)
          - status (str): task status (e.g. "in-progress", "completed", etc.)
          - duration (str): human-readable duration (e.g. "3 days")
    """
    url = f"{CONVEX_SITE_URL}/api/brain/get-tasks"
    params = {"userId": user_id}
    if limit is not None:
        params["limit"] = str(limit)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch tasks: {str(e)}"}]


# ─── Tool: create_tasks ────────────────────────────────────────────────────────

@tool
async def create_tasks(user_id: str, tasks: list[dict]) -> dict:
    """
    Bulk-create 1-10 tasks for a given user.

    Calls POST /api/brain/create-tasks on the Convex HTTP router.

    Args:
        user_id: The Clerk user ID (e.g. "").
        tasks:   A list of task dicts to create (max 10). Each dict must have:
                 - title (str): Title of the task
                 - description (str, optional): Task description
                 - priority (str, optional): "high" | "medium" | "low" (defaults to "medium")
                 - startDate (int): Start date Unix timestamp in milliseconds
                 - endDate (int): End date Unix timestamp in milliseconds

    Returns:
        A dict with a summary message and a list of per-task results (created or skipped).
    """
    url = f"{CONVEX_SITE_URL}/api/brain/create-tasks"
    payload = {"userId": user_id, "tasks": tasks}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return {"error": f"Failed to create tasks: {str(e)}"}


# ─── Tool: get_browser_activity ────────────────────────────────────────────────

@tool
async def get_browser_activity(user_id: str) -> list[dict]:
    """
    Fetch user's recent aggregated browser activity (last 48 hours).
    Returns a list of websites/domains where the user has spent a significant
    amount of time (>= 10 minutes combined), sorted by total duration descending.

    Args:
        user_id: The Clerk user ID (e.g. "").

    Returns:
        A list of dicts, each containing:
          - domain (str): the domain visited
          - totalDurationMs (int): total time spent in milliseconds
          - visitCount (int): number of visits
          - lastVisitedAt (int): timestamp of the last visit
    """
    url = f"{CONVEX_SITE_URL}/api/brain/get-browser-activity"
    params = {"userId": user_id}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=15)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch browser activity: {str(e)}"}]


from langchain_core.runnables import RunnableConfig

# ─── Tool: fetch_inbox ─────────────────────────────────────────────────────────

async def resolve_convex_user_id(clerk_user_id: str) -> str:
    """Helper to query Convex and resolve the Clerk ID to Convex document ID."""
    if not clerk_user_id or not clerk_user_id.startswith("user_"):
        return clerk_user_id
        
    url = f"{CONVEX_SITE_URL}/api/brain/resolve-user"
    params = {"userId": clerk_user_id}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            # Return the Convex user document ID if found
            return data.get("_id", clerk_user_id)
    except Exception as e:
        print(f"[resolve_convex_user_id error] {str(e)}", flush=True)
        return clerk_user_id


@tool
async def fetch_inbox(user_id: str, instruction: str, config: RunnableConfig = None) -> str:
    """
    Query Gmail, Slack, and Google Calendar for the user.
    The agent searches and executes actions across these three services using Composio.

    Args:
        user_id: The Clerk user ID (e.g. "").
        instruction: Detailed instruction of what to fetch/do (e.g., "Get my unread emails from Gmail").

    Returns:
        A formatted text summary of the results returned by the sub-agent.
    """
    from src.app.brain.inbox_agent import create_inbox_session, run_inbox_agent

    print(f"\n[fetch_inbox tool] Running inbox sub-agent for user_id={user_id} with instruction: {instruction}", flush=True)
    try:
        # Resolve Clerk user_id to Convex user document ID
        resolved_id = await resolve_convex_user_id(user_id)
        print(f"[fetch_inbox tool] Resolved user Clerk ID {user_id} -> Convex ID {resolved_id}", flush=True)
        
        session = create_inbox_session(resolved_id)
        
        # Extract progress callback if registered in configurable metadata
        if isinstance(config, dict):
            configurable = config.get("configurable", {})
        elif config:
            configurable = getattr(config, "configurable", {})
        else:
            configurable = {}
        inbox_callback = configurable.get("inbox_callback")
        
        result = await run_inbox_agent(session, instruction, on_step_callback=inbox_callback)
        return result
    except Exception as e:
        print(f"[fetch_inbox tool error] {str(e)}", flush=True)
        return f"Error executing inbox agent: {str(e)}"



# ─── Tool: fetch_memory ────────────────────────────────────────────────────────

@tool
def fetch_memory(user_id: str, query_text: str, source: str = "all") -> dict:
    """
    Retrieve personal knowledge context from the user's vector store,
    knowledge graph, or browser activity history.

    Args:
        user_id: The Clerk user ID (e.g. "").
        query_text: Search query / keywords (e.g., "past work on Next.js").
        source: Source type to query. Either "all" (queries both Pinecone Vector Index + Neo4j Graph db)
                or "browser" (queries Convex browser activity database).

    Returns:
        A dictionary containing the retrieved contextual elements.
    """
    print(f"\n[fetch_memory tool] Querying memory source={source} for user_id={user_id} with query_text: {query_text}", flush=True)
    
    if source == "browser":
        # Simply query browser activity
        activity = get_browser_activity(user_id)
        return {"browser_activity": activity}
    
    # Otherwise query vector store + graph
    from src.utils.vector_store import query_pinecone
    from src.utils.graph_db import query_neo4j

    vector_results = query_pinecone(user_id, query_text)
    graph_results = query_neo4j(user_id, query_text)

    print(f"[fetch_memory tool] Memory query returned {len(vector_results)} vector matches and {len(graph_results)} graph relationships.", flush=True)

    return {
        "vector_context": vector_results,
        "graph_context": graph_results
    }


# ─── Tool: save_to_memory ───────────────────────────────────────────────────────

def _bg_save_to_memory(user_id: str, facts: list[str], user_name: Optional[str] = None):
    from src.utils.vector_store import upsert_vector_store
    from src.utils.graph_db import upsert_knowledge_graph
    from src.utils.entity_extractor import extract_knowledge_graph_elements

    try:
        print(f"\n[save_to_memory tool background] Starting updates for user_id={user_id} with facts: {facts}", flush=True)
        # 1. Update Pinecone
        upsert_vector_store(user_id, facts)

        # 2. Extract Entities and Relations from each fact
        combined_elements = {"entities": [], "relations": []}
        for fact in facts:
            elements = extract_knowledge_graph_elements(fact, user_name=user_name)
            combined_elements["entities"].extend(elements.get("entities", []))
            combined_elements["relations"].extend(elements.get("relations", []))

        # Deduplicate extracted elements
        seen_entities = {}
        for ent in combined_elements["entities"]:
            seen_entities[ent["name"].lower()] = ent
        combined_elements["entities"] = list(seen_entities.values())

        # 3. Update Neo4j Graph
        upsert_knowledge_graph(user_id, combined_elements)
        print("[save_to_memory tool background] Completed DB updates successfully.", flush=True)
    except Exception as e:
        print(f"[save_to_memory tool background error] {str(e)}", flush=True)


@tool
async def save_to_memory(user_id: str, facts: list[str], user_name: Optional[str] = None) -> str:
    """
    Save key workspace facts, technology preferences, task constraints, 
    or client contacts about the user to their long-term memory graph and vector DB.
    Only invoke this when the user shares new, valuable, long-term information.

    Args:
        user_id: The Clerk user ID (e.g. "").
        facts:   A list of concise fact/preference sentences to commit to memory (e.g., ["User prefers Vanilla CSS over TailwindCSS", "User is working on Project Orion"]).
        user_name: Optional name of the user to resolve personal pronouns to central USER node.

    Returns:
        A JSON string containing the status, facts, or error.
    """
    import json
    import asyncio
    print(f"\n[save_to_memory tool] Invoked for user_id={user_id} (name={user_name}) with facts: {facts}", flush=True)
    if not facts:
        return json.dumps({"status": "failed", "error": "No facts provided."})

    # Run the blocking updates in a background thread to prevent blocking the agent response stream
    asyncio.create_task(asyncio.to_thread(_bg_save_to_memory, user_id, facts, user_name))

    print("[save_to_memory tool] Database updates spawned in background. Returning success immediately.", flush=True)
    return json.dumps({"status": "success", "facts": facts})



# ─── Exported tool list (register all agent tools here) ──────────────────────

# AGENT_TOOLS = [get_task_by_name]
BRAIN_TOOLS = [get_tasks, create_tasks, get_browser_activity, fetch_inbox, fetch_memory, save_to_memory]



