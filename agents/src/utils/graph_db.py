from neo4j import GraphDatabase
from src.config import settings

def query_neo4j(user_id: str, query_text: str, limit: int = 15) -> list[dict]:
    """
    Queries Neo4j Graph database for the user's neighborhood of relationships.
    Matches the USER node (by id or userId) and retrieves connected nodes.
    """
    if not settings.neo4j_uri or not settings.neo4j_password:
        print("[Neo4j] Configuration is missing. Skipping graph query.", flush=True)
        return []

    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password)
        )
        
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
