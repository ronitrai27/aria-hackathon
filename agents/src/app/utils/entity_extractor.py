# agents/src/app/utils/entity_extractor.py
#
# A module to extract entities and relationship triplets from conversation logs
# and other textual data to populate a personalized long-term knowledge graph.
#
# Core target entity nodes: USER, CONTACT, TASK, EVENT, DOCUMENT, WORKFLOW, FACT, SKILL
#
# Pure extraction logic - NO database operations.

import re
import spacy
from spacy.pipeline import EntityRuler
from typing import List, Dict, Tuple, Any, Optional
from loguru import logger

# Load spaCy English model (medium model for better accuracy)
try:
    nlp = spacy.load("en_core_web_md")
    logger.info("Loaded spaCy medium model (en_core_web_md) successfully.")
except OSError:
    logger.warning("spaCy medium model (en_core_web_md) not found. Falling back to en_core_web_sm.")
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        nlp = spacy.load("en")

# ─── Custom EntityRuler — catches domain patterns spaCy misses ────────────────
if "entity_ruler" not in nlp.pipe_names:
    ruler = nlp.add_pipe("entity_ruler", before="ner")
    
    _dept_names = [
        "Engineering", "Security", "Research", "Finance", "Human Resources",
        "Legal", "Product", "Customer Success", "Infrastructure", "Data Science",
    ]
    
    _custom_features = [
        "AI Assistant", "Authentication", "Analytics", "GraphRAG",
        "Project Atlas", "Project Orion", "Project Nebula",
        "Project WeKraft", "WeKraft", "AWS infrastructure",
        "Atlas", "Orion", "Nebula", "OpenAI Agent Workspace",
        "Knowledge Graph", "Hybrid RAG", "Graph Only RAG",
    ]
    
    _skills = [
        "Python", "TypeScript", "JavaScript", "React", "Next.js",
        "Streamlit", "LangGraph", "LangChain", "OpenAI API",
        "Neo4j", "Cypher", "Pinecone", "BM25", "LlamaParse",
        "spaCy", "GraphRAG", "RAG", "Prompt Engineering",
        "Product Management", "UX Research", "Security Review",
        "API Design", "Data Modeling", "Workflow Automation",
    ]
    
    _roles = [
        "Product Manager", "Engineering Lead", "Backend Engineer",
        "Frontend Engineer", "Data Scientist", "Security Engineer",
        "Designer", "QA Engineer", "Researcher", "Analyst",
    ]
    
    _workflows = [
        "Slack Workflow", "Slack Alert", "Email Trigger", "Webhook Integration",
        "Cron Job", "GitHub Action", "Airflow DAG", "Automation Pipeline"
    ]
    
    _events = [
        "Daily Standup", "Retro", "Planning Huddle", "Review Session",
        "Sprint Planning", "Client Call", "Sync Meeting", "1-on-1 Meeting",
        "Daily Standup Meeting", "Standup Meeting", "Standup"
    ]

    dept_patterns = [
        {"label": "ORG", "pattern": [{"LOWER": name.lower()}, {"LOWER": "department"}]}
        for name in _dept_names
    ] + [
        {"label": "ORG", "pattern": [{"LOWER": name.lower()}]}
        for name in _dept_names
    ]
    
    feature_patterns = [
        {"label": "PROJECT", "pattern": [{"LOWER": word.lower()} for word in name.split()]}
        for name in _custom_features
    ]
    
    skill_patterns = [
        {"label": "SKILL", "pattern": [{"LOWER": word.lower()} for word in name.split()]}
        for name in _skills
    ]
    role_patterns = [
        {"label": "ROLE", "pattern": [{"LOWER": word.lower()} for word in name.split()]}
        for name in _roles
    ]
    workflow_patterns = [
        {"label": "WORKFLOW", "pattern": [{"LOWER": word.lower()} for word in name.split()]}
        for name in _workflows
    ]
    event_patterns = [
        {"label": "EVENT", "pattern": [{"LOWER": word.lower()} for word in name.split()]}
        for name in _events
    ]

    ruler.add_patterns(
        dept_patterns + feature_patterns + skill_patterns + role_patterns + workflow_patterns + event_patterns
    )

