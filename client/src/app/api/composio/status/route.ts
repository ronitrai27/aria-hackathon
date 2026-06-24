import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

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

    // Extract toolkits with ACTIVE connection
    const activeToolkits = accounts.items
      .filter((acc) => acc.status === "ACTIVE")
      .map((acc) => {
        const slug =
          acc.toolkit?.slug ||
          (typeof acc.toolkit === "string" ? acc.toolkit : "");
        // Normalize googlecalendar back to calendar
        return slug.toLowerCase() === "googlecalendar" ? "calendar" : slug;
      });

    return NextResponse.json({ activeToolkits });
  } catch (error: any) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch status" },
      { status: 500 },
    );
  }
}
