"""
agent/graph.py
──────────────
Defines the AgentGraph subgraph structure.
Contains the supervisor node and real worker nodes for workflow building.
"""

import os
from dotenv import load_dotenv

# Load environment variables strictly from workspace .env file and override system variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")
load_dotenv(dotenv_path=env_path, override=True)

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
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
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
        logger.info(f"[Composio] Fetching live schema for action: {action_slug}")
        tools = comp.tools.get(user_id="schema_looker", slug=action_slug)
        if tools and len(tools) > 0:
            function_data = tools[0].get("function", {})
            schema = function_data.get("parameters", {})
            logger.info(f"[Composio] Schema received for {action_slug} — {len(str(schema))} chars")
            return schema
    except Exception as e:
        logger.warning(f"[Composio] Could not load schema for {action_slug}: {e}")
    return {}


# ── Supervisor Node ───────────────────────────────────────────────────────────
def agent_supervisor_node(state: AgentState) -> Command:
    """
    Supervisor node inside the AgentGraph.
    Decides which worker to execute based on user message and current state.
    """
    messages = state.get("messages", [])
    if not messages:
        return Command(
            update={"status": "done", "final_response": "No messages to process."},
            goto=END
        )

    last_msg = str(messages[-1].content).lower()
    logger.info(f"[Agent Supervisor] Evaluating query: '{last_msg[:80]}...'")

    completed_workers = set(state.get("completed_steps") or [])

    logger.info(f"[Agent Supervisor] Completed workers so far: {completed_workers}")

    # ── Step 1: Build workflow schema first ───────────────────────────────────
    if "workflow_builder" not in completed_workers:
        intent = "create_workflow"
        workers = ["workflow_builder"]
        logger.info(f"[Agent Supervisor] STEP 1 — Routing to workflow_builder")
        return Command(
            update={
                "current_intent": intent,
                "planned_workers": workers,
                "turn_count": state.get("turn_count", 0) + 1
            },
            goto="workflow_builder"
        )

    # ── Step 2: Configure AI nodes (research/summarize prompts) ──────────────
    if "ai_node_worker" not in completed_workers:
        logger.info(f"[Agent Supervisor] STEP 2 — Routing to ai_node_worker")
        return Command(
            update={
                "current_intent": "add_ai_node",
                "planned_workers": ["ai_node_worker"],
                "turn_count": state.get("turn_count", 0) + 1
            },
            goto="ai_node_worker"
        )

    # ── Step 3: Execute Composio integration tool calls ───────────────────────
    if "composio_worker" not in completed_workers:
        logger.info(f"[Agent Supervisor] STEP 3 — Routing to composio_worker")
        return Command(
            update={
                "current_intent": "run",
                "planned_workers": ["composio_worker"],
                "turn_count": state.get("turn_count", 0) + 1
            },
            goto="composio_worker"
        )

    # ── All workers done — finalize ───────────────────────────────────────────
    import json as _json
    logger.info("[Agent Supervisor] All workers completed. Finalizing.")
    schema = state.get("workflow_schema")
    workflow_name = schema.get("workflow_name", "Workflow") if schema else "Workflow"

    # Count nodes by type for the summary
    node_types: dict = {}
    if schema:
        for n in schema.get("nodes", []):
            t = n.get("type", "unknown")
            node_types[t] = node_types.get(t, 0) + 1

    node_summary = ", ".join(f"{v}x {k}" for k, v in node_types.items())
    composio_slugs = [
        n.get("data", {}).get("composio_config", {}).get("action_slug", "")
        for n in (schema.get("nodes", []) if schema else [])
        if n.get("type") == "composio_app"
    ]
    integration_line = (
        f" Integrations wired: {', '.join(s for s in composio_slugs if s)}."
        if composio_slugs else ""
    )

    # ── Print full structured JSON to console ─────────────────────────────────
    logger.info("[Agent Supervisor] ╔══════════════════════════════════════════════╗")
    logger.info("[Agent Supervisor] ║   FINAL WORKFLOW JSON — NODES & EDGES        ║")
    logger.info("[Agent Supervisor] ╚══════════════════════════════════════════════╝")
    if schema:
        logger.info("\n" + _json.dumps(schema, indent=2))
    else:
        logger.warning("[Agent Supervisor] No workflow schema found in state!")
    logger.info("[Agent Supervisor] ═══════════════════════════════════════════════")

    final_msg = (
        f"Successfully built the workflow '{workflow_name}' with {len(schema.get('nodes', [])) if schema else 0} nodes "
        f"({node_summary}) and {len(schema.get('edges', [])) if schema else 0} edges.{integration_line} "
        f"The canvas is now live — feel free to modify any node or ask me to refine it!"
    )

    return Command(
        update={
            "status": "done",
            "final_response": final_msg
        },
        goto=END
    )