# Target entity types and standard spaCy mapping rules
TARGET_ENTITIES = {"USER", "CONTACT", "TASK", "EVENT", "DOCUMENT", "WORKFLOW", "FACT", "SKILL"}

PERSON_RE = r"\b[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}\b"

# Name categories hints to aid fallback labeling
ORG_OR_PRODUCT_HINTS = {
    "api", "assistant", "atlas", "automation", "bm25", "dashboard", "graphrag",
    "knowledge graph", "langgraph", "llamaparse", "neo4j", "openai", "pinecone",
    "platform", "project", "rag", "streamlit", "wekraft", "workflow",
}
SKILL_HINTS = {
    "api design", "bm25", "cypher", "data modeling", "graphrag", "javascript",
    "langchain", "langgraph", "llamaparse", "neo4j", "next.js", "pinecone",
    "prompt engineering", "python", "rag", "react", "security review", "spacy",
    "streamlit", "typescript", "ux research", "workflow automation",
}
ROLE_HINTS = {
    "analyst", "architect", "designer", "engineer", "lead", "manager",
    "owner", "researcher", "scientist",
}


def _clean_and_validate_node(name: str) -> str:
    """
    Clean and validate entity or relation node names.
    - Strips leading/trailing '#' characters and whitespace/newlines.
    - Normalizes internal whitespaces/newlines.
    - Strips leading "the " (case-insensitive).
    - Skips if the node starts with '#' or digits followed by whitespace.
    - Skips if the node is longer than 60 characters or empty/single-char.
    - Skips if the node is a merged clause with verbs.
    """
    if not name:
        return ""
    
    norm_temp = re.sub(r"\s+", " ", name).strip()
    if re.match(r"^#\s", norm_temp) or re.match(r"^\d+\s", norm_temp):
        return ""
        
    cleaned = name.strip("# \t\n\r,.-'\"")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    
    if cleaned.lower().startswith("the "):
        cleaned = cleaned[4:].strip()
        
    cleaned = cleaned.strip("# \t\n\r,.-'\"")
    
    if len(cleaned) > 60 or len(cleaned) <= 1:
        return ""
        
    lower_cleaned = cleaned.lower()
    words = lower_cleaned.split()
    if not words:
        return ""
        
    bad_words = {"with", "to", "from", "for", "and", "in", "on", "of", "about", "works", "contributes", "reports", "attends", "collaborates", "depends"}
    if words[0] in bad_words or words[-1] in bad_words:
        return ""
        
    if re.search(r"\b(works|contributes|collaborates|reports|attends|depends)\b", lower_cleaned):
        return ""
        
    return cleaned


def _normalize_node_name(name: str, user_name: Optional[str] = None) -> str:
    """
    Cleans node name and resolves personal pronouns / user identity to central 'USER'.
    """
    if not name:
        return ""
    
    temp_cleaned = name.strip("# \t\n\r,.-'\"")
    if temp_cleaned.lower() in ("i", "me", "my", "myself"):
        return "USER"
    if user_name and temp_cleaned.lower() == user_name.lower():
        return "USER"
        
    cleaned = _clean_and_validate_node(name)
    return cleaned


