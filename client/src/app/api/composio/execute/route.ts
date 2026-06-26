import { Composio } from "@composio/core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, actionSlug, arguments: args } = await request.json();
    if (!userId || !actionSlug) {
      return NextResponse.json(
        { error: "userId and actionSlug are required" },
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
    console.log(
      `[Composio Execute] action: ${actionSlug}, userId: ${userId}, args:`,
      args,
    );

    const result = await client.tools.execute(actionSlug, {
      userId,
      dangerouslySkipVersionCheck: true,
      arguments: args || {},
    });

    console.log(`[Composio Execute] Success result:`, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Composio Execute] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute Composio action" },
      { status: 500 },
    );
  }
}
