import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0); // 9:00 AM local time
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

/**
 * Get the daily digest status and run details for the authenticated user.
 */
export const getDigestState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) return null;

    const digest = await ctx.db
      .query("dailyDigest")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!digest) {
      return {
        lastRun: null,
        nextRun: getNextRunTime(),
        status: "idle" as const,
        error: null,
        lastReportText: null,
      };
    }

    return {
      lastRun: digest.lastRun ?? null,
      nextRun: digest.nextRun ?? getNextRunTime(),
      status: (digest.status ?? "idle") as "idle" | "running" | "success" | "failed",
      error: digest.error ?? null,
      lastReportText: digest.lastReportText ?? null,
    };
  },
});

/**
 * Start or update digest state internally (called by the API route).
 */
export const updateDigestStateInternal = mutation({
  args: {
    userId: v.string(), // Convex User ID or Clerk ID
    status: v.union(v.literal("idle"), v.literal("running"), v.literal("success"), v.literal("failed")),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    error: v.optional(v.string()),
    lastReportText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch (e) {}
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
        .unique();
    }
    if (!user) throw new Error(`User not found for ID: ${args.userId}`);

    const existing = await ctx.db
      .query("dailyDigest")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const updates = {
      userId: user._id,
      status: args.status,
      lastRun: args.lastRun !== undefined ? args.lastRun : (existing?.lastRun),
      nextRun: args.nextRun !== undefined ? args.nextRun : (existing?.nextRun ?? getNextRunTime()),
      error: args.error !== undefined ? args.error : (existing?.error),
      lastReportText: args.lastReportText !== undefined ? args.lastReportText : (existing?.lastReportText),
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("dailyDigest", updates);
    }
  },
});

/**
 * Update digest state from the client side using clerk authentication context.
 */
export const updateDigestState = mutation({
  args: {
    status: v.union(v.literal("idle"), v.literal("running"), v.literal("success"), v.literal("failed")),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    error: v.optional(v.string()),
    lastReportText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("dailyDigest")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const updates = {
      userId: user._id,
      status: args.status,
      lastRun: args.lastRun !== undefined ? args.lastRun : (existing?.lastRun),
      nextRun: args.nextRun !== undefined ? args.nextRun : (existing?.nextRun ?? getNextRunTime()),
      error: args.error !== undefined ? args.error : (existing?.error),
      lastReportText: args.lastReportText !== undefined ? args.lastReportText : (existing?.lastReportText),
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("dailyDigest", updates);
    }
  },
});

/**
 * Fetch tasks to summarize for the daily digest.
 */
export const getTasksForDigest = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    let user = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch (e) {}
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
        .unique();
    }
    if (!user) throw new Error("User not found");

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Fetch user email and name for routing and address resolution.
 */
export const getUserInfoForDigest = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    let user = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch (e) {}
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
        .unique();
    }
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});
