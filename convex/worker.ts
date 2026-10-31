// Public API used only by the worker process (Spectrum transport + Remotion renderer).
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkSecret } from "./auth";
import { failJob } from "./jobs";

const AGENT_DEBOUNCE_MS = 6000; // photos and text often arrive as separate messages

export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    checkSecret(secret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const receive = mutation({
  args: {
    secret: v.string(),
    platform: v.string(),
    spaceId: v.string(),
    senderId: v.string(),
    agentId: v.optional(v.string()),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, a) => {
    checkSecret(a.secret);
    const user = await ctx.db
      .query("users")
      .withIndex("by_space", (q) => q.eq("platform", a.platform).eq("spaceId", a.spaceId))
      .unique();
    const userId =
      user?._id ??
      (await ctx.db.insert("users", { platform: a.platform, spaceId: a.spaceId, senderId: a.senderId, agentId: a.agentId }));
    if (user && a.agentId && user.agentId !== a.agentId) await ctx.db.patch(userId, { agentId: a.agentId });

    if (a.storageId) {
      await ctx.db.insert("assets", { userId, storageId: a.storageId, source: "upload" });
    }
    const text = a.text?.trim() || (a.storageId ? "[sent a photo]" : "");
    if (!text) return;
    const messageId = await ctx.db.insert("messages", { userId, role: "user", text });
    await ctx.scheduler.runAfter(AGENT_DEBOUNCE_MS, internal.agent.handle, { userId, messageId });
  },
});

export const pendingOutbox = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    checkSecret(secret);
    const rows = await ctx.db
      .query("outbox")
      .withIndex("by_sent", (q) => q.eq("sent", false))
      .take(20);
    return await Promise.all(
      rows.map(async (r) => ({
        ...r,
        agentId: (await ctx.db.get(r.userId))?.agentId ?? null,
        videoUrl: r.videoStorageId ? await ctx.storage.getUrl(r.videoStorageId) : null,
      })),
    );
  },
});

export const markSent = mutation({
  args: { secret: v.string(), id: v.id("outbox") },
  handler: async (ctx, { secret, id }) => {
    checkSecret(secret);
    await ctx.db.patch(id, { sent: true });
  },
});

export const renderQueue = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    checkSecret(secret);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "render_queued"))
      .take(5);
    return jobs.map((j) => ({ _id: j._id, renderProps: j.renderProps }));
  },
});

export const claimRender = mutation({
  args: { secret: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, { secret, jobId }) => {
    checkSecret(secret);
    const job = await ctx.db.get(jobId);
    if (!job || job.status !== "render_queued") return false;
    await ctx.db.patch(jobId, { status: "rendering", progress: "rendering 0%" });
    return true;
  },
});

export const renderProgress = mutation({
  args: { secret: v.string(), jobId: v.id("jobs"), progress: v.string() },
  handler: async (ctx, { secret, jobId, progress }) => {
    checkSecret(secret);
    await ctx.db.patch(jobId, { progress });
  },
});

export const renderDone = mutation({
  args: { secret: v.string(), jobId: v.id("jobs"), storageId: v.id("_storage") },
  handler: async (ctx, { secret, jobId, storageId }) => {
    checkSecret(secret);
    await ctx.db.patch(jobId, { status: "ready", videoStorageId: storageId, progress: undefined });
    await ctx.scheduler.runAfter(0, internal.jobs.onRendered, { jobId });
  },
});

export const renderFailed = mutation({
  args: { secret: v.string(), jobId: v.id("jobs"), error: v.string() },
  handler: async (ctx, { secret, jobId, error }) => {
    checkSecret(secret);
    await failJob(ctx, jobId, error);
  },
});
