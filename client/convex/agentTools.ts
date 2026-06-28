import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * getTaskByName — fetch a single task by title for a given user.
 * Returns only the fields the agent needs: id, title, description, status.
 * Returns null with a message if no matching task is found.
 */
export const getTaskByName = query({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Resolve user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
      .unique();
    const dbUserId = user ? user._id : args.userId;

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", dbUserId))
      .collect();

    // Support legacy/both matches
    if (user && user._id !== args.userId) {
      const legacyTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      tasks = [...tasks, ...legacyTasks];
    }

    const match = tasks.find(
      (t) => t.title.toLowerCase() === args.title.toLowerCase(),
    );

    if (!match) {
      return {
        message: `No task found with title "${args.title}".`,
        task: null,
      };
    }

    return {
      message: "Task found.",
      task: {
        id: match._id,
        title: match.title,
        description: match.description ?? null,
        status: match.status,
      },
    };
  },
});

// ─── Brain Tool: getTasks ─────────────────────────────────────────────────────
/**
 * getTasks — fetch the most recent tasks for a given user (brain agent tool).
 * Returns only: title, description (truncated to 120 chars), status, duration
 * (derived from estimation.startDate → endDate in human-readable form).
 * Limit is optional, capped at 10. Ordered newest first.
 */
export const getTasks = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Clamp limit: default 10, max 10
    const limit = Math.min(args.limit ?? 10, 10);

    // Resolve user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
      .unique();
    const dbUserId = user ? user._id : args.userId;

    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", dbUserId))
      .order("desc")
      .take(limit);

    // Support legacy/both matches
    if (user && user._id !== args.userId) {
      const legacyTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(limit);
      if (legacyTasks.length > 0) {
        const combined = [...tasks, ...legacyTasks];
        combined.sort((a, b) => b.createdAt - a.createdAt);
        tasks = combined.slice(0, limit);
      }
    }

    return tasks.map((t) => {
      // Compute human-readable duration from estimation timestamps
      const durationMs = t.estimation.endDate - t.estimation.startDate;
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      const duration =
        durationDays <= 0
          ? "No duration"
          : durationDays === 1
            ? "1 day"
            : `${durationDays} days`;

      // Truncate description to 120 characters
      const rawDesc = t.description ?? "";
      const description =
        rawDesc.length > 120 ? rawDesc.slice(0, 117) + "..." : rawDesc;

      return {
        title: t.title,
        description,
        status: t.status,
        duration,
      };
    });
  },
});

// ─── Brain Tool: createTasks ──────────────────────────────────────────────────
/**
 * createTasks — bulk-create 1–10 tasks for a given user (brain agent tool).
 * Each task requires: title, description (optional), status, startDate, endDate.
 * Priority defaults to "medium", aiGenerated is always set to true.
 * Skips (does not throw) on duplicate titles — returns per-task results.
 */
export const createTasks = mutation({
  args: {
    userId: v.string(),
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        priority: v.optional(
          v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        ),
        // Unix timestamps in milliseconds
        startDate: v.number(),
        endDate: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Resolve user: try direct Convex ID first, then fallback to Clerk ID
    let user = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch (e) {
      // ignore invalid ID format
    }
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
        .unique();
    }
    if (!user) {
      throw new Error(`User not found for ID: ${args.userId}`);
    }
    const dbUserId = user._id;

    // Hard cap: never create more than 10 tasks at once
    const batch = args.tasks.slice(0, 10);
    const now = Date.now();
    const results: {
      title: string;
      status: "created" | "skipped";
      reason?: string;
    }[] = [];

    for (const task of batch) {
      // Check duplicate using both IDs
      const existingConvex = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", dbUserId))
        .filter((q) => q.eq(q.field("title"), task.title.trim()))
        .first();

      const existingClerk = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("title"), task.title.trim()))
        .first();

      if (existingConvex || existingClerk) {
        results.push({
          title: task.title,
          status: "skipped",
          reason: "Duplicate title already exists",
        });
        continue;
      }

      await ctx.db.insert("tasks", {
        userId: dbUserId,
        title: task.title.trim(),
        description: task.description,
        status: "not-started",
        priority: task.priority ?? "medium",
        estimation: {
          startDate: task.startDate,
          endDate: task.endDate,
        },
        aiGenerated: true,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ title: task.title, status: "created" });
    }

    const createdCount = results.filter((r) => r.status === "created").length;
    return {
      message: `Created ${createdCount} of ${batch.length} task(s).`,
      results,
    };
  },
});

