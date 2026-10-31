"use node";
// The chat agent: reads the conversation, decides what to do, and replies.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const Decision = z.object({
  reply: z.string().describe("What to text back. Short, friendly, texting style. No markdown."),
  action: z.enum([
    "none",
    "create_video",
    "revise_video",
    "post_video",
    "set_daily",
    "stop_daily",
    "connect_accounts",
    "set_brand",
  ]),
  brief: z.string().nullable().describe("create_video: what the video should be about / achieve."),
  url: z.string().nullable().describe("Website URL for create_video, set_daily or set_brand."),
  feedback: z.string().nullable().describe("revise_video: what to change."),
  hourUtc: z.number().int().nullable().describe("set_daily: posting hour in UTC (0-23)."),
  autoPost: z.boolean().nullable().describe("set_daily: post without asking for approval."),
  brandName: z.string().nullable(),
  brandNotes: z.string().nullable().describe("Tone, audience, things to always/never say."),
  platforms: z
    .array(z.enum(["instagram", "tiktok", "linkedin", "youtube"]))
    .nullable()
    .describe("post_video: only these platforms if the user named some; null = all connected."),
});

const SYSTEM = `You are ReelAgent, a creative director people text on iMessage/WhatsApp. You make high-quality short vertical videos (Reels/TikToks/Shorts) from a website URL, photos they send, or just an idea, and can post them to Instagram, TikTok, LinkedIn and YouTube Shorts for them, including a fresh video every day.

Pick exactly one action per message:
- create_video: they asked for a video (or sent a URL/photos clearly wanting one). Uploaded photos waiting to be used are included automatically. If they only sent photos with no instruction, ask what the video is for (action none) unless intent is obvious.
- revise_video: they want changes to the most recent video ("make it faster", "different music", "change the headline").
- post_video: they approve the latest ready video ("post", "looks good, ship it", "post to tiktok only"). Set platforms only if they named specific ones.
- set_daily / stop_daily: daily automatic videos. You need a posting time; if you don't know their timezone, ask (action none). Default autoPost to false (we send a preview first) unless they say to post automatically.
- connect_accounts: they want to connect or add Instagram/TikTok/LinkedIn/YouTube ("connect", "add my tiktok"). You'll get a link to send; one page connects all of them.
- set_brand: they tell you their brand name, website, or style preferences.
- none: chit-chat, questions, or when you need info.

When you start a video, say it takes a few minutes. Never invent links. Keep replies under 3 sentences.`;

export const handle = internalAction({
  args: { userId: v.id("users"), messageId: v.id("messages") },
  handler: async (ctx, { userId, messageId }) => {
    const c = await ctx.runQuery(internal.jobs.agentContext, { userId, messageId });
    if (!c.user || c.superseded) return;
    const user = c.user;

    const state = {
      brand: user.brand ?? null,
      daily: user.daily ?? null,
      connectedPlatforms: user.connectedPlatforms ?? [],
      photosWaitingToBeUsed: c.unusedUploadIds.length,
      recentVideos: c.jobs,
      nowUtc: new Date().toISOString(),
    };
    const transcript = c.history.map((m) => `${m.role === "user" ? "User" : "You"}: ${m.text}`).join("\n");

    const client = new Anthropic();
    const res = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Decision) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `State:\n${JSON.stringify(state, null, 2)}\n\nConversation (latest last):\n${transcript}\n\nDecide how to respond to the user's latest message(s).`,
        },
      ],
    });
    const d = res.stop_reason === "refusal" ? null : res.parsed_output;
    if (!d) {
      await ctx.runMutation(internal.jobs.say_, { userId, text: "Sorry, I didn't catch that. Could you say it another way?" });
      return;
    }

    const latestJob = c.jobs[0];
    let reply = d.reply;

    switch (d.action) {
      case "create_video": {
        const url = d.url ?? user.brand?.url;
        await ctx.runMutation(internal.jobs.create, {
          userId,
          brief: d.brief ?? "A promotional reel",
          sourceUrl: url,
          assetIds: c.unusedUploadIds,
          scheduled: false,
          autoPost: false,
        });
        if (d.url && !user.brand?.url) {
          await ctx.runMutation(internal.users.patch, { userId, fields: { brand: { ...user.brand, url: d.url } } });
        }
        break;
      }
      case "revise_video": {
        const parent = c.jobs.find((j) => j.status === "ready" || j.status === "posted") ?? latestJob;
        const job = parent && (await ctx.runQuery(internal.jobs.get, { jobId: parent.id }));
        if (!job) {
          reply = "I don't have a video to change yet. Want me to make one?";
          break;
        }
        await ctx.runMutation(internal.jobs.create, {
          userId,
          brief: `${job.brief}\nRevision request: ${d.feedback ?? ""}`,
          sourceUrl: job.sourceUrl,
          assetIds: [...job.assetIds, ...c.unusedUploadIds],
          scheduled: false,
          autoPost: false,
          parentJobId: job._id,
        });
        break;
      }
      case "post_video": {
        const ready = c.jobs.find((j) => j.status === "ready");
        if (!ready) {
          reply =
            latestJob && ["planning", "render_queued", "rendering"].includes(latestJob.status)
              ? "It's still being made. I'll send it over as soon as it's done."
              : "I don't have a finished video waiting to post.";
          break;
        }
        if (!user.connectedPlatforms?.length) {
          const link = await ctx.runAction(internal.social.connectLink, { userId });
          reply = `First, connect where you want to post (Instagram, TikTok, LinkedIn, YouTube). One page, takes a minute: ${link}\nI'll ping you when it's connected.`;
          break;
        }
        await ctx.runMutation(internal.jobs.patch, { jobId: ready.id, fields: { status: "posting" } });
        await ctx.scheduler.runAfter(0, internal.social.publish, { jobId: ready.id, platforms: d.platforms ?? undefined });
        break;
      }
      case "set_daily": {
        if (d.hourUtc === null) break;
        await ctx.runMutation(internal.users.patch, {
          userId,
          fields: {
            daily: { enabled: true, hourUtc: d.hourUtc, autoPost: d.autoPost ?? false },
            ...(d.url ? { brand: { ...user.brand, url: d.url } } : {}),
          },
        });
        if (d.autoPost && !user.connectedPlatforms?.length) {
          const link = await ctx.runAction(internal.social.connectLink, { userId });
          reply += `\n\nTo post automatically, connect your accounts here: ${link}`;
        }
        break;
      }
      case "stop_daily":
        if (user.daily) {
          await ctx.runMutation(internal.users.patch, { userId, fields: { daily: { ...user.daily, enabled: false } } });
        }
        break;
      case "connect_accounts": {
        const link = await ctx.runAction(internal.social.connectLink, { userId });
        reply = `${reply}\n${link}`;
        break;
      }
      case "set_brand":
        await ctx.runMutation(internal.users.patch, {
          userId,
          fields: {
            brand: {
              ...user.brand,
              ...(d.brandName ? { name: d.brandName } : {}),
              ...(d.url ? { url: d.url } : {}),
              ...(d.brandNotes ? { notes: d.brandNotes } : {}),
            },
          },
        });
        break;
    }

    await ctx.runMutation(internal.jobs.say_, { userId, text: reply });
  },
});
