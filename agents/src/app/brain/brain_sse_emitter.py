"""
SSE Emitter for LangGraph Brain Supervisor Agent.
Converts python agent stream updates into formatted SSE events (asynchronous).
"""

import json
from typing import Any, AsyncGenerator


def format_sse(event_name: str, data: Any) -> str:
    """Format data as a Server-Sent Event."""
    # Ensure double newlines at the end to flush the event chunk
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"


async def map_brain_stream_to_sse(agent_stream: AsyncGenerator[dict, None]) -> AsyncGenerator[str, None]:
    """
    Transforms the dict-based events from run_brain_agent_stream
    into formatted SSE strings.
    """
    try:
        async for event in agent_stream:
            event_type = event.get("type")

            if event_type == "trace":
                # For debug console logging on the client/backend
                yield format_sse("trace_log", {
                    "message": event.get("content", "")
                })

            elif event_type == "thought":
                # Stream thought text directly
                yield format_sse("brain_thought", {
                    "message": event.get("content", "")
                })

            elif event_type == "tool_call":
                tool_name = event.get("name", "")
                args = event.get("args", {})
                
                # Signal a tool invocation for detailed status
                yield format_sse("brain_tool_call", {
                    "tool_name": tool_name,
                    "args": args
                })

            elif event_type == "tool_output":
                tool_name = event.get("name", "")
                content = event.get("content", "")
                
                # Signal tool completion and results
                yield format_sse("brain_tool_result", {
                    "tool_name": tool_name,
                    "content": content
                })

                if tool_name == "save_to_memory":
                    try:
                        res = json.loads(content)
                        yield format_sse("memory_updated", res)
                    except Exception:
                        yield format_sse("memory_updated", {
                            "status": "failed",
                            "error": content
                        })

            elif event_type == "inbox_agent_event":
                # Detailed progress events from the inbox sub-agent
                yield format_sse("inbox_agent_event", event.get("data", {}))

            elif event_type == "hitl_request":
                # Frontend task verification request (interrupt state)
                yield format_sse("hitl_request", {
                    "status": "pending_approval",
                    "tasks": event.get("tasks", [])
                })

            elif event_type == "final_answer":
                # Final response from the supervisor
                yield format_sse("supervisor_data", {
                    "status": "done",
                    "final_response": event.get("content", "")
                })

            elif event_type == "error":
                # Server-side graph exception
                yield format_sse("error", {
                    "error": event.get("content", "")
                })

    except Exception as e:
        yield format_sse("error", {"error": str(e)})
