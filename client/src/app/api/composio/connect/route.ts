import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

// ─── Canonical slug map ────────────────────────────────────────────────────────
// Maps display names (from ConnectorDropdown) → Composio toolkit slugs
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
  calendly: "calendly",
  airtable: "airtable",
  discord: "discord",
};

export function toComposioSlug(appName: string): string {
  const key = appName.toLowerCase().trim();
  return SLUG_MAP[key] ?? key.replace(/\s+/g, ""); // fallback: strip spaces
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

    // 1. Check if already connected (active account exists in Composio)
    const existingAccounts = await client.connectedAccounts.list({
      userIds: [userId],
    });
    const alreadyActive = existingAccounts.items.find((acc) => {
      const slug =
        acc.toolkit?.slug ||
        (typeof acc.toolkit === "string" ? acc.toolkit : "");
      return slug.toLowerCase() === toolkitSlug && acc.status === "ACTIVE";
    });

    if (alreadyActive) {
      // Already connected in Composio — return sentinel so UI syncs Convex DB
      return NextResponse.json({ alreadyConnected: true });
    }

    // 2. Find or create the auth config for this toolkit
    const configs = await client.authConfigs.list();
    let configId = "";
    const existingConfig = configs.items.find((c) => {
      const slug =
        c.toolkit?.slug || (typeof c.toolkit === "string" ? c.toolkit : "");
      return slug.toLowerCase() === toolkitSlug;
    });

    if (existingConfig) {
      configId = existingConfig.id;
    } else {
      const newConfig = await client.authConfigs.create(toolkitSlug, {
        name: `auth_config_${toolkitSlug}_created`,
        type: "use_composio_managed_auth",
      });
      configId = newConfig.id;
    }

    // 3. Generate redirect link (allowMultiple prevents "multiple accounts" error)
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/home/agent`;
    const linkRes = await client.connectedAccounts.link(userId, configId, {
      callbackUrl,
      allowMultiple: true,
    });

    return NextResponse.json({ redirectUrl: linkRes.redirectUrl });
  } catch (error: any) {
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate connection" },
      { status: 500 },
    );
  }
}
