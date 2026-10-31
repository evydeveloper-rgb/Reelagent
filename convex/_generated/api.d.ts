/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as daily from "../daily.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as pipeline from "../pipeline.js";
import type * as scrape from "../scrape.js";
import type * as site from "../site.js";
import type * as social from "../social.js";
import type * as subscribers from "../subscribers.js";
import type * as users from "../users.js";
import type * as worker from "../worker.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  auth: typeof auth;
  crons: typeof crons;
  daily: typeof daily;
  http: typeof http;
  jobs: typeof jobs;
  pipeline: typeof pipeline;
  scrape: typeof scrape;
  site: typeof site;
  social: typeof social;
  subscribers: typeof subscribers;
  users: typeof users;
  worker: typeof worker;
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
