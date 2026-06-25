// =============================================================================
// POST /api/ai-vercel/actions
// =============================================================================
//
// PURPOSE:
//   Given a user's Convex _id, read their already-fetched importantActionsData
//   from Convex (Gmail unread in last 6h, upcoming calendar events, Slack msgs)
//   and run them through an LLM (via Vercel AI SDK / OpenAI) to produce a short
//   list of 3–6 prioritised actionable insights the user should act on NOW.
//
// WHEN IT'S CALLED:
//   - From the "Morning Brief" card on /home → "Ask for Insights" button click
//   - Each call is stateless (read stored data → stream response, no DB write)
//
// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION PLAN
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. PARSE REQUEST
//    - Accept POST body: { userId: string }
//    - userId = Convex _id (same as used in importantActionsData.userId)
//
// 2. FETCH DATA FROM CONVEX
//    - Use ConvexHttpClient (server-side, same pattern as chatbot route)
//    - Call api.importantActions.getImportantActionsData({ userId })
//    - If no data found → return 404 / "No synced data yet. Please refresh."
//
// 3. BUILD CONTEXT STRING FOR LLM
//
//    GMAIL (last 6h unread):
//    - For each email in gmailEmails array (up to 10):
//        • Subject line  (full)
//        • From          (full)
//        • Snippet       (truncated to 120 chars to save tokens)
//        • Date          (formatted relative e.g. "2h ago")
//    - If gmailError is set, note it in context so AI can acknowledge it
//
//    CALENDAR (upcoming events):
//    - For each event in calendarEvents array (up to 10):
//        • Summary / title  (full)
//        • Start time       (formatted as "Today at 3:00 PM")
//        • End time         (formatted as "3:30 PM")
//    - Sorted by start time ascending
//
//    SLACK (last 6h messages from channel):
//    - For each message in slackMessages (up to 10):
//        • Text  (truncated to 100 chars)
//        • User  (ID or name if available)
//        • ts    (converted to relative time "45 min ago")
//    - Note channel name in context
//
// 4. SYSTEM PROMPT (non-streaming version is fine, or streamText)
//    Model: gpt-4.1-nano (cheap, fast — matches wekraft chatbot pattern)
//
//    System:
//    """
//    You are a smart personal assistant that reviews a user's recent digital
//    activity (emails, calendar, Slack) and returns a concise list of 3–6
//    prioritised actions they should take right now.
//
//    Rules:
//    - Output ONLY a JSON array of action objects — no prose, no markdown wrapper.
//    - Each action object shape:
//        {
//          "priority": "high" | "medium" | "low",
//          "source": "gmail" | "calendar" | "slack",
//          "title": string,          // ≤ 60 chars, imperative verb ("Reply to...", "Join...", "Review...")
//          "detail": string          // ≤ 120 chars, brief context
//        }
//    - Rank by urgency: calendar events starting < 30 min → high, urgent emails → high, etc.
//    - If a source had a fetch error, skip it and mention nothing about that source.
//    - Limit to 6 actions maximum. Quality over quantity.
//    """
//
//    User message: the context string built in step 3.
//
// 5. CALL LLM
//    Option A (recommended): generateText (not streaming) since we want JSON
//      const { text } = await generateText({ model, system, prompt })
//      Parse text as JSON → validate shape with zod
//
//    Option B: streamText with structured output (if we want streaming to client)
//
// 6. RETURN RESPONSE
//    - 200 JSON: { actions: Action[], fetchedAt: string }
//    - 500 on parse/LLM error with { error: string }
//
// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES NEEDED (already in package.json from chatbot route):
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
