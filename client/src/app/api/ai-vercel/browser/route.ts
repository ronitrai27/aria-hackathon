import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { redis } from "@/lib/redis";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ||
    "https://wandering-antelope-3.convex.cloud",
);

const customOpenai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = customOpenai("gpt-4.1-nano");

interface RawBrowserItem {
  _id: string;
  _creationTime: number;
  userId: string;
  clientUuid: string;
  url: string;
  content?: string;
  openedAt: number;
  duration?: number;
  scrollDepth?: number;
}

interface AggregatedActivity {
  url: string;
  title: string;
  totalDurationMs: number;
  visitCount: number;
  lastVisitedAt: number;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, forceRefresh } = await req.json();
    console.log(
      "[Recap API] Request received for userId:",
      userId,
      "forceRefresh:",
      forceRefresh,
    );

    if (!userId) {
      console.error("[Recap API] Missing required parameter: userId");
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    const cacheKey = `browser_recap:${userId}`;

    if (!forceRefresh) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          console.log("[Recap API] Cache hit from Redis for user:", userId);
          const data =
            typeof cachedData === "string"
              ? JSON.parse(cachedData)
              : cachedData;
          return NextResponse.json({ ...data, cached: true });
        }
      } catch (redisError) {
        console.error(
          "[Recap API] Redis read error (falling back to fetch):",
          redisError,
        );
      }
    }

    // 1. Fetch raw browser data from Convex
    // Fetch up to 250 items to have plenty of raw entries to group
    console.log(
      "[Recap API] Fetching recent browser data from Convex client...",
    );
    const rawData = (await convex.query(api.activities.getRecentBrowserData, {
      userId,
      limit: 250,
    })) as RawBrowserItem[];

    console.log(
      "[Recap API] Convex query completed. Total raw items returned:",
      rawData.length,
    );

    if (!rawData || rawData.length === 0) {
      console.log("[Recap API] Convex returned zero items for this user.");
      return NextResponse.json({
        summary: "No recent browsing activity found for today.",
        items: [
          "No activities found yet. Install the extension to sync your browsing data automatically.",
        ],
        topSites: [],
      });
    }

    // 2. Clean & Group raw activity logs
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Check if there is any data from the last 24 hours.
    // If not, we relax the filter and allow older entries so the feature still shows value.
    const hasRecentData = rawData.some((item) => item.openedAt >= oneDayAgo);
    const timeFilter = hasRecentData ? oneDayAgo : 0;

    console.log(
      `[Recap API] Timeframe filter choice: ${
        timeFilter > 0
          ? "last 24 hours only"
          : "all history (relaxing filter because 0 entries match last 24h)"
      }`,
    );

    const groups: Record<string, AggregatedActivity> = {};

    for (const item of rawData) {
      // Apply time filter
      if (item.openedAt < timeFilter) continue;

      const duration = item.duration ?? 0;
      // Filter out accidental clicks/short visits (< 3 seconds) unless it's a search page
      const isSearch =
        item.url.includes("google.com/search") ||
        item.url.includes("bing.com/search");
      if (duration < 3000 && !isSearch) continue;

      let normUrl = item.url;
      try {
        const parsed = new URL(item.url);
        if (isSearch) {
          const q = parsed.searchParams.get("q");
          normUrl = `${parsed.hostname}/search${q ? `?q=${q}` : ""}`;
        } else {
          normUrl = parsed.hostname + parsed.pathname;
        }
      } catch (err) {
        // Fallback to raw URL
      }

      const title = item.content || "Active Web Page";

      if (!groups[normUrl]) {
        groups[normUrl] = {
          url: normUrl,
          title,
          totalDurationMs: 0,
          visitCount: 0,
          lastVisitedAt: item.openedAt,
        };
      }

      groups[normUrl].totalDurationMs += duration;
      groups[normUrl].visitCount += 1;
      if (item.openedAt > groups[normUrl].lastVisitedAt) {
        groups[normUrl].lastVisitedAt = item.openedAt;
      }
    }

    // 3. Sort by total spent duration and slice top 40 to avoid token overload
    const sortedActivities = Object.values(groups)
      .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
      .slice(0, 40);

    console.log(
      "[Recap API] Grouped and filtered activities count:",
      sortedActivities.length,
    );

    if (sortedActivities.length === 0) {
      console.log(
        "[Recap API] Zero significant items after filtering short duration logs.",
      );
      return NextResponse.json({
        summary: "Not enough significant activity recorded today.",
        items: [
          "Browsing records are too brief to summarize. Spend more time on key sites to see insights.",
        ],
        topSites: [],
      });
    }

    // 4. Generate Top Sites Domain aggregation for display
    const domainGroups: Record<
      string,
      { domain: string; durationMs: number; visits: number }
    > = {};
    for (const act of sortedActivities) {
      let domain = "other";
      try {
        // Some normalized URLs may not have http protocol, add it to parse domain correctly
        const urlWithProto = act.url.startsWith("http")
          ? act.url
          : `https://${act.url}`;
        const parsed = new URL(urlWithProto);
        domain = parsed.hostname.replace("www.", "");
      } catch (e) {
        domain = act.url.split("/")[0] || "other";
      }

      if (!domainGroups[domain]) {
        domainGroups[domain] = { domain, durationMs: 0, visits: 0 };
      }
      domainGroups[domain].durationMs += act.totalDurationMs;
      domainGroups[domain].visits += act.visitCount;
    }

    const topSites = Object.values(domainGroups)
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5); // Limit to top 5 domains

    // 5. Build prompt context for LLM
    const activityListString = sortedActivities
      .map(
        (a) =>
          `- Title: "${a.title}"\n  URL: ${a.url}\n  Duration: ${Math.round(
            a.totalDurationMs / 1000,
          )} seconds\n  Visits: ${a.visitCount} times`,
      )
      .join("\n");

    const systemPrompt = `
You are an advanced work-activity intelligence assistant.
Analyze the user's daily browser activity log and generate a structured JSON recap and standup output.

Output ONLY a JSON block with this exact format (no markdown code blocks, no backticks, just raw JSON):
{
  "summary": "Yesterday you spent [X hours] researching [Main Topic], visited [Site] [Y times], and read [Z pages].",
  "items": [
    "Sentence with opinion/suggestion 1",
    "Sentence with opinion/suggestion 2"
  ]
}

Rules:
1. Provide a single concise "summary" paragraph summarizing overall activity.
2. In "items", provide exactly 6 to 10 bullet points showing interesting opinions, direct suggestions, observations, or advice.
3. Keep the advice actionable (e.g., "I noticed you spent 45 minutes on Tailwind's Grid layout documentation, ask aria agent to consider this as your new task." or "You spent nearly 1 hour researching [Topic], I can create a workflow to summarize that URL and send details to your email.").
4. Focus only on high-value sites (docs, research, tools, repositories) rather than basic searches.
5. Limit the output to 6-10 items max. Ensure valid JSON parsing.
`;

    console.log(
      "[Recap API] Prompting AI model gpt-4.1-nano with details of",
      sortedActivities.length,
      "activities...",
    );
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Analyze the following browsing activity:\n\n${activityListString}`,
    });

    console.log("[Recap API] AI response text raw:", text);

    // Strip out markdown formatting markers if LLM returns them
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    const result = JSON.parse(cleanText);
    console.log("[Recap API] Parsed JSON response successfully:", result);

    const finalResult = {
      summary: result.summary,
      items: result.items || [],
      topSites,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(finalResult), { ex: 21600 });
      console.log("[Recap API] Cached new result in Redis for user:", userId);
    } catch (redisError) {
      console.error("[Recap API] Redis write error:", redisError);
    }

    return NextResponse.json(finalResult);
  } catch (error: any) {
    console.error("[API /api/ai-vercel/browser] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process browser recap" },
      { status: 500 },
    );
  }
}
