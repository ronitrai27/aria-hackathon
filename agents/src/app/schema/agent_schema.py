"""
Agent Schema — /agent route
Defines the LangGraph WorkflowState used by the Workflow Designer Agent.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any

from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


class WorkflowState(TypedDict):
    # Chat history — always appended, never overwritten (operator.add reducer)
    messages: Annotated[list[BaseMessage], operator.add]
    # The committed, verifier-approved workflow structure
    workflow: dict[str, Any]
    # Non-empty when verifier_node rejects a proposed workflow
    validation_error: str
    # True when the last verifier pass succeeded
    is_valid: bool