# ── Worker Node Implementations ───────────────────────────────────────────────
def workflow_builder_node(state: AgentState) -> dict:
    """
    Analyzes user prompts to construct a structured workflow schema.
    Queries Composio dynamically to inject input field parameter properties.
    """
    logger.info("[workflow_builder] === STARTING: Designing workflow structure ===")
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
        structured_llm = llm.with_structured_output(WorkflowDesign, method="function_calling")
        system_prompt = (
            "You are an expert AI Workflow Designer.\n"
            "Build a directed acyclic graph (DAG) of nodes and edges matching the user's intent.\n"
            "You have three node categories available:\n"
            "1. AI Nodes: 'ai_summarize', 'ai_classify', 'ai_extract', 'ai_research'\n"
            "2. Integration Apps: 'composio_app' (e.g. gmail_send_email, slack_chat_post_message, google_docs_create_document)\n"
            "3. Triggers: 'task_trigger' (for trigger nodes)\n\n"
            "Map references between nodes using double braces, e.g., {{node_1.output}} to feed data sequentially."
        )
        
        logger.info("[workflow_builder] Calling GPT-4o-mini for workflow structure design...")
        design: WorkflowDesign = structured_llm.invoke([
            {"role": "system", "content": system_prompt},
            *messages
        ])
        logger.info(f"[workflow_builder] LLM designed workflow: '{design.workflow_name}' with {len(design.steps)} nodes")
        
        # Convert design into React Flow compatible nodes and edges
        react_flow_nodes = []
        react_flow_edges = []
        
        for i, step in enumerate(design.steps):
            # Clean string values
            label_clean = step.label.strip() if step.label else ""
            if (label_clean.startswith('"') and label_clean.endswith('"')) or (label_clean.startswith("'") and label_clean.endswith("'")):
                label_clean = label_clean[1:-1].strip()

            node_data = {
                "label": label_clean,
                "type": step.type,
            }
            
            # Populate AI configurations
            if step.type.startswith("ai_"):
                prompt_clean = step.ai_prompt.strip() if step.ai_prompt else ""
                if (prompt_clean.startswith('"') and prompt_clean.endswith('"')) or (prompt_clean.startswith("'") and prompt_clean.endswith("'")):
                    prompt_clean = prompt_clean[1:-1].strip()
                node_data["ai_config"] = {
                    "prompt": prompt_clean,
                    "target_classes": step.ai_target_classes,
                    "extraction_schema": step.ai_extraction_schema,
                }
                logger.info(f"[workflow_builder]   Node [{step.id}] AI node: {step.type} | prompt: '{prompt_clean[:60]}...'")
            
            # Populate Composio configuration & fetch real-time schemas
            elif step.type == "composio_app" and step.composio_action_slug:
                action_slug = step.composio_action_slug.strip().lower()
                if (action_slug.startswith('"') and action_slug.endswith('"')) or (action_slug.startswith("'") and action_slug.endswith("'")):
                    action_slug = action_slug[1:-1].strip()
                node_data["composio_config"] = {
                    "action_slug": action_slug,
                    "params_mapping": step.composio_params_mapping or {},
                }
                
                # Fetch live schema parameter fields for parameters form rendering on UI
                logger.info(f"[workflow_builder]   Node [{step.id}] Composio node: {action_slug} — fetching live schema...")
                parameter_schema = fetch_composio_action_schema(action_slug)
                if parameter_schema:
                    node_data["parameter_schema"] = parameter_schema
                    logger.info(f"[workflow_builder]   Node [{step.id}] Schema ready — {len(parameter_schema.get('properties', {}))} params available")
            
            elif step.type == "task_trigger":
                logger.info(f"[workflow_builder]   Node [{step.id}] Trigger node: {label_clean}")

            react_flow_nodes.append({
                "id": step.id,
                "type": step.type,
                "position": {"x": 250, "y": i * 160 + 80},
                "data": node_data
            })
            
        for conn in design.connections:
            react_flow_edges.append({
                "id": f"e-{conn.source}-{conn.target}",
                "source": conn.source,
                "target": conn.target
            })
            logger.info(f"[workflow_builder]   Edge: {conn.source} --> {conn.target}")
            
        import json as _json
        final_schema = {
            "workflow_name": design.workflow_name,
            "nodes": react_flow_nodes,
            "edges": react_flow_edges
        }
        
        logger.info(f"[workflow_builder] === DONE: Built '{design.workflow_name}' — {len(react_flow_nodes)} nodes, {len(react_flow_edges)} edges ===")
        logger.info("[workflow_builder] ╔══════════════════════════════════════════════╗")
        logger.info("[workflow_builder] ║     FINAL WORKFLOW SCHEMA (JSON OUTPUT)      ║")
        logger.info("[workflow_builder] ╚══════════════════════════════════════════════╝")
        logger.info("\n" + _json.dumps(final_schema, indent=2))
        logger.info("[workflow_builder] ═══════════════════════════════════════════════")
        return {
            "workflow_schema": final_schema,
            "completed_steps": ["workflow_builder"],
            "worker_results": [
                WorkerResult(
                    worker="workflow_builder",
                    output=f"Designed workflow: {design.workflow_name} ({len(react_flow_nodes)} nodes, {len(react_flow_edges)} edges)",
                    error=None
                )
            ]
        }
        
    except Exception as e:
        logger.error(f"[workflow_builder] FAILED: {e}")
        return {
            "completed_steps": ["workflow_builder"],
            "worker_results": [
                WorkerResult(
                    worker="workflow_builder",
                    output=None,
                    error=str(e)
                )
            ]
        }


