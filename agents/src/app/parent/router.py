"""
parent/router.py
────────────────
Determines whether to route user query to Brain or Agent subgraphs.
Uses gpt-4.1-nano via LangChain with Pydantic structured output.
"""

from typing import Literal
from loguru import logger
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

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
    llm = ChatOpenAI(model="gpt-4.1-nano", temperature=0.0)
except Exception as e:
    logger.warning(f"Failed to instantiate ChatOpenAI: {e}. Placeholder llm reference created.")
    llm = None


def router_node(state: ParentState) -> dict:
    """
    ParentGraph router node. Uses gpt-4.1-nano to classify query and route.
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
            "messages": messages_update
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
        return {"next_route": "brain_subgraph", "status": "running"}

    last_msg = messages[-1]
    if not isinstance(last_msg, HumanMessage):
        return {"next_route": state.get("next_route", "brain_subgraph")}

    if llm is None:
        logger.error("Router LLM is not initialized. Defaulting to brain_subgraph.")
        return {"next_route": "brain_subgraph", "status": "running"}

    # Invoke LLM structured routing
    try:
        structured_llm = llm.with_structured_output(RoutingDecision)
        system_prompt = (
            "You are the central router for a dual-agent system containing a Brain agent and an Agent agent.\n"
            "Analyze the conversation history and the user's latest query to select the next subgraph:\n\n"
            "1. 'brain_subgraph': Use this for tasks management (getting/creating/updating tasks), asking about memories/preferences, "
            "reflections, general knowledge questions, document upload/analysis, and inbox checks.\n"
            "2. 'agent_subgraph': Use this if the user wants to create/edit automated workflows, connect to integrations (Composio, Gmail, LinkedIn, Slack), "
            "schedule cron triggers, or run workflows.\n"
            "3. '__end__': Select this if the task is complete and no action is required."
        )
        
        logger.info("[Parent Router] Querying gpt-4.1-nano for routing decision...")
        decision: RoutingDecision = structured_llm.invoke([
            {"role": "system", "content": system_prompt},
            *messages
        ])
        
        logger.info(f"[Parent Router] Route: {decision.next_route} | Reason: {decision.reason}")
        return {"next_route": decision.next_route, "status": "running"}
        
    except Exception as e:
        logger.error(f"[Parent Router] LLM routing failed: {e}. Defaulting to brain_subgraph.")
        return {"next_route": "brain_subgraph", "status": "running"}
