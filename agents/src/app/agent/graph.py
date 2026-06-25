"""
Workflow Designer Agent — LangGraph StateGraph
Adapted from R:\\python\\ai_flow\\workflows\\agent.py

Uses Composio meta-tools to discover tool schemas, then calls set_workflow()
to build a workflow structure. The verifier validates it, and on success the
workflow is converted to React Flow {nodes, edges} via workflow_to_reactflow().
"""

from __future__ import annotations

import os
import re
import sys

# Force stdout/stderr to use UTF-8 encoding on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from typing import Any

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from src.app.schema.agent_schema import WorkflowState, WorkflowStructure
from src.utils.reactflow import workflow_to_reactflow

# Load .env from agents root
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # agents/
load_dotenv(_ROOT / ".env", override=True)


# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a Workflow Designer Agent.

Your job is to:
1. Help the user understand what workflow they want to build.
2. Use COMPOSIO_SEARCH_TOOLS to find the right tool actions for each step.
3. Use COMPOSIO_GET_TOOL_SCHEMAS to get the parameter names and types for each action.
4. Call set_workflow() with all the steps and their fields — so the user can fill in the form and click Run.

## STEP-BY-STEP PROCESS (follow this every time):

STEP 1: Use COMPOSIO_SEARCH_TOOLS to find the right tool action for each step.
  - Example: search "send email via gmail" to find GMAIL_SEND_EMAIL
  - Example: search "post message to slack channel" to find SLACK_SEND_MESSAGE
  
STEP 2: Use COMPOSIO_GET_TOOL_SCHEMAS to get the parameter list of each found action.
  - Pass the exact tool_slug you found in Step 1.

STEP 3: Call set_workflow() with the workflow name, description, and all steps.
  - Each step MUST include: tool_name, step_description, and fields.
  - fields MUST list ONLY the important/essential parameters required to run the action (e.g. 'recipient_email', 'subject', and 'body' for Gmail; 'channel' and 'markdown_text' for Slack).
  - EXCLUDE all highly technical, secondary optional fields (such as 'cc', 'bcc', 'attachment', 'unfurl_links', 'unfurl_media', 'reply_broadcast', 'thread_ts', 'extra_recipients', etc.) unless the user explicitly requested them in their message. This keeps the user form clean and simple.

## AI PROCESSING NODES:
You also have access to 4 AI processing node types. Use these ONLY when the user
explicitly asks for research, summarization, extraction, or classification in their
prompt. Do NOT add AI nodes unless the user's request specifically requires them.

  - AI_SUMMARIZE  → Condenses text into a concise summary.
    Fields: input_text (string), max_length (integer, optional)
  - AI_EXTRACT    → Pulls structured data / key entities from text.
    Fields: input_text (string), extract_format (string, e.g. "json", "list")
  - AI_CLASSIFY   → Categorizes / labels input into predefined categories.
    Fields: input_text (string), categories (string, comma-separated list)
  - AI_RESEARCH   → Deep-dive research on a topic, returns comprehensive findings.
    Fields: topic (string), depth (string, "brief" or "detailed")

When using AI nodes:
  - Set tool_name to one of: AI_SUMMARIZE, AI_EXTRACT, AI_CLASSIFY, AI_RESEARCH
  - Use {{step_N}} placeholders to chain AI output into subsequent steps.
  - AI nodes follow the same schema rules as Composio tool steps.

