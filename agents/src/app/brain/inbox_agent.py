"""
Inbox Sub-Agent — simple LangGraph ReAct loop scoped to Gmail, Slack, and Calendar.

Uses Composio meta-tools to search, inspect schemas, and execute multiple 
actions dynamically via COMPOSIO_MULTI_EXECUTE_TOOL.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from composio import Composio
from composio_langchain import LangchainProvider
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from src.config import settings

# Scope limited only to Gmail, Slack, and Google Calendar
INBOX_TOOLKITS = ["gmail", "slack", "googlecalendar"]

INBOX_SYSTEM_PROMPT = """You are a specialized Inbox Sub-Agent. Your task is to fetch data from the user's workspace for ONLY three platforms:
1. Gmail (gmail)
2. Slack (slack)
3. Google Calendar (googlecalendar)

Under no circumstances are you allowed to fetch data, search for, or execute actions for any other integrations (e.g., Jira, Notion, GitHub, etc.).

IMPORTANT: Today's date is {current_date}.
CRITICAL: When retrieving calendar events, you MUST set the start time filter parameter (e.g., `timeMin` parameter) to today's date/time ({current_date}) so that you do not retrieve or list past events. Do not summarize or show any events that occurred before today ({current_date}).

When the supervisor agent gives you an instruction:
1. Use COMPOSIO_SEARCH_TOOLS to locate the exact action slugs needed.
   - Example search: "list emails" or "get recent messages" for Gmail.
   - Example search: "list channels" or "read history" for Slack.
   - Example search: "list upcoming events" for Google Calendar.
2. Use COMPOSIO_GET_TOOL_SCHEMAS to inspect the parameters and schema requirements for the tool slugs you found.
3. For Slack:
   - Make sure you search for or list channels to find the correct channel ID if a channel name is requested.
   - Always use the valid channel ID/name in your execution payload.
4. Call COMPOSIO_MULTI_EXECUTE_TOOL to execute the actions.
   - You can batch and execute actions across different tools in one go (e.g. Gmail list + Calendar list).
   - Carefully fill in the parameters matching the schema you retrieved.
5. Summarize the tool outputs into a clean, structured, and factual summary. Do not invent details or email/calendar entries. Return only this summary so the supervisor can present it to the user.
6. CRITICAL - TOKEN LIMIT PRESERVATION:
   - When listing emails using GMAIL_FETCH_EMAILS: ALWAYS set `verbose=false`, `include_payload=false`, and `max_results` to a small number (e.g., 5 or 10 max). This retrieves lightweight metadata only. NEVER request full HTML bodies or payloads in bulk.
   - When listing calendar events using GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS: ALWAYS set `response_detail="minimal"` and restrict `max_results_per_calendar` to a small number (e.g., 5 or 10).
   - This prevents Organization TPM limit / Rate Limit exceeded errors on OpenAI.
"""

# ─── Composio client + session ────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_composio() -> Composio:
    api_key = settings.composio_api_key or os.getenv("COMPOSIO_API_KEY")
    if api_key:
        return Composio(api_key=api_key, provider=LangchainProvider())
    return Composio(provider=LangchainProvider())


def create_inbox_session(user_id: str):
    """Per-user Composio session scoped only to Gmail, Slack, and Google Calendar."""
    return get_composio().create(
        user_id=user_id,
        toolkits=INBOX_TOOLKITS,
        manage_connections={"enable": True},
        workbench={"enable": False},
    )


# ─── LangGraph agent compilation ──────────────────────────────────────────────

def get_llm() -> ChatOpenAI:
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    return ChatOpenAI(
        model="gpt-4.1-nano",
        temperature=0.1,
        api_key=api_key,
    )


def compile_inbox_agent(session, current_date: str = ""):
    """
    Build a LangGraph ReAct agent that only has access to Composio's meta-tools:
    - COMPOSIO_SEARCH_TOOLS
    - COMPOSIO_GET_TOOL_SCHEMAS
    - COMPOSIO_MULTI_EXECUTE_TOOL
    """
    all_tools = session.tools()
    
    # Filter tools to ONLY contain the meta-tools for discovery and execution
    meta_tools = [
        t for t in all_tools
        if t.name in ["COMPOSIO_SEARCH_TOOLS", "COMPOSIO_GET_TOOL_SCHEMAS", "COMPOSIO_MULTI_EXECUTE_TOOL"]
    ]
    
    llm = get_llm()
    prompt = INBOX_SYSTEM_PROMPT.format(current_date=current_date)
    return create_react_agent(
        model=llm,
        tools=meta_tools,
        prompt=prompt,
    )


# ─── Execution Interface ──────────────────────────────────────────────────────

async def run_inbox_agent(
    session,
    instruction: str,
    thread_id: str = "inbox_agent_thread",
    on_step_callback = None,
) -> str:
    """
    Runs the sub-agent with the supervisor's instruction and returns the final answer.
    """
    import datetime
    current_date = datetime.datetime.now().strftime("%B %d, %Y")
    agent = compile_inbox_agent(session, current_date=current_date)
    lc_messages = [HumanMessage(content=instruction)]
    config = {"configurable": {"thread_id": thread_id}}

    last_chunk = None
    
    # Stream using agent.astream to track step progress
    async for chunk in agent.astream({"messages": lc_messages}, config=config, stream_mode="updates"):
        last_chunk = chunk
        if on_step_callback:
            for node_name, node_output in chunk.items():
                if "messages" in node_output:
                    for msg in node_output["messages"]:
                        # 1. Handle AIMessages (thought/reasoning & tool calls)
                        if isinstance(msg, AIMessage):
                            if msg.tool_calls:
                                for tc in msg.tool_calls:
                                    await on_step_callback({
                                        "status": "tool_call",
                                        "message": f"Invoking {tc['name']}..."
                                    })
                            elif msg.content:
                                await on_step_callback({
                                    "status": "thought",
                                    "message": msg.content
                                })
                        # 2. Handle ToolMessages (results & connection checks)
                        elif isinstance(msg, ToolMessage):
                            content_str = str(msg.content)
                            
                            # Intercept connection issues
                            if "No active connection found" in content_str or "No Active connection" in content_str:
                                toolkit_err = "Gmail/Calendar/Slack"
                                if "gmail" in content_str.lower():
                                    toolkit_err = "Gmail"
                                elif "calendar" in content_str.lower():
                                    toolkit_err = "Google Calendar"
                                elif "slack" in content_str.lower():
                                    toolkit_err = "Slack"
                                    
                                await on_step_callback({
                                    "status": "connection_error",
                                    "message": f"Connection required: Please connect {toolkit_err} in settings."
                                })
                                raise ValueError(f"Missing connection for {toolkit_err}. Please connect it and retry.")
                            
                            snippet = content_str[:200] + "..." if len(content_str) > 200 else content_str
                            await on_step_callback({
                                "status": "tool_result",
                                "message": f"Tool {msg.name or 'tool'} returned: {snippet}"
                            })

    if not last_chunk:
        return "Inbox agent failed to return a response."

    # Inspect the last chunk of create_react_agent
    out_messages = []
    for node_output in last_chunk.values():
        if isinstance(node_output, dict) and "messages" in node_output:
            out_messages.extend(node_output["messages"])
        elif isinstance(node_output, list):
            out_messages.extend(node_output)

    if not out_messages:
        return "Inbox agent failed to return a response."

    last = out_messages[-1]
    content = getattr(last, "content", None)
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        parts = [p.get("text", "") for p in content if isinstance(p, dict)]
        joined = "".join(parts).strip()
        if joined:
            return joined
    return str(content or "Inbox agent failed to return a response.")
