import { NextResponse } from "next/server";

export async function POST() {
  try {
    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    console.log(
      `[NextJS Cron Proxy] Triggering nightly memory sync at: ${backendUrl}/cron/sync-memory`,
    );

    const response = await fetch(`${backendUrl}/cron/sync-memory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[NextJS Cron Proxy] Sync request failed: ${response.status} - ${text}`,
      );
      return NextResponse.json(
        { error: `Backend sync failed: ${text}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("[NextJS Cron Proxy] Sync triggered successfully:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[NextJS Cron Proxy] Fatal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger backend sync cron" },
      { status: 500 },
    );
  }
}
