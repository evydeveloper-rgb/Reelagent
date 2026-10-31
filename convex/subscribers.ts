import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const add = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("agency")),
    website: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", a.email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, a);
      return existing._id;
    }
    return await ctx.db.insert("subscribers", a);
  },
});

/** Most recent finished video, used as the live demo on the website. */
export const demoVideoUrl = internalQuery({
  args: {},
  handler: async (ctx) => {
    for (const status of ["posted", "ready"] as const) {
      const job = await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .first();
      if (job?.videoStorageId) return await ctx.storage.getUrl(job.videoStorageId);
    }
    return null;
  },
});

/** Public share page data for one video. The job id in the URL is the only key. */
export const shareInfo = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const id = ctx.db.normalizeId("jobs", jobId);
    const job = id && (await ctx.db.get(id));
    if (!job?.videoStorageId) return null;
    return { videoUrl: await ctx.storage.getUrl(job.videoStorageId), caption: job.caption ?? "" };
  },
});
