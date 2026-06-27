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
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
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
        model="gpt-4o-mini",
        temperature=0.1,  # Low temperature for precise schema mapping and tool calling
        api_key=api_key,
    )


def compile_inbox_agent(session):
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
    return create_react_agent(
        model=llm,
        tools=meta_tools,
        prompt=INBOX_SYSTEM_PROMPT,
    )


# ─── Execution Interface ──────────────────────────────────────────────────────

def run_inbox_agent(
    session,
    instruction: str,
    thread_id: str = "inbox_agent_thread",
) -> str:
    """
    Runs the sub-agent with the supervisor's instruction and returns the final answer.
    """
    agent = compile_inbox_agent(session)
    lc_messages = [HumanMessage(content=instruction)]
    config = {"configurable": {"thread_id": thread_id}}

    result = agent.invoke({"messages": lc_messages}, config=config)
    out_messages = result.get("messages", [])
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
