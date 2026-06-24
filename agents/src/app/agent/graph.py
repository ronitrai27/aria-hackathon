"""
agent/graph.py
──────────────
Defines the AgentGraph subgraph structure.
Contains the supervisor node and real worker nodes for workflow building.
"""

import os
from typing import Literal, Optional, List, Dict, Any
from loguru import logger
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from ..schema.state import AgentState, WorkerResult


# ── Pydantic Workflow Design Schemas ──────────────────────────────────────────
class WorkflowStepDesign(BaseModel):
    id: str = Field(
        description="Unique ID for the node, e.g., 'node_1', 'node_2'"
    )
    type: Literal["ai_summarize", "ai_classify", "ai_extract", "ai_research", "composio_app", "task_trigger"] = Field(
        description="The type of the workflow node."
    )
    label: str = Field(
        description="Human-readable label for this step."
    )
    
    # AI specific configurations
    ai_prompt: Optional[str] = Field(
        None,
        description="The prompt instructions for the AI node (can use output variables like {{node_1.output}})."
    )
    ai_target_classes: Optional[List[str]] = Field(
        None,
        description="List of categories to classify into (for ai_classify nodes)."
    )
    ai_extraction_schema: Optional[Dict[str, Any]] = Field(
        None,
        description="JSON Schema for fields to extract (for ai_extract nodes)."
    )
    
    # Composio specific configurations
    composio_action_slug: Optional[str] = Field(
        None,
        description="The Composio action slug, e.g., 'gmail_send_email', 'google_docs_create_document'."
    )
    composio_params_mapping: Optional[Dict[str, str]] = Field(
        None,
        description="Key-value mapping of parameter values, e.g., {'body': '{{node_2.output}}'}."
    )


class WorkflowConnectionDesign(BaseModel):
    source: str = Field(description="ID of the source node.")
    target: str = Field(description="ID of the target node.")


class WorkflowDesign(BaseModel):
    workflow_name: str = Field(description="Descriptive name of the workflow.")
    steps: List[WorkflowStepDesign] = Field(description="The list of nodes in the workflow.")
    connections: List[WorkflowConnectionDesign] = Field(description="The list of connections/edges between nodes.")


# ── Model Instantiation ───────────────────────────────────────────────────────
try:
    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.0)
except Exception as e:
    logger.warning(f"Failed to instantiate ChatOpenAI for AgentGraph: {e}")
    llm = None


# ── Helper: Fetch Composio Action Parameter Schema ───────────────────────────
def fetch_composio_action_schema(action_slug: str) -> dict:
    """
    Queries the Composio API to fetch parameter properties for a given action slug.
    """
    api_key = os.environ.get("COMPOSIO_API_KEY")
    if not api_key:
        logger.warning("COMPOSIO_API_KEY not found in environment.")
        return {}
    try:
        from composio import Composio
        comp = Composio(api_key=api_key)
        logger.info(f"Fetching Composio schema for action: {action_slug}")
        # user_id is required but schema lookup is identical for all users
        tools = comp.tools.get(user_id="schema_looker", slug=action_slug)
        if tools and len(tools) > 0:
            function_data = tools[0].get("function", {})
            return function_data.get("parameters", {})
    except Exception as e:
        logger.warning(f"Could not load Composio schema for {action_slug}: {e}")
    return {}


# ── Supervisor Node ───────────────────────────────────────────────────────────
def agent_supervisor_node(state: AgentState) -> Command:
    """
    Supervisor node inside the AgentGraph.
    Decides which worker to execute based on user message.
    """
    messages = state.get("messages", [])
    if not messages:
        return Command(
            update={"status": "done", "final_response": "No messages to process."},
            goto=END
        )

    last_msg = str(messages[-1].content).lower()
    logger.info(f"[Agent Supervisor] Evaluating query: '{last_msg}'")

    # If worker results are present, it means the builder worker has run. We terminate.
    if state.get("worker_results"):
        logger.info("[Agent Supervisor] Workers completed. Completing subgraph turn.")
        return Command(
            update={
                "status": "done",
                "final_response": "Workflow designed successfully and populated with parameter schemas."
            },
            goto=END
        )

    # Route based on intent
    if "schedule" in last_msg:
        intent = "schedule"
        workers = ["scheduler_worker"]
    elif "run" in last_msg or "execute" in last_msg:
        intent = "run"
        workers = ["composio_worker"]
    else:
        intent = "create_workflow"
        workers = ["workflow_builder"]

    logger.info(f"[Agent Supervisor] Selected worker(s) {workers} for intent '{intent}'")
    return Command(
        update={
            "current_intent": intent,
            "planned_workers": workers,
            "turn_count": state.get("turn_count", 0) + 1
        },
        goto=workers[0]
    )