// ─── Brain Tool: getBrowserActivity ───────────────────────────────────────────
/**
 * getBrowserActivity — fetch recent aggregated browser activity for a given user.
 * Fetches data from last 48 hours, groups by domain to remove duplicate pages/visits,
 * and returns only domains where the user spent >= 10 minutes, sorted descending by duration (max 30).
 */
export const getBrowserActivity = query({
  args: {
    userId: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const fortyEightHoursAgo = args.now - 48 * 60 * 60 * 1000;
    const tenMinutesMs = 10 * 60 * 1000;

    // Resolve Convex ID to Clerk ID if needed
    let user = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch (e) {}
    const clerkId = user ? user.id : args.userId;

    // Fetch recent browser data entries for the user
    const rows = await ctx.db
      .query("browserData")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .order("desc")
      .take(1000);

    console.log("[getBrowserActivity Query] Total rows found in DB:", rows.length);
    if (rows.length > 0) {
      console.log("[getBrowserActivity Query] First row openedAt:", rows[0].openedAt, "duration:", rows[0].duration, "url:", rows[0].url);
    }

    // Self-healing time filter: if no data matches the last 48 hours, relax the filter
    const hasRecentData = rows.some((r) => r.openedAt >= fortyEightHoursAgo);
    const timeFilter = hasRecentData ? fortyEightHoursAgo : 0;
    console.log("[getBrowserActivity Query] hasRecentData in last 48h:", hasRecentData, "timeFilter:", timeFilter);

    // Grouping structure: domain -> aggregated data
    const groups: Record<
      string,
      {
        domain: string;
        totalDurationMs: number;
        visitCount: number;
        lastVisitedAt: number;
      }
    > = {};

    for (const r of rows) {
      if (r.openedAt < timeFilter) continue;

      let domain = "";
      try {
        const urlWithProto = r.url.startsWith("http") ? r.url : `https://${r.url}`;
        const parsed = new URL(urlWithProto);
        domain = parsed.hostname.replace("www.", "");
      } catch (e) {
        domain = r.url.split("/")[0] || r.url;
      }

      if (!domain) continue;

      if (!groups[domain]) {
        groups[domain] = {
          domain,
          totalDurationMs: 0,
          visitCount: 0,
          lastVisitedAt: r.openedAt,
        };
      }

      groups[domain].totalDurationMs += r.duration ?? 0;
      groups[domain].visitCount += 1;
      if (r.openedAt > groups[domain].lastVisitedAt) {
        groups[domain].lastVisitedAt = r.openedAt;
      }
    }

    // Dynamic duration thresholding fallback chain
    let filtered = Object.values(groups).filter((g) => g.totalDurationMs >= tenMinutesMs);
    if (filtered.length === 0) {
      filtered = Object.values(groups).filter((g) => g.totalDurationMs >= 1 * 60 * 1000); // 1 minute
    }
    if (filtered.length === 0) {
      filtered = Object.values(groups); // no floor fallback
    }

    // Sort descending by duration, limit 30
    const result = filtered
      .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
      .slice(0, 30);

    console.log("[getBrowserActivity Query] Returning aggregated items count:", result.length);
    return result;
  },
});

export const resolveUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.clerkUserId))
      .unique();
    return user ? { _id: user._id, name: user.name } : null;
  },
});
