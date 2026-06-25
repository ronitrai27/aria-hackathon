import { query } from "./_generated/server";
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
