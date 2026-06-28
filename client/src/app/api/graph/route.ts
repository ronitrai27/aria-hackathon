import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    
    console.log(`[API /api/graph] Fetching graph for user: ${userId}`);
    const response = await fetch(`${backendUrl}/graph/${userId}`);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API /api/graph] Backend error ${response.status}:`, errText);
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API /api/graph] Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
