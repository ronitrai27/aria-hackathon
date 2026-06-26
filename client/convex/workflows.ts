import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update a workflow design.
 * Uses the Clerk unique user ID.
 */
export const saveWorkflow = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("draft"))),
    structure: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Unauthorized: Cannot save workflow without a Clerk session.",
      );
    }
    const userId = identity.subject;

    const existing = await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        structure: args.structure,
        description: args.description || existing.description,
        status: args.status ?? existing.status,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const newId = await ctx.db.insert("workflows", {
        userId,
        name: args.name,
        description: args.description || "",
        isStarred: false,
        status: args.status ?? "active",
        structure: args.structure,
        createdAt: now,
        updatedAt: now,
      });
      return newId;
    }
  },
});

/**
 * Toggle starred status of a workflow
 */
export const toggleStar = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    const nextStarred = !workflow.isStarred;
    await ctx.db.patch(args.id, {
      isStarred: nextStarred,
      updatedAt: Date.now(),
    });
    return nextStarred;
  },
});

/**
 * Rename a workflow
 */
export const renameWorkflow = mutation({
  args: {
    id: v.id("workflows"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    await ctx.db.patch(args.id, {
      name: args.name.trim() || workflow.name,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Record the timestamp of the most recent run for a workflow.
 * Also marks the workflow as "active".
 */
export const updateLastRun = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    await ctx.db.patch(args.id, {
      lastRun: Date.now(),
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update the status of a workflow (active or draft)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("workflows"),
    status: v.union(v.literal("active"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Save the schedule configuration (time + repeat frequency) for a workflow.
 */
export const updateSchedule = mutation({
  args: {
    id: v.id("workflows"),
    time: v.string(), // e.g. "09:00"
    frequency: v.string(), // "once" | "daily" | "weekly" | "monthly"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    await ctx.db.patch(args.id, {
      scheduled: {
        time: args.time,
        frequency: args.frequency,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Fetch all workflows for the authenticated user (newest first)
 */
export const getWorkflows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Delete a workflow by ID
 */
export const deleteWorkflow = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");
    if (workflow.userId !== identity.subject) {
      throw new Error("Unauthorized: You do not own this workflow");
    }
    await ctx.db.delete(args.id);
  },
});
