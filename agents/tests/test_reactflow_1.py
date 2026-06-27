"""
Test Script 1: Research about OpenAI → Send email → Message on Slack

Simulates the workflow the agent would produce when user says:
  "Research about OpenAI and send the findings to email and message on Slack"

This uses an AI_RESEARCH node (user explicitly asked for research)
followed by two Composio tool steps.

Run:  python -m tests.test_reactflow_1
From: r:\\hackathon-project\\agents
"""

import json
import sys
from pathlib import Path

# Force stdout/stderr to use UTF-8 encoding on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure src is importable
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.utils.reactflow import workflow_to_reactflow


# ── Mock workflow (what the agent's set_workflow() would produce) ──────────

mock_workflow = {
    "name": "OpenAI Research & Notify",
    "description": "Research about OpenAI, email the findings, and post a summary on Slack.",
    "steps": [
        {
            "tool_name": "AI_RESEARCH",
            "step_description": "Deep-dive research on OpenAI — latest news, products, and strategy.",
            "fields": [
                {
                    "name": "topic",
                    "type": "string",
                    "description": "The subject to research",
                    "value": "OpenAI latest developments, products, and strategy 2025"
                },
                {
                    "name": "depth",
                    "type": "string",
                    "description": "Research depth: 'brief' or 'detailed'",
                    "value": "detailed"
                }
            ]
        },
        {
            "tool_name": "GMAIL_SEND_EMAIL",
            "step_description": "Send the research findings via email.",
            "fields": [
                {
                    "name": "recipient_email",
                    "type": "string",
                    "description": "Email address of the recipient",
                    "value": ""
                },
                {
                    "name": "subject",
                    "type": "string",
                    "description": "Email subject line",
                    "value": "OpenAI Research Report"
                },
                {
                    "name": "body",
                    "type": "string",
                    "description": "Email body content",
                    "value": "Here are the research findings on OpenAI:\n\n{{step_1}}"
                }
            ]
        },
        {
            "tool_name": "SLACK_SEND_MESSAGE",
            "step_description": "Post a summary of the research to a Slack channel.",
            "fields": [
                {
                    "name": "channel",
                    "type": "string",
                    "description": "Slack channel to post in",
                    "value": "#general"
                },
                {
                    "name": "markdown_text",
                    "type": "string",
                    "description": "Message content (supports Slack markdown)",
                    "value": "📋 *OpenAI Research Summary*\n\n{{step_1}}"
                }
            ]
        }
    ]
}


# ── Convert & print ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    result = workflow_to_reactflow(mock_workflow)

    print("=" * 70)
    print("  TEST 1: Research about OpenAI → Email → Slack")
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
