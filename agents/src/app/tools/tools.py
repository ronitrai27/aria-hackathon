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

@tool
def get_task_by_name(user_id: str, title: str) -> dict:
    """
    Look up a single task by its title for a given user.

    Calls GET /api/agent/get-task on the Convex HTTP router which runs the
    getTaskByName query against the tasks table.

    Args:
        user_id: The Clerk user ID (e.g. "user_2abc...").
        title:   The exact (case-insensitive) title of the task to find.

    Returns:
        A dict with:
          - message (str): human-readable result summary
          - task (dict | None): {id, title, description, status} or null
    """
    url = f"{CONVEX_SITE_URL}/api/agent/get-task"
    params = {"userId": user_id, "title": title}

    try:
        response = httpx.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        return {
            "message": f"HTTP error {e.response.status_code}: {e.response.text}",
            "task": None,
        }
    except Exception as e:
        return {
            "message": f"Failed to reach Convex: {str(e)}",
            "task": None,
        }


# ─── Exported tool list (register all agent tools here) ──────────────────────

AGENT_TOOLS = [get_task_by_name]