def ai_node_worker_node(state: AgentState) -> dict:
    """
    Configures AI node parameters for research/summarize/classify/extract nodes in the workflow.
    """
    logger.info("[ai_node_worker] === STARTING: Configuring AI node parameters ===")
    
    schema = state.get("workflow_schema")
    if not schema:
        logger.warning("[ai_node_worker] No workflow schema available to configure.")
        return {
            "ai_node_configs": None,
            "completed_steps": ["ai_node_worker"],
            "worker_results": [
                WorkerResult(
                    worker="ai_node_worker",
                    output="No workflow schema available.",
                    error=None
                )
            ]
        }

    ai_nodes = [n for n in schema.get("nodes", []) if n.get("type", "").startswith("ai_")]
    configs = []

    for node in ai_nodes:
        node_id = node.get("id")
        node_type = node.get("type")
        ai_config = node.get("data", {}).get("ai_config", {})
        prompt = ai_config.get("prompt", "")
        
        logger.info(f"[ai_node_worker]   Configuring node [{node_id}] type={node_type}")
        logger.info(f"[ai_node_worker]   Prompt: '{prompt[:80]}...'")

        config = {
            "node_id": node_id,
            "type": node_type,
            "prompt": prompt,
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "max_tokens": 1024,
        }
        configs.append(config)
        logger.info(f"[ai_node_worker]   Config set: model=gpt-4o-mini, temp=0.3, max_tokens=1024")

    logger.info(f"[ai_node_worker] === DONE: Configured {len(configs)} AI nodes ===")
    return {
        "ai_node_configs": configs,
        "completed_steps": ["ai_node_worker"],
        "worker_results": [
            WorkerResult(
                worker="ai_node_worker",
                output=f"Configured {len(configs)} AI node(s): {[c['node_id'] for c in configs]}",
                error=None
            )
        ]
    }


