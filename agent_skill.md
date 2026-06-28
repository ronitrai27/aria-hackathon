# Agent Skill: Unified User Identifiers, Loading States, and Alignment

### 1. Unified User Identifiers (Convex ID Namespace)
All agent features (including Pinecone, Neo4j, Composio toolkits, and tasks) must operate under the user's **Convex document ID** (`user._id`, e.g. `j575q...`) instead of the Clerk user ID (`user_3FYJ...`).

* **Client Invocation (`useBrainChat.ts`):**
  Pass the Convex User ID `user?._id` (as `userId` / `user_id`) in all POST payloads to `/api/chat` and `/api/chat/approve`.
* **Python Agent Gateway (`tools.py`):**
  Uses the passed user ID directly as the session identifier, ensuring it matches active Composio credentials set up in the client UI.
* **Auto-Resolving Clerk IDs on Bound Endpoints (`main.py`):**
  For boundaries (like `/graph/{user_id}` and background syncs) where Clerk IDs are received from auth systems or cron metadata, translate them to Convex IDs using the resolver `/api/brain/resolve-user` before performing database lookups or Neo4j queries.
* **Convex Telemetry Queries (`agentTools.ts` & `workflows.ts`):**
  When querying tables like `browserData` or `workflows` that store entries under the Clerk ID, resolve the incoming Convex ID back to the Clerk ID first.

### 2. Avatar Alignment
Assistant message avatars and loaders must be vertically aligned with the top of the text block.
* Because assistant message text containers have a top padding (e.g. `py-2`), standard avatars aligned to the top of the flex container will sit too high.
* Add `mt-1` (4px top margin) to all assistant avatars/loaders to ensure perfect visual alignment with the first line of text.

### 3. Morphing Loading States
Instead of static or standard pulsing icons, the assistant loading state uses a morphing, rotating SVG.
* **CSS Animation (`AgentChatMessages.tsx`):**
  ```css
  @keyframes aria-morph-rotate {
    0% {
      transform: rotate(0deg);
      border-radius: 50%;
    }
    35% {
      border-radius: 50%;
    }
    50% {
      transform: rotate(180deg);
      border-radius: 8px;
    }
    85% {
      border-radius: 8px;
    }
    100% {
      transform: rotate(360deg);
      border-radius: 50%;
    }
  }
  .aria-morph-loading {
    animation: aria-morph-rotate 3s infinite ease-in-out;
  }
  ```
* **Avatar Wrapper:** Apply the class `aria-morph-loading` and remove `rounded-lg animate-pulse` so the shape morphs dynamically between a circle and a rounded square while spinning.
