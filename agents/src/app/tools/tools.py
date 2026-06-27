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
def get_tasks(user_id: str, limit: Optional[int] = 10) -> list[dict]:
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
        response = httpx.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch tasks: {str(e)}"}]


# ─── Tool: create_tasks ────────────────────────────────────────────────────────

@tool
def create_tasks(user_id: str, tasks: list[dict]) -> dict:
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
        response = httpx.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": f"Failed to create tasks: {str(e)}"}


# ─── Tool: get_browser_activity ────────────────────────────────────────────────

@tool
def get_browser_activity(user_id: str) -> list[dict]:
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
        response = httpx.get(url, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch browser activity: {str(e)}"}]


# ─── Tool: fetch_inbox ─────────────────────────────────────────────────────────

@tool
def fetch_inbox(user_id: str, instruction: str) -> str:
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
        session = create_inbox_session(user_id)
        result = run_inbox_agent(session, instruction)
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


# ─── Exported tool list (register all agent tools here) ──────────────────────

# AGENT_TOOLS = [get_task_by_name]
BRAIN_TOOLS = [get_tasks, create_tasks, get_browser_activity, fetch_inbox, fetch_memory]



