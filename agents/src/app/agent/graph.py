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
from typing import Any

# Force stdout/stderr to use UTF-8 encoding on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from src.app.schema.agent_schema import WorkflowState, WorkflowStructure
from src.utils.reactflow import workflow_to_reactflow, consolidate_steps

# Load .env from agents root
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # agents/
load_dotenv(_ROOT / ".env", override=True)


# ─── System Prompts ───────────────────────────────────────────────────────────

DESIGNER_PROMPT = """You are a Workflow Designer Agent.

Your job is to design a draft workflow based on the user's requirements.

## CRITICAL — CONNECTIONS ARE ALREADY ESTABLISHED:
- NEVER use COMPOSIO_MANAGE_CONNECTIONS.
- NEVER ask the user to connect, authenticate, or authorize any app.
- ASSUME all required apps are connected. Just design the workflow immediately.
- Do NOT ask for user confirmation or connections. Proceed directly to tool searching and calling `draft_workflow`.

## CRITICAL — GENERAL RESEARCH / SEARCH:
- For general information gathering, research, web search, or finding articles/news, you MUST use the built-in `AI_RESEARCH` node.
- NEVER search for or use external apps (like Reddit, Google Search, Tavily, YouTube, etc.) for general research or searching, unless the user explicitly requested that app by name (e.g., "Search Reddit...").
- Ignore any tool suggestions or plans from search tools that suggest using external search or social media apps for general research. Use `AI_RESEARCH` instead.

## PROCESS:
1. Select the necessary steps to achieve the goal (either integration actions or AI processing nodes).
2. If you need to search for tool names or inspect schemas, you may use COMPOSIO_SEARCH_TOOLS and COMPOSIO_GET_TOOL_SCHEMAS.
3. Once you have designed the sequence of steps, call the `draft_workflow` tool to stage your draft workflow.

## AI PROCESSING NODES:
Use these ONLY for text processing like research, summarization, extraction, or classification. Do NOT use them for integration steps (such as writing documents, sending emails, or messaging).
- AI_SUMMARIZE → Summarizes text or prior step output
- AI_EXTRACT   → Extracts structured data or entities
- AI_CLASSIFY  → Classifies input into categories
- AI_RESEARCH  → Researches a topic and returns findings

Each AI node must have exactly ONE field:
- name: "prompt"
- type: "string"
- description: "Instructions for the AI"
- value: Pre-filled instructions, referencing prior steps with {{step_N}} if needed.

## INTEGRATION ACTIONS:
For apps like Gmail, Slack, Google Drive, Google Docs, Notion, Jira, GitHub, etc.
- You can draft actions with their names (e.g. `GMAIL_SEND_EMAIL`, `SLACK_SEND_MESSAGE`).
- For Google Docs, use `GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN` or `GOOGLEDOCS_CREATE_DOCUMENT` (do NOT use Google Drive tools to create docs).
- Exclude unnecessary optional/technical parameters to keep it simple. Only include core inputs (e.g. recipient_email, subject, body).

## STEP CHAINING:
- Pass outputs between steps using `{{step_N}}` (or `{{step_N.some_field}}` if applicable), where N is the 1-based step index.
- Ensure that each step's value uses these placeholders to pass data downstream.

After you call `draft_workflow`, the Verifier Agent will audit your draft, check actual Composio APIs to verify the tool slugs and parameters, correct any errors, and produce the final workflow.
"""


VERIFIER_PROMPT = """You are a Workflow Verifier and Corrector Agent.

Your job is to audit and correct the draft workflow staged by the Designer Agent, and then finalize it.

## CRITICAL — CONNECTIONS ARE ALREADY ESTABLISHED:
- NEVER use COMPOSIO_MANAGE_CONNECTIONS.
- NEVER ask the user to connect, authenticate, or authorize any app.
- ASSUME all required apps are connected. Just audit and finalize the workflow.

## CRITICAL — GENERAL RESEARCH / SEARCH:
- General research, web searches, news finding, or general information gathering MUST use the built-in `AI_RESEARCH` node.
- If the Designer used an external tool (like Reddit, Google Search, Tavily, YouTube, etc.) for generic research/search, you MUST replace it with `AI_RESEARCH` (unless the user explicitly asked for that specific app by name).
- Ignore any tool recommendations from Composio search tools that advise using external apps for general research. Correct them to `AI_RESEARCH`.

## DRAFT TO AUDIT:
{proposed_draft}

## AUDIT CHECKLIST:
1. **Composio API Verification**:
   - For every integration step (Gmail, Slack, Drive, Google Docs, etc.):
     - You MUST call COMPOSIO_SEARCH_TOOLS to find the exact action slug.
     - You MUST call COMPOSIO_GET_TOOL_SCHEMAS using the tool_slug to get the exact parameter names.
     - Correct any hallucinated or wrong tool slugs (e.g., if the designer used `GOOGLEDRIVE_CREATE_GOOGLE_DOC`, correct it to `GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN`).
     - Correct the parameter names in fields to match the real schema (e.g. 'recipient_email', 'subject', 'body').
2. **AI Nodes Verification**:
   - Ensure they are named `AI_RESEARCH`, `AI_SUMMARIZE`, `AI_EXTRACT`, or `AI_CLASSIFY`.
   - AI nodes must have exactly ONE field: name="prompt", type="string", description="Instructions for the AI", value="...".
   - If they have other fields, delete/merge them into the prompt.
3. **Step Chaining Connection**:
   - Ensure that steps are connected logically by referencing previous outputs using `{{step_N}}` (e.g., Step 2 references Step 1 as `{{step_1}}`).
   - Double-check that Step N only references previous steps (index must be between 1 and N-1).
4. **Finalize**:
   - Once all steps are corrected and verified, call the `finalize_workflow` tool with the final workflow name, description, and steps.
   - If `finalize_workflow` returns a validation error, read it, fix the problem, and call it again.

## CRITICAL RULES:
- Exclude optional, highly technical parameters to keep the user form simple. Include only important fields (e.g., recipient_email, subject, body for email).
"""


