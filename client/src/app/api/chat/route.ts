import { NextRequest } from "next/server";

// Edge runtime streams each SSE chunk immediately — nodejs runtime buffers the
// entire response before forwarding, which breaks real-time SSE delivery.
export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    const mode = body.mode || "agent";
    const path = mode === "brain" ? "/brain" : "/agent";

    console.log(`[API /api/chat] Forwarding request to: ${backendUrl}${path}`);
    console.log(`[API /api/chat] Body:`, JSON.stringify(body));

    const response = await fetch(`${backendUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API /api/chat] Backend error ${response.status}:`, errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!response.body) {
      return new Response("No response body received from backend service.", {
        status: 500,
      });
    }

    // Pipe the backend SSE stream directly to the client.
    // Edge runtime forwards each chunk as-is without buffering.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body.getReader();

    const pump = async () => {
      try {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[API /api/chat] SSE stream ended. Total chunks: ${chunkCount}`);
            await writer.close();
            break;
          }
          chunkCount++;
          // Log each SSE chunk as raw text so you can verify delivery
          const text = new TextDecoder().decode(value);
          console.log(`[API /api/chat] SSE chunk #${chunkCount}:`, text.trim());
          await writer.write(value);
        }
      } catch (err) {
        console.error("[API /api/chat] Stream pump error:", err);
        await writer.abort(err);
      }
    };

    // Kick off pumping without awaiting (runs concurrently with stream delivery)
    pump();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Tell nginx/proxies not to buffer SSE
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[API /api/chat] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
