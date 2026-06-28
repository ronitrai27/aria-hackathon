from neo4j import GraphDatabase
from src.config import settings

def _get_neo4j_driver():
    """Returns a GraphDatabase driver with self-signed certificate scheme fallback (+ssc) if needed."""
    uri = settings.neo4j_uri
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    elif uri.startswith("bolt+s://"):
        uri = uri.replace("bolt+s://", "bolt+ssc://")
        
    return GraphDatabase.driver(
        uri,
        auth=(settings.neo4j_username, settings.neo4j_password)
    )

def query_neo4j(user_id: str, query_text: str, limit: int = 15) -> list[dict]:
    """
    Queries Neo4j Graph database for the user's neighborhood of relationships.
    Matches the USER node (by id or userId) and retrieves connected nodes.
    """
    if not settings.neo4j_uri or not settings.neo4j_password:
        print("[Neo4j] Configuration is missing. Skipping graph query.", flush=True)
        return []

    try:
        driver = _get_neo4j_driver()
        
        # Cypher query matches USER node by id or userId and gets target nodes + relationship types
        cypher = """
        MATCH (u:USER)
        WHERE u.id = $user_id OR u.userId = $user_id OR u.clerkId = $user_id
        MATCH (u)-[r]->(target)
        RETURN labels(target) as labels, 
               target.name as name, 
               type(r) as relationship, 
               coalesce(target.description, '') as description
        LIMIT $limit
        """
        
        results = []
        with driver.session(database=settings.neo4j_database or "neo4j") as session:
            db_res = session.run(cypher, user_id=user_id, limit=limit)
            for record in db_res:
                results.append({
                    "labels": record["labels"],
                    "name": record["name"],
                    "relationship": record["relationship"],
                    "description": record["description"]
                })
        
        driver.close()
        return results

    except Exception as e:
        print(f"[Neo4j Error] Failed to query graph database: {str(e)}", flush=True)
        return []


import time
import re

def upsert_knowledge_graph(user_id: str, elements: dict) -> bool:
    """
    Upserts extracted entities and relations to Neo4j.
    Prevents duplicates using Cypher MERGE, records timestamps on nodes and edges.
    """
    if not settings.neo4j_uri or not settings.neo4j_password:
        print("[Neo4j] Configuration is missing. Skipping graph write.", flush=True)
        return False

    try:
        driver = _get_neo4j_driver()

        timestamp = int(time.time() * 1000)
        entities = elements.get("entities", [])
        relations = elements.get("relations", [])

        # Create a map of entity names (lowercase) to their mapped label
        entity_labels = {}
        for ent in entities:
            name = ent.get("name", "").strip()
            label = ent.get("label", "FACT").strip().upper()
            if name:
                entity_labels[name.lower()] = label

        with driver.session(database=settings.neo4j_database or "neo4j") as session:
            # 1. Merge User Node
            session.run(
                """
                MERGE (u:USER {id: $user_id})
                ON CREATE SET u.createdAt = $timestamp, u.lastUpdated = $timestamp
                ON MATCH SET u.lastUpdated = $timestamp
                """,
                user_id=user_id,
                timestamp=timestamp
            )

            # 2. Merge all entities
            for ent in entities:
                name = ent.get("name", "").strip()
                label = ent.get("label", "FACT").strip().upper()
                if not name or label == "USER":
                    continue

                # Sanitize label for safety (alphanumeric only)
                clean_label = re.sub(r"[^A-Z0-9_]", "", label) or "FACT"

                # Merge node scoped to user_id
                cypher_node = f"""
                MERGE (e:{clean_label} {{name: $name, userId: $user_id}})
                ON CREATE SET e.createdAt = $timestamp, e.lastUpdated = $timestamp
                ON MATCH SET e.lastUpdated = $timestamp
                """
                session.run(cypher_node, name=name, user_id=user_id, timestamp=timestamp)

            # 3. Merge all relations
            for rel in relations:
                source = rel.get("source", "").strip()
                target = rel.get("target", "").strip()
                rel_type = rel.get("type", "RELATED_TO").strip().upper()

                if not source or not target:
                    continue

                # Resolve labels
                source_label = entity_labels.get(source.lower(), "FACT")
                target_label = entity_labels.get(target.lower(), "FACT")
                
                # Sanitize rel_type and labels
                clean_rel_type = re.sub(r"[^A-Z0-9_]", "", rel_type) or "RELATED_TO"
                clean_src_label = re.sub(r"[^A-Z0-9_]", "", source_label) or "FACT"
                clean_tgt_label = re.sub(r"[^A-Z0-9_]", "", target_label) or "FACT"

                # Merge the relationship
                if source.upper() == "USER":
                    cypher_rel = f"""
                    MATCH (u:USER {{id: $user_id}})
                    MERGE (target:{clean_tgt_label} {{name: $target, userId: $user_id}})
                    MERGE (u)-[r:{clean_rel_type}]->(target)
                    SET r.lastUpdated = $timestamp
                    """
                    session.run(cypher_rel, user_id=user_id, target=target, timestamp=timestamp)
                elif target.upper() == "USER":
                    cypher_rel = f"""
                    MERGE (source:{clean_src_label} {{name: $source, userId: $user_id}})
                    MATCH (u:USER {{id: $user_id}})
                    MERGE (source)-[r:{clean_rel_type}]->(u)
                    SET r.lastUpdated = $timestamp
                    """
                    session.run(cypher_rel, user_id=user_id, source=source, timestamp=timestamp)
                else:
                    cypher_rel = f"""
                    MERGE (source:{clean_src_label} {{name: $source, userId: $user_id}})
                    MERGE (target:{clean_tgt_label} {{name: $target, userId: $user_id}})
                    MERGE (source)-[r:{clean_rel_type}]->(target)
                    SET r.lastUpdated = $timestamp
                    """
                    session.run(cypher_rel, user_id=user_id, source=source, target=target, timestamp=timestamp)

        driver.close()
        print(f"[Neo4j] Upserted {len(entities)} entities and {len(relations)} relations successfully.", flush=True)
        return True

    except Exception as e:
        print(f"[Neo4j Error] Failed to write graph: {str(e)}", flush=True)
        return False

