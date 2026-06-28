import os
from openai import OpenAI
from pinecone import Pinecone
from src.config import settings

def query_pinecone(user_id: str, query_text: str, limit: int = 5) -> list[dict]:
    """
    Queries the Pinecone vector index for relevant context.
    Filters the vector results by the user's user_id.
    """
    if not settings.pinecone_api_key:
        print("[Pinecone] API Key is missing. Skipping vector search.", flush=True)
        return []

    try:
        # Initialize Pinecone client
        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index_name)

        # Generate embedding for the query
        api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        openai_client = OpenAI(api_key=api_key)
        embedding_res = openai_client.embeddings.create(
            input=[query_text],
            model="text-embedding-3-small",
            dimensions=1024
        )
        query_vector = embedding_res.data[0].embedding

        # Query index with filter
        query_res = index.query(
            vector=query_vector,
            top_k=limit,
            include_metadata=True,
            filter={"user_id": {"$eq": user_id}}
        )

        matches = []
        for m in query_res.get("matches", []):
            metadata = m.get("metadata", {})
            matches.append({
                "score": m.get("score", 0),
                "text": metadata.get("text", ""),
                "metadata": metadata
            })
        return matches

    except Exception as e:
        print(f"[Pinecone Error] Failed to query vector index: {str(e)}", flush=True)
        return []


import hashlib
import time

def upsert_vector_store(user_id: str, facts: list[str]) -> bool:
    """
    Computes text-embedding-3-small embeddings and upserts to Pinecone.
    Uses MD5 of user_id + fact for ID deduplication.
    """
    if not settings.pinecone_api_key or not facts:
        print("[Pinecone] API Key is missing or facts are empty. Skipping vector upsert.", flush=True)
        return False

    try:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index_name)

        api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        openai_client = OpenAI(api_key=api_key)

        # Batch compute embeddings to save network round trips
        embeddings_res = openai_client.embeddings.create(
            input=facts,
            model="text-embedding-3-small",
            dimensions=1024
        )

        vectors = []
        timestamp = int(time.time() * 1000)
        
        for idx, fact in enumerate(facts):
            clean_fact = fact.strip()
            if not clean_fact:
                continue
                
            embedding = embeddings_res.data[idx].embedding
            
            # Stable unique ID to prevent duplicates in Pinecone index
            fact_id = hashlib.md5(f"{user_id}_{clean_fact.lower()}".encode()).hexdigest()
            
            vectors.append({
                "id": fact_id,
                "values": embedding,
                "metadata": {
                    "user_id": user_id,
                    "text": clean_fact,
                    "createdAt": timestamp,
                    "lastUpdated": timestamp
                }
            })

        if vectors:
            index.upsert(vectors=vectors)
            print(f"[Pinecone] Upserted {len(vectors)} facts successfully.", flush=True)
            return True
        return False

    except Exception as e:
        print(f"[Pinecone Error] Failed to upsert vectors: {str(e)}", flush=True)
        return False
