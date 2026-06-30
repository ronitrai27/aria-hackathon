# Aria OS Hackathon Project - Docker Deployment Guide

This directory contains the Docker configuration for containerizing and deploying the application to production (specifically optimized for Google Cloud Run).

## Architecture Overview

The application is split into two main services:
1. **Frontend (`/client`)**: Next.js 16 (React 19) client application compiled in Next.js's optimized `standalone` build mode.
2. **Backend (`/agents`)**: FastAPI Python server orchestrating LangGraph workflows with a custom checkpoint manager.
3. **Database / Auth**: Managed externally via Convex (database + HTTP APIs) and Clerk (identity provider).
4. **State / Memory (HITL)**: Persisted in **Upstash Redis** (serverless).

---

## Upstash Redis Confirmation
The LangGraph checkpointer in `agents/src/utils/checkpointer.py` has been custom-implemented to utilize standard Redis command mappings (sorted sets, lists, hashes) for thread states. 

**This guarantees 100% compatibility with serverless Upstash Redis instances.** It completely avoids heavy RediSearch (`FT.*`) command sets that are unsupported by standard serverless Redis tiers.

---

## 1. Backend Service (`/agents`)

The backend Docker configuration uses a clean multi-stage build. Dev dependencies, compilation tools (`build-essential`, `git`), and Poetry are kept inside the builder stage. The final runtime copy uses a lightweight Python virtualenv. It also pre-installs the required spaCy English models to prevent runtime read-only file-system crashes on Cloud Run.

### Build Backend Image
Run the following command from the `/agents` directory:
```bash
docker build -t aria-agents:latest .
```

### Run Backend Locally
Run the container by passing the required environment variables (e.g. from your `agents/.env` file):
```bash
docker run -d \
  -p 8000:8000 \
  --name aria-backend \
  -e OPENAI_API_KEY="your-openai-api-key" \
  -e ANTHROPIC_API_KEY="your-anthropic-api-key" \
  -e COMPOSIO_API_KEY="your-composio-api-key" \
  -e PINECONE_API_KEY="your-pinecone-api-key" \
  -e REDIS_URL="your-upstash-redis-url" \
  -e CONVEX_SITE_URL="https://wandering-antelope-3.convex.site" \
  aria-agents:latest
```
*(Note: Cloud Run automatically injects its own dynamic port using the `PORT` env var, which the FastAPI app handles automatically.)*

---

## 2. Frontend Service (`/client`)

The Next.js client uses a multi-stage Docker build utilizing `pnpm`. Because Next.js bakes environment variables starting with `NEXT_PUBLIC_` into the static JavaScript bundles at compile-time, these **must** be provided as build arguments (`--build-arg`) during the docker build command.

### Build Frontend Image
Run the following command from the `/client` directory (replace URLs/keys with your production settings):
```bash
docker build -t aria-client:latest \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..." \
  --build-arg NEXT_PUBLIC_CONVEX_URL="https://wandering-antelope-3.convex.cloud" \
  --build-arg NEXT_PUBLIC_CONVEX_SITE_URL="https://wandering-antelope-3.convex.site" \
  --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in" \
  --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up" \
  --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/auth/callback" \
  --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/auth/callback" \
  .
```

### Run Frontend Locally
Run the client container. Provide server-side runtime variables (like Clerk secret keys or Redis credentials) as environment options:
```bash
docker run -d \
  -p 3000:3000 \
  --name aria-frontend \
  -e CLERK_SECRET_KEY="sk_test_..." \
  -e UPSTASH_REDIS_REST_URL="https://..." \
  -e UPSTASH_REDIS_REST_TOKEN="your-token" \
  -e AGENT_BACKEND_URL="http://localhost:8000" \
  aria-client:latest
```

---

## 3. Orchestrating Locally (Docker Compose)

To test both containers locally simultaneously with hot network routing, you can create a `docker-compose.yml` file in the root workspace directory:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./agents
    ports:
      - "8000:8000"
    env_file:
      - ./agents/.env

  frontend:
    build:
      context: ./client
      args:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_..."
        NEXT_PUBLIC_CONVEX_URL: "https://wandering-antelope-3.convex.cloud"
        NEXT_PUBLIC_CONVEX_SITE_URL: "https://wandering-antelope-3.convex.site"
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in"
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up"
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: "/auth/callback"
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: "/auth/callback"
    ports:
      - "3000:3000"
    environment:
      - AGENT_BACKEND_URL=http://backend:8000
    env_file:
      - ./client/.env.local
    depends_on:
      - backend
```

Deploy locally with:
```bash
docker compose up --build -d
```
