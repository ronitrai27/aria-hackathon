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
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    const userId = user._id;

    // Check for existing title with either Convex ID or Clerk ID
    const existingConvex = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("title"), args.title.trim()))
      .first();

    const existingClerk = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("title"), args.title.trim()))
      .first();

    if (existingConvex || existingClerk) throw new ConvexError("DUPLICATE_TITLE");

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();

    const convexTasks = user
      ? await ctx.db
          .query("tasks")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];

    const legacyTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Merge and deduplicate
    const combined = [...convexTasks];
    const convexIds = new Set(convexTasks.map((t) => t._id));
    for (const t of legacyTasks) {
      if (!convexIds.has(t._id)) {
        combined.push(t);
      }
    }

    // Sort newest first
    combined.sort((a, b) => b.createdAt - a.createdAt);
    return combined;
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const task = await ctx.db.get(args.id);
    if (!task || (task.userId !== user._id && task.userId !== identity.subject))
      throw new Error("Task not found or access denied");

    if (args.title && args.title.trim() !== task.title) {
      // Check duplicate using both IDs
      const dupConvex = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("title"), args.title!.trim()))
        .first();

      const dupClerk = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .filter((q) => q.eq(q.field("title"), args.title!.trim()))
        .first();

      if (dupConvex || dupClerk) throw new ConvexError("DUPLICATE_TITLE");
    }

    const { id, ...rest } = args;
    const patch: Record<string, any> = { ...rest, updatedAt: Date.now() };
    if (args.title) patch.title = args.title.trim();

    // Auto-migrate on update
    if (task.userId === identity.subject) {
      patch.userId = user._id;
    }

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const task = await ctx.db.get(args.id);
    if (!task || (task.userId !== user._id && task.userId !== identity.subject))
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    for (const id of args.ids) {
      const task = await ctx.db.get(id);
      if (task && (task.userId === user._id || task.userId === identity.subject)) {
        await ctx.db.delete(id);
      }
    }
  },
});

// -----------------------------------------------------------
/** Toggle a task's status between "on-hold" and "in-progress". */
export const toggleTaskHold = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const task = await ctx.db.get(args.id);
    if (!task || (task.userId !== user._id && task.userId !== identity.subject))
      throw new Error("Task not found or access denied");

    const newStatus = task.status === "on-hold" ? "in-progress" : "on-hold";
    const patch: Record<string, any> = {
      status: newStatus,
      updatedAt: Date.now(),
      finalCompletedAt: undefined,
    };

    // Auto-migrate on toggle
    if (task.userId === identity.subject) {
      patch.userId = user._id;
    }

    await ctx.db.patch(args.id, patch);
    return newStatus;
  },
});

/**
 * Mutation to migrate all legacy tasks for the authenticated user.
 * Changes tasks with userId = Clerk ID to the Convex User ID.
 */
export const migrateTasks = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const legacyTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    let count = 0;
    for (const t of legacyTasks) {
      await ctx.db.patch(t._id, { userId: user._id });
      count++;
    }

    return { migrated: count };
  },
});
