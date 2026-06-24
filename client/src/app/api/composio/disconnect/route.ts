import { NextResponse } from "next/server";
import { Composio } from "@composio/core";

export async function POST(request: Request) {
  try {
    const { userId, appName } = await request.json();
    if (!userId || !appName) {
      return NextResponse.json(
        { error: "userId and appName are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const client = new Composio({ apiKey });
    // Normalize app/toolkit slug
    const toolkitSlug = appName.toLowerCase() === "calendar" ? "googlecalendar" : appName.toLowerCase();

    // 1. List accounts for the user and toolkit
    const accounts = await client.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: [toolkitSlug]
    });

    // 2. Delete all active/matching connected accounts
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
      { status: 500 }
    );
  }
}
