# <img src="https://img.shields.io/badge/-Aria%20OS-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ3NyAyIDIgNi40NzcgMiAxMnM0LjQ3NyAxMCAxMCAxMCAxMC00LjQ3NyAxMC0xMFMxNy41MjMgMiAxMiAyem0wIDE4Yy00LjQxOCAwLTgtMy41ODItOC04czMuNTgyLTggOC04IDggMy41ODIgOCA4LTMuNTgyIDgtOCA4em0xLTEzaC0ydjZ6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==" alt="Aria OS" />  Aria — Your Intelligent Personal OS

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-FF6B35?style=for-the-badge&logo=langchain&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic_Claude-D4A852?style=for-the-badge&logo=anthropic&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=for-the-badge&logo=pinecone&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-4581C3?style=for-the-badge&logo=neo4j&logoColor=white)
![Redis](https://img.shields.io/badge/Upstash_Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-EE342F?style=for-the-badge&logo=convex&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![Composio](https://img.shields.io/badge/Composio-1A1A2E?style=for-the-badge&logo=composio&logoColor=white)
![LlamaCloud](https://img.shields.io/badge/LlamaCloud-07080A?style=for-the-badge&logo=llama&logoColor=white)
![Apache Airflow](https://img.shields.io/badge/Apache_Airflow-017CEB?style=for-the-badge&logo=apache-airflow&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Google Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

</div>

> **Aria** is an AI-native personal operating system that learns how you work, remembers your context, builds automations from natural language, and acts as a persistent intelligent companion — across every tab, task, and tool you use.

---

## ✨ Features

### 🧠 Brain Agent (Personal AI Companion)
- **Conversational AI with persistent memory**: Talk to Aria like a teammate. It remembers your past context, projects, preferences, and work history — across sessions — using a hybrid long-term memory system (Pinecone vector store + Neo4j knowledge graph).
- **Real task management**: The Brain agent can fetch, list, and create your tasks with smart prioritization. New task creation uses a **Human-In-The-Loop (HITL)** approval flow — the agent proposes, you confirm, tasks land in your board.
- **Inbox intelligence**: Fetch and summarize unread Gmail emails, upcoming Google Calendar events, and Slack messages in a single unified query.
- **Browser activity awareness**: The agent can query your last 48 hours of browsing activity to reflect on your focus areas, suggest improvements, or add context to task recommendations.
- **Streaming SSE responses**: All Brain responses stream token-by-token directly from LangGraph to the UI for a real-time chat experience.

### 🤖 Workflow Designer Agent
- **Natural language → Visual workflow builder**: Describe any automation in plain English and the Workflow Designer agent produces a structured, visual multi-step workflow automatically.
- **Composio-powered integrations**: 15+ app integrations supported out of the box — Gmail, Slack, GitHub, Notion, Jira, Linear, Google Calendar, Google Drive, Google Docs, Typeform, Apollo, Todoist, Reddit, LinkedIn, Google Meet.
- **React Flow visual canvas**: Every generated workflow renders as an interactive node graph with draggable steps, icons, and connection edges.
- **Dual LLM architecture**: The Workflow Designer uses **Anthropic Claude** as the designer model and **OpenAI GPT** as the verifier — ensuring structured, accurate workflow output.
- **Workflow scheduling**: Workflows can be scheduled to run once, daily, weekly, or monthly.

### 🕸️ Life Graph (Knowledge Graph Visualization)
- **Neo4j-powered personal knowledge graph**: All your browsing activity, tasks, and workspace context are extracted into named entities (people, tools, projects, companies) and relationships using spaCy NLP + LLM-assisted graph extraction.
- **Interactive graph viewer**: Visualize your personal knowledge graph using `react-force-graph-2d` with live node/edge rendering.
- **Graph rebuild on demand**: Clear and rebuild your full graph anytime from the UI.

### 🌐 Browser Activity Tracker (Chrome Extension)
- **Passive background tracking**: Silently records every page visited with URL, page content summary, scroll depth, and dwell time — without any user action.
- **Smart content extraction**: Extracts meaningful summaries for Google/Bing/DuckDuckGo searches, GitHub repos, StackOverflow questions, and YouTube videos.
- **Dwell threshold filter**: Only events where the user actively spent ≥3 seconds are committed — preventing noise from accidental clicks or rapid tab switches.
- **Offline-first sync with IndexedDB**: Activity is first buffered locally in IndexedDB, then synced to Convex every 5 minutes via a background service worker alarm. Works offline and auto-syncs when network is available.
- **Blacklist support**: Users can exclude specific domains from tracking via the extension popup.
- **AI browser recap**: Aggregated browsing data is analyzed by GPT to generate a rich, human-readable daily summary of your browsing focus.

### 📋 Task Manager
- **Full task CRUD**: Create, update, and manage tasks with statuses (`not-started`, `in-progress`, `completed`, `on-hold`, `delayed`) and priorities (`high`, `medium`, `low`).
- **AI-generated tasks**: Tasks created by the Brain Agent are flagged `aiGenerated: true` so you can distinguish AI suggestions from manual entries.
- **Date-range estimation**: Each task tracks start and end date for project planning.
- **File attachments**: Tasks support file attachment metadata.

### 📊 Important Actions Dashboard
- **Unified integrations panel**: A cron-powered dashboard (runs every 6 hours) showing live unread Gmail count, upcoming calendar events, and unread Slack messages in a single view.
- **Convex-scheduled cron jobs**: Automated cron pipelines trigger data fetching, digest generation, and nightly memory sync without any user interaction.

### 🗂️ Daily Digest
- **Nightly AI memory sync**: At 6:30 AM UTC daily, a cron job runs across all users — fetching their browser activity and workflows, synthesizing insights via GPT, and committing meaningful facts to long-term memory (Pinecone + Neo4j).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router, React 19) |
| **Language (Frontend)** | TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui, Radix UI |
| **Animations** | GSAP, Framer Motion, Lenis |
| **Language (Backend)** | Python 3.12 |
| **Backend Framework** | FastAPI + Uvicorn |
| **AI Orchestration** | LangGraph (StateGraph, ToolNode, HITL) |
| **LLM — Reasoning** | OpenAI GPT-4.1 / GPT-4.1-nano |
| **LLM — Workflow Design** | Anthropic Claude (Sonnet) |
| **Vector Store** | Pinecone |
| **Knowledge Graph** | Neo4j (AuraDB) |
| **NLP Entity Extraction** | spaCy (`en_core_web_md`) + custom EntityRuler |
| **App Integrations** | Composio (15+ apps) |
| **Real-time Database** | Convex |
| **Object Storage** | Google Cloud Storage (Bucket: `araia-project`) |
| **Authentication** | Clerk |
| **HITL State Persistence** | Upstash Redis (serverless, custom LangGraph checkpointer) |
| **Caching (Browser Recap)** | Upstash Redis REST |
| **Browser Extension** | Chrome Extension Manifest V3 |
| **Document Parsing & Cloud Extraction** | LlamaIndex + LlamaParse / LlamaCloud |
| **Pipeline Orchestration** | Apache Airflow |
| **LLMs & Multi-Agent Models** | Anthropic Claude, OpenAI GPT, Google Gemini / Vertex AI |
| **SSE Streaming** | FastAPI StreamingResponse + Next.js Edge Runtime |
| **Containerization** | Docker (multi-stage builds) |
| **Deployment** | Google Cloud Run |

---

## 🚀 USP — What Makes Aria Different

1. **Passive intelligence, zero friction** — Aria learns from your work silently in the background. Install the extension, sign in once, and Aria starts building your context immediately. No manual input, no tags, no configuration.

2. **Full-stack memory system** — Most AI tools forget you the moment the window closes. Aria uses a tri-layer memory architecture — Redis for session state, Pinecone for semantic search, and Neo4j for relationship-aware personal knowledge graphs — so it grows smarter the longer you use it.

3. **Human-In-The-Loop by design** — Aria never takes irreversible actions without your explicit sign-off. When the Brain Agent proposes tasks, you get a confirmation prompt inline in the chat before a single record is written to the database.

4. **Natural language → production-ready workflow** — Describe what you want to automate in one sentence and Aria outputs a validated, visual, schedulable workflow connected to real apps via Composio. No drag-and-drop required.

5. **Dual-model verification pipeline** — The Workflow Designer uses two LLMs in tandem: Claude drafts the workflow, GPT verifies it. This catch-and-correct architecture produces structured, reliable automation blueprints.

6. **Awareness across every surface** — From your browser tabs to your inbox, calendar, Slack, and tasks — Aria aggregates signals across your entire digital workspace and surfaces them in one cohesive interface.

---

## 🐳 Docker Deployment

> Production-ready Docker images with multi-stage builds. Cloud Run compatible.

### 1. Backend (`/agents`)

```bash
# Build
docker build -t aria-agents:latest ./agents

# Run locally
docker run -d -p 8000:8000 --name aria-backend \
  -e OPENAI_API_KEY="sk-..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e COMPOSIO_API_KEY="..." \
  -e PINECONE_API_KEY="..." \
  -e REDIS_URL="rediss://..." \
  -e CONVEX_SITE_URL="https://wandering-antelope-3.convex.site" \
  aria-agents:latest
```

### 2. Frontend (`/client`)

> `NEXT_PUBLIC_` variables must be provided at **build time** as `--build-arg` because Next.js bakes them into the static bundle.

```bash
# Build
docker build -t aria-client:latest \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..." \
  --build-arg NEXT_PUBLIC_CONVEX_URL="https://wandering-antelope-3.convex.cloud" \
  --build-arg NEXT_PUBLIC_CONVEX_SITE_URL="https://wandering-antelope-3.convex.site" \
  --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in" \
  --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up" \
  --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/auth/callback" \
  --build-arg NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/auth/callback" \
  --build-arg UPSTASH_REDIS_REST_URL="https://..." \
  --build-arg UPSTASH_REDIS_REST_TOKEN="..." \
  ./client

# Run locally
docker run -d -p 3000:3000 --name aria-frontend \
  -e CLERK_SECRET_KEY="sk_test_..." \
  -e UPSTASH_REDIS_REST_URL="https://..." \
  -e UPSTASH_REDIS_REST_TOKEN="..." \
  -e AGENT_BACKEND_URL="http://localhost:8000" \
  aria-client:latest
```

### 3. Run Both Together (Docker Compose)

```yaml
# docker-compose.yml (place in /hackathon root)
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

```bash
docker compose up --build -d
```

---

## ✅ Upstash Redis — Confirmed Compatible

The LangGraph checkpointer (`agents/src/utils/checkpointer.py`) uses **only standard Redis commands** (hashes, sorted sets, lists) for HITL thread state persistence. It explicitly avoids RediSearch (`FT.*`) commands — making it **100% compatible with serverless Upstash Redis** tiers out of the box.
