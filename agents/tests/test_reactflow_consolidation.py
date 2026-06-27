"""
Test Script: Consolidation of Duplicate AI Nodes
Simulates a workflow where the agent outputs multiple AI_RESEARCH nodes.
Verifies that they are successfully merged and reference indices are adjusted.

Run: python -m tests.test_reactflow_consolidation
From: r:\\hackathon-project\\agents
"""

import json
import sys
from pathlib import Path

# Ensure src is importable
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.utils.reactflow import workflow_to_reactflow, consolidate_steps

# ── Mock duplicate workflow ──────────────────────────────────────────────────

mock_duplicate_workflow = {
    "name": "HN + YC digest → Email draft + LinkedIn post",
    "description": "Find latest startup posts on Hacker News and recent YC videos, summarize them with AI, create an email draft and prepare a LinkedIn post draft.",
    "steps": [
        {
            "tool_name": "AI_RESEARCH",
            "step_description": "Find latest Hacker News posts about startups.",
            "fields": [
                {
                    "name": "prompt",
                    "type": "string",
                    "description": "Instructions for the AI",
                    "value": "Search Hacker News for startup posts."
                }
            ]
        },
        {
            "tool_name": "AI_RESEARCH",
            "step_description": "List recent Y Combinator YouTube uploads.",
            "fields": [
                {
                    "name": "prompt",
                    "type": "string",
                    "description": "Instructions for the AI",
                    "value": "List recent videos on YC YouTube channel."
                }
            ]
        },
        {
            "tool_name": "AI_RESEARCH",
            "step_description": "Retrieve transcripts for YC videos.",
            "fields": [
                {
                    "name": "prompt",
                    "type": "string",
                    "description": "Instructions for the AI",
                    "value": "Retrieve transcripts for videos from {{step_2}}."
                }
            ]
        },
        {
            "tool_name": "AI_SUMMARIZE",
            "step_description": "Summarize HN posts + YC transcripts.",
            "fields": [
                {
                    "name": "prompt",
                    "type": "string",
                    "description": "Instructions for the AI",
                    "value": "Summarize HN posts from {{step_1}} and transcripts from {{step_3}}."
                }
            ]
        },
        {
            "tool_name": "GMAIL_CREATE_EMAIL_DRAFT",
            "step_description": "Create Gmail draft.",
            "fields": [
                {
                    "name": "body",
                    "type": "string",
                    "description": "Email body",
                    "value": "Here is the digest:\n\n{{step_4.email_digest}}"
                }
            ]
        }
    ]
}


if __name__ == "__main__":
    print("=" * 70)
    print("  TESTING STEP CONSOLIDATION DIRECTLY")
    print("=" * 70)
    
    consolidated = consolidate_steps(mock_duplicate_workflow["steps"])
    print(f"\n  Original step count: {len(mock_duplicate_workflow['steps'])}")
    print(f"  Consolidated step count: {len(consolidated)}")
    
    print("\n  Steps details:")
    for idx, step in enumerate(consolidated, 1):
        print(f"  Step {idx}: {step['tool_name']}")
        print(f"    Desc: {step['step_description']}")
        for f in step.get("fields", []):
            print(f"    Field '{f['name']}' = {f['value']!r}")
            
    print("\n" + "=" * 70)
    print("  TESTING REACT FLOW GENERATION")
    print("=" * 70)
    
    result = workflow_to_reactflow(mock_duplicate_workflow)
    print(f"\n  Nodes created: {len(result['nodes'])}")
    print(f"  Edges created: {len(result['edges'])}")
    
    for node in result["nodes"]:
        print(f"  📦 Node: {node['id']} - label: {node['data']['label']} (type: {node['type']})")
        
    for edge in result["edges"]:
        print(f"  🔗 Edge: {edge['source']} ──▶ {edge['target']}")
        
    # Validations
    assert len(consolidated) == 3, f"Expected 3 steps, got {len(consolidated)}"
    assert consolidated[0]["tool_name"] == "AI_RESEARCH"
    assert consolidated[1]["tool_name"] == "AI_SUMMARIZE"
    assert consolidated[2]["tool_name"] == "GMAIL_CREATE_EMAIL_DRAFT"
    
    # Check merged prompts
    research_prompt = consolidated[0]["fields"][0]["value"]
    assert "Search Hacker News" in research_prompt
    assert "List recent videos" in research_prompt
    # Check updated placeholder in research prompt (step_2 should become step_1 since it's merged)
    assert "from {{step_1}}" in research_prompt or "from {{ step_1 }}" in research_prompt
    
    # Check summarize step placeholders: step_1 and step_3 should both resolve to step_1
    summarize_prompt = consolidated[1]["fields"][0]["value"]
    assert "{{step_1}}" in summarize_prompt
    assert "{{step_3}}" not in summarize_prompt
    
    # Check gmail step placeholder: step_4.email_digest should resolve to step_2.email_digest
    gmail_body = consolidated[2]["fields"][0]["value"]
    assert "{{step_2.email_digest}}" in gmail_body
    
    print("\n  ✓ ALL VALIDATIONS PASSED SUCCESSFULLY!")
