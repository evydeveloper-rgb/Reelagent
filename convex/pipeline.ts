"use node";
// Planning half of a job: gather material -> Claude storyboard -> AI images/clips + voiceover -> queue render.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { fal } from "@fal-ai/client";
import { v } from "convex/values";
import { ActionCtx, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  FPS,
  RenderProps,
  RenderScene,
  Scene,
  StoryboardSchema,
  Word,
} from "../shared/storyboard";
import { scrapeSite, SiteInfo } from "./scrape";

const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux-pro/v1.1";
const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL ?? "fal-ai/kling-video/v2.1/standard/image-to-video";
const CLIP_SECONDS = 5;
const MAX_AI_CLIPS = Number(process.env.MAX_AI_CLIPS ?? 3);
const MAX_IMAGES_FOR_CLAUDE = 10;
const CLAUDE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ClaudeImageType = (typeof CLAUDE_IMAGE_TYPES)[number];

const DIRECTOR = `You are a top short-form video creative director. You storyboard Instagram Reels (9:16, 15-30s) that stop the scroll and convert.

Craft rules:
- Scene 1 is a hook: a bold claim, question or tension in <= 6 words, readable in under 2 seconds.
- One idea per scene. On-screen text is short and punchy; never paragraphs.
- Use the provided images wherever they fit (assetIndex). Look at them: put the most striking image on the hook or a hero scene. Website screenshots work well in "feature" scenes.
- Only use imagePrompt when no provided image fits; write it like a photographer's brief (subject, setting, light, lens), photorealistic, no text in the image.
- Mark 1-3 hero scenes animate=true with a subtle, physically plausible motionPrompt (camera move + one subject motion). Never animate screenshots, text-heavy images or logos.
- Voiceover lines are conversational, one sentence per scene, and must fit the scene duration (~2.5 words/sec). Use null voiceover on the hook if the text says it all.
- End with a "cta" scene (what to do next + ctaUrl if there is one).
- Palette: use the brand colors if known; ensure text/background contrast. Pick a font that matches the brand personality.
- Vary transitions; use "none" for hard cuts on beat-driven moments.
- The caption starts with a hook line, stays short, ends with a call to action. No hashtags in the caption itself.`;

function client() {
  return new Anthropic();
}

async function fetchImage(url: string): Promise<{ blob: Blob; type: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ReelAgent" } });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!type.startsWith("image/") || type.includes("svg")) return null;
    const blob = await res.blob();
    if (blob.size < 8_000 || blob.size > 4_500_000) return null; // skip icons/spacers and oversize
    return { blob, type };
  } catch {
    return null;
  }
}

async function storeFromUrl(ctx: ActionCtx, url: string) {
  const img = await fetchImage(url);
  if (!img) return null;
  return await ctx.storage.store(img.blob);
}

export const run = internalAction({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    try {
      await plan(ctx, jobId);
    } catch (e) {
      await ctx.runMutation(internal.jobs.fail, { jobId, error: String((e as Error)?.stack ?? e) });
    }
  },
});

