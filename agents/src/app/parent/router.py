"""
parent/router.py
────────────────
Determines whether to route user query to Brain or Agent subgraphs.
Uses gpt-4.1-nano via LangChain with Pydantic structured output.
"""

from typing import Literal
import os
from dotenv import load_dotenv
from loguru import logger
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

# Load environment variables strictly from workspace .env file and override system variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")
load_dotenv(dotenv_path=env_path, override=True)

from ..schema.state import ParentState
from ..schema.types import ParentWorkerName


# ── Pydantic Routing Schema ───────────────────────────────────────────────────
class RoutingDecision(BaseModel):
    next_route: Literal["brain_subgraph", "agent_subgraph", "__end__"] = Field(
        description="Select brain_subgraph for task management, documents, memory or suggestion. Select agent_subgraph for creating/running/scheduling workflows and integrations."
    )
    reason: str = Field(
        description="A brief explanation for making this routing decision."
    )


# Instantiate lightweight routing LLM
try:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
except Exception as e:
    logger.warning(f"Failed to instantiate ChatOpenAI: {e}. Placeholder llm reference created.")
    llm = None


def heuristic_routing(query: str) -> tuple[str, str]:
    """
    Fallback routing logic based on keywords.
    Returns (next_route, reason).
    """
    q = query.lower()
    # Agent subgraph indicators
    agent_keywords = [
        "workflow", "automate", "flow", "slack", "gmail", "email", "composio", 
        "send", "connect", "trigger", "schedule", "run", "execute", "integration"
    ]
    for kw in agent_keywords:
        if kw in q:
            return "agent_subgraph", f"Heuristic match: query contains '{kw}' which signals workflow/integration intent."
            
    # Default to brain_subgraph
    return "brain_subgraph", "Heuristic match: query does not contain workflow/integration keywords."


def router_node(state: ParentState) -> dict:
    """
    ParentGraph router node. Uses gpt-4o-mini to classify query and route.
    """
    # ── 1. Check Handoff Signal First ────────────────────────────────────────
    if state.get("transfer_to_agent"):
        logger.info("Handoff detected: Routing from Brain to Agent subgraph.")
        
        transfer_query = state.get("transfer_query")
        messages_update = []
        if transfer_query:
            messages_update = [HumanMessage(content=transfer_query)]

        return {
            "next_route": "agent_subgraph",
            "transfer_to_agent": False,
            "transfer_query": None,
            "status": "running",
            "messages": messages_update,
            "completed_steps": []
        }

    # ── 2. Check Subgraph Loop-back Completion ────────────────────────────────
    if state.get("status") == "done" and state.get("next_route") != "__end__":
        logger.info("[Parent Router] Subgraph finished task (status=done). Exiting ParentGraph.")
        final_response = state.get("final_response") or "Task completed."
        
        return {
            "next_route": "__end__",
            "messages": [AIMessage(content=final_response)]
        }

    # ── 3. Routing Analysis ───────────────────────────────────────────────────
    messages = state.get("messages", [])
    if not messages:
        logger.info("\n[Parent Router] INCOMING QUERY: (None/Empty)")
        logger.info("[Parent Router] DECISION MADE: next_route = brain_subgraph | reason = No messages found")
        return {"next_route": "brain_subgraph", "status": "running", "completed_steps": []}

    last_msg = messages[-1]
    incoming_query = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
    logger.info(f"\n[Parent Router] INCOMING QUERY: '{incoming_query}'")

    if not isinstance(last_msg, HumanMessage):
        fallback_route = state.get("next_route", "brain_subgraph")
        logger.info(f"[Parent Router] DECISION MADE: next_route = {fallback_route} | reason = Last message is not a HumanMessage")
        return {"next_route": fallback_route}

    if llm is None:
        route, reason = heuristic_routing(incoming_query)
        logger.error("Router LLM is not initialized. Defaulting to heuristic fallback.")
        logger.info(f"[Parent Router] DECISION MADE: next_route = {route} | reason = {reason} (LLM not initialized)")
        return {"next_route": route, "status": "running", "completed_steps": []}

    # Invoke LLM structured routing
    try:
        structured_llm = llm.with_structured_output(RoutingDecision)
        system_prompt = (
            "You are the central router for a dual-agent system containing a Brain agent and an Agent agent.\n"
            "Analyze the user's incoming query and select the most appropriate next route:\n"
            "1. 'brain_subgraph': Select this for task management (listing, creating, updating tasks), asking about memories/preferences, "
            "reflections, general knowledge, document upload, and analysis.\n"
            "2. 'agent_subgraph': Select this if the user wants to create/edit automated workflows, flows, connect to integrations (Composio, Gmail, Slack), "
            "schedule cron triggers, or execute workflows/schedules.\n"
            "3. '__end__': Select this if the user's goal has been completely achieved and no further action is required."
        )
        
        logger.info("[Parent Router] Querying gpt-4o-mini for routing decision...")
        decision: RoutingDecision = structured_llm.invoke([
            {"role": "system", "content": system_prompt},
            *messages
        ])
        
        logger.info(f"[Parent Router] DECISION MADE: next_route = {decision.next_route} | reason = {decision.reason}")
        return {"next_route": decision.next_route, "status": "running", "completed_steps": []}
        
    except Exception as e:
        logger.error(f"[Parent Router] LLM routing failed: {e}. Falling back to heuristics.")
        route, reason = heuristic_routing(incoming_query)
        logger.info(f"[Parent Router] DECISION MADE: next_route = {route} | reason = {reason} (LLM call failed: {e})")
        return {"next_route": route, "status": "running", "completed_steps": []}





#   "1. 'brain_subgraph': Use this for tasks management (getting/creating/updating tasks), asking about memories/preferences, "
#             "reflections, general knowledge questions, document upload/analysis, and inbox checks.\n"
#             "2. 'agent_subgraph': Use this if the user wants to create/edit automated workflows, flows, want to send , research and connect to integrations (Composio, Gmail, LinkedIn, Slack), "
#             "schedule cron triggers, or run workflows.\n"
#             "3. '__end__': Select this if the task is complete and no action is required."