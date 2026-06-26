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
    return value.replace(
      /\{\{(step_\d+(?:\.\w+)*(?:\.\d+)*(?:\.\w+)*)\}\}/g,
      (match, path) => {
        const parts = path.split(".");
        const stepKey = parts[0];
        let current: unknown = stepResults[stepKey];
        for (let i = 1; i < parts.length; i++) {
          if (current == null) return match;
          current = (current as Record<string, unknown>)[parts[i]];
        }
        return current !== undefined ? String(current) : match;
      },
    );
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
// Filter helpers for 6-hour window
// ---------------------------------------------------------------------------
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isWithinSixHours(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return Date.now() - d.getTime() <= SIX_HOURS_MS;
  } catch {
    return false;
  }
}

function isUpcomingWithinSixHours(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    return d.getTime() >= now && d.getTime() <= now + SIX_HOURS_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST /api/composio/test-schedule
// Body: { userId: string; slackChannel?: string }
// userId = Convex _id (same ID used when connecting via Composio)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, slackChannel = "all-wekraft" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const client = new Composio({ apiKey });

    // Build time boundaries
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - SIX_HOURS_MS);
    const sixHoursLater = new Date(now.getTime() + SIX_HOURS_MS);

    const steps = [
      {
        key: "step_1",
        tool: "GMAIL_FETCH_EMAILS",
        params: {
          // Simple query — fetch 10 unread, then filter last 6h in JS
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
          timeMin: now.toISOString(),
          // No timeMax — show all upcoming events
        },
      },
      {
        key: "step_3",
        tool: "SLACK_FETCH_CONVERSATION_HISTORY",
        params: {
          channel: slackChannel,
          limit: 20,
          oldest: String(sixHoursAgo.getTime() / 1000),
        },
      },
    ];

    const stepResults: Record<string, unknown> = {};
    const stepMeta: {
      key: string;
      tool: string;
      status: string;
      result?: unknown;
      error?: string;
    }[] = [];

    for (const step of steps) {
      console.log(`[Schedule] Running ${step.key}: ${step.tool}`);
      const resolvedParams = resolveTemplates(
        step.params,
        stepResults,
      ) as Record<string, unknown>;

      try {
        const result = await client.tools.execute(step.tool, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: resolvedParams,
        });

        console.log(`[Schedule] ${step.key} success`);
        stepResults[step.key] = result;
        stepMeta.push({
          key: step.key,
          tool: step.tool,
          status: "success",
          result,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Schedule] ${step.key} failed:`, msg);
        stepResults[step.key] = null;
        stepMeta.push({
          key: step.key,
          tool: step.tool,
          status: "error",
          error: msg,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Parse and filter results
    // -----------------------------------------------------------------------

    // Gmail – extract emails from last 6 hours
    const gmailRaw = (stepResults["step_1"] as any)?.data?.messages || [];
    const gmailEmails = (Array.isArray(gmailRaw) ? gmailRaw : [])
      .filter((m: any) =>
        isWithinSixHours(
          m?.internalDate
            ? new Date(parseInt(m.internalDate)).toISOString()
            : m?.payload?.headers?.find((h: any) => h.name === "Date")?.value,
        ),
      )
      .slice(0, 10)
      .map((m: any) => {
        const headers: any[] = m?.payload?.headers || [];
        const get = (name: string) =>
          headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value;
        return {
          id: m.id || "",
          subject: get("Subject") || "(No subject)",
          from: get("From") || "",
          snippet: m.snippet || "",
          date: get("Date") || "",
        };
      });

    // Calendar – upcoming events in next 6 hours
    const calRaw =
      (stepResults["step_2"] as any)?.data?.items ||
      (stepResults["step_2"] as any)?.items ||
      [];
    const calendarEvents = (Array.isArray(calRaw) ? calRaw : [])
      .filter((e: any) => {
        const start = e?.start?.dateTime || e?.start?.date;
        return isUpcomingWithinSixHours(start);
      })
      .slice(0, 10)
      .map((e: any) => ({
        id: e.id || "",
        summary: e.summary || "(No title)",
        start: e?.start?.dateTime || e?.start?.date || "",
        end: e?.end?.dateTime || e?.end?.date || "",
      }));

    // Slack – messages from last 6 hours in #all-wekraft
    const slackRaw =
      (stepResults["step_3"] as any)?.data?.messages ||
      (stepResults["step_3"] as any)?.messages ||
      [];
    const slackMessages = (Array.isArray(slackRaw) ? slackRaw : [])
      .filter((msg: any) => {
        if (!msg?.ts) return false;
        const ts = parseFloat(msg.ts) * 1000;
        return Date.now() - ts <= SIX_HOURS_MS;
      })
      .slice(0, 20)
      .map((msg: any) => ({
        ts: msg.ts || "",
        text: msg.text || "",
        user: msg.user || msg.username || "",
      }));

    return NextResponse.json({
      success: true,
      fetchedAt: now.toISOString(),
      gmail: {
        unreadCount: gmailEmails.length,
        emails: gmailEmails,
        error: stepMeta.find((s) => s.key === "step_1")?.error,
      },
      calendar: {
        eventCount: calendarEvents.length,
        events: calendarEvents,
        error: stepMeta.find((s) => s.key === "step_2")?.error,
      },
      slack: {
        messageCount: slackMessages.length,
        messages: slackMessages,
        channel: slackChannel,
        error: stepMeta.find((s) => s.key === "step_3")?.error,
      },
      // Raw step results for debugging
      steps: stepMeta,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Schedule] Fatal error:", error);
    return NextResponse.json(
      { error: msg || "Schedule fetch failed" },
      { status: 500 },
    );
  }
}
