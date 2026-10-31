// Posting to Instagram, TikTok, LinkedIn and YouTube Shorts via Upload-Post.
// Each chat user gets an Upload-Post profile; they connect their accounts on Upload-Post's hosted page.
import { v } from "convex/values";
import { ActionCtx, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

const API = "https://api.upload-post.com";
export const PLATFORMS = ["instagram", "tiktok", "linkedin", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const platformValidator = v.union(...PLATFORMS.map((p) => v.literal(p)));

const LABEL: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube Shorts" };
export const labels = (ps: string[]) => ps.map((p) => LABEL[p as Platform] ?? p).join(", ");

async function api(path: string, init: RequestInit = {}) {
  const key = process.env.UPLOAD_POST_API_KEY;
  if (!key) throw new Error("UPLOAD_POST_API_KEY is not set");
  const res = await fetch(API + path, { ...init, headers: { Authorization: `Apikey ${key}`, ...init.headers } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// UPLOAD_POST_PROFILE_OVERRIDES="<userId>=<profile>,..." pins a chat user to an existing Upload-Post
// profile (e.g. the owner's "default" profile that already has accounts connected).
function profileName(userId: Id<"users">) {
  for (const pair of (process.env.UPLOAD_POST_PROFILE_OVERRIDES ?? "").split(",")) {
    const [id, profile] = pair.split("=").map((s) => s.trim());
    if (id === userId && profile) return profile;
  }
  return `reelagent_${userId}`;
}

/** Which platforms this user has connected, according to Upload-Post. Creates the profile on first use. */
async function connectedPlatforms(userId: Id<"users">): Promise<Platform[]> {
  let r = await api(`/api/uploadposts/users/${profileName(userId)}`);
  if (r.status === 404) {
    await api("/api/uploadposts/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profileName(userId) }),
    });
    r = await api(`/api/uploadposts/users/${profileName(userId)}`);
  }
  if (!r.ok) throw new Error(`upload-post profile: ${r.status} ${JSON.stringify(r.body)}`);
  const accounts = (r.body.profile?.social_accounts ?? {}) as Record<string, unknown>;
  return PLATFORMS.filter((p) => accounts[p] && typeof accounts[p] === "object");
}

async function syncConnected(ctx: ActionCtx, userId: Id<"users">) {
  const platforms = await connectedPlatforms(userId);
  await ctx.runMutation(internal.users.patch, { userId, fields: { connectedPlatforms: platforms } });
  return platforms;
}

/** A link where the user connects (or adds) their social accounts. Valid for 48h. */
export const connectLink = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<string> => {
    await syncConnected(ctx, userId); // also makes sure the profile exists
    const site = process.env.CONVEX_SITE_URL;
    const r = await api("/api/uploadposts/users/generate-jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: profileName(userId),
        platforms: PLATFORMS,
        connect_title: "Connect your accounts to Reelagent",
        ...(site ? { redirect_url: `${site}/connected?u=${userId}` } : {}),
      }),
    });
    if (!r.ok || !r.body.access_url) throw new Error(`upload-post connect link: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body.access_url as string;
  },
});

/** Called when the user comes back from the connect page: refresh and confirm in chat. */
export const refreshConnections = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const before = ((await ctx.runQuery(internal.users.get, { userId }))?.connectedPlatforms ?? []) as string[];
    const now = await syncConnected(ctx, userId);
    const added = now.filter((p) => !before.includes(p));
    if (added.length) {
      await ctx.runMutation(internal.jobs.say_, {
        userId,
        text: `Connected ✅ ${labels(added)}. Reply "post" to publish your latest video${now.length > 1 ? ` (to ${labels(now)})` : ""}.`,
      });
    }
  },
});

export const publish = internalAction({
  args: { jobId: v.id("jobs"), platforms: v.optional(v.array(platformValidator)) },
  handler: async (ctx, { jobId, platforms: requested }) => {
    const job = (await ctx.runQuery(internal.jobs.get, { jobId }))!;
    try {
      const connected = await syncConnected(ctx, job.userId);
      const targets = (requested?.length ? requested : connected).filter((p) => connected.includes(p));
      if (!targets.length) throw new Error("no connected platforms");
      const videoUrl = job.videoStorageId && (await ctx.storage.getUrl(job.videoStorageId));
      if (!videoUrl) throw new Error("video missing");

      const requestId = await upload(job, videoUrl, targets);
      const results = await waitForResults(requestId);
      const ok = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      await ctx.runMutation(internal.jobs.patch, {
        jobId,
        fields: { status: ok.length ? "posted" : "ready", postResults: results, error: failed.length ? JSON.stringify(failed) : undefined },
      });
      const lines = [
        ok.length ? `Posted ✅` : `That didn't post.`,
        ...ok.map((r) => `• ${LABEL[r.platform as Platform] ?? r.platform}${r.post_url ? `: ${r.post_url}` : ""}`),
        ...failed.map((r) => `• ${LABEL[r.platform as Platform] ?? r.platform} failed: ${r.message ?? "unknown error"}`),
        failed.length ? `Reply "post" to retry.` : "",
      ];
      await ctx.runMutation(internal.jobs.say_, { userId: job.userId, text: lines.filter(Boolean).join("\n") });
    } catch (e) {
      console.error("publish failed", e);
      await ctx.runMutation(internal.jobs.patch, { jobId, fields: { status: "ready", error: String(e) } });
      await ctx.runMutation(internal.jobs.say_, {
        userId: job.userId,
        text: `Posting didn't work this time. Reply "post" to retry, or "connect" to check your accounts.`,
      });
    }
  },
});

async function upload(job: Doc<"jobs">, videoUrl: string, platforms: Platform[]) {
  const caption = job.caption ?? "";
  const title = ((job.storyboard as { title?: string } | undefined)?.title ?? caption.split("\n")[0] ?? "New video").slice(0, 100);
  const form = new FormData();
  form.append("user", profileName(job.userId));
  for (const p of platforms) form.append("platform[]", p);
  form.append("video", videoUrl);
  form.append("title", title);
  form.append("description", caption);
  form.append("async_upload", "true");
  // Per-platform text
  form.append("instagram_title", caption.slice(0, 2200));
  form.append("media_type", "REELS");
  form.append("tiktok_title", caption.slice(0, 2200));
  form.append("privacy_level", "PUBLIC_TO_EVERYONE");
  form.append("linkedin_description", caption.slice(0, 3000));
  form.append("visibility", "PUBLIC");
  form.append("youtube_title", `${title} #Shorts`.slice(0, 100));
  form.append("youtube_description", caption.slice(0, 5000));
  form.append("privacyStatus", "public");

  const r = await api("/api/upload", { method: "POST", body: form });
  if (!r.ok || !r.body.success) throw new Error(`upload-post upload: ${r.status} ${JSON.stringify(r.body)}`);
  if (!r.body.request_id) throw new Error(`upload-post returned no request_id: ${JSON.stringify(r.body)}`);
  return r.body.request_id as string;
}

type PlatformResult = { platform: string; success: boolean; message?: string; post_url?: string };

async function waitForResults(requestId: string): Promise<PlatformResult[]> {
  // Video processing on Instagram/TikTok takes a while; Convex actions can run up to 10 minutes.
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const r = await api(`/api/uploadposts/status?request_id=${encodeURIComponent(requestId)}`);
    if (!r.ok) continue;
    if (["completed", "failed"].includes(r.body.status)) return (r.body.results ?? []) as PlatformResult[];
  }
  throw new Error("timed out waiting for posting results");
}
