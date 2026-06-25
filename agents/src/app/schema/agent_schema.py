"""
Agent Schema — /agent route
Defines the LangGraph WorkflowState and Pydantic validation models
used by the Workflow Designer Agent (graph.py).
"""

from __future__ import annotations

import operator
from typing import Annotated, Any, List

from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


# ─── LangGraph State ─────────────────────────────────────────────────────────

class WorkflowState(TypedDict):
    # Chat history — always appended, never overwritten (operator.add reducer)
    messages: Annotated[list[BaseMessage], operator.add]
    # The committed, verifier-approved workflow structure
    workflow: dict[str, Any]
    # Non-empty when verifier_node rejects a proposed workflow
    validation_error: str
    # True when the last verifier pass succeeded
    is_valid: bool


# ─── Pydantic Validation Models (used by verifier_node) ──────────────────────

class WorkflowField(BaseModel):
    name: str = Field(description="Exact parameter name from Composio schema")
    type: str = Field(description="string, boolean, integer, or number")
    description: str = Field(default="", description="Friendly description of what this parameter does")
    value: Any = Field(default="", description="Pre-filled value, or placeholder like {{step_N.key}}")


class WorkflowStep(BaseModel):
    tool_name: str = Field(description="Exact tool action slug (e.g. GMAIL_SEND_EMAIL) or AI operation (AI_SUMMARIZE)")
    step_description: str = Field(description="Short sentence explaining what this step does")
    fields: List[WorkflowField] = Field(default_factory=list)


class WorkflowStructure(BaseModel):
    name: str
    description: str
    steps: List[WorkflowStep] = Field(default_factory=list)