async function plan(ctx: ActionCtx, jobId: Id<"jobs">) {
  const job = (await ctx.runQuery(internal.jobs.get, { jobId }))!;
  const user = (await ctx.runQuery(internal.users.get, { userId: job.userId }))!;
  const progress = (p: string) => ctx.runMutation(internal.jobs.patch, { jobId, fields: { progress: p } });

  // 1. Material: the user's photos + whatever the website gives us.
  let site: SiteInfo | null = null;
  const assetIds = [...job.assetIds];
  let logoUrl: string | null = null;
  if (job.sourceUrl) {
    await progress("reading website");
    site = await scrapeSite(job.sourceUrl);
    const already = new Set<string>();
    for (const url of site.imageUrls) {
      if (already.has(url) || assetIds.length >= MAX_IMAGES_FOR_CLAUDE) continue;
      already.add(url);
      const storageId = await storeFromUrl(ctx, url);
      if (storageId) {
        assetIds.push(await ctx.runMutation(internal.jobs.addAsset, { userId: job.userId, storageId, source: "website", jobId }));
      }
    }
    if (site.logoUrl) {
      const logoId = await storeFromUrl(ctx, site.logoUrl);
      if (logoId) logoUrl = await ctx.storage.getUrl(logoId);
    }
    await ctx.runMutation(internal.jobs.patch, { jobId, fields: { assetIds } });
  }
  const assets = (await ctx.runQuery(internal.jobs.assetUrls, { assetIds })).slice(0, MAX_IMAGES_FOR_CLAUDE);

  // 2. Storyboard. Claude sees the actual images so it can choose shots.
  await progress("writing storyboard");
  const imageBlocks: Anthropic.ContentBlockParam[] = [];
  for (const [i, a] of assets.entries()) {
    const img = await fetchImage(a.url);
    if (!img || !CLAUDE_IMAGE_TYPES.includes(img.type as ClaudeImageType)) continue;
    imageBlocks.push({ type: "text", text: `Image ${i}:` });
    imageBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.type as ClaudeImageType,
        data: Buffer.from(await img.blob.arrayBuffer()).toString("base64"),
      },
    });
  }
  const parent = job.parentJobId ? await ctx.runQuery(internal.jobs.get, { jobId: job.parentJobId }) : null;

  const brief = [
    `Brief: ${job.brief}`,
    user.brand?.name && `Brand: ${user.brand.name}`,
    user.brand?.notes && `Brand notes: ${user.brand.notes}`,
    site && `Website (${site.url}):\nTitle: ${site.title}\nDescription: ${site.description}\nBrand colors: ${site.colors.join(", ") || "unknown"}\n\nPage content:\n${site.text}`,
    parent?.storyboard && `This is a revision. Previous storyboard:\n${JSON.stringify(parent.storyboard)}\nKeep what works; apply the revision request.`,
    assets.length
      ? `${assets.length} images are attached (indices 0-${assets.length - 1}).`
      : "No images were provided; use imagePrompt for visual scenes.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const stream = client().messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(StoryboardSchema) },
    system: DIRECTOR,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: brief }] }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("storyboard refused");
  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no storyboard returned");
  const storyboard = StoryboardSchema.parse(JSON.parse(textBlock.text));
  await ctx.runMutation(internal.jobs.patch, { jobId, fields: { storyboard } });

  // 3. Media for each scene, in parallel.
  await progress("generating clips and voiceover");
  if (process.env.FAL_KEY) fal.config({ credentials: process.env.FAL_KEY });
  let clipBudget = MAX_AI_CLIPS;
  const scenes = await Promise.all(
    storyboard.scenes.map(async (scene, i): Promise<RenderScene> => {
      const wantsClip = scene.animate && clipBudget-- > 0;
      let imageUrl: string | null =
        scene.assetIndex !== null && assets[scene.assetIndex] ? assets[scene.assetIndex].url : null;
      if (!imageUrl && scene.imagePrompt) imageUrl = await generateImage(ctx, job.userId, jobId, scene.imagePrompt);
      const [clipUrl, vo] = await Promise.all([
        wantsClip && imageUrl ? animate(imageUrl, scene) : Promise.resolve(null),
        scene.voiceover ? voiceover(ctx, scene.voiceover) : Promise.resolve(null),
      ]);
      const voEnd = vo?.words.at(-1)?.end ?? 0;
      let seconds = Math.min(Math.max(2, scene.durationSec, voEnd + 0.5), 8);
      if (i === 0 && !vo) seconds = Math.min(seconds, 2.5); // keep the hook snappy
      return {
        ...scene,
        imageUrl,
        clipUrl,
        voUrl: vo?.url ?? null,
        words: vo?.words ?? [],
        durationInFrames: Math.round(seconds * FPS),
      };
    }),
  );

  const renderProps: RenderProps = {
    storyboard,
    scenes,
    brandName: user.brand?.name ?? site?.title?.split(/[|\-–]/)[0].trim() ?? null,
    logoUrl,
    musicUrl: null, // resolved by the worker from public/music/<mood>.mp3
  };
  const caption = `${storyboard.caption}\n\n${storyboard.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`;
  await ctx.runMutation(internal.jobs.patch, {
    jobId,
    fields: { renderProps, caption, status: "render_queued", progress: "waiting for renderer" },
  });
}

async function generateImage(ctx: ActionCtx, userId: Id<"users">, jobId: Id<"jobs">, prompt: string) {
  if (!process.env.FAL_KEY) return null;
  try {
    const r = await fal.subscribe(IMAGE_MODEL, {
      input: { prompt, image_size: "portrait_16_9", num_images: 1 },
    });
    const url = (r.data as { images?: { url: string }[] }).images?.[0]?.url;
    if (!url) return null;
    const storageId = await storeFromUrl(ctx, url);
    if (!storageId) return url;
    await ctx.runMutation(internal.jobs.addAsset, { userId, storageId, source: "generated", jobId });
    return await ctx.storage.getUrl(storageId);
  } catch (e) {
    console.warn("image generation failed", e);
    return null;
  }
}

async function animate(imageUrl: string, scene: Scene): Promise<string | null> {
  if (!process.env.FAL_KEY) return null;
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 6 * 60_000));
  // Re-host on fal so it works even when Convex storage isn't publicly reachable (local dev).
  const img = await fetchImage(imageUrl);
  if (!img) return null;
  const job = fal.storage
    .upload(img.blob)
    .then((hosted) =>
      fal.subscribe(VIDEO_MODEL, {
        input: {
          image_url: hosted,
          prompt: `${scene.motionPrompt ?? "slow cinematic push in"}. Smooth, realistic motion, no text, no morphing.`,
          duration: String(CLIP_SECONDS),
          negative_prompt: "blur, distortion, warping, text, watermark, low quality",
        },
      }),
    )
    .then((r) => (r.data as { video?: { url: string } }).video?.url ?? null)
    .catch((e) => {
      console.warn("clip generation failed; falling back to Ken Burns", e);
      return null;
    });
  return await Promise.race([job, timeout]); // a stuck clip shouldn't block the whole video
}

/** ElevenLabs TTS with character timings, grouped into words for animated captions. */
async function voiceover(ctx: ActionCtx, text: string): Promise<{ url: string; words: Word[] } | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const voice = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35 },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const body = (await res.json()) as {
      audio_base64: string;
      alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
    };
    const storageId = await ctx.storage.store(new Blob([Buffer.from(body.audio_base64, "base64")], { type: "audio/mpeg" }));
    const url = await ctx.storage.getUrl(storageId);
    if (!url) return null;

    const words: Word[] = [];
    const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = body.alignment;
    let cur: Word | null = null;
    characters.forEach((ch, i) => {
      if (/\s/.test(ch)) {
        if (cur) words.push(cur);
        cur = null;
      } else if (cur) {
        cur.text += ch;
        cur.end = ends[i];
      } else {
        cur = { text: ch, start: starts[i], end: ends[i] };
      }
    });
    if (cur) words.push(cur);
    return { url, words };
  } catch (e) {
    console.warn("voiceover failed", e);
    return null;
  }
}
