import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

// ─── Slug map (same as connect route) ─────────────────────────────────────────
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

export async function POST(request: Request) {
  try {
    const { userId, appName } = await request.json();
    if (!userId || !appName) {
      return NextResponse.json(
        { error: "userId and appName are required" },
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
    const toolkitSlug = toComposioSlug(appName);

    // 1. List accounts for the user and toolkit
    const accounts = await client.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: [toolkitSlug],
    });

    // 2. Delete all matching connected accounts
    let deletedAny = false;
    for (const account of accounts.items) {
      await client.connectedAccounts.delete(account.id);
      deletedAny = true;
    }

    return NextResponse.json({ success: true, deletedAny });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect" },
      { status: 500 },
    );
  }
}
