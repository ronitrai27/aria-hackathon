import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    id: v.string(), // Clerk unique identifier
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    occupation: v.optional(v.string()),
    age: v.optional(v.number()),
    download_extension: v.boolean(),
    onbording_dialog: v.boolean(),
    connecters: v.array(v.string()),
    planType: v.union(v.literal("free"), v.literal("plus")),
  })
    .index("by_clerk_id", ["id"])
    .index("by_email", ["email"]),

  browserData: defineTable({
    userId: v.string(),
    clientUuid: v.string(), // - this is only what makes the "don't save twice" logic possible — Convex checks this index before inserting.
    url: v.string(),
    content: v.optional(v.string()), // short summary, not raw page
    openedAt: v.number(),
    duration: v.optional(v.number()), // ms, filled when tab closes/leaves
    scrollDepth: v.optional(v.number()), // 0-100
  })
    .index("by_user", ["userId"])
    .index("by_uuid", ["clientUuid"]),

  // tasks.....

  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("not-started"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("on-hold"),
      v.literal("delayed"),
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    estimation: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    finalCompletedAt: v.optional(v.number()),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          size: v.optional(v.number()),
        }),
      ),
    ),
    // Link to workflow
    // workflowId: v.optional(v.id("workflows")),
    aiGenerated: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_priority", ["userId", "priority"]),
  // .index("by_workflow", ["workflowId"]),
});
