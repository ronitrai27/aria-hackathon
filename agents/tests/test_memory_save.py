"""
Test script for verifying Pinecone and Neo4j memory writing utilities.
Run: poetry run python tests/test_memory_save.py
"""

import sys
import asyncio
from pathlib import Path

# Add src to sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load .env and override system env vars (e.g. OpenAI keys)
from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=True)

from src.utils.vector_store import upsert_vector_store, query_pinecone
from src.utils.graph_db import upsert_knowledge_graph, query_neo4j
from src.utils.entity_extractor import extract_knowledge_graph_elements

# Set up UTF-8 encoding for Windows CLI
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

async def test_memory_writes():
    user_id = "user_3FYJ8kFMGmpFPmqhxbjPLCGn3bF"
    print("=" * 60)
    print("  RUNNING MEMORY WRITE INTEGRATION TESTS")
    print("=" * 60)

    # 1. Test Pinecone Vector Upsert
    test_facts = [
        "User prefers Vanilla CSS over TailwindCSS",
        "User is working on update-schema task for Project Atlas"
    ]
    print(f"\n[Step 1] Upserting facts to Pinecone: {test_facts}")
    v_res = upsert_vector_store(user_id, test_facts)
    print(f"Upsert status: {v_res}")
    assert v_res is True, "Pinecone upsert failed!"

    # Verify via query
    print("\n[Step 2] Querying Pinecone vector store...")
    query_res = query_pinecone(user_id, "styling stack preference")
    print("Pinecone matches:")
    for match in query_res:
        print(f"  - [{match['score']:.4f}] {match['text']}")
    assert len(query_res) > 0, "No vectors retrieved from Pinecone!"

    # 2. Test Neo4j Graph Upsert
    print("\n[Step 3] Extracting graph elements from facts...")
    combined_elements = {"entities": [], "relations": []}
    for fact in test_facts:
        elements = extract_knowledge_graph_elements(fact)
        combined_elements["entities"].extend(elements.get("entities", []))
        combined_elements["relations"].extend(elements.get("relations", []))

    # Deduplicate entities
    seen_entities = {}
    for ent in combined_elements["entities"]:
        seen_entities[ent["name"].lower()] = ent
    combined_elements["entities"] = list(seen_entities.values())

    print("Extracted Entities:")
    for ent in combined_elements["entities"]:
        print(f"  - {ent['name']}: {ent['label']}")
    print("Extracted Relations:")
    for rel in combined_elements["relations"]:
        print(f"  - {rel['source']} --[{rel['type']}]--> {rel['target']}")

    print("\n[Step 4] Upserting to Neo4j...")
    g_res = upsert_knowledge_graph(user_id, combined_elements)
    print(f"Graph upsert status: {g_res}")
    assert g_res is True, "Neo4j upsert failed!"

    # Verify via query
    print("\n[Step 5] Querying Neo4j neighborhood graph...")
    graph_res = query_neo4j(user_id, "anything")
    print("Neo4j matches:")
    for rel in graph_res:
        print(f"  - USER --[{rel['relationship']}]--> {rel['name']} ({rel['labels']})")
    assert len(graph_res) > 0, "No graph elements retrieved from Neo4j!"

    print("\n" + "=" * 60)
    print("  ✓ ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_memory_writes())