def get_user_graph_data(user_id: str) -> dict:
    """
    Fetches the entire knowledge graph (nodes and relationships) for a specific user.
    Returns a dictionary formatted for graph visualization libraries (e.g., force-graph).
    """
    if not settings.neo4j_uri or not settings.neo4j_password:
        return {"nodes": [], "links": []}

    try:
        driver = _get_neo4j_driver()
        
        # We need to fetch nodes and links. We can do this in two queries for simplicity.
        cypher_nodes = """
        MATCH (n)
        WHERE n.id = $user_id OR n.userId = $user_id
        RETURN elementId(n) as id, coalesce(n.name, "USER") as name, labels(n)[0] as label
        """
        
        cypher_links = """
        MATCH (n)-[r]->(m)
        WHERE (n.id = $user_id OR n.userId = $user_id) AND (m.id = $user_id OR m.userId = $user_id)
        RETURN elementId(n) as source, elementId(m) as target, type(r) as label
        """
        
        nodes = []
        links = []
        
        with driver.session(database=settings.neo4j_database or "neo4j") as session:
            db_nodes = session.run(cypher_nodes, user_id=user_id)
            for record in db_nodes:
                nodes.append({
                    "id": record["id"],
                    "name": record["name"],
                    "label": record["label"]
                })
                
            db_links = session.run(cypher_links, user_id=user_id)
            for record in db_links:
                links.append({
                    "source": record["source"],
                    "target": record["target"],
                    "label": record["label"]
                })
                
        driver.close()
        return {"nodes": nodes, "links": links}
    
    except Exception as e:
        print(f"[Neo4j Error] Failed to fetch graph data: {str(e)}", flush=True)
        return {"nodes": [], "links": []}

def delete_user_graph_data(user_id: str) -> bool:
    """
    Deletes all nodes and relationships associated with a specific user from Neo4j.
    """
    if not settings.neo4j_uri or not settings.neo4j_password:
        return False

    try:
        driver = _get_neo4j_driver()
        
        # Cypher query to delete all nodes matched by user_id or userId
        cypher = """
        MATCH (n)
        WHERE n.id = $user_id OR n.userId = $user_id
        DETACH DELETE n
        """
        
        with driver.session(database=settings.neo4j_database or "neo4j") as session:
            session.run(cypher, user_id=user_id)
            
        driver.close()
        print(f"[Neo4j] Successfully deleted all graph data for user: {user_id}", flush=True)
        return True
    except Exception as e:
        print(f"[Neo4j Error] Failed to delete user graph data: {str(e)}", flush=True)
        return False
