"""
parent/graph.py
───────────────
Builds and compiles the ParentGraph.
Integrates ParentState, ParentRouter, BrainGraph, and AgentGraph.
"""

from loguru import logger
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from ..schema.state import ParentState
from .router import router_node
from ..brain.graph import build_brain_graph
from ..agent.graph import build_agent_graph


def route_next(state: ParentState) -> str:
    """
    Look up next route from parent state.
    """
    nxt = state.get("next_route", "brain_subgraph")
    logger.info(f"[Parent Router] Selecting conditional path: '{nxt}'")
    return nxt


def build_parent_graph(checkpointer=None) -> StateGraph:
    """
    Constructs the ParentGraph hierarchy by mounting the Brain and Agent subgraphs.
    """
    builder = StateGraph(ParentState)

    # 1. Add Parent Router
    builder.add_node("router", router_node)

    # 2. Compile and add subgraphs as nodes
    # They will automatically copy/merge shared keys with ParentState
    logger.info("Mounting BrainGraph subgraph...")
    brain_subgraph = build_brain_graph().compile()
    builder.add_node("brain_subgraph", brain_subgraph)

    logger.info("Mounting AgentGraph subgraph...")
    agent_subgraph = build_agent_graph().compile()
    builder.add_node("agent_subgraph", agent_subgraph)

    # 3. Entry point
    builder.add_edge(START, "router")

    # 4. Router conditional edges
    builder.add_conditional_edges(
        "router",
        route_next,
        {
            "brain_subgraph": "brain_subgraph",
            "agent_subgraph": "agent_subgraph",
            "__end__": END
        }
    )

    # 5. Subgraphs loop back to the router
    builder.add_edge("brain_subgraph", "router")
    builder.add_edge("agent_subgraph", "router")

    return builder