# ─── LLM config ──────────────────────────────────────────────────────────────

def get_llm() -> ChatOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    return ChatOpenAI(model="gpt-5.1", temperature=0.1, api_key=api_key)


# ─── Programmatic Validation Helper ──────────────────────────────────────────

def validate_and_commit_workflow(proposed: dict, workflow_holder: dict) -> tuple[bool, str]:
    # Phase 1: Validate against Pydantic schema structure
    try:
        from src.app.schema.agent_schema import WorkflowStructure
        struct = WorkflowStructure.model_validate(proposed)
        print("[validate_and_commit_workflow] Pydantic schema structure check passed.", flush=True)
    except Exception as e:
        error_msg = f"[Verifier Warning] Structure validation failed: {str(e)}"
        print(f"[validate_and_commit_workflow] Pydantic check FAILED: {error_msg}", flush=True)
        return False, error_msg

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
                        error_msg = f"[Verifier Warning] Step {idx+1} ({step.tool_name}), Field '{field.name}' references Step {ref_idx}, which is invalid (index must be >= 1)."
                        print(f"[validate_and_commit_workflow] Placeholder check FAILED: {error_msg}", flush=True)
                        return False, error_msg
                    if ref_idx >= idx + 1:
                        error_msg = (
                            f"[Verifier Warning] Step {idx+1} ({step.tool_name}), Field '{field.name}' references Step {ref_idx}, "
                            f"which is a future or current step. You can only reference completed steps prior to Step {idx+1} (i.e. Steps 1 to {idx})."
                        )
                        print(f"[validate_and_commit_workflow] Placeholder check FAILED: {error_msg}", flush=True)
                        return False, error_msg

    # Phase 3: Success — commit workflow and convert to React Flow format
    print(f"[validate_and_commit_workflow] Validation SUCCESS. Committing workflow '{proposed['name']}' to active state.", flush=True)
    workflow_holder["name"] = proposed["name"]
    workflow_holder["description"] = proposed["description"]
    workflow_holder["steps"] = proposed["steps"]

    # Convert to React Flow nodes/edges for the frontend canvas
    reactflow_data = workflow_to_reactflow(proposed)
    workflow_holder["reactflow"] = reactflow_data
    
    return True, f"[Verifier Success] Workflow '{proposed['name']}' verified and registered successfully."


# ─── Custom Agent compilation with custom StateGraph ────────────────────────

