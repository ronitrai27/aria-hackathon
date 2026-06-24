import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

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
    // Normalize app/toolkit slug
    const toolkitSlug =
      appName.toLowerCase() === "calendar"
        ? "googlecalendar"
        : appName.toLowerCase();

    // 1. Find or create the auth config for this toolkit
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

    // 2. Generate redirect link
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/home/agent`;
    const linkRes = await client.connectedAccounts.link(userId, configId, {
      callbackUrl,
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