## CRITICAL RULES:
- You are a DESIGNER only. You do NOT have tools to execute actions. If the user asks you to run, execute, or test the workflow in the chat, explain that you are a designer and instruct them to click the "Run Workflow" button in the right-side panel.
- To pass the output of a previous step to a subsequent step, use the placeholder `{{step_N}}` where N is the 1-based index of the step (e.g., `{{step_1}}` for the output of Step 1, or `{{step_1.some_key}}` for a nested key if known).
- For example, if Step 1 is `LINKEDIN_GET_MY_INFO` and Step 2 is `GMAIL_SEND_EMAIL`, you must pre-fill the `body` field of the Gmail step with a value like: "Here is my LinkedIn profile info: {{step_1}}"
- Always populate "value" in fields when you can infer it from the user's message (or when it references a previous step using `{{step_N}}`).
- Leave "value" as "" for fields the user must fill in (e.g. recipient email, API keys).
- After calling set_workflow, tell the user to review the fields on the right panel and click "Run Workflow".
"""


# ─── LLM config ──────────────────────────────────────────────────────────────

def get_llm() -> ChatOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    return ChatOpenAI(model="gpt-4.1-mini", temperature=0.1, api_key=api_key)


# ─── Custom Agent compilation with custom StateGraph ────────────────────────

def compile_workflow_agent(session, workflow_holder: dict):
    """
    Build custom LangGraph StateGraph with Agent and Verifier nodes.
    Checks the workflow generated by LLM for semantic and structural validity.

    Args:
        session: Composio session providing meta-tools via session.tools()
        workflow_holder: Mutable dict to stage/commit the workflow into.
    """
    # Load all allowed Composio meta-tools
    composio_tools = list(session.tools())
    print(f"\n[compile_workflow_agent] Composio meta-tools loaded: {[t.name for t in composio_tools]}", flush=True)

    # Filter out execution tools so the designer cannot run them directly in chat
    allowed_tools = [t for t in composio_tools if t.name != "COMPOSIO_MULTI_EXECUTE_TOOL"]

    # ── set_workflow tool ─────────────────────────────────────────────────
    @tool
    def set_workflow(name: str, description: str, steps: list[dict]) -> str:
        """
        Build or update the visual workflow on the right-side panel.
        Call this AFTER using COMPOSIO_GET_TOOL_SCHEMAS to get exact param names.

        Args:
            name: Short workflow title shown to the user.
            description: One-sentence summary of what this workflow does.
            steps: List of step dicts. Each must have:
              - tool_name: Exact action slug (e.g. 'GMAIL_SEND_EMAIL', 'SLACK_SEND_MESSAGE')
                           or AI operation (e.g. 'AI_SUMMARIZE', 'AI_RESEARCH')
              - step_description: Friendly explanation of this step
              - fields: List of parameter dicts. Each must have:
                  - name: Exact parameter name from COMPOSIO_GET_TOOL_SCHEMAS
                  - type: 'string', 'boolean', 'integer', or 'number'
                  - description: What this parameter does
                  - value: Pre-filled value if known from user's message, else empty string ""
        """
        field_count = sum(len(s.get("fields", [])) for s in steps)
        print(f"\n[set_workflow called] name='{name}' steps={len(steps)} total_fields={field_count}", flush=True)

        # ── Console the full structure so you can inspect params ──────────
        import json
        print("\n" + "=" * 60, flush=True)
        print(f"  WORKFLOW: {name}", flush=True)
        print(f"  DESC:     {description}", flush=True)
        print("=" * 60, flush=True)
        for i, step in enumerate(steps, 1):
            print(f"  Step {i}: {step.get('tool_name')} — {step.get('step_description')}", flush=True)
            for field in step.get("fields", []):
                print(f"    • {field.get('name')} ({field.get('type')}) = {field.get('value')!r}  # {field.get('description')}", flush=True)
        print("=" * 60 + "\n", flush=True)

        # Stage the proposed workflow for the verifier to validate
        workflow_holder["proposed"] = {
            "name": name,
            "description": description,
            "steps": steps,
        }
        return f"Workflow '{name}' submitted for validation with {len(steps)} steps."

    # ── Tool list ─────────────────────────────────────────────────────────
    tools = allowed_tools + [set_workflow]
    tool_node = ToolNode(tools)

    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)

    # ── Agent Node ────────────────────────────────────────────────────────
    def agent_node(state: WorkflowState):
        messages = state["messages"]
        system_msg = SystemMessage(content=SYSTEM_PROMPT)
        prompt_msgs = [system_msg] + messages

        # Append validation error guidance if present
        err = state.get("validation_error")
        if err:
            print(f"[agent_node] validation_error found in state: '{err}'", flush=True)
            prompt_msgs.append(
                SystemMessage(
                    content=(
                        f"CRITICAL VERIFICATION ERROR: {err}\n"
                        "The workflow you submitted is invalid. You MUST fix the issues "
                        "(e.g., incorrect step placeholder indices, missing fields, or out-of-order steps) "
                        "and call set_workflow again with the corrected steps."
                    )
                )
            )
        else:
            print("[agent_node] Running agent without validation errors.", flush=True)

        response = llm_with_tools.invoke(prompt_msgs)
        return {"messages": [response]}

    # ── Verifier Node ─────────────────────────────────────────────────────
    def verifier_node(state: WorkflowState):
        proposed = workflow_holder.get("proposed")
        if not proposed:
            print("[verifier_node] No proposed workflow staged. Skipping validation.", flush=True)
            return {"is_valid": True, "validation_error": ""}

        print(f"[verifier_node] Validating proposed workflow '{proposed.get('name')}'...", flush=True)

        # Phase 1: Validate against Pydantic schema structure
        try:
            struct = WorkflowStructure.model_validate(proposed)
            print("[verifier_node] Pydantic schema structure check passed.", flush=True)
        except Exception as e:
            error_msg = f"Structure validation failed: {str(e)}"
            print(f"[verifier_node] Pydantic check FAILED: {error_msg}", flush=True)
            workflow_holder.pop("proposed", None)
            feedback_msg = SystemMessage(
                content=f"[Verifier Warning] Workflow structure validation failed: {error_msg}. Please fix schemas and try again."
            )
            return {
                "is_valid": False,
                "validation_error": error_msg,
                "messages": [feedback_msg]
            }

        # Phase 2: Validate step placeholder references (cannot reference current or future steps)
        for idx, step in enumerate(struct.steps):
            for field in step.fields:
                if field.value is not None:
                    val_str = str(field.value)
                    # Find placeholders like {{step_N}} or {{step_N.nested_key}}
                    placeholders = re.findall(r"\{\{\s*step_(\d+)(?:\.[a-zA-Z0-9_\-\.]+)?\s*\}\}", val_str)
                    for p in placeholders:
                        ref_idx = int(p)
                        if ref_idx < 1:
                            error_msg = f"Step {idx+1} ({step.tool_name}), Field '{field.name}' references Step {ref_idx}, which is invalid (index must be >= 1)."
                            print(f"[verifier_node] Placeholder check FAILED: {error_msg}", flush=True)
                            workflow_holder.pop("proposed", None)
                            return {
                                "is_valid": False,
                                "validation_error": error_msg,
                                "messages": [SystemMessage(content=f"[Verifier Warning] {error_msg}")]
                            }
                        if ref_idx >= idx + 1:
                            error_msg = (
                                f"Step {idx+1} ({step.tool_name}), Field '{field.name}' references Step {ref_idx}, "
                                f"which is a future or current step. You can only reference completed steps prior to Step {idx+1} (i.e. Steps 1 to {idx})."
                            )
                            print(f"[verifier_node] Placeholder check FAILED: {error_msg}", flush=True)
                            workflow_holder.pop("proposed", None)
                            return {
                                "is_valid": False,
                                "validation_error": error_msg,
                                "messages": [SystemMessage(content=f"[Verifier Warning] {error_msg}")]
                            }

        # Phase 3: Success — commit workflow and convert to React Flow format
        print(f"[verifier_node] Validation SUCCESS. Committing workflow '{proposed['name']}' to active state.", flush=True)
        workflow_holder["name"] = proposed["name"]
        workflow_holder["description"] = proposed["description"]
        workflow_holder["steps"] = proposed["steps"]
        workflow_holder.pop("proposed", None)

        # Convert to React Flow nodes/edges for the frontend canvas
        reactflow_data = workflow_to_reactflow(proposed)
        workflow_holder["reactflow"] = reactflow_data

        feedback_msg = SystemMessage(
            content=f"[Verifier Success] Workflow '{proposed['name']}' verified and registered successfully."
        )
        return {
            "is_valid": True,
            "validation_error": "",
            "workflow": {**proposed, **reactflow_data},
            "messages": [feedback_msg]
        }

    # ── Conditional Routing from Agent ────────────────────────────────────
    def should_continue(state: WorkflowState):
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            print(f"[should_continue] Routing to tools. Calls: {[tc['name'] for tc in last_message.tool_calls]}", flush=True)
            return "tools"
        print("[should_continue] No tool calls. Routing to END.", flush=True)
        return END

    # ── Graph Setup ───────────────────────────────────────────────────────
    wf = StateGraph(WorkflowState)
    wf.add_node("agent", agent_node)
    wf.add_node("tools", tool_node)
    wf.add_node("verifier", verifier_node)

    wf.set_entry_point("agent")

    wf.add_conditional_edges("agent", should_continue, ["tools", END])
    wf.add_edge("tools", "verifier")
    wf.add_edge("verifier", "agent")

    return wf.compile()


# ─── Streaming execution ──────────────────────────────────────────────────────

def chat_messages_to_lc(messages: list[dict]) -> list[BaseMessage]:
    """Convert frontend {role, content} dicts to LangChain message objects."""
    result: list[BaseMessage] = []
    for msg in messages:
        if msg.get("role") == "user":
            result.append(HumanMessage(content=msg["content"]))
        else:
            result.append(AIMessage(content=msg["content"]))
    return result


def run_workflow_agent_stream(
    session,
    chat_history: list[dict],
    thread_id: str,
    workflow_holder: dict,
):
    """
    Stream the agent execution, yielding SSE-compatible event dicts.

    Yields dicts with "type" key:
      - thought      → agent thinking / text content
      - tool_call    → agent calling a tool
      - tool_output  → tool returned a result
      - workflow     → verifier approved, contains {nodes, edges} for React Flow
      - final_answer → last text response from agent
    """
    agent = compile_workflow_agent(session, workflow_holder)
    lc_messages = chat_messages_to_lc(chat_history)
    config = {"configurable": {"thread_id": thread_id}}

    print(f"\n[run_workflow_agent_stream] Starting agent run for thread_id={thread_id}", flush=True)
    final_text = ""
    for chunk in agent.stream({"messages": lc_messages}, config=config, stream_mode="updates"):
        if "agent" in chunk:
            for msg in chunk["agent"].get("messages", []):
                content = getattr(msg, "content", None)
                if isinstance(content, str) and content.strip():
                    final_text = content.strip()
                    yield {"type": "thought", "content": final_text}

                for tc in getattr(msg, "tool_calls", []):
                    yield {
                        "type": "tool_call",
                        "name": tc.get("name", "unknown"),
                        "args": tc.get("args", {}),
                    }

        elif "tools" in chunk:
            for msg in chunk["tools"].get("messages", []):
                yield {
                    "type": "tool_output",
                    "name": getattr(msg, "name", "unknown"),
                    "content": str(getattr(msg, "content", "") or ""),
                }

        elif "verifier" in chunk:
            node_data = chunk["verifier"]
            # Yield verifier thoughts/warnings to the chat
            for msg in node_data.get("messages", []):
                content = getattr(msg, "content", None)
                if isinstance(content, str) and content.strip():
                    yield {"type": "thought", "content": content}

            # If verifier approved, yield the React Flow data for the canvas
            if node_data.get("is_valid") and node_data.get("workflow"):
                wf = node_data["workflow"]
                if "nodes" in wf and "edges" in wf:
                    yield {
                        "type": "workflow",
                        "nodes": wf["nodes"],
                        "edges": wf["edges"],
                    }

    print("[run_workflow_agent_stream] Stream complete.", flush=True)
    yield {"type": "final_answer", "content": final_text or "Done."}