def map_label(label: str, name: str, user_name: Optional[str] = None) -> str:
    """
    Maps spaCy or custom entity labels to our core entities:
    USER, CONTACT, TASK, EVENT, DOCUMENT, WORKFLOW, FACT, SKILL
    """
    label_upper = label.upper()
    name_lower = name.lower()

    # User identification
    if name_lower == "user" or (user_name and name_lower == user_name.lower()):
        return "USER"

    if label_upper == "PERSON":
        return "CONTACT"

    if label_upper in ("ORG", "GPE", "NORP", "LOC", "FAC"):
        # Organizations, locations, and teams represent communication boundaries
        return "CONTACT"

    if label_upper in ("PRODUCT", "WORK_OF_ART", "LAW"):
        # Digital assets, files, schemas, APIs, libraries
        if any(w in name_lower for w in ["workflow", "automation", "pipeline", "flow"]):
            return "WORKFLOW"
        return "DOCUMENT"

    if label_upper in ("EVENT", "DATE", "TIME"):
        return "EVENT"

    if label_upper in ("TASK", "PROJECT"):
        return "TASK"

    if label_upper in ("WORKFLOW", "AUTOMATION"):
        return "WORKFLOW"

    if label_upper == "SKILL":
        return "SKILL"

    if label_upper in ("FACT", "ROLE", "EXPERIENCE"):
        return "FACT"

    # Lexical fallback matching
    if any(word in name_lower.split() for word in ["workflow", "automation", "flow", "react-flow", "trigger", "action"]):
        return "WORKFLOW"
    if any(word in name_lower.split() for word in ["task", "project", "ticket", "issue", "milestone"]):
        return "TASK"
    if any(word in name_lower.split() for word in ["meeting", "call", "event", "standup", "huddle", "sync", "calendar"]):
        return "EVENT"
    if any(word in name_lower.split() for word in ["document", "file", "url", "codebase", "repo", "api", "doc", "pdf", "sheet"]):
        return "DOCUMENT"
    if name_lower in SKILL_HINTS:
        return "SKILL"
    if any(word in name_lower.split() for word in ["skill", "profile", "fact", "preference", "hobby", "habit"]):
        return "FACT"

    return "FACT"


def _infer_entity_label(name: str, default: str = "FACT") -> str:
    """Infer semantic categories from raw names for fallback mapping."""
    lower = name.lower().strip()
    if lower in SKILL_HINTS:
        return "SKILL"
    if any(word in lower.split() for word in ROLE_HINTS):
        return "FACT"
    if lower.startswith("project ") or " project " in lower:
        return "TASK"
    if any(hint in lower for hint in ORG_OR_PRODUCT_HINTS):
        return "DOCUMENT"
    return default


def _remember_entity(entities: Dict[str, tuple], raw_name: str, label: str, user_name: Optional[str] = None) -> None:
    """Store an entity with longer-match deduplication and custom mapping."""
    name = _normalize_node_name(raw_name, user_name)
    if not name or re.fullmatch(r"[\d\W]+", name):
        return

    # Map the label to our target set
    mapped = map_label(label, name, user_name)

    if mapped == "CONTACT" and label == "PERSON":
        name = name.title()

    lower = name.lower()
    dominated = False
    to_delete = []
    
    for stored_lower, (stored_name, _stored_label) in entities.items():
        if lower == stored_lower:
            if len(name) > len(stored_name):
                to_delete.append(stored_lower)
            else:
                dominated = True
            break
        if lower in stored_lower:
            dominated = True
            break
        if stored_lower in lower:
            to_delete.append(stored_lower)

    for key in to_delete:
        del entities[key]

    if not dominated:
        entities[lower] = (name, mapped)


def _split_profile_items(items: str) -> List[str]:
    """Split comma or 'and' joined listing blocks into clean nodes."""
    cleaned = re.sub(r"\([^)]*\)", "", items)
    cleaned = re.sub(r"\b(?:and|plus)\b", ",", cleaned, flags=re.IGNORECASE)
    parts = [part.strip(" .;:") for part in cleaned.split(",")]
    return [part for part in parts if _clean_and_validate_node(part)]


def _extract_profile_entities(text: str, user_name: Optional[str] = None) -> List[Dict[str, str]]:
    """Extract profile declarations (skills, roles, milestones) from bio-like texts."""
    entities: Dict[str, str] = {}

    for match in re.finditer(rf"\b({PERSON_RE})\b", text):
        name = _normalize_node_name(match.group(1), user_name)
        if name and name != "USER":
            entities[name] = "CONTACT"

    labelled_lists = [
        (r"\bskills?\s*[:=-]\s*(?P<items>[^.\n]+)", "FACT"),
        (r"\b(?:past|previous|earlier)\s+experience\s*[:=-]\s*(?P<items>[^.\n]+)", "FACT"),
        (r"\b(?:role|title)\s*[:=-]\s*(?P<items>[^.\n]+)", "FACT"),
        (r"\b(?:projects?|products?)\s*[:=-]\s*(?P<items>[^.\n]+)", "TASK"),
    ]
    for pattern, label in labelled_lists:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            for item in _split_profile_items(match.group("items")):
                name = _normalize_node_name(item, user_name)
                if name:
                    entities[name] = label

    return [{"name": name, "label": label} for name, label in entities.items()]


