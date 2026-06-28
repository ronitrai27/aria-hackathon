import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation to sync the authenticated Clerk user to Convex.
 * If the user already exists, it updates their profile (name, email, avatar) if changed.
 * If they don't exist, it creates a new user record.
 * Returns the Convex User ID.
 */
export const createUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Unauthorized: Cannot store user without a valid Clerk session.",
      );
    }

    // Check if the user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();

    if (existingUser !== null) {
      // User exists, check if updates are needed to sync profile
      const updates: Partial<typeof existingUser> = {};
      let needsUpdate = false;

      if (existingUser.name !== (identity.name ?? "Anonymous")) {
        updates.name = identity.name ?? "Anonymous";
        needsUpdate = true;
      }
      if (existingUser.email !== (identity.email ?? "")) {
        updates.email = identity.email ?? "";
        needsUpdate = true;
      }
      if (existingUser.avatar !== identity.pictureUrl) {
        updates.avatar = identity.pictureUrl;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(existingUser._id, updates);
      }

      return existingUser._id;
    }

    // Insert new user record
    const newUserId = await ctx.db.insert("users", {
      id: identity.subject,
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      avatar: identity.pictureUrl,
      download_extension: false,
      onbording_dialog: false,
      connecters: [],
      planType: "free",
    });

    return newUserId;
  },
});

/**
 * Query to fetch the currently authenticated user's record from Convex.
 * Returns null if the user is not authenticated or not synced yet.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
  },
});

export const toggleConnector = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    const connecters = user.connecters ?? [];
    let nextConnecters = [];
    if (connecters.includes(args.name)) {
      nextConnecters = connecters.filter((c) => c !== args.name);
    } else {
      nextConnecters = [...connecters, args.name];
    }
    await ctx.db.patch(user._id, { connecters: nextConnecters });
    return nextConnecters;
  },
});

/**
 * Atomically replace the full connecters list.
 * Used by ConnectorDropdown to sync Composio → Convex in one mutation.
 */
export const setConnectors = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { connecters: args.names });
    return args.names;
  },
});

export const getAllUsersInternal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
