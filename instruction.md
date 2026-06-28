# Developer Instructions: Convex User ID System

### Core Principle
**All agent interactions, tool execution, telemetry tracking, database lookups, vector inserts, and knowledge graph mappings must utilize the user's Convex document ID (`user._id`, e.g. `j575q101a4sycsnngr0kxz8hz5897wwm`).**

Under no circumstances should Clerk User IDs (`user_3FYJ...`) be passed directly as identifiers to the `/brain` agent stream or its internal services (Pinecone, Neo4j, Composio, etc.).

---

### Implementation Guidelines

#### 1. Client-to-Agent Payload
* In client-side chat hooks (such as [useBrainChat.ts](file:///r:/hackathon-project/client/src/hooks/useBrainChat.ts)), extract the database ID `user?._id` (never `user?.id` which is the Clerk ID).
* Ensure `userId` and `user_id` fields in request body schemas are populated using this Convex ID.

#### 2. Telemetry and Workspace Telemetry Queries
* Convex tables `browserData` and `workflows` store telemetry utilizing the Clerk ID.
* When querying these tables from the agent backend (via helper queries like `getBrowserActivity` and `getWorkflowsForUserInternal`), the query handler must first resolve the passed Convex ID back to the Clerk ID to fetch the relevant rows.

#### 3. Backend Gateway and Boundaries
* For endpoints triggered by external systems (e.g. Next.js server actions, Clerk auth routes, or scheduled cron triggers) that only have access to the Clerk User ID, translate the Clerk ID to the Convex document ID via the resolver `/api/brain/resolve-user` before starting any Neo4j, Pinecone, or background worker sync.
* This ensures that downstream memory graphs and vector indices are unified under the exact same Convex document ID namespace.
