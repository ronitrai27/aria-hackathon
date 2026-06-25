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

export default http;
