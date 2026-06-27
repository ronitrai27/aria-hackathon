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
            model="text-embedding-3-small"
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
