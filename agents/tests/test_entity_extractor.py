"""
Unit tests for agents/src/utils/entity_extractor.py
Run: python -m tests.test_entity_extractor
From: r:\\hackathon-project\\agents
"""

import sys
from pathlib import Path

# Force UTF-8 output on Windows to prevent UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add src to sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.utils.entity_extractor import extract_entities, extract_knowledge_graph_elements

def run_tests():
    print("=" * 60)
    print("  RUNNING ENTITY EXTRACTOR TESTS")
    print("=" * 60)

    # Test Case 1: Tech stack should not be CONTACT
    test_1 = "I am building a Next.js application with TypeScript and Pinecone database, deploying on Vercel."
    res_1 = extract_entities(test_1)
    print(f"\n[Test 1] Input: {test_1!r}")
    print("Extracted entities:")
    for ent in res_1:
        print(f"  - {ent['name']}: {ent['label']}")

    # Assertions
    contacts = [e['name'].lower() for e in res_1 if e['label'] == 'CONTACT']
    assert "next.js" not in contacts, "Next.js should not be classified as a CONTACT!"
    assert "typescript" not in contacts, "TypeScript should not be classified as a CONTACT!"
    assert "pinecone" not in contacts, "Pinecone should not be classified as a CONTACT!"
    assert "vercel" not in contacts, "Vercel should not be classified as a CONTACT!"

    # Test Case 2: Filter out noisy words like "api", "assistant", "yesterday", "details", "data"
    test_2 = "Yesterday I asked the assistant to fetch the api details and sync the database data."
    res_2 = extract_entities(test_2)
    print(f"\n[Test 2] Input: {test_2!r}")
    print("Extracted entities:")
    for ent in res_2:
        print(f"  - {ent['name']}: {ent['label']}")

    names = [e['name'].lower() for e in res_2]
    noisy_words = {"yesterday", "assistant", "api", "details", "data", "database"}
    for word in noisy_words:
        assert word not in names, f"Noisy word {word!r} should be filtered out!"

    # Test Case 3: Proper humans and channels should be CONTACT
    test_3 = "Ronit and Sarah discussed Sprint Planning on the Slack channel #general."
    res_3 = extract_entities(test_3)
    print(f"\n[Test 3] Input: {test_3!r}")
    print("Extracted entities:")
    for ent in res_3:
        print(f"  - {ent['name']}: {ent['label']}")

    contacts_3 = [e['name'].lower() for e in res_3 if e['label'] == 'CONTACT']
    assert "ronit" in contacts_3, "Ronit should be a CONTACT!"
    assert "sarah" in contacts_3, "Sarah should be a CONTACT!"

    # Test Case 4: Preferences and stack choices + relations
    test_4 = "The user prefers Vanilla CSS over TailwindCSS."
    res_4 = extract_knowledge_graph_elements(test_4)
    print(f"\n[Test 4] Input: {test_4!r}")
    print("Extracted entities:")
    for ent in res_4["entities"]:
        print(f"  - {ent['name']}: {ent['label']}")
    print("Extracted relations:")
    for rel in res_4["relations"]:
        print(f"  - {rel['source']} --[{rel['type']}]--> {rel['target']}")

    # Assert relations
    pref_relations = [
        r for r in res_4["relations"]
        if r["source"] == "USER" and r["type"] == "PREFERS" and r["target"] == "Vanilla CSS"
    ]
    assert len(pref_relations) > 0, "Should extract USER -[PREFERS]-> Vanilla CSS relation!"

    # Test Case 5: Full KG elements extraction
    test_5 = "Ronit is working on update-schema task for Project Atlas."
    res_5 = extract_knowledge_graph_elements(test_5)
    print(f"\n[Test 5] Input: {test_5!r}")
    print("KG Entities:")
    for ent in res_5["entities"]:
        print(f"  - {ent['name']}: {ent['label']}")
    print("KG Relations:")
    for rel in res_5["relations"]:
        print(f"  - {rel['source']} --[{rel['type']}]--> {rel['target']}")

    print("\n" + "=" * 60)
    print("  ✓ ALL TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
