// =============================================================================
// POST /api/ai-vercel/browser
// =============================================================================
//
// PURPOSE:
//   Given a user's Convex _id, read their browserData from the last 24 hours,
//   deduplicate by domain, and use an LLM (Vercel AI SDK) to surface only the
//   most meaningful/noteworthy sites the user visited — giving a quick "what
//   did I focus on yesterday?" digest.
//
// WHEN IT'S CALLED:
//   - From a "Browser Activity" card / section on /home or /insights
//   - On-demand (button click) — no cron needed, browser data is live in Convex
//
// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION PLAN
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. PARSE REQUEST
//    - Accept POST body: { userId: string }
//    - userId = Convex _id (matches browserData.userId)
//
// 2. FETCH BROWSER DATA FROM CONVEX
//    - Use ConvexHttpClient (server-side)
//    - Need a new Convex query: api.browserData.getRecentByUser({ userId, since: timestamp })
//      OR we can fetch all by_user and filter server-side (fine for small data)
//    - Filter: openedAt >= Date.now() - 24 * 60 * 60 * 1000  (last 24 hours)
//    - If no entries found → return { insights: [], message: "No browser activity in the last 24h" }
//
// 3. PRE-PROCESS / DEDUPLICATE
//    - Extract domain from each url  (new URL(url).hostname)
//    - Group entries by domain:
//        { domain: string, visits: number, totalDuration: number, urls: string[], contents: string[] }
//    - Sort by totalDuration DESC (time spent = importance signal)
//    - Keep top 20 domains to avoid token overload
//    - For each domain, concatenate content summaries (truncated to 80 chars each) into one string
//
// 4. BUILD CONTEXT STRING FOR LLM
//    Format each domain group as:
//    ---
//    Domain: github.com
//    Visits: 14  |  Time: ~42 min
//    Pages: "Reviewing PR #234 in aria-os", "Issues tab – aria-os", ...
//    ---
//    Domain: notion.so
//    Visits: 3  |  Time: ~8 min
//    Pages: "Sprint planning doc", ...
//    ---
//    (etc.)
//
// 5. SYSTEM PROMPT
//    Model: gpt-4.1-nano
//
//    System:
//    """
//    You are a smart personal productivity assistant reviewing a user's browser
//    activity from the last 24 hours.
//
//    Rules:
//    - Output ONLY a JSON array of insight objects — no prose, no markdown.
//    - Each insight object shape:
//        {
//          "domain": string,          // e.g. "github.com"
//          "label": string,           // ≤ 50 chars, human-friendly label e.g. "Code Review"
//          "summary": string,         // ≤ 120 chars, what the user was doing on this site
//          "timeSpent": string,       // formatted e.g. "~42 min"
//          "importance": "high" | "medium" | "low"  // based on time + content relevance
//        }
//    - Include only domains where activity was meaningful (skip 1-visit <30s sites).
//    - Rank by importance DESC.
//    - Maximum 8 insights.
//    - "high" = > 15 min or work-critical tool (GitHub, Jira, Notion, Gmail, Figma, etc.)
//    - "medium" = 5–15 min or moderate relevance
//    - "low" = < 5 min or entertainment/social
//    """
//
//    User message: the context string built in step 4.
//
// 6. CALL LLM
//    - generateText (non-streaming) to get clean JSON
//    - Parse → validate with zod schema
//    - On parse failure → log raw text, return { error: "AI returned invalid response" }
//
// 7. RETURN RESPONSE
//    - 200 JSON: { insights: Insight[], periodStart: string, periodEnd: string, totalSites: number }
//    - 500 on LLM/Convex error
//
// ─────────────────────────────────────────────────────────────────────────────
// CONVEX QUERY NEEDED (to add to convex/browserData.ts or similar):
//
//   export const getRecentByUser = query({
//     args: { userId: v.string(), since: v.number() },
//     handler: async (ctx, { userId, since }) => {
//       return await ctx.db
//         .query("browserData")
//         .withIndex("by_user", q => q.eq("userId", userId))
//         .filter(q => q.gte(q.field("openedAt"), since))
//         .collect();
//     }
//   });
//
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
