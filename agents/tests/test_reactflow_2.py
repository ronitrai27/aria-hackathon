"""
Test Script 2: Send BCC email → Create calendar event

Simulates the workflow the agent would produce when user says:
  "Create a flow to send email to many using BCC and then create a
   client meet event in calendar."

No AI nodes here — pure Composio tool steps (user didn't ask for
research/summarize/classify/extract).

Run:  python -m tests.test_reactflow_2
From: r:\\hackathon-project\\agents
"""

import json
import sys
from pathlib import Path

# Ensure src is importable
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.utils.reactflow import workflow_to_reactflow


# ── Mock workflow (what the agent's set_workflow() would produce) ──────────

mock_workflow = {
    "name": "Bulk Email & Calendar Invite",
    "description": "Send a bulk email using BCC and then create a client meeting event in Google Calendar.",
    "steps": [
        {
            "tool_name": "GMAIL_SEND_EMAIL",
            "step_description": "Send an email to multiple recipients using BCC for privacy.",
            "fields": [
                {
                    "name": "recipient_email",
                    "type": "string",
                    "description": "Primary recipient email address",
                    "value": ""
                },
                {
                    "name": "subject",
                    "type": "string",
                    "description": "Email subject line",
                    "value": "Upcoming Client Meeting — Please Confirm"
                },
                {
                    "name": "body",
                    "type": "string",
                    "description": "Email body content",
                    "value": "Hi team,\n\nPlease confirm your availability for the upcoming client meeting.\n\nBest regards"
                },
                {
                    "name": "bcc",
                    "type": "string",
                    "description": "BCC recipients (comma-separated email addresses)",
                    "value": ""
                }
            ]
        },
        {
            "tool_name": "GOOGLECALENDAR_CREATE_EVENT",
            "step_description": "Create a client meeting event in Google Calendar.",
            "fields": [
                {
                    "name": "summary",
                    "type": "string",
                    "description": "Event title",
                    "value": "Client Meeting"
                },
                {
                    "name": "start_datetime",
                    "type": "string",
                    "description": "Event start time (ISO 8601 format)",
                    "value": ""
                },
                {
                    "name": "end_datetime",
                    "type": "string",
                    "description": "Event end time (ISO 8601 format)",
                    "value": ""
                },
                {
                    "name": "description",
                    "type": "string",
                    "description": "Event description / agenda",
                    "value": "Client meeting to discuss project updates and next steps."
                },
                {
                    "name": "attendees",
                    "type": "string",
                    "description": "Comma-separated list of attendee emails",
                    "value": ""
                }
            ]
        }
    ]
}


# ── Convert & print ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    result = workflow_to_reactflow(mock_workflow)

    print("=" * 70)
    print("  TEST 2: BCC Email → Google Calendar Event")
    print("=" * 70)
    print(f"\n  Total nodes: {len(result['nodes'])}")
    print(f"  Total edges: {len(result['edges'])}")
    print()

    for node in result["nodes"]:
        node_type = node["type"]
        ai_op = node["data"].get("ai_operation", "")
        label = node["data"]["label"]
        pos = node["position"]
        tag = f" [AI: {ai_op}]" if ai_op else ""
        print(f"  📦 {node['id']:10s}  type={node_type:8s}  label={label}{tag}  pos=({pos['x']}, {pos['y']})")

    print()
    for edge in result["edges"]:
        print(f"  🔗 {edge['source']:10s} ──▶ {edge['target']:10s}  animated={edge['animated']}")

    print("\n" + "─" * 70)
    print("\nFull JSON output:\n")
    print(json.dumps(result, indent=2))