# ── Worker Node Implementations ───────────────────────────────────────────────
def workflow_builder_node(state: AgentState) -> dict:
    """
    Analyzes user prompts to construct a structured workflow schema.
    Queries Composio dynamically to inject input field parameter properties.
    """
    logger.info("[workflow_builder] Designing workflow structure...")
    messages = state.get("messages", [])
    if not messages or llm is None:
        logger.warning("No messages or LLM unavailable in workflow_builder.")
        return {
            "worker_results": [
                WorkerResult(worker="workflow_builder", output=None, error="LLM unavailable")
            ]
        }

    try:
        # Call LLM with structured output to get workflow design
        structured_llm = llm.with_structured_output(WorkflowDesign)
        system_prompt = (
            "You are an expert AI Workflow Designer.\n"
            "Build a directed acyclic graph (DAG) of nodes and edges matching the user's intent.\n"
            "You have three node categories available:\n"
            "1. AI Nodes: 'ai_summarize', 'ai_classify', 'ai_extract', 'ai_research'\n"
            "2. Integration Apps: 'composio_app' (e.g. gmail_send_email, slack_chat_post_message, google_docs_create_document)\n"
            "3. Triggers: 'task_trigger' (for trigger nodes)\n\n"
            "Map references between nodes using double braces, e.g., {{node_1.output}} to feed data sequentially."
        )
        
        design: WorkflowDesign = structured_llm.invoke([
            {"role": "system", "content": system_prompt},
            *messages
        ])
        
        # Convert design into React Flow compatible nodes and edges
        react_flow_nodes = []
        react_flow_edges = []
        
        for step in design.steps:
            node_data = {
                "label": step.label,
                "type": step.type,
            }
            
            # Populate AI configurations
            if step.type.startswith("ai_"):
                node_data["ai_config"] = {
                    "prompt": step.ai_prompt,
                    "target_classes": step.ai_target_classes,
                    "extraction_schema": step.ai_extraction_schema,
                }
            
            # Populate Composio configuration & fetch real-time schemas
            elif step.type == "composio_app" and step.composio_action_slug:
                action_slug = step.composio_action_slug.lower()
                node_data["composio_config"] = {
                    "action_slug": action_slug,
                    "params_mapping": step.composio_params_mapping or {},
                }
                
                # Fetch live schema parameter fields for parameters form rendering on UI
                parameter_schema = fetch_composio_action_schema(action_slug)
                if parameter_schema:
                    node_data["parameter_schema"] = parameter_schema
            
            react_flow_nodes.append({
                "id": step.id,
                "type": step.type,
                "position": {"x": 100, "y": 100},  # Mock placement coordinate
                "data": node_data
            })
            
        for conn in design.connections:
            react_flow_edges.append({
                "id": f"e-{conn.source}-{conn.target}",
                "source": conn.source,
                "target": conn.target
            })
            
        final_schema = {
            "workflow_name": design.workflow_name,
            "nodes": react_flow_nodes,
            "edges": react_flow_edges
        }
        
        logger.info(f"[workflow_builder] Successfully built workflow: {design.workflow_name}")
        return {
            "workflow_schema": final_schema,
            "worker_results": [
                WorkerResult(
                    worker="workflow_builder",
                    output=f"Designed workflow: {design.workflow_name}",
                    error=None
                )
            ]
        }
        
    except Exception as e:
        logger.error(f"[workflow_builder] Failed to build workflow: {e}")
        return {
            "worker_results": [
                WorkerResult(
                    worker="workflow_builder",
                    output=None,
                    error=str(e)
                )
            ]
        }


def composio_worker_node(state: AgentState) -> dict:
    logger.info("[composio_worker] Placeholder active.")
    return {
        "composio_action_results": None,
        "worker_results": [
            WorkerResult(
                worker="composio_worker",
                output="Composio action completed placeholder.",
                error=None
            )
        ]
    }


def ai_node_worker_node(state: AgentState) -> dict:
    logger.info("[ai_node_worker] Placeholder active.")
    return {
        "ai_node_configs": None,
        "worker_results": [
            WorkerResult(
                worker="ai_node_worker",
                output="AI node configured placeholder.",
                error=None
            )
        ]
    }


def scheduler_worker_node(state: AgentState) -> dict:
    logger.info("[scheduler_worker] Placeholder active.")
    return {
        "schedule_config": None,
        "worker_results": [
            WorkerResult(
                worker="scheduler_worker",
                output="Scheduler active placeholder.",
                error=None
            )
        ]
    }


# ── Graph Builder ─────────────────────────────────────────────────────────────
def build_agent_graph(checkpointer=None) -> StateGraph:
    """
    Constructs and returns the StateGraph for AgentGraph.
    """
    builder = StateGraph(AgentState)

    # Register nodes
    builder.add_node("supervisor", agent_supervisor_node)
    builder.add_node("workflow_builder", workflow_builder_node)
    builder.add_node("composio_worker", composio_worker_node)
    builder.add_node("ai_node_worker", ai_node_worker_node)
    builder.add_node("scheduler_worker", scheduler_worker_node)

    # Define edges
    builder.add_edge(START, "supervisor")

    # All workers loop back to supervisor
    builder.add_edge("workflow_builder", "supervisor")
    builder.add_edge("composio_worker", "supervisor")
    builder.add_edge("ai_node_worker", "supervisor")
    builder.add_edge("scheduler_worker", "supervisor")

    return builder
