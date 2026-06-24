"""
tool/tasks.py
─────────────
Placeholder tools for task triggers.
This is commented out for now, to be integrated as a trigger node in workflows in the future.
"""

from loguru import logger
# from langchain_core.tools import tool
# from convex import ConvexClient
# import os

# @tool
# def get_tasks_trigger(user_id: str) -> list[dict]:
#     """
#     Retrieves active tasks for the user from Convex DB to trigger workflow node executions.
#     """
#     logger.info(f"Retrieving tasks for trigger node evaluation for user: {user_id}")
#     try:
#         convex_url = os.environ.get("CONVEX_URL") or os.environ.get("NEXT_PUBLIC_CONVEX_URL")
#         if not convex_url:
#             raise ValueError("CONVEX_URL environment variable is missing")
#             
#         # In the future, instantiate the client and fetch active/completed tasks
#         # client = ConvexClient(convex_url)
#         # tasks = client.mutation("tasks:get", {"user_id": user_id})
#         # return tasks
#         return []
#     except Exception as e:
#         logger.error(f"Failed to fetch tasks trigger: {e}")
#         return []
