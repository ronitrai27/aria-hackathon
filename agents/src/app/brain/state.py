"""
BrainState — LangGraph TypedDict state for the /brain supervisor agent.

Fields:
  messages       – chat history (append-only via operator.add reducer)
  user_id        – Clerk user ID passed from the frontend
  user_name      – display name passed from the frontend
  thread_id      – unique thread identifier for checkpointing
  pending_tasks  – tasks proposed by supervisor, awaiting HITL approval
  hitl_approved  – set True when user approves pending tasks
"""

from __future__ import annotations

import operator
from typing import Annotated, Any

from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


class BrainState(TypedDict):
    # Chat history — always appended, never overwritten (operator.add reducer)
    messages: Annotated[list[BaseMessage], operator.add]

    # User identity — injected at the start of every /brain call
    user_id: str
    user_name: str

    # Thread tracking for Redis checkpointer
    thread_id: str

    # HITL (Human-in-the-Loop) for create_tasks
    pending_tasks: list[dict]   # supervisor-proposed tasks awaiting approval
    hitl_approved: bool         # flipped to True after user confirms
