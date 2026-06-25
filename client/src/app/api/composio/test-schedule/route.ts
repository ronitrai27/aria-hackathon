import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helper – resolve {{step_N.path.to.value}} placeholders from previous steps
// ---------------------------------------------------------------------------
function resolveTemplates(
  value: unknown,
  stepResults: Record<string, unknown>,
): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{(step_\d+(?:\.\w+)*(?:\.\d+)*(?:\.\w+)*)\}\}/g, (match, path) => {
      const parts = path.split(".");
      // parts[0] = "step_N", rest = property path
      const stepKey = parts[0]; // e.g. "step_3"
      let current: unknown = stepResults[stepKey];
      for (let i = 1; i < parts.length; i++) {
        if (current == null) return match; // keep original if not found
        current = (current as Record<string, unknown>)[parts[i]];
      }
      return current !== undefined ? String(current) : match;
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveTemplates(v, stepResults));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveTemplates(v, stepResults),
      ]),
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// POST /api/composio/workflow
// Body: { userId: string }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const client = new Composio({ apiKey });

    // -----------------------------------------------------------------------
    // Workflow definition (mirrors the Python SDK version)
    // -----------------------------------------------------------------------
    const steps = [
      {
        key: "step_1",
        tool: "GMAIL_FETCH_EMAILS",
        params: {
          query: "is:unread label:inbox",
          user_id: "me",
          max_results: 10,
          verbose: true,
          ids_only: false,
          include_payload: true,
          include_spam_trash: false,
        },
      },
      {
        key: "step_2",
        tool: "GOOGLECALENDAR_EVENTS_LIST",
        params: {
          calendarId: "primary",
          maxResults: 10,
          orderBy: "startTime",
          singleEvents: true,
        },
      },
      {
        key: "step_3",
        tool: "SLACK_FETCH_CONVERSATION_HISTORY",
        params: {
          channel: "all-wekraft",
          limit: 10,
        },
      },
    ];

    const stepResults: Record<string, unknown> = {};
    const stepMeta: { key: string; tool: string; status: string; result?: unknown; error?: string }[] = [];

    // -----------------------------------------------------------------------
    // Execute steps sequentially
    // -----------------------------------------------------------------------
    for (const step of steps) {
      console.log(`[Workflow] Running ${step.key}: ${step.tool}`);

      // Resolve any template variables from previous step results
      const resolvedParams = resolveTemplates(step.params, stepResults) as Record<string, unknown>;

      console.log(`[Workflow] ${step.key} resolved params:`, resolvedParams);

      try {
        const result = await client.tools.execute(step.tool, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: resolvedParams,
        });

        console.log(`[Workflow] ${step.key} success:`, result);
        stepResults[step.key] = result;
        stepMeta.push({ key: step.key, tool: step.tool, status: "success", result });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Workflow] ${step.key} failed:`, err);
        stepResults[step.key] = null;
        stepMeta.push({ key: step.key, tool: step.tool, status: "error", error: msg });
        // Continue to next steps even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      steps: stepMeta,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Workflow] Fatal error:", error);
    return NextResponse.json({ error: msg || "Workflow failed" }, { status: 500 });
  }
}
