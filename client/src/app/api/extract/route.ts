import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    const formData = await req.formData();

    console.log(`[API /api/extract] Proxying upload to: ${backendUrl}/extract`);

    const response = await fetch(`${backendUrl}/extract`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[API /api/extract] Backend returned error: ${response.status} - ${errText}`,
      );
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[API /api/extract] Successfully extracted document content.`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API /api/extract] Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
