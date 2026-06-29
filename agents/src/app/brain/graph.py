"""
Brain Supervisor Agent — LangGraph StateGraph
Supervises sub-agents and tools (inbox_agent, memory, tasks, browser activity).
Uses gpt-5-mini for supervisor model and implements checkpointer-based HITL.
Supports token-by-token streaming via LangChain callbacks and asyncio Queue.
"""

from __future__ import annotations

import asyncio
import os
import sys
from typing import Any, AsyncGenerator

from dotenv import load_dotenv
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from src.config import settings
from src.app.brain.state import BrainState
from src.app.tools.tools import BRAIN_TOOLS, get_tasks, create_tasks, get_browser_activity, fetch_inbox, fetch_memory, save_to_memory
from src.utils.checkpointer import get_checkpointer

# Load environment variables
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(_ROOT / ".env", override=True)


# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Aria's Brain Agent, a super intelligent personal companion agent.
You are speaking to {user_name} (User ID: {user_id}). Always refer to them by their name and greet them warmly if starting a conversation!

IMPORTANT: Today's date is {current_date}. All relative time queries (e.g., "upcoming events", "recent emails", "last 7 days") must be resolved using today's date: {current_date}.

You have direct access to these tools to assist {user_name}:
1. get_tasks: Retrieve the user's tasks list.
2. create_tasks: Propose/create new tasks (requires user's Human-In-The-Loop approval before final insertion).
3. get_browser_activity: Fetch aggregated browsing history for the last 48 hours to analyze visited websites.
4. fetch_inbox: Fetch emails, calendar events, and Slack messages.
5. fetch_memory: Search long-term vector store and Neo4j graph db for past work and personal facts.
6. save_to_memory: Commit key workspace facts, technology preferences, task constraints, or client contacts about the user to their long-term memory graph and vector DB.

Answer questions directly and intelligently. ALWAYS use rich markdown formatting (bolding, headers, bullet points, code blocks) to organize your answers beautifully so they look clean and structured on the user interface. If you invoke a tool, summarize its results elegantly in clear bullet points.

CRITICAL INSTRUCTIONS:
-Be playful , try to suggest or reflect back user his work , tasks or browser activities. Make user feel you are perosnal companion help to create tasks , suggest , help him improve and never let him feel over wrok loaded or down.
- SAVE USER MEMORIES: Whenever the user shares new, valuable, long-term workspace context (such as technology preferences, project descriptions, specific task details, or important contacts), call `save_to_memory` with a list of concise, declarative sentences summarizing the facts (e.g., `["User prefers Vanilla CSS over TailwindCSS", "User is working on Project Orion"]`). Only call this when new information is shared. Do not call this for trivial chat turns, greetings, or questions.
- DIRECT TOOL CALLS FOR TASKS: If you propose to create tasks for the user, call the `create_tasks` tool directly after asking for any chnages if users wants. Do NOT ask the user for permission, confirmation more than 1 time. The system automatically prompts the user for approval, so proceed straight to calling the tool.
- WORKFLOW CREATION LIMITATION: If the user asks you to create, build, or design a workflow (or a flow), you MUST state: "I can suggest and help with tasks and am here to make you achieve your goals, but I cannot directly create workflows. You need to switch to Agent Mode to do so!" (Direct them to use the Agent Mode toggle in the sidebar).
"""


# ─── Nodes ────────────────────────────────────────────────────────────────────

def supervisor_node(state: BrainState, config: Any = None):
    """Supervisor LLM node """
    user_name = state.get("user_name", "User")
    user_id = state.get("user_id", "default")
    
    print(f"\n[brain.supervisor_node] Running supervisor for user: '{user_name}' ({user_id})", flush=True)
    
    # Construct prompt messages
    import datetime
    current_date = datetime.datetime.now().strftime("%B %d, %Y")
    sys_prompt = SYSTEM_PROMPT.format(user_name=user_name, user_id=user_id, current_date=current_date)
    messages = [SystemMessage(content=sys_prompt)] + state["messages"]
   
    print(f"[brain.supervisor_node] Running supervisor. Messages trace:", flush=True)
    for idx, msg in enumerate(messages):
        msg_type = type(msg).__name__
        content_snippet = str(msg.content)[:60].replace("\n", " ")
        t_calls = getattr(msg, "tool_calls", None)
        t_call_id = getattr(msg, "tool_call_id", None)
        print(f"  [{idx}] Type={msg_type}, Content={content_snippet!r}, tool_calls={t_calls}, tool_call_id={t_call_id}", flush=True)
   
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    
    # Extract callbacks from config if present
    callbacks = []
    if config and "callbacks" in config:
        callbacks = config["callbacks"]
        
    llm = ChatOpenAI(
        model="gpt-4.1-mini", 
        temperature=0.1, 
        api_key=api_key,
        streaming=True,
        # reasoning={"effort": "none"},
        callbacks=callbacks
    )
    
    # Bind only the brain tools
    llm_with_tools = llm.bind_tools(BRAIN_TOOLS)
    
    print("[brain.supervisor_node] Invoking LLM...", flush=True)
    response = llm_with_tools.invoke(messages)
    
    if response.tool_calls:
        print(f"[brain.supervisor_node] LLM generated tool calls: {[tc['name'] for tc in response.tool_calls]}", flush=True)
    else:
        # Print snippet of final thought
        content_snippet = response.content[:100] + "..." if len(response.content) > 100 else response.content
        print(f"[brain.supervisor_node] LLM generated response thought: '{content_snippet}'", flush=True)
        
    return {"messages": [response]}


async def tool_node(state: BrainState):
    """Executes standard non-HITL tools (get_tasks, get_browser_activity, fetch_inbox, fetch_memory, save_to_memory)."""
    non_hitl_tools = [get_tasks, get_browser_activity, fetch_inbox, fetch_memory, save_to_memory]
    t_node = ToolNode(non_hitl_tools)
    
    last_message = state["messages"][-1]
    
    # Inject user_name into save_to_memory arguments if available in state
    user_name = state.get("user_name")
    if user_name and hasattr(last_message, "tool_calls") and last_message.tool_calls:
        for tc in last_message.tool_calls:
            tc_name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", None)
            if tc_name == "save_to_memory":
                tc_args = tc.get("args") if isinstance(tc, dict) else getattr(tc, "args", {})
                if isinstance(tc_args, dict):
                    tc_args["user_name"] = user_name
                    
    print(f"[brain.tool_node] Running tool node for: {[tc.get('name') if isinstance(tc, dict) else getattr(tc, 'name', '') for tc in last_message.tool_calls]}", flush=True)
    
    return await t_node.ainvoke(state)


async def execute_tasks_node(state: BrainState):
    """
    Executes task creation after passing the HITL gate.
    If hitl_approved is True, triggers the create_tasks Convex API.
    Otherwise returns a cancellation message.
    """
    last_message = state["messages"][-1]
    
    # Retrieve the create_tasks tool call
    create_tc = None
    for tc in getattr(last_message, "tool_calls", []):
        if tc["name"] == "create_tasks":
            create_tc = tc
            break
            
    if not create_tc:
        print("[brain.execute_tasks_node] ERROR: No create_tasks tool call found in prior message.", flush=True)
        return {
            "messages": [ToolMessage(
                content="Error: create_tasks tool call was lost.",
                tool_call_id="lost_id"
            )]
        }
        
    tool_call_id = create_tc["id"]
    args = create_tc["args"]
    
    approved = state.get("hitl_approved", False)
    print(f"[brain.execute_tasks_node] Evaluating approval for create_tasks. Approved={approved}", flush=True)
    
    if approved:
        print(f"[brain.execute_tasks_node] Approval RECEIVED. Creating {len(args.get('tasks', []))} tasks...", flush=True)
        result = await create_tasks.ainvoke(args)
        print(f"[brain.execute_tasks_node] Convex insertion response: {result}", flush=True)
        
        return {
            "hitl_approved": False,
            "messages": [ToolMessage(
                content=str(result),
                name="create_tasks",
                tool_call_id=tool_call_id
            )]
        }
    else:
        print("[brain.execute_tasks_node] Approval REJECTED or not provided. Task creation cancelled.", flush=True)
        return {
            "messages": [ToolMessage(
                content="Task creation cancelled/rejected by user.",
                name="create_tasks",
                tool_call_id=tool_call_id
            )]
        }


# ─── Routing ──────────────────────────────────────────────────────────────────

def should_continue(state: BrainState):
    """Routes execution based on whether tool calls are present and if they require HITL."""
    last_message = state["messages"][-1]
    if not last_message.tool_calls:
        print("[brain.should_continue] No tool calls. Routing to END.", flush=True)
        return END
        
    tool_calls = last_message.tool_calls
    for tc in tool_calls:
        if tc["name"] == "create_tasks":
            print("[brain.should_continue] Matches create_tasks. Routing to execute_tasks (HITL gate).", flush=True)
            return "execute_tasks"
            
    print(f"[brain.should_continue] Routing to standard tool node for: {[tc['name'] for tc in tool_calls]}", flush=True)
    return "tools"


# ─── Compile StateGraph ───────────────────────────────────────────────────────

def compile_brain_graph(checkpointer):
    """Compiles the brain supervisor LangGraph with Redis checkpointer."""
    builder = StateGraph(BrainState)
    
    # Add nodes
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("tools", tool_node)
    builder.add_node("execute_tasks", execute_tasks_node)
    
    # Entry point
    builder.set_entry_point("supervisor")
    
    # Edges
    builder.add_conditional_edges("supervisor", should_continue, ["tools", "execute_tasks", END])
    builder.add_edge("tools", "supervisor")
    builder.add_edge("execute_tasks", "supervisor")
    
    # Compile with checkpointer, interrupting before execute_tasks to request approval
    print("[brain.compile_brain_graph] Compiling brain graph with interrupt_before=['execute_tasks']", flush=True)
    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["execute_tasks"]
    )


# ─── Run Interface (Streaming generator with token callback queue) ───────────

class QueueCallbackHandler(AsyncCallbackHandler):
    """Callback handler to stream LLM tokens directly to the SSE queue in real time."""
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.active_runs = {}

    async def on_llm_new_token(self, token: Any, chunk: Optional[Any] = None, **kwargs: Any) -> None:
        token_text = ""
        
        # 1. Inspect chunk if passed
        if chunk is not None:
            # chunk is a ChatGenerationChunk or GenerationChunk
            message_chunk = getattr(chunk, "message", None)
            if message_chunk is not None:
                token_text = getattr(message_chunk, "content", "")
        
        # 2. Fallback to token parameter
        if not token_text and token:
            if isinstance(token, str):
                token_text = token
            elif isinstance(token, dict):
                token_text = token.get("text", "") or token.get("content", "")
            else:
                token_text = getattr(token, "text", "") or getattr(token, "content", "")

        # 3. Parse block structured list content
        if isinstance(token_text, list):
            parts = []
            for block in token_text:
                if isinstance(block, dict):
                    parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    parts.append(block)
            token_text = "".join(parts)

        # Print detailed diagnostics to terminal log
        if token_text:
            await self.queue.put({
                "type": "token",
                "content": token_text
            })

    async def on_tool_start(self, serialized: dict[str, Any], input_str: str, *, run_id: Any = None, **kwargs: Any) -> None:
        tool_name = serialized.get("name", "")
        if run_id:
            self.active_runs[run_id] = tool_name
        print(f"[on_tool_start] Tool {tool_name} started with input: {input_str}", flush=True)
        await self.queue.put({
            "type": "tool_start",
            "tool": tool_name,
            "input": input_str
        })

    async def on_tool_end(self, output: Any, *, run_id: Any = None, **kwargs: Any) -> None:
        tool_name = self.active_runs.pop(run_id, "tool")
        
        # Safe string coercion / serialization
        output_str = ""
        if isinstance(output, str):
            output_str = output
        elif isinstance(output, (dict, list)):
            try:
                output_str = json.dumps(output)
            except Exception:
                output_str = str(output)
        else:
            # It could be a ToolMessage or other LangChain object
            content = getattr(output, "content", None)
            if content is not None:
                if isinstance(content, (dict, list)):
                    try:
                        output_str = json.dumps(content)
                    except Exception:
                        output_str = str(content)
                else:
                    output_str = str(content)
            else:
                output_str = str(output)

        print(f"[on_tool_end] Tool {tool_name} finished. Output: {output_str!r}", flush=True)
        await self.queue.put({
            "type": "tool_end",
            "tool": tool_name,
            "output": output_str
        })


async def run_brain_agent_stream(
    message: str,
    user_id: str,
    user_name: str,
    thread_id: str,
    checkpointer,
) -> AsyncGenerator[dict, None]:
    """
    Streams updates from the brain supervisor graph execution.
    Uses a background task and queue to stream LLM tokens in real-time.
    """
    yield {"type": "trace", "content": f"[run_brain_agent_stream] Initializing graph execution for thread_id={thread_id}"}
    
    # Compile the graph
    graph = compile_brain_graph(checkpointer)
    config = {"configurable": {"thread_id": thread_id}}
    
    # Get current state to see if we are resuming from an interrupt
    current_state = await graph.aget_state(config)
    
    # Prepare execution inputs
    inputs = None
    if not current_state or not current_state.values:
        yield {"type": "trace", "content": f"[run_brain_agent_stream] Starting fresh conversation thread."}
        yield {"type": "trace", "content": "[graph update] Node 'supervisor' started execution."}
        inputs = {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "user_name": user_name,
            "thread_id": thread_id,
            "pending_tasks": [],
            "hitl_approved": False
        }
    else:
        next_node = current_state.next
        yield {"type": "trace", "content": f"[run_brain_agent_stream] Existing thread found. Next node: {next_node}"}
        
        if "execute_tasks" in next_node:
            yield {"type": "trace", "content": f"[run_brain_agent_stream] Resuming execution at execute_tasks."}
            yield {"type": "trace", "content": "🔧 Calling tool [create_tasks]..."}
            inputs = None
        else:
            yield {"type": "trace", "content": f"[run_brain_agent_stream] Appending new human message to existing thread."}
            yield {"type": "trace", "content": "[graph update] Node 'supervisor' started execution."}
            inputs = {
                "messages": [HumanMessage(content=message)],
                "user_id": user_id,
                "user_name": user_name
            }

    # Queue to coordinate token streaming and graph nodes completion
    event_queue = asyncio.Queue()
    token_handler = QueueCallbackHandler(event_queue)
    config["callbacks"] = [token_handler]

    # Define progress callback for the inbox agent to queue events
    async def on_inbox_step(event_data: dict):
        await event_queue.put({"type": "inbox_agent_event", "data": event_data})
        
    config["configurable"]["inbox_callback"] = on_inbox_step

    # Background task to stream graph updates into the queue
    async def execute_graph():
        try:
            async for chunk in graph.astream(inputs, config=config, stream_mode="updates"):
                await event_queue.put({"type": "chunk", "chunk": chunk})
            await event_queue.put({"type": "end"})
        except Exception as ex:
            import traceback
            print(f"[execute_graph] ERROR occurred during graph stream: {str(ex)}", flush=True)
            traceback.print_exc()
            await event_queue.put({"type": "error", "error": str(ex)})

    # Launch background graph run
    asyncio.create_task(execute_graph())

    final_text = ""

    # Process events from the queue in real-time
    while True:
        event = await event_queue.get()
        
        if event["type"] == "end":
            break
        elif event["type"] == "error":
            yield {"type": "error", "content": event["error"]}
            break
        elif event["type"] == "token":
            # Stream tokens to the client (only text content)
            yield {
                "type": "thought",
                "content": event.get("content", "")
            }
        elif event["type"] == "tool_start":
            yield {
                "type": "tool_call",
                "name": event["tool"],
                "args": event["input"]
            }
        elif event["type"] == "tool_end":
            yield {
                "type": "tool_output",
                "name": event["tool"],
                "content": event["output"]
            }
        elif event["type"] == "inbox_agent_event":
            # Stream inbox agent sub-steps
            yield {"type": "inbox_agent_event", "data": event["data"]}
        elif event["type"] == "chunk":
            # Process node transitions and structured outputs
            chunk = event["chunk"]
            for node_name, output in chunk.items():
                yield {"type": "trace", "content": f"[graph update] Node '{node_name}' finished execution."}
                
                # If tools or task execution completed, the graph loops back to the supervisor node
                if node_name in ["tools", "execute_tasks"]:
                    yield {"type": "trace", "content": "[graph update] Node 'supervisor' started execution."}
                
                if "messages" in output:
                    for msg in output["messages"]:
                        if isinstance(msg, AIMessage):
                            # Capture final content string for the final summary yield
                            if msg.content:
                                if isinstance(msg.content, list):
                                    text_parts = []
                                    for block in msg.content:
                                        if isinstance(block, dict) and block.get("type") == "text":
                                            text_parts.append(block.get("text", ""))
                                        elif isinstance(block, str):
                                            text_parts.append(block)
                                    final_text = "".join(text_parts)
                                else:
                                    final_text = msg.content
                            
                            # Yield tool calls if LLM decided to invoke tools
                            if msg.tool_calls:
                                for tc in msg.tool_calls:
                                    yield {
                                        "type": "tool_call",
                                        "name": tc["name"],
                                        "args": tc["args"]
                                    }
                        elif isinstance(msg, ToolMessage):
                            yield {
                                "type": "tool_output",
                                "name": msg.name or "tool",
                                "content": msg.content
                            }

    # Post-stream inspection to check if graph paused on an interrupt
    final_state = await graph.aget_state(config)
    if final_state and "execute_tasks" in final_state.next:
        last_msg = final_state.values["messages"][-1]
        proposed_tasks = []
        for tc in getattr(last_msg, "tool_calls", []):
            if tc["name"] == "create_tasks":
                proposed_tasks = tc["args"].get("tasks", [])
                break
                
        print(f"[run_brain_agent_stream] HITL interrupt hit. Staging {len(proposed_tasks)} pending tasks.", flush=True)
        yield {
            "type": "hitl_request",
            "tasks": proposed_tasks
        }
    else:
        if final_text:
            yield {"type": "final_answer", "content": final_text}
            
    print(f"[run_brain_agent_stream] Completed stream for thread_id={thread_id}", flush=True)
