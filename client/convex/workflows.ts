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
    structure: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Cannot save workflow without a Clerk session.");
    }
    const userId = identity.subject;

    // Find if user already has a workflow with this exact name
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
        updatedAt: now,
      });
      return existing._id;
    } else {
      const newId = await ctx.db.insert("workflows", {
        userId,
        name: args.name,
        description: args.description || "",
        isStarred: false,
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
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
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
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      throw new Error("Workflow not found");
    }
    await ctx.db.patch(args.id, {
      name: args.name.trim() || workflow.name,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Fetch all workflows for the authenticated user
 */
export const getWorkflows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});