def compile_workflow_agent(session, workflow_holder: dict):
    """
    Build custom LangGraph StateGraph with Designer and Verifier/Corrector agents.
    """
    # Load all allowed Composio meta-tools
    composio_tools = list(session.tools())
    print(f"\n[compile_workflow_agent] Composio meta-tools loaded: {[t.name for t in composio_tools]}", flush=True)

    # Filter out tools the designer LLM must never call
    BLOCKED_TOOLS = {"COMPOSIO_MULTI_EXECUTE_TOOL", "COMPOSIO_MANAGE_CONNECTIONS"}
    allowed_tools = [t for t in composio_tools if t.name not in BLOCKED_TOOLS]

    # ── draft_workflow tool ─────────────────────────────────────────────────
    @tool
    def draft_workflow(name: str, description: str, steps: list[dict]) -> str:
        """
        Stage the proposed draft workflow. This will trigger the Verifier Agent to audit, verify, and finalize it.

        Args:
            name: Short workflow title shown to the user.
            description: One-sentence summary of what this workflow does.
            steps: List of proposed step dicts. Each must have:
              - tool_name: Proposed action slug or AI operation
              - step_description: Friendly explanation of this step
              - fields: List of parameter dicts (name, type, description, value)
        """
        steps = consolidate_steps(steps)
        workflow_holder["proposed"] = {
            "name": name,
            "description": description,
            "steps": steps,
        }
        return f"Workflow draft '{name}' staged with {len(steps)} steps. Triggering Verifier Agent to audit and verify details."

    # ── finalize_workflow tool ──────────────────────────────────────────────
    @tool
    def finalize_workflow(name: str, description: str, steps: list[dict]) -> str:
        """
        Commit the audited and verified workflow. Call this ONLY after verifying all tool names, parameters, and step chaining.

        Args:
            name: Final workflow title.
            description: One-sentence summary.
            steps: List of audited and corrected step dicts. Each must have:
              - tool_name: Exact action slug or AI operation
              - step_description: Friendly explanation of this step
              - fields: List of parameter dicts (name, type, description, value)
        """
        steps = consolidate_steps(steps)
        proposed = {
            "name": name,
            "description": description,
            "steps": steps,
        }
        
        success, err_or_msg = validate_and_commit_workflow(proposed, workflow_holder)
        if not success:
            workflow_holder["is_valid"] = False
            workflow_holder["validation_error"] = err_or_msg
            return f"Validation failed: {err_or_msg}"
            
        workflow_holder["is_valid"] = True
        workflow_holder["validation_error"] = ""
        return err_or_msg

    # ── Tool list ─────────────────────────────────────────────────────────
    tools = allowed_tools + [draft_workflow, finalize_workflow]
    tool_node = ToolNode(tools)

    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)

    # ── Agent Node (Designer) ─────────────────────────────────────────────
    def agent_node(state: WorkflowState):
        messages = state["messages"]
        system_msg = SystemMessage(content=DESIGNER_PROMPT)
        prompt_msgs = [system_msg] + messages

        response = llm_with_tools.invoke(prompt_msgs)
        return {"messages": [response]}

    # ── Verifier Agent Node (Auditor/Corrector) ───────────────────────────
    def verifier_agent_node(state: WorkflowState):
        messages = state["messages"]
        proposed = workflow_holder.get("proposed", {})
        
        # Format the draft nicely for the verifier
        import json
        draft_str = json.dumps(proposed, indent=2)
        
        sys_msg = SystemMessage(content=VERIFIER_PROMPT.format(proposed_draft=draft_str))
        prompt_msgs = [sys_msg] + messages

        # Append validation error guidance if present
        err = state.get("validation_error")
        if err:
            print(f"[verifier_agent_node] validation_error found in state: '{err}'", flush=True)
            prompt_msgs.append(
                HumanMessage(
                    content=(
                        f"CRITICAL VERIFICATION ERROR: {err}\n"
                        "The workflow you submitted is invalid. You MUST fix the issues "
                        "(e.g., incorrect step placeholder indices, missing fields, or out-of-order steps) "
                        "and call finalize_workflow again with the corrected steps."
                    )
                )
            )

        response = llm_with_tools.invoke(prompt_msgs)
        return {"messages": [response]}

    # ── Conditional Routing ────────────────────────────────────────────────
    def should_continue_designer(state: WorkflowState):
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            print(f"[should_continue_designer] Routing to tools. Calls: {[tc['name'] for tc in last_message.tool_calls]}", flush=True)
            return "tools"
        if workflow_holder.get("proposed"):
            print("[should_continue_designer] Draft staged. Routing to verifier_agent.", flush=True)
            return "verifier_agent"
        print("[should_continue_designer] No tool calls or draft. Routing to END.", flush=True)
        return END

    def should_continue_verifier(state: WorkflowState):
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            print(f"[should_continue_verifier] Routing to tools. Calls: {[tc['name'] for tc in last_message.tool_calls]}", flush=True)
            return "tools"
        # If the verifier has run but didn't call tools, route to END
        print("[should_continue_verifier] Routing to END.", flush=True)
        return END

    def should_continue_from_tools(state: WorkflowState):
        messages = state["messages"]
        # Traverse backward to find the last AIMessage with tool calls
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.tool_calls:
                for tc in msg.tool_calls:
                    name = tc.get("name")
                    if name == "draft_workflow":
                        print("[should_continue_from_tools] draft_workflow called. Routing to verifier_agent.", flush=True)
                        return "verifier_agent"
                    elif name == "finalize_workflow":
                        if workflow_holder.get("is_valid"):
                            print("[should_continue_from_tools] finalize_workflow SUCCESS. Routing to END.", flush=True)
                            return END
                        else:
                            print("[should_continue_from_tools] finalize_workflow FAILED. Routing to verifier_agent.", flush=True)
                            return "verifier_agent"
                break
        
        # Fallback for search / schema tools
        if workflow_holder.get("proposed"):
            print("[should_continue_from_tools] Staged workflow found. Routing back to verifier_agent.", flush=True)
            return "verifier_agent"
        print("[should_continue_from_tools] No staged workflow. Routing back to agent.", flush=True)
        return "agent"

    # ── Graph Setup ───────────────────────────────────────────────────────
    wf = StateGraph(WorkflowState)
    wf.add_node("agent", agent_node)
    wf.add_node("verifier_agent", verifier_agent_node)
    wf.add_node("tools", tool_node)

    wf.set_entry_point("agent")

    wf.add_conditional_edges("agent", should_continue_designer, ["tools", "verifier_agent", END])
    wf.add_conditional_edges("verifier_agent", should_continue_verifier, ["tools", END])
    wf.add_conditional_edges("tools", should_continue_from_tools, ["agent", "verifier_agent", END])

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
    yield {"type": "trace", "content": f"[run_workflow_agent_stream] Starting agent run for thread_id={thread_id}"}
    yield {"type": "trace", "content": "[compile_workflow_agent] Loading Composio meta-tools..."}
    
    # Initialize/reset active keys in workflow_holder
    workflow_holder.clear()
    workflow_holder["is_valid"] = False

    agent = compile_workflow_agent(session, workflow_holder)
    tool_names = [t.name for t in session.tools()]
    yield {"type": "trace", "content": f"[compile_workflow_agent] Composio meta-tools loaded: {tool_names}"}

    lc_messages = chat_messages_to_lc(chat_history)
    config = {"configurable": {"thread_id": thread_id}}

    print(f"\n[run_workflow_agent_stream] Starting agent run for thread_id={thread_id}", flush=True)
    final_text = ""
    for chunk in agent.stream({"messages": lc_messages}, config=config, stream_mode="updates"):
        if "agent" in chunk:
            yield {"type": "trace", "content": "[agent_node] Running Designer Agent..."}
            for msg in chunk["agent"].get("messages", []):
                content = getattr(msg, "content", None)
                if isinstance(content, str) and content.strip():
                    final_text = content.strip()
                    yield {"type": "thought", "content": final_text}

                for tc in getattr(msg, "tool_calls", []):
                    tool_name = tc.get("name", "unknown")
                    yield {"type": "trace", "content": f"[agent_node] Designer called tool: '{tool_name}'"}
                    yield {
                        "type": "tool_call",
                        "name": tool_name,
                        "args": tc.get("args", {}),
                    }

        elif "verifier_agent" in chunk:
            yield {"type": "trace", "content": "[verifier_agent_node] Running Verifier/Corrector Agent..."}
            for msg in chunk["verifier_agent"].get("messages", []):
                content = getattr(msg, "content", None)
                if isinstance(content, str) and content.strip():
                    yield {"type": "thought", "content": content.strip()}

                for tc in getattr(msg, "tool_calls", []):
                    tool_name = tc.get("name", "unknown")
                    yield {"type": "trace", "content": f"[verifier_agent] Verifier called tool: '{tool_name}'"}
                    yield {
                        "type": "tool_call",
                        "name": tool_name,
                        "args": tc.get("args", {}),
                    }

        elif "tools" in chunk:
            for msg in chunk["tools"].get("messages", []):
                tool_name = getattr(msg, "name", "unknown")
                tool_content = str(getattr(msg, "content", "") or "")
                
                if tool_name == "draft_workflow":
                    proposed = workflow_holder.get("proposed", {})
                    name = proposed.get("name", "unknown")
                    steps_count = len(proposed.get("steps", []))
                    yield {"type": "trace", "content": f"[draft_workflow] Staged draft workflow '{name}' ({steps_count} steps)."}
                elif tool_name == "finalize_workflow":
                    if workflow_holder.get("is_valid"):
                        reactflow_data = workflow_holder.get("reactflow", {})
                        yield {"type": "trace", "content": f"[finalize_workflow] Validation SUCCESS. Committing workflow to active state."}
                        if "nodes" in reactflow_data and "edges" in reactflow_data:
                            yield {
                                "type": "workflow",
                                "nodes": reactflow_data["nodes"],
                                "edges": reactflow_data["edges"],
                            }
                    else:
                        err_msg = workflow_holder.get("validation_error", "Unknown validation error.")
                        yield {"type": "trace", "content": f"[finalize_workflow] Validation FAILED: {err_msg}"}
                else:
                    yield {"type": "trace", "content": f"[tools_node] Tool '{tool_name}' executed successfully."}

                yield {
                    "type": "tool_output",
                    "name": tool_name,
                    "content": tool_content,
                }

    print("[run_workflow_agent_stream] Stream complete.", flush=True)
    yield {"type": "final_answer", "content": final_text or "Done."}