def composio_worker_node(state: AgentState) -> dict:
    """
    Validates Composio integration nodes — verifies action slugs and 
    confirms required parameters are mapped in the workflow schema.
    """
    logger.info("[composio_worker] === STARTING: Validating Composio integration nodes ===")

    schema = state.get("workflow_schema")
    if not schema:
        logger.warning("[composio_worker] No workflow schema to validate.")
        return {
            "composio_action_results": None,
            "completed_steps": ["composio_worker"],
            "worker_results": [
                WorkerResult(
                    worker="composio_worker",
                    output="No workflow schema available.",
                    error=None
                )
            ]
        }

    composio_nodes = [
        n for n in schema.get("nodes", [])
        if n.get("type") == "composio_app"
    ]

    logger.info(f"[composio_worker] Found {len(composio_nodes)} Composio integration node(s)")
    
    validation_results = []
    for node in composio_nodes:
        node_id = node.get("id")
        composio_cfg = node.get("data", {}).get("composio_config", {})
        action_slug = composio_cfg.get("action_slug", "")
        params_mapping = composio_cfg.get("params_mapping", {})
        param_schema = node.get("data", {}).get("parameter_schema", {})
        
        required_params = param_schema.get("required", [])
        mapped_params = list(params_mapping.keys())
        missing_params = [p for p in required_params if p not in mapped_params]
        
        logger.info(f"[composio_worker]   Node [{node_id}] action={action_slug}")
        logger.info(f"[composio_worker]   Mapped params: {mapped_params}")
        logger.info(f"[composio_worker]   Required params: {required_params}")
        
        if missing_params:
            logger.warning(f"[composio_worker]   Missing required params: {missing_params}")
        else:
            logger.info(f"[composio_worker]   All required params satisfied!")

        # Log each param mapping
        for param_key, param_val in params_mapping.items():
            logger.info(f"[composio_worker]     {param_key} = {param_val}")

        validation_results.append({
            "node_id": node_id,
            "action_slug": action_slug,
            "status": "ready" if not missing_params else "needs_params",
            "mapped_params": mapped_params,
            "missing_params": missing_params,
        })

    ready_count = sum(1 for r in validation_results if r["status"] == "ready")
    logger.info(f"[composio_worker] === DONE: {ready_count}/{len(validation_results)} nodes ready for execution ===")

    return {
        "composio_action_results": validation_results,
        "completed_steps": ["composio_worker"],
        "worker_results": [
            WorkerResult(
                worker="composio_worker",
                output={
                    "validated_nodes": len(validation_results),
                    "ready_nodes": ready_count,
                    "results": validation_results,
                },
                error=None
            )
        ]
    }


def scheduler_worker_node(state: AgentState) -> dict:
    logger.info("[scheduler_worker] === STARTING: Configuring schedule/trigger settings ===")
    logger.info("[scheduler_worker] Placeholder: No schedule configuration in current request.")
    logger.info("[scheduler_worker] === DONE ===")
    return {
        "schedule_config": None,
        "completed_steps": ["scheduler_worker"],
        "worker_results": [
            WorkerResult(
                worker="scheduler_worker",
                output="No schedule configuration required for this workflow.",
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

    # Entry point
    builder.add_edge(START, "supervisor")

    # All workers loop back to supervisor for next step decision
    builder.add_edge("workflow_builder", "supervisor")
    builder.add_edge("composio_worker", "supervisor")
    builder.add_edge("ai_node_worker", "supervisor")
    builder.add_edge("scheduler_worker", "supervisor")

    return builder
