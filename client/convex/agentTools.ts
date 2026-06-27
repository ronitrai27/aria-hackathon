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
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

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

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

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
    // Hard cap: never create more than 10 tasks at once
    const batch = args.tasks.slice(0, 10);
    const now = Date.now();
    const results: { title: string; status: "created" | "skipped"; reason?: string }[] = [];

    for (const task of batch) {
      // Check for existing task with same title for this user
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("title"), task.title.trim()))
        .first();

      if (existing) {
        results.push({
          title: task.title,
          status: "skipped",
          reason: "Duplicate title already exists",
        });
        continue;
      }

      await ctx.db.insert("tasks", {
        userId: args.userId,
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
