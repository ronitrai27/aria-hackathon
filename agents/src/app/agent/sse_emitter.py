"""
SSE Emitter for LangGraph Workflow Designer Agent
Converts the internal python agent stream events to standard SSE format.
"""

import json
from typing import Any, Generator

def format_sse(event_name: str, data: Any) -> str:
    """Format data as a Server-Sent Event."""
    # Ensure double newlines at the end to flush the event chunk
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"

def map_agent_stream_to_sse(agent_stream: Generator[dict, None, None]) -> Generator[str, None, None]:
    """
    Transforms the dict-based events from run_workflow_agent_stream
    into formatted SSE strings.
    """
    # 1. Emit initial worker states to indicate setup
    yield format_sse("worker_status", {
        "worker": "router",
        "status": "completed",
        "details": {"message": "Query intent checked."}
    })
    yield format_sse("worker_status", {
        "worker": "workflow_builder",
        "status": "running",
        "details": {"message": "Designing workflow structure..."}
    })

    try:
        for event in agent_stream:
            event_type = event.get("type")

            if event_type == "thought":
                content = event.get("content", "")
                
                # Check if it's a verifier warning or success message
                if "[Verifier Warning]" in content or "validation failed" in content.lower():
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_validation",
                        "details": {
                            "action_slug": "verifier",
                            "status": "failed",
                            "message": content
                        }
                    })
                elif "[Verifier Success]" in content or "verified and registered" in content.lower():
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_validation",
                        "details": {
                            "action_slug": "verifier",
                            "status": "ready",
                            "message": content
                        }
                    })
                else:
                    # Regular agent thought / communication
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "thought",
                        "details": {"message": content}
                    })

            elif event_type == "tool_call":
                name = event.get("name", "")
                args = event.get("args", {})
                
                # Map specific tools for rich UI feedback
                if name == "COMPOSIO_SEARCH_TOOLS":
                    query = args.get("query", "")
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "fetching_composio_schemas",
                        "details": {"message": f"Searching for Composio tool matching '{query}'..."}
                    })
                elif name == "COMPOSIO_GET_TOOL_SCHEMAS":
                    slug = args.get("tool_slug", "")
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "fetching_composio_schemas",
                        "details": {"message": f"Loading live parameter schemas for {slug}..."}
                    })
                elif name == "set_workflow":
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_validation",
                        "details": {
                            "action_slug": "workflow",
                            "status": "running",
                            "message": "Validating proposed workflow structure..."
                        }
                    })
                else:
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_call",
                        "details": {"tool_name": name, "args": args}
                    })

            elif event_type == "tool_output":
                name = event.get("name", "")
                content = event.get("content", "")
                
                if name == "COMPOSIO_GET_TOOL_SCHEMAS":
                    # Parse tool slug if possible or just notify
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "composio_schema_fetched",
                        "details": {"action_slug": name}
                    })
                else:
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "tool_output",
                        "details": {"tool_name": name, "content": content}
                    })

            elif event_type == "workflow":
                nodes = event.get("nodes", [])
                edges = event.get("edges", [])
                
                # Check for AI nodes in the generated React Flow layout
                ai_nodes = [n for n in nodes if n.get("type") == "ai" or str(n.get("id", "")).startswith("ai_")]
                if ai_nodes:
                    yield format_sse("worker_action", {
                        "worker": "workflow_builder",
                        "action": "configuring_ai_nodes",
                        "details": {"message": f"Configuring {len(ai_nodes)} AI nodes..."}
                    })
                    for idx, node in enumerate(ai_nodes):
                        yield format_sse("worker_action", {
                            "worker": "workflow_builder",
                            "action": "node_configured",
                            "details": {
                                "node_id": node.get("id"),
                                "type": node.get("type", "ai"),
                                "model": "gpt-4.1-mini"
                            }
                        })
                
                # Final tool validation ready signal
                yield format_sse("worker_action", {
                    "worker": "workflow_builder",
                    "action": "tool_validation",
                    "details": {
                        "action_slug": "workflow",
                        "status": "ready",
                        "message": "Workflow successfully verified and built!"
                    }
                })

                # Stream the actual nodes and edges
                yield format_sse("worker_response", {
                    "worker": "workflow_builder",
                    "output": {
                        "nodes": nodes,
                        "edges": edges
                    }
                })

            elif event_type == "final_answer":
                content = event.get("content", "")
                yield format_sse("supervisor_data", {
                    "status": "done",
                    "final_response": content
                })
                
                yield format_sse("worker_status", {
                    "worker": "workflow_builder",
                    "status": "completed",
                    "details": {"message": "Workflow successfully generated."}
                })

    except Exception as e:
        yield format_sse("error", {"error": str(e)})
