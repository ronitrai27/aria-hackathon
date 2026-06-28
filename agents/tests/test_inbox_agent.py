"""
Test Script: Measure and trace inbox_agent async execution.

Run: python -m tests.test_inbox_agent
From: r:\\hackathon-project\\agents
"""

import sys
import time
import asyncio
from pathlib import Path

# Force UTF-8 output on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure src is importable
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=True)

from src.app.brain.inbox_agent import create_inbox_session, run_inbox_agent

async def mock_callback(event: dict):
    print(f"[Callback Event] Status: {event.get('status')} | Message: {event.get('message')}", flush=True)

async def test_main():
    user_id = "j575q101a4sycsnngr0kxz8hz5897wwm"
    instruction = (
        "Get my unread emails (last 7 days) and upcoming Google Calendar events (next 14 days). "
        "For each email include sender, subject, snippet, and unread status. "
        "For calendar events include title, start and end time with timezone, location, attendees, and description. "
        "Also flag any events that have 'meeting', 'call', 'review', 'demo', or 'deadline' in the title or description."
    )

    print("--- 1. Creating Composio session ---")
    start_time = time.time()
    session = create_inbox_session(user_id)
    print(f"Session created in {time.time() - start_time:.2f} seconds.")

    print("\n--- 2. Running inbox agent (async stream execution) ---")
    start_time = time.time()
    
    try:
        result = await run_inbox_agent(
            session=session,
            instruction=instruction,
            thread_id="test_inbox_thread_async",
            on_step_callback=mock_callback
        )
        print(f"\nResult: {result}")
    except ValueError as ve:
        print(f"\nCaught Expected Connection Abort: {str(ve)}")
    except Exception as e:
        print(f"\nCaught unexpected exception: {str(e)}")
        
    print(f"\nTotal execution time: {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    asyncio.run(test_main())
