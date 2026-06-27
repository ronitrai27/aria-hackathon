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


# ─── Exported tool list (register all agent tools here) ──────────────────────

# AGENT_TOOLS = [get_task_by_name]
BRAIN_TOOLS = [get_tasks, create_tasks]

