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

  // Stores the last fetched important actions data from the 6-hour cron
  importantActionsData: defineTable({
    userId: v.string(),
    fetchedAt: v.number(), // timestamp
    gmailUnreadCount: v.number(),
    gmailEmails: v.array(
      v.object({
        id: v.string(),
        subject: v.optional(v.string()),
        from: v.optional(v.string()),
        snippet: v.optional(v.string()),
        date: v.optional(v.string()),
      }),
    ),
    gmailError: v.optional(v.string()),
    calendarEvents: v.array(
      v.object({
        id: v.string(),
        summary: v.optional(v.string()),
        start: v.optional(v.string()),
        end: v.optional(v.string()),
      }),
    ),
    calendarError: v.optional(v.string()),
    slackMessageCount: v.number(),
    slackMessages: v.array(
      v.object({
        ts: v.optional(v.string()),
        text: v.optional(v.string()),
        user: v.optional(v.string()),
      }),
    ),
    slackChannel: v.optional(v.string()),
    slackError: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_fetchedAt", ["userId", "fetchedAt"]),

  workflows: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isStarred: v.boolean(),
    status: v.optional(v.union(v.literal("active"), v.literal("draft"))),
    structure: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
    lastRun: v.optional(v.number()), // timestamp of last execution
    scheduled: v.optional(
      v.object({
        time: v.string(), // e.g. "09:00"
        frequency: v.string(), // "once" | "daily" | "weekly" | "monthly"
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_starred", ["userId", "isStarred"])
    .index("by_user_status", ["userId", "status"]),
});
