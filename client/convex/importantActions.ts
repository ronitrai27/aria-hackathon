import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const emailObj = v.object({
  id: v.string(),
  subject: v.optional(v.string()),
  from: v.optional(v.string()),
  snippet: v.optional(v.string()),
  date: v.optional(v.string()),
});

const calEventObj = v.object({
  id: v.string(),
  summary: v.optional(v.string()),
  start: v.optional(v.string()),
  end: v.optional(v.string()),
});

const slackMsgObj = v.object({
  ts: v.optional(v.string()),
  text: v.optional(v.string()),
  user: v.optional(v.string()),
});

const sharedArgs = {
  userId: v.string(),
  fetchedAt: v.number(),
  gmailUnreadCount: v.number(),
  gmailEmails: v.array(emailObj),
  gmailError: v.optional(v.string()),
  calendarEvents: v.array(calEventObj),
  calendarError: v.optional(v.string()),
  slackMessageCount: v.number(),
  slackMessages: v.array(slackMsgObj),
  slackChannel: v.optional(v.string()),
  slackError: v.optional(v.string()),
};

/**
 * Internal mutation called by the cron job.
 */
export const upsertImportantActionsData = internalMutation({
  args: sharedArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("importantActionsData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fetchedAt: args.fetchedAt,
        gmailUnreadCount: args.gmailUnreadCount,
        gmailEmails: args.gmailEmails,
        gmailError: args.gmailError,
        calendarEvents: args.calendarEvents,
        calendarError: args.calendarError,
        slackMessageCount: args.slackMessageCount,
        slackMessages: args.slackMessages,
        slackChannel: args.slackChannel,
        slackError: args.slackError,
      });
    } else {
      await ctx.db.insert("importantActionsData", args);
    }
  },
});

/**
 * Public mutation for the Next.js API to upsert fetched schedule data.
 * Always patches existing row; never creates duplicates.
 */
export const storeScheduleData = mutation({
  args: sharedArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("importantActionsData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fetchedAt: args.fetchedAt,
        gmailUnreadCount: args.gmailUnreadCount,
        gmailEmails: args.gmailEmails,
        gmailError: args.gmailError,
        calendarEvents: args.calendarEvents,
        calendarError: args.calendarError,
        slackMessageCount: args.slackMessageCount,
        slackMessages: args.slackMessages,
        slackChannel: args.slackChannel,
        slackError: args.slackError,
      });
      return existing._id;
    }

    return await ctx.db.insert("importantActionsData", args);
  },
});

/**
 * Query to get the latest important actions data for a user.
 */
export const getImportantActionsData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("importantActionsData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});
