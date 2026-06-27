"""
Centralized configuration for the agents project.
Uses pydantic-settings to load environment variables from .env.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── LLM API Keys ────────────────────────────────────────────────────
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # ─── Composio ─────────────────────────────────────────────────────────
    composio_api_key: str = ""

    # ─── Vector Store (Pinecone) ──────────────────────────────────────────
    pinecone_api_key: str = ""
    pinecone_index_name: str = "aria-hackathon-project"

    # ─── Knowledge Graph (Neo4j) ──────────────────────────────────────────
    neo4j_uri: str = ""
    neo4j_username: str = ""
    neo4j_password: str = ""
    neo4j_database: str = ""

    # ─── Document Parsing (LlamaCloud) — future use ──────────────────────
    llama_cloud_api_key: str = ""

    # ─── Convex HTTP API ──────────────────────────────────────────────────
    convex_site_url: str = "https://wandering-antelope-3.convex.site"

    # ─── Redis (checkpointer for HITL) ────────────────────────────────────
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        extra = "ignore"  # ignore env vars not defined here


settings = Settings()
