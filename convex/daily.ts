// Daily automatic videos: every hour, start a job for users whose posting hour has come.
import { internalMutation } from "./_generated/server";
import { createJob } from "./jobs";

export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const hour = now.getUTCHours();
    const today = now.toISOString().slice(0, 10);
    // Fine for hackathon scale; add an index on daily.enabled if this grows.
    for await (const user of ctx.db.query("users")) {
      const d = user.daily;
      if (!d?.enabled || d.hourUtc !== hour || d.lastRunDay === today) continue;

      // Feed in recent captions so each day takes a new angle.
      const past = await ctx.db
        .query("jobs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(10);
      const pastCaptions = past.map((j) => j.caption?.split("\n")[0]).filter(Boolean);
      const library = await ctx.db
        .query("assets")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(40);
      // Rotate through their photo library: a different handful each day.
      const uploads = library.filter((a) => a.source === "upload");
      const offset = uploads.length ? (Number(today.replaceAll("-", "")) * 3) % uploads.length : 0;
      const picks = [...uploads.slice(offset), ...uploads.slice(0, offset)].slice(0, 6).map((a) => a._id);

      await ctx.db.patch(user._id, { daily: { ...d, lastRunDay: today } });
      await createJob(ctx, {
        userId: user._id,
        brief: [
          "Daily Instagram Reel for this brand. Pick ONE fresh angle (a feature, benefit, customer story, tip, behind-the-scenes, offer or seasonal hook) that has not been done recently.",
          pastCaptions.length && `Recent posts (do not repeat these angles):\n- ${pastCaptions.join("\n- ")}`,
          `Today is ${today}.`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        sourceUrl: user.brand?.url,
        assetIds: picks,
        scheduled: true,
        autoPost: d.autoPost,
      });
    }
  },
});
