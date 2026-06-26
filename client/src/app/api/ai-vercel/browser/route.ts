// =============================================================================
// POST /api/ai-vercel/browser
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES NEEDED (same as actions route):
//   - ai (Vercel AI SDK)
//   - @ai-sdk/openai
//   - convex/browser (ConvexHttpClient)
//   - zod
//   - OPENAI_API_KEY env var
//   - NEXT_PUBLIC_CONVEX_URL env var
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(_req: Request) {
  // TODO: Implement per the plan above
  return new Response("Not implemented yet", { status: 501 });
}
