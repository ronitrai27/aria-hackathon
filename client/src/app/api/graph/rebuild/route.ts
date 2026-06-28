import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "User";

    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    
    console.log(`[API /api/graph/rebuild] Rebuilding graph for user: ${userId} (${userName})`);
    const response = await fetch(`${backendUrl}/graph/${userId}/rebuild`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_name: userName }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API /api/graph/rebuild] Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
