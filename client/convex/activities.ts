import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation to sync multiple browser activity records.
 * Performs an upsert: inserts new rows or updates existing records with duration/scrollDepth if they already exist.
 */
export const syncBrowserData = mutation({
  args: {
    userId: v.string(),
    events: v.array(
      v.object({
        clientUuid: v.string(),
        url: v.string(),
        content: v.optional(v.string()),
        openedAt: v.number(),
        duration: v.optional(v.number()),
        scrollDepth: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Validate if the user exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new Error(
        `Unauthorized: Clerk user with ID '${args.userId}' not found.`,
      );
    }

    const results = [];

    for (const event of args.events) {
      // Check if event already exists using by_uuid index
      const existing = await ctx.db
        .query("browserData")
        .withIndex("by_uuid", (q) => q.eq("clientUuid", event.clientUuid))
        .unique();

      if (existing) {
        // Event exists, update duration or scroll depth if available
        const updates: Partial<typeof existing> = {};
        let needsUpdate = false;

        if (
          event.duration !== undefined &&
          event.duration !== existing.duration
        ) {
          updates.duration = event.duration;
          needsUpdate = true;
        }
        if (
          event.scrollDepth !== undefined &&
          event.scrollDepth !== existing.scrollDepth
        ) {
          updates.scrollDepth = event.scrollDepth;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await ctx.db.patch(existing._id, updates);
          results.push({ id: existing._id, status: "updated" });
        } else {
          results.push({ id: existing._id, status: "ignored" });
        }
      } else {
        // Insert new event
        const id = await ctx.db.insert("browserData", {
          userId: args.userId,
          clientUuid: event.clientUuid,
          url: event.url,
          content: event.content,
          openedAt: event.openedAt,
          duration: event.duration,
          scrollDepth: event.scrollDepth,
        });
        results.push({ id, status: "inserted" });
      }
    }

    return results;
  },
});

/**
 * Query to fetch recent browsing data for a user.
 */
export const getRecentBrowserData = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxLimit = args.limit ?? 50;
    return await ctx.db
      .query("browserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(maxLimit);
  },
});
