import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper to extract a title from the first message
function extractTitle(messages: any[]): string {
  if (!messages || messages.length === 0) return "New Conversation";
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage || !firstUserMessage.content) return "New Conversation";
  
  const content = firstUserMessage.content as string;
  // Get first 5 words or so
  const words = content.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length < content.length ? words + "..." : words;
}

export const saveSession = mutation({
  args: {
    userId: v.string(), // Convex User ID
    threadId: v.string(),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brainSessions")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      const title = extractTitle(args.messages);
      const newSessionId = await ctx.db.insert("brainSessions", {
        userId: args.userId,
        threadId: args.threadId,
        title,
        messages: args.messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return newSessionId;
    }
  },
});

export const getSessions = query({
  args: {
    userId: v.string(), // Convex User ID
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("brainSessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Sort pinned sessions to the top, then by updatedAt desc
    return [...sessions].sort((a, b) => {
      const aPinned = !!a.isPinned;
      const bPinned = !!b.isPinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

export const getSession = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brainSessions")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();
  },
});

export const clearSessions = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("brainSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

export const renameSession = mutation({
  args: {
    sessionId: v.id("brainSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const togglePinSession = mutation({
  args: {
    sessionId: v.id("brainSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    await ctx.db.patch(args.sessionId, {
      isPinned: !session.isPinned,
      updatedAt: Date.now(),
    });
  },
});

export const deleteSession = mutation({
  args: {
    sessionId: v.id("brainSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});
