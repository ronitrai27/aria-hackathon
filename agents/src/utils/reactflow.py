"""
reactflow.py — Convert the agent's workflow dict into React Flow nodes & edges.

The agent (graph.py) produces a workflow structure like:
    {
      "name": "My Workflow",
      "description": "Does X then Y",
      "steps": [
        {
          "tool_name": "GMAIL_SEND_EMAIL",       # or "AI_SUMMARIZE", "AI_EXTRACT", etc.
          "step_description": "Send a welcome email",
          "fields": [
            { "name": "recipient_email", "type": "string", "description": "...", "value": "" },
            { "name": "body",            "type": "string", "description": "...", "value": "{{step_1}}" }
          ]
        }
      ]
    }

This module converts that into the format React Flow expects:
    {
      "nodes": [ { id, type, position, data }, ... ],
      "edges": [ { id, source, target, animated }, ... ]
    }

Layout: simple vertical — one node below another, centered at x=250.

Two node categories:
  1. Tool nodes  — Composio action steps (GMAIL_SEND_EMAIL, SLACK_SEND_MESSAGE, etc.)
  2. AI nodes    — built-in AI processing steps with operation ∈ {summarize, extract, classify, research}
     These are identified by a tool_name prefix "AI_" (e.g. "AI_SUMMARIZE", "AI_RESEARCH").
"""

from __future__ import annotations

from typing import Any

# ─── Constants ────────────────────────────────────────────────────────────────

# Vertical spacing between nodes (px)
Y_SPACING = 150

# Horizontal center for the vertical layout
X_CENTER = 250

# AI node prefixes the agent must use when creating an AI step
AI_OPERATIONS = {"AI_SUMMARIZE", "AI_EXTRACT", "AI_CLASSIFY", "AI_RESEARCH"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_ai_node(tool_name: str) -> bool:
    """Check if this step is an AI processing node rather than a Composio tool."""
    return tool_name.upper() in AI_OPERATIONS


def _make_node(
    node_id: str,
    node_type: str,
    label: str,
    position_y: int,
    extra_data: dict[str, Any] | None = None,
) -> dict:
    """Build a single React Flow node dict."""
    data: dict[str, Any] = {"label": label}
    if extra_data:
        data.update(extra_data)
    return {
        "id": node_id,
        "type": node_type,
        "position": {"x": X_CENTER, "y": position_y},
        "data": data,
    }


def _make_edge(source: str, target: str, animated: bool = True) -> dict:
    """Build a single React Flow edge dict."""
    return {
        "id": f"e_{source}-{target}",
        "source": source,
        "target": target,
        "animated": animated,
    }


# ─── Main converter ──────────────────────────────────────────────────────────

def workflow_to_reactflow(workflow: dict) -> dict:
    """
    Convert a validated workflow dict into React Flow {nodes, edges}.

    Args:
        workflow: The workflow dict with keys: name, description, steps[].

    Returns:
        {
          "nodes": [ ... ],
          "edges": [ ... ]
        }

    Node types emitted:
        - "input"     → the start node (workflow name)
        - "ai"        → AI processing node (summarize | extract | classify | research)
        - "default"   → regular Composio tool node (GMAIL_SEND_EMAIL, etc.)
    """
    nodes: list[dict] = []
    edges: list[dict] = []

    # ── Start node ────────────────────────────────────────────────────────
    nodes.append(
        _make_node(
            node_id="start",
            node_type="input",
            label=workflow.get("name", "Workflow"),
            position_y=0,
            extra_data={"description": workflow.get("description", "")},
        )
    )

    # ── Step nodes ────────────────────────────────────────────────────────
    steps = workflow.get("steps", [])
    for i, step in enumerate(steps):
        node_id = f"step_{i + 1}"
        tool_name = step.get("tool_name", "UNKNOWN")
        is_ai = _is_ai_node(tool_name)

        # Determine node type:
        #   "ai"      → for AI_SUMMARIZE, AI_EXTRACT, AI_CLASSIFY, AI_RESEARCH
        #   "default" → for regular Composio tool steps
        node_type = "ai" if is_ai else "default"

        # Build data payload
        extra_data: dict[str, Any] = {
            "description": step.get("step_description", ""),
            "fields": step.get("fields", []),
            "tool_name": tool_name,
        }

        # For AI nodes, also embed the operation type (summarize/extract/classify/research)
        if is_ai:
            # "AI_SUMMARIZE" → "summarize"
            operation = tool_name.replace("AI_", "").lower()
            extra_data["ai_operation"] = operation

        nodes.append(
            _make_node(
                node_id=node_id,
                node_type=node_type,
                label=tool_name,
                position_y=(i + 1) * Y_SPACING,
                extra_data=extra_data,
            )
        )

        # ── Edge from previous node ───────────────────────────────────────
        source = "start" if i == 0 else f"step_{i}"
        edges.append(_make_edge(source, node_id))

    return {"nodes": nodes, "edges": edges}
