import { ObjectType, v } from "convex/values";
import { internalMutation, internalQuery, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/** Queue a chat message (and optionally a video) to the user, and log it for the agent's memory. */
export async function say(ctx: MutationCtx, userId: Id<"users">, text: string, videoStorageId?: Id<"_storage">) {
  const user = await ctx.db.get(userId);
  if (!user) return;
  await ctx.db.insert("outbox", {
    userId,
    platform: user.platform,
    spaceId: user.spaceId,
    text,
    videoStorageId,
    sent: false,
  });
  await ctx.db.insert("messages", { userId, role: "assistant", text });
}

export async function failJob(ctx: MutationCtx, jobId: Id<"jobs">, error: string) {
  const job = await ctx.db.get(jobId);
  if (!job) return;
  console.error(`job ${jobId} failed: ${error}`);
  await ctx.db.patch(jobId, { status: "failed", error, progress: undefined });
  await say(ctx, job.userId, "Sorry, that video didn't work out on my end. Want me to try again?");
}

export const say_ = internalMutation({
  args: { userId: v.id("users"), text: v.string(), videoStorageId: v.optional(v.id("_storage")) },
  handler: (ctx, a) => say(ctx, a.userId, a.text, a.videoStorageId),
});

export const fail = internalMutation({
  args: { jobId: v.id("jobs"), error: v.string() },
  handler: (ctx, { jobId, error }) => failJob(ctx, jobId, error),
});

export const get = internalQuery({
  args: { jobId: v.id("jobs") },
  handler: (ctx, { jobId }) => ctx.db.get(jobId),
});

export const patch = internalMutation({
  args: { jobId: v.id("jobs"), fields: v.any() },
  handler: (ctx, { jobId, fields }) => ctx.db.patch(jobId, fields),
});

const createArgs = {
  userId: v.id("users"),
  brief: v.string(),
  sourceUrl: v.optional(v.string()),
  assetIds: v.array(v.id("assets")),
  scheduled: v.boolean(),
  autoPost: v.boolean(),
  parentJobId: v.optional(v.id("jobs")),
};

export async function createJob(ctx: MutationCtx, a: ObjectType<typeof createArgs>) {
  const jobId = await ctx.db.insert("jobs", { ...a, status: "planning" });
  for (const id of a.assetIds) {
    const asset = await ctx.db.get(id);
    if (asset && !asset.jobId) await ctx.db.patch(id, { jobId });
  }
  await ctx.scheduler.runAfter(0, internal.pipeline.run, { jobId });
  return jobId;
}

export const create = internalMutation({ args: createArgs, handler: createJob });

export const addAsset = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    source: v.union(v.literal("upload"), v.literal("website"), v.literal("generated")),
    jobId: v.optional(v.id("jobs")),
  },
  handler: (ctx, a) => ctx.db.insert("assets", a),
});

/** Asset URLs for a job, in order. */
export const assetUrls = internalQuery({
  args: { assetIds: v.array(v.id("assets")) },
  handler: async (ctx, { assetIds }) => {
    const out: { assetId: Id<"assets">; storageId: Id<"_storage">; url: string }[] = [];
    for (const id of assetIds) {
      const a = await ctx.db.get(id);
      const url = a && (await ctx.storage.getUrl(a.storageId));
      if (a && url) out.push({ assetId: id, storageId: a.storageId, url });
    }
    return out;
  },
});

export const onRendered = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job?.videoStorageId) return;
    const user = await ctx.db.get(job.userId);
    const connected = user?.connectedPlatforms ?? [];
    if (job.autoPost && connected.length) {
      await ctx.db.patch(jobId, { status: "posting" });
      await ctx.scheduler.runAfter(0, internal.social.publish, { jobId });
      await say(ctx, job.userId, "Today's video is ready. Posting it now 👇", job.videoStorageId);
      return;
    }
    const where = connected.length ? "to your connected accounts" : "to Instagram, TikTok, LinkedIn or YouTube Shorts";
    const site = process.env.CONVEX_SITE_URL;
    const share = site ? `\n\nOr post it yourself: ${site}/v?j=${jobId}` : "";
    await say(
      ctx,
      job.userId,
      `Here's your video 🎬\n\nCaption:\n${job.caption ?? ""}\n\nReply "post" to publish it ${where}, or tell me what to change.${share}`,
      job.videoStorageId,
    );
  },
});

/** Everything the agent needs to decide what to do with a new message. */
export const agentContext = internalQuery({
  args: { userId: v.id("users"), messageId: v.id("messages") },
  handler: async (ctx, { userId, messageId }) => {
    const user = await ctx.db.get(userId);
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(16);
    const latestUserMsg = recent.find((m) => m.role === "user");
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(3);
    const unusedUploads = (
      await ctx.db
        .query("assets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(20)
    ).filter((a) => !a.jobId && a.source === "upload");
    return {
      user,
      superseded: latestUserMsg?._id !== messageId, // a newer message will be handled instead
      history: recent.reverse().map((m) => ({ role: m.role, text: m.text })),
      jobs: jobs.map((j) => ({
        id: j._id,
        status: j.status,
        brief: j.brief,
        progress: j.progress,
        caption: j.caption,
        ageMin: Math.round((Date.now() - j._creationTime) / 60000),
      })),
      unusedUploadIds: unusedUploads.map((a) => a._id),
    };
  },
});

/** For debugging from the CLI: `npx convex run jobs:videoUrl '{"jobId":"..."}'` */
export const videoUrl = internalQuery({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    return job?.videoStorageId ? await ctx.storage.getUrl(job.videoStorageId) : null;
  },
});
