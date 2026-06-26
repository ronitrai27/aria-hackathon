import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Internal action that calls the Next.js test-schedule endpoint for all users
export const runScheduledFetch = internalAction({
  args: {},
  handler: async (ctx) => {
    // We use fetch to call the Next.js API from inside Convex
    // The site URL is configured via environment variable
    const siteUrl =
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.SITE_URL;

    if (!siteUrl) {
      console.error("[Cron] SITE_URL is not configured");
      return;
    }

    // Call the trigger endpoint (defined in http.ts) that runs the schedule
    // This endpoint fetches all active users and triggers the workflow
    const response = await fetch(`${siteUrl}/api/trigger-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Cron] trigger-schedule failed:", response.status, text);
    } else {
      const data = await response.json();
      console.log("[Cron] trigger-schedule success:", data);
    }
  },
});

const crons = cronJobs();

// Run every 6 hours
crons.interval(
  "fetch-important-actions",
  { hours: 6 },
  internal.crons.runScheduledFetch,
);

export default crons;
