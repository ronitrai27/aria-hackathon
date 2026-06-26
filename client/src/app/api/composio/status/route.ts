import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

// ─── Same slug map as connect route ───────────────────────────────────────────
const SLUG_MAP: Record<string, string> = {
  calendar: "googlecalendar",
  "google meet": "googlemeet",
  "google docs": "googledocs",
  "google sheets": "googlesheets",
  "hacker news": "hackernews",
  hubspot: "hubspot",
  linkedin: "linkedin",
  typeform: "typeform",
  youtube: "youtube",
};

function toComposioSlug(appName: string): string {
  const key = appName.toLowerCase().trim();
  return SLUG_MAP[key] ?? key.replace(/\s+/g, "");
}

// Reverse map: Composio slug → display name used in ConnectorDropdown
const DISPLAY_NAME_MAP: Record<string, string> = {
  googlecalendar: "Calendar",
  googlemeet: "Google Meet",
  googledocs: "Google Docs",
  googlesheets: "Google Sheets",
  hackernews: "Hacker News",
  gmail: "Gmail",
  slack: "Slack",
  github: "GitHub",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  todoist: "Todoist",
  attio: "Attio",
  hubspot: "HubSpot",
  jira: "Jira",
  linear: "Linear",
  notion: "Notion",
  outlook: "Outlook",
  typeform: "Typeform",
  ashby: "Ashby",
  youtube: "YouTube",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
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
    const accounts = await client.connectedAccounts.list({
      userIds: [userId],
    });

    // Build list of active toolkit slugs (normalized)
    const activeToolkits: string[] = [];
    // Build list of display names (for Convex DB sync)
    const activeDisplayNames: string[] = [];

    for (const acc of accounts.items) {
      if (acc.status !== "ACTIVE") continue;
      const slug =
        acc.toolkit?.slug ||
        (typeof acc.toolkit === "string" ? acc.toolkit : "");
      const normalized = slug.toLowerCase();
      if (!normalized) continue;

      // Normalize googlecalendar → "calendar" for legacy status checks
      const legacySlug =
        normalized === "googlecalendar" ? "calendar" : normalized;
      activeToolkits.push(legacySlug);

      // Also include display name for easy Convex sync
      const displayName = DISPLAY_NAME_MAP[normalized] ?? slug;
      activeDisplayNames.push(displayName);
    }

    return NextResponse.json({ activeToolkits, activeDisplayNames });
  } catch (error: any) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch status" },
      { status: 500 },
    );
  }
}
