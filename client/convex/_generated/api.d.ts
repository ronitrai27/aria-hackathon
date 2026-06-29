/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as agentTools from "../agentTools.js";
import type * as brain from "../brain.js";
import type * as crons from "../crons.js";
import type * as dailyDigest from "../dailyDigest.js";
import type * as http from "../http.js";
import type * as importantActions from "../importantActions.js";
import type * as tasks from "../tasks.js";
import type * as user from "../user.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  agentTools: typeof agentTools;
  brain: typeof brain;
  crons: typeof crons;
  dailyDigest: typeof dailyDigest;
  http: typeof http;
  importantActions: typeof importantActions;
  tasks: typeof tasks;
  user: typeof user;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
