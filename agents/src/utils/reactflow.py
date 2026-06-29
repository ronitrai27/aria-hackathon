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
  2. AI nodes    — prompt nodes for the frontend LLM (AI_SUMMARIZE, AI_EXTRACT,
     AI_CLASSIFY, AI_RESEARCH). These carry a single 'prompt' field that the
     frontend passes to its own LLM at run-time. Identified by the "AI_" prefix.
"""

from __future__ import annotations

import copy
import re
from typing import Any

# ─── Constants ────────────────────────────────────────────────────────────────

# Vertical spacing between nodes (px)
Y_SPACING = 150

# Horizontal center for the vertical layout
X_CENTER = 250

# AI node prefixes the agent must use when creating an AI step
AI_OPERATIONS = {"AI_SUMMARIZE", "AI_EXTRACT", "AI_CLASSIFY", "AI_RESEARCH"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def consolidate_steps(steps: list[dict]) -> list[dict]:
    """
    Consolidate multiple AI nodes of the same operation type (e.g. AI_RESEARCH)
    into a single step. Merge descriptions and field values, remove duplicates,
    and adjust step references (e.g. {{step_N}}) in subsequent steps.
    """
    first_occurrences = {}  # tool_name -> original_index (0-based)
    to_delete = set()       # set of original indices to delete
    merge_map = {}          # original_index -> target_original_index
    
    for i, step in enumerate(steps):
        tool_name = step.get("tool_name", "")
        if tool_name in AI_OPERATIONS:
            if tool_name not in first_occurrences:
                first_occurrences[tool_name] = i
            else:
                target = first_occurrences[tool_name]
                to_delete.add(i)
                merge_map[i] = target
                
    if not to_delete:
        return steps
        
    # Map original_index to new_index (1-based)
    original_to_new_1based = {}
    current_new_index = 1
    for i in range(len(steps)):
        if i in to_delete:
            target_orig = merge_map[i]
            original_to_new_1based[i + 1] = original_to_new_1based[target_orig + 1]
        else:
            original_to_new_1based[i + 1] = current_new_index
            current_new_index += 1
            
    # Copy steps to avoid side effects
    temp_steps = [copy.deepcopy(step) for step in steps]
    
    # Merge step information for duplicated nodes
    for orig_idx, target_orig_idx in merge_map.items():
        target_step = temp_steps[target_orig_idx]
        merged_step = temp_steps[orig_idx]
        
        # Merge descriptions
        target_desc = target_step.get("step_description", "")
        merged_desc = merged_step.get("step_description", "")
        if merged_desc and merged_desc not in target_desc:
            target_step["step_description"] = f"{target_desc} / {merged_desc}"
            
        # Merge fields
        target_fields = target_step.setdefault("fields", [])
        merged_fields = merged_step.get("fields", [])
        
        # Build map of target fields by name
        target_fields_by_name = {
            f.get("name"): f for f in target_fields if isinstance(f, dict) and f.get("name")
        }
        
        for f in merged_fields:
            if not isinstance(f, dict):
                continue
            fname = f.get("name")
            if not fname:
                continue
            fval = f.get("value")
            
            if fname in target_fields_by_name:
                t_field = target_fields_by_name[fname]
                t_val = t_field.get("value")
                
                # If they are both strings, merge them
                if isinstance(t_val, str) and isinstance(fval, str):
                    if fval and fval not in t_val:
                        if fname in ("prompt", "commentary", "body", "description"):
                            t_field["value"] = f"{t_val}\n\nAND ALSO:\n\n{fval}"
                        elif fname in ("topic", "query", "search_query"):
                            t_field["value"] = f"{t_val}, {fval}"
                        else:
                            t_field["value"] = f"{t_val} | {fval}"
                elif t_val is None or t_val == "":
                    t_field["value"] = fval
            else:
                target_fields.append(copy.deepcopy(f))

    # Build the new steps list, filtering out deleted ones
    new_steps = []
    for i, step in enumerate(temp_steps):
        if i not in to_delete:
            new_steps.append(step)
            
    # Update step placeholders
    def replace_placeholder(match):
        orig_step_num = int(match.group(1))
        new_step_num = original_to_new_1based.get(orig_step_num, orig_step_num)
        full_match = match.group(0)
        return full_match.replace(f"step_{orig_step_num}", f"step_{new_step_num}")

    placeholder_pattern = re.compile(r"\{\{\s*step_(\d+)(?:\.[a-zA-Z0-9_\-\.]+)?\s*\}\}")

    for step in new_steps:
        for field in step.get("fields", []):
            val = field.get("value")
            if isinstance(val, str):
                field["value"] = placeholder_pattern.sub(replace_placeholder, val)
                
    return new_steps

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

    # ── Step nodes ────────────────────────────────────────────────────────
    steps = consolidate_steps(workflow.get("steps", []))
    for i, step in enumerate(steps):
        node_id = f"step_{i + 1}"
        tool_name = step.get("tool_name", "UNKNOWN")
        is_ai = _is_ai_node(tool_name)
        fields = step.get("fields", [])
        
        # Build parameter mapping dictionaries
        params_mapping = {f.get("name"): f.get("value", "") for f in fields if isinstance(f, dict)}

        if is_ai:
            operation = tool_name.replace("AI_", "").lower()
            node_type = f"ai_{operation}"
            
            extra_data = {
                "description": step.get("step_description", ""),
                "fields": fields,
                "tool_name": tool_name,
                "ai_config": {
                    # The agent always sets a single 'prompt' field for AI nodes.
                    "prompt": params_mapping.get("prompt", ""),
                    "model": "gemini-2.5-flash",
                    "extra_instructions": ""
                }
            }
        else:
            node_type = "composio_app"
            extra_data = {
                "description": step.get("step_description", ""),
                "fields": fields,
                "tool_name": tool_name,
                "composio_config": {
                    "action_slug": tool_name,
                    "params_mapping": params_mapping
                }
            }

        nodes.append(
            _make_node(
                node_id=node_id,
                node_type=node_type,
                label=tool_name,
                position_y=i * Y_SPACING,
                extra_data=extra_data,
            )
        )

        # ── Edge from previous node ───────────────────────────────────────
        if i > 0:
            source = f"step_{i}"
            edges.append(_make_edge(source, node_id))

    return {"nodes": nodes, "edges": edges}
