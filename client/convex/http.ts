import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

http.route({
  path: "/api/sync-activities",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { userId, events } = body;

      if (!userId || !Array.isArray(events)) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = await ctx.runMutation(api.activities.syncBrowserData, {
        userId,
        events,
      });

      return new Response(
        JSON.stringify({ success: true, count: events.length, results }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/sync-activities",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Agent Tool: GET /api/agent/get-task ─────────────────────────────────────
// Called by the Python LangGraph agent (tools.py → get_task_by_name).
// Looks up a single task by title for a given user.
// Usage: GET /api/agent/get-task?userId=<clerkId>&title=<taskTitle>
http.route({
  path: "/api/agent/get-task",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      const title = url.searchParams.get("title");

      if (!userId || !title) {
        return new Response(
          JSON.stringify({ error: "Missing required params: userId, title" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await ctx.runQuery(api.agentTools.getTaskByName, {
        userId,
        title,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/agent/get-task",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Brain Tool: GET /api/brain/get-tasks ────────────────────────────────────
// Called by the Python brain agent to list recent tasks for a user.
// Query params:
//   userId  — Clerk user ID (required)
//   limit   — number of tasks to return, 1–10 (optional, defaults to 10)
// Returns: [ { title, description (truncated), status, duration } ]
http.route({
  path: "/api/brain/get-tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      const limitParam = url.searchParams.get("limit");

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing required param: userId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Parse & clamp limit (1–10)
      const limit = limitParam
        ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 10)
        : 10;

      const result = await ctx.runQuery(api.agentTools.getTasks, {
        userId,
        limit,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/brain/get-tasks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Brain Tool: POST /api/brain/create-tasks ────────────────────────────────
// Called by the Python brain agent to bulk-create tasks for a user.
// Body (JSON):
//   userId  — Clerk user ID (required)
//   tasks   — array of task objects, max 10 (required)
//             Each task: { title, description?, priority?, startDate, endDate }
// Returns: { message, results: [ { title, status: "created"|"skipped", reason? } ] }
http.route({
  path: "/api/brain/create-tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { userId, tasks } = body;

      if (!userId || !Array.isArray(tasks) || tasks.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: userId (string), tasks (array)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (tasks.length > 10) {
        return new Response(
          JSON.stringify({ error: "Cannot create more than 10 tasks at once." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await ctx.runMutation(api.agentTools.createTasks, {
        userId,
        tasks,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/brain/create-tasks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Brain Tool: GET /api/brain/get-browser-activity ─────────────────────────
// Called by the Python brain agent to retrieve recent browser activity for a user.
// Query params:
//   userId  — Clerk user ID (required)
// Returns: [ { domain, totalDurationMs, visitCount, lastVisitedAt } ]
http.route({
  path: "/api/brain/get-browser-activity",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing required param: userId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await ctx.runQuery(api.agentTools.getBrowserActivity, {
        userId,
        now: Date.now(),
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/brain/get-browser-activity",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Brain Tool: GET /api/brain/get-all-users ───────────────────────────────
http.route({
  path: "/api/brain/get-all-users",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const result = await ctx.runQuery(api.user.getAllUsersInternal);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/brain/get-all-users",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ─── Brain Tool: GET /api/brain/get-workflows ───────────────────────────────
http.route({
  path: "/api/brain/get-workflows",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing required param: userId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const result = await ctx.runQuery(api.workflows.getWorkflowsForUserInternal, { userId });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// ─── Brain Tool: GET /api/brain/resolve-user ─────────────────────────────────
http.route({
  path: "/api/brain/resolve-user",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing required param: userId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const result = await ctx.runQuery(api.agentTools.resolveUser, { clerkUserId: userId });
      return new Response(JSON.stringify(result || {}), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/brain/resolve-user",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

export default http;


