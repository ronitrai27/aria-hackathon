# import asyncio
# import os
# from langchain_core.messages import HumanMessage
# from app.parent.graph import build_parent_graph
# from langgraph.checkpoint.memory import MemorySaver

# async def main():
#     checkpointer = MemorySaver()
#     parent_graph = build_parent_graph().compile(checkpointer=checkpointer)
    
#     config = {"configurable": {"thread_id": "test_thread"}}
#     state_input = {
#         "messages": [HumanMessage(content="create me a flow where hello im a rox to email and then send to slack")],
#         "turn_count": 0,
#         "status": "running"
#     }

#     print("Running Parent Graph test...")
#     async for path, chunk in parent_graph.astream(
#         state_input, config, stream_mode="updates", subgraphs=True
#     ):
#         print(f"Path: {path} | Chunk: {chunk}\n")
        
#     # Get final state
#     final_state = parent_graph.get_state(config).values
#     print("\n--- FINAL STATE ---")
#     print("status:", final_state.get("status"))
#     print("next_route:", final_state.get("next_route"))
#     print("final_response:", final_state.get("final_response"))
#     print("workflow_schema:", final_state.get("workflow_schema"))
#     print("worker_results:", final_state.get("worker_results"))

# if __name__ == "__main__":
#     asyncio.run(main())
