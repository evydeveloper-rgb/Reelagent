import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const jobStatus = v.union(
  v.literal("planning"), // scraping + Claude storyboard + AI clips / voiceover
  v.literal("render_queued"), // waiting for the render worker
  v.literal("rendering"),
  v.literal("ready"), // preview sent, waiting for approval
  v.literal("posting"),
  v.literal("posted"),
  v.literal("failed"),
);

export default defineSchema({
  users: defineTable({
    platform: v.string(), // "imessage" | "whatsapp_business" | ...
    spaceId: v.string(), // where to reply
    senderId: v.string(),
    agentId: v.optional(v.string()), // our line (Photon agent user) in this conversation
    brand: v.optional(
      v.object({
        name: v.optional(v.string()),
        url: v.optional(v.string()),
        logoStorageId: v.optional(v.id("_storage")),
        notes: v.optional(v.string()), // tone, audience, do/don't
      }),
    ),
    daily: v.optional(
      v.object({
        enabled: v.boolean(),
        hourUtc: v.number(),
        autoPost: v.boolean(),
        lastRunDay: v.optional(v.string()), // YYYY-MM-DD
      }),
    ),
    connectedPlatforms: v.optional(v.array(v.string())), // instagram | tiktok | linkedin | youtube
  }).index("by_space", ["platform", "spaceId"]),

  messages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
  }).index("by_user", ["userId"]),

  assets: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    source: v.union(v.literal("upload"), v.literal("website"), v.literal("generated")),
    jobId: v.optional(v.id("jobs")), // set once used by a job
  }).index("by_user", ["userId"]),

  jobs: defineTable({
    userId: v.id("users"),
    status: jobStatus,
    brief: v.string(),
    sourceUrl: v.optional(v.string()),
    assetIds: v.array(v.id("assets")),
    scheduled: v.boolean(), // created by the daily cron
    autoPost: v.boolean(),
    parentJobId: v.optional(v.id("jobs")), // set for revisions
    storyboard: v.optional(v.any()), // Storyboard
    renderProps: v.optional(v.any()), // RenderProps
    videoStorageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
    postResults: v.optional(v.any()), // per-platform results from Upload-Post
    error: v.optional(v.string()),
    progress: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Website signups.
  subscribers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("agency")),
    website: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // Messages for the worker to deliver.
  outbox: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    spaceId: v.string(),
    text: v.optional(v.string()),
    videoStorageId: v.optional(v.id("_storage")),
    sent: v.boolean(),
  }).index("by_sent", ["sent"]),
});
