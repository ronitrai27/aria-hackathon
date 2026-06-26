import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

import { v } from "convex/values";

const taskStatus = v.union(
  v.literal("not-started"),
  v.literal("in-progress"),
  v.literal("completed"),
  v.literal("on-hold"),
  v.literal("delayed"),
);

const taskPriority = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

/**
 * Create a task for the authenticated user.
 * Throws ConvexError("DUPLICATE_TITLE") if title already exists for this user.
 */
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority: taskPriority,
    estimation: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          size: v.optional(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("title"), args.title.trim()))
      .first();

    if (existing) throw new ConvexError("DUPLICATE_TITLE");

    const now = Date.now();
    return await ctx.db.insert("tasks", {
      userId,
      title: args.title.trim(),
      description: args.description,
      status: args.status,
      priority: args.priority,
      estimation: args.estimation,
      attachments: args.attachments,
      aiGenerated: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ----------------------------------------------------------
/** Get all tasks for the authenticated user, newest first. */
export const getTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Update a task. Only the owning user can update.
 * Auto-sets finalCompletedAt when status transitions to "completed".
 * Throws ConvexError("DUPLICATE_TITLE") if the new title conflicts.
 */
export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    estimation: v.optional(
      v.object({ startDate: v.number(), endDate: v.number() }),
    ),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          size: v.optional(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject)
      throw new Error("Task not found or access denied");

    if (args.title && args.title.trim() !== task.title) {
      const dup = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .filter((q) => q.eq(q.field("title"), args.title!.trim()))
        .first();
      if (dup) throw new ConvexError("DUPLICATE_TITLE");
    }

    const { id, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };
    if (args.title) patch.title = args.title.trim();

    if (args.status === "completed" && task.status !== "completed") {
      patch.finalCompletedAt = Date.now();
    } else if (args.status && args.status !== "completed") {
      patch.finalCompletedAt = undefined;
    }

    await ctx.db.patch(id, patch);
  },
});

// -------------------------------------------------
/** Delete a task. Only the owning user can delete. */
export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject)
      throw new Error("Task not found or access denied");
    await ctx.db.delete(args.id);
  },
});

// -----------------------------------------------------------
/** Delete multiple tasks. Only the owning user can delete. */
export const deleteTasks = mutation({
  args: { ids: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    for (const id of args.ids) {
      const task = await ctx.db.get(id);
      if (task && task.userId === identity.subject) {
        await ctx.db.delete(id);
      }
    }
  },
});