def extract_entities(text: str, user_name: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Extract unique entities and map them to our core set using spaCy NER + custom EntityRuler.
    """
    clean_text = re.sub(r"\s+", " ", text).strip()

    texts_to_try = [clean_text]
    if clean_text == clean_text.lower() and len(clean_text) < 500:
        texts_to_try.append(clean_text.title())

    entities: Dict[str, tuple] = {}

    for current_text in texts_to_try:
        doc = nlp(current_text)

        for ent in doc.ents:
            raw_name = ent.text.strip()
            label = ent.label_

            if len(raw_name) < 2:
                continue

            token = ent.root
            expanded_name = raw_name
            if doc.noun_chunks:
                for chunk in doc.noun_chunks:
                    if token in chunk:
                        words = [t.text for t in chunk if t.pos_ != "DET"]
                        chunk_text = " ".join(words).strip()

                        if label == "PERSON":
                            chunk_text = chunk_text.title()

                        chunk_words = chunk_text.split()
                        if len(chunk_words) <= 4 and all(w[0].isupper() for w in chunk_words if w and w[0].isalpha()):
                            expanded_name = chunk_text
                        break

            name = _normalize_node_name(expanded_name, user_name)
            if not name:
                name = _normalize_node_name(raw_name, user_name)
                if not name:
                    continue

            mapped = map_label(label, name, user_name)

            if mapped == "CONTACT" and label == "PERSON":
                name = name.title()

            lower = name.lower()

            if re.fullmatch(r"[\d\W]+", name):
                continue

            dominated = False
            to_delete = []
            for stored_lower, (stored_name, _stored_label) in entities.items():
                if lower == stored_lower:
                    if len(name) > len(stored_name):
                        to_delete.append(stored_lower)
                    else:
                        dominated = True
                    break
                if lower in stored_lower:
                    dominated = True
                    break
                if stored_lower in lower:
                    to_delete.append(stored_lower)

            for k in to_delete:
                del entities[k]

            if not dominated:
                entities[lower] = (name, mapped)

    for ent in _extract_profile_entities(clean_text, user_name):
        _remember_entity(entities, ent["name"], ent["label"], user_name)

    return [{"name": name, "label": label} for name, label in entities.values()]


def extract_svo_triplets(text: str) -> List[Tuple[str, str, str]]:
    """
    Extract (Subject, Verb/Relation, Object) triplets using spaCy dependency parser.
    """
    doc = nlp(text)
    triplets = []
    
    for sent in doc.sents:
        for token in sent:
            if token.pos_ == "VERB":
                subj = None
                obj = None
                
                for child in token.children:
                    if child.dep_ in ("nsubj", "nsubjpass"):
                        subj = _get_noun_chunk(child)
                    elif child.dep_ in ("dobj", "attr", "oprd"):
                        obj = _get_noun_chunk(child)
                    elif child.dep_ == "prep":
                        for prep_child in child.children:
                            if prep_child.dep_ in ("pobj", "pcomp"):
                                obj = _get_noun_chunk(prep_child)
                                
                if subj and obj:
                    relation = token.lemma_.lower()
                    if relation == "be":
                        prep_parts = [child.text for child in token.children if child.dep_ in ("prep", "attr")]
                        if prep_parts:
                            relation = f"is {' '.join(prep_parts)}".lower()
                    
                    triplets.append((subj, relation, obj))
                    
    return triplets


def _get_noun_chunk(token) -> str:
    """Helper to reconstruct noun chunk for parsed subject/object tokens."""
    if token.doc.noun_chunks:
        for chunk in token.doc.noun_chunks:
            if token in chunk:
                words = [t.text for t in chunk if t.pos_ != "DET"]
                return " ".join(words).strip()
    
    words = []
    for t in token.subtree:
        if t.dep_ in ("compound", "amod", "flat") or t == token:
            words.append(t.text)
    return " ".join(words).strip()


def _normalise_relation_type(relation: str) -> str:
    """Normalize verbs to clean relationship names."""
    rel_upper = relation.upper().replace(" ", "_")
    
    # Check if there is a known mapped relation type
    # Collaboration/Management
    if rel_upper in ("WORKS_WITH", "COLLABORATES_WITH", "COOPERATES_WITH"):
        return "WORKS_WITH"
    if rel_upper in ("REPORTS_TO", "SUBMITS_TO"):
        return "REPORTS_TO"
    if rel_upper in ("MANAGES", "SUPERVISES", "DIRECTS", "LEADS"):
        return "MANAGES"
    
    # Tasking/Assignments
    if rel_upper in ("ASSIGNED_TO", "WORKS_ON", "CONTRIBUTES_TO", "HANDLES"):
        return "ASSIGNED_TO"
        
    # Calendars/Attendance
    if rel_upper in ("ATTENDED", "PARTICIPATED_IN", "JOINS", "JOINED", "SYNCED_ON"):
        return "ATTENDED"
        
    # Creation
    if rel_upper in ("CREATED", "BUILT", "DEVELOPED", "DESIGNED", "ARCHITECTED", "CODED", "AUTHORED", "WROTE"):
        return "CREATED"
        
    # Discussing
    if rel_upper in ("DISCUSSED", "MENTIONED", "TALKED_ABOUT", "REVIEWED"):
        return "DISCUSSED"

    # Workflows/Automations
    if rel_upper in ("AUTOMATES", "TRIGGERS", "RUNS"):
        return "AUTOMATES"
    if rel_upper in ("MONITORS", "WATCHES", "TRACKS"):
        return "MONITORS"
        
    # Dependencies
    if rel_upper in ("DEPENDS_ON", "REQUIRES", "NEEDS"):
        return "DEPENDS_ON"
    if rel_upper in ("BLOCKS", "PREVENTS"):
        return "BLOCKS"

    return re.sub(r"[^A-Z0-9_]+", "_", rel_upper).strip("_") or "RELATED_TO"


def _add_relation(
    relations: List[Dict[str, str]],
    seen: set,
    source: str,
    relation_type: str,
    target: str,
    user_name: Optional[str] = None,
) -> None:
    """Utility to clean, validate, and append normalized relationships."""
    clean_source = _normalize_node_name(source, user_name)
    clean_target = _normalize_node_name(target, user_name)
    if not clean_source or not clean_target or clean_source == clean_target:
        return

    relation = {
        "source": clean_source,
        "type": _normalise_relation_type(relation_type),
        "target": clean_target,
    }
    relation_key = (
        relation["source"].casefold(),
        relation["type"],
        relation["target"].casefold(),
    )
    if relation_key not in seen:
        seen.add(relation_key)
        relations.append(relation)


def _extract_profile_relations(text: str, user_name: Optional[str] = None) -> List[Dict[str, str]]:
    """Extract profile statements directly using pattern matching rules."""
    relations: List[Dict[str, str]] = []
    seen: set = set()

    sentences = [s.strip() for s in re.split(r"[\n.;]+", text) if s.strip()]
    work_verbs = {
        "architects": "ARCHITECT",
        "builds": "BUILD",
        "built": "BUILT",
        "creates": "CREATE",
        "created": "CREATE",
        "designs": "DESIGN",
        "develops": "DEVELOP",
        "implements": "IMPLEMENT",
        "leads": "LEAD",
        "maintains": "MAINTAIN",
        "manages": "MANAGE",
        "owns": "OWN",
        "tests": "TEST",
    }

    for sentence in sentences:
        skill_match = re.search(
            rf"\b(?P<person>{PERSON_RE})\b\s+(?:has|uses|brings|knows|specializes\s+in|is\s+skilled\s+in)\s+"
            rf"(?:(?:skills?|expertise|experience)\s+(?:in|with)\s+)?(?P<items>.+)$",
            sentence,
            flags=re.IGNORECASE,
        )
        if skill_match:
            for item in _split_profile_items(skill_match.group("items")):
                _add_relation(relations, seen, skill_match.group("person"), "SKILLED_IN", item, user_name)

        exp_match = re.search(
            rf"\b(?P<person>{PERSON_RE})\b\s+(?:previously|earlier|formerly)\s+"
            rf"(?P<verb>worked\s+(?:at|for|with|on)|served\s+at|built|created|developed|led|designed)\s+"
            rf"(?P<items>.+)$",
            sentence,
            flags=re.IGNORECASE,
        )
        if exp_match:
            verb = exp_match.group("verb").lower()
            relation_type = "HAS_EXPERIENCE_IN"
            if "worked at" in verb or "worked for" in verb or "served at" in verb:
                relation_type = "WORKED_AT"
            elif "worked on" in verb:
                relation_type = "WORKED_ON"
            elif verb in {"built", "created", "developed", "led", "designed"}:
                relation_type = f"PREVIOUSLY_{verb.upper()}"
            for item in _split_profile_items(exp_match.group("items")):
                _add_relation(relations, seen, exp_match.group("person"), relation_type, item, user_name)

        profile_exp_match = re.search(
            rf"\b(?P<person>{PERSON_RE})\b.+\b(?:past|previous|earlier)\s+experience\s+(?:includes|with|in)\s+"
            rf"(?P<items>.+)$",
            sentence,
            flags=re.IGNORECASE,
        )
        if profile_exp_match:
            for item in _split_profile_items(profile_exp_match.group("items")):
                _add_relation(relations, seen, profile_exp_match.group("person"), "HAS_EXPERIENCE_IN", item, user_name)

        for verb, relation_type in work_verbs.items():
            work_match = re.search(
                rf"\b(?P<person>{PERSON_RE})\b\s+{verb}\s+(?P<target>.+)$",
                sentence,
                flags=re.IGNORECASE,
            )
            if work_match:
                _add_relation(relations, seen, work_match.group("person"), relation_type, work_match.group("target"), user_name)

    return relations


def extract_knowledge_graph_elements(text: str, user_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyzes raw text to extract customized knowledge graph entities (nodes)
    and normalized relationship links (edges).
    """
    entities = extract_entities(text, user_name)
    triplets = extract_svo_triplets(text)
    
    cleaned_relations = []
    seen_relations = set()
    
    for subj, rel, obj in triplets:
        cleaned_subj = _normalize_node_name(subj, user_name)
        cleaned_obj = _normalize_node_name(obj, user_name)
        if not cleaned_subj or not cleaned_obj:
            continue
            
        subj_match = next((ent["name"] for ent in entities if ent["name"].lower() in cleaned_subj.lower()), cleaned_subj)
        obj_match = next((ent["name"] for ent in entities if ent["name"].lower() in cleaned_obj.lower()), cleaned_obj)
        
        subj_match = _normalize_node_name(subj_match, user_name)
        obj_match = _normalize_node_name(obj_match, user_name)
        
        if subj_match and obj_match and subj_match != obj_match:
            relation = {
                "source": subj_match,
                "type": _normalise_relation_type(rel),
                "target": obj_match
            }
            relation_key = (
                relation["source"].casefold(),
                relation["type"],
                relation["target"].casefold(),
            )
            if relation_key not in seen_relations:
                seen_relations.add(relation_key)
                cleaned_relations.append(relation)

    for relation in _extract_profile_relations(text, user_name):
        _add_relation(
            cleaned_relations,
            seen_relations,
            relation["source"],
            relation["type"],
            relation["target"],
            user_name,
        )

    entity_map = {ent["name"].casefold(): ent for ent in entities}
    for relation in cleaned_relations:
        for side in ("source", "target"):
            name = relation[side]
            key = name.casefold()
            if key not in entity_map:
                label = "CONTACT" if re.fullmatch(PERSON_RE, name) else _infer_entity_label(name)
                mapped = map_label(label, name, user_name)
                ent = {"name": name, "label": mapped}
                entity_map[key] = ent
                entities.append(ent)
            
    return {
        "entities": entities,
        "relations": cleaned_relations
    }
