// Public website, served straight from Convex at https://<deployment>.convex.site
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { LANDING_HTML } from "./site";

const http = httpRouter();

http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async () =>
    new Response(LANDING_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" },
    }),
  ),
});

http.route({
  path: "/demo.mp4",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const url = await ctx.runQuery(internal.subscribers.demoVideoUrl, {});
    return url ? Response.redirect(url, 302) : new Response("No demo yet", { status: 404 });
  }),
});

// Upload-Post sends users here after they connect their social accounts.
http.route({
  path: "/connected",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const u = new URL(req.url).searchParams.get("u") ?? "";
    const userId = await ctx.runQuery(internal.users.normalize, { id: u });
    if (userId) await ctx.scheduler.runAfter(0, internal.social.refreshConnections, { userId });
    return html(
      page("Connected", `<div style="font-size:56px">✅</div><h1>You're connected</h1><p>Head back to your messages. Reply <b>post</b> to publish your latest video.</p>`),
    );
  }),
});

// No-setup option: watch, download and post the video yourself.
http.route({
  path: "/v",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const j = new URL(req.url).searchParams.get("j") ?? "";
    const info = await ctx.runQuery(internal.subscribers.shareInfo, { jobId: j });
    if (!info?.videoUrl) return html(page("Not found", "<h1>Video not found</h1>"), 404);
    const caption = escapeHtml(info.caption);
    return html(
      page(
        "Your video",
        `<video src="${escapeHtml(info.videoUrl)}" controls playsinline autoplay muted loop></video>
        <a class="btn" href="${escapeHtml(info.videoUrl)}" download="reel.mp4">⬇ Download video</a>
        <div class="cap"><pre id="cap">${caption}</pre><button class="btn ghost" onclick="navigator.clipboard.writeText(document.getElementById('cap').innerText);this.textContent='Copied ✓'">Copy caption</button></div>
        <p class="hint">Download, copy the caption, then open your app and post:</p>
        <div class="apps"><a href="instagram://camera">Instagram</a><a href="https://www.tiktok.com/upload">TikTok</a><a href="https://www.linkedin.com/feed/?shareActive=true">LinkedIn</a><a href="https://studio.youtube.com">YouTube</a></div>`,
      ),
    );
  }),
});

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function page(title: string, content: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Reelagent</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0b0a10;color:#f4f1fb;display:flex;justify-content:center;padding:32px 18px}
main{max-width:420px;width:100%;display:grid;gap:16px;text-align:center}h1{margin:0;font-size:30px;letter-spacing:-.03em}p{color:#a39db5;margin:0}
video{width:100%;border-radius:22px;background:#15131d;aspect-ratio:9/16}
.btn{display:block;padding:15px;border-radius:999px;font-weight:700;color:#fff;text-decoration:none;border:0;font-size:16px;cursor:pointer;width:100%;background:linear-gradient(120deg,#ff6a3d,#ff3d8b 50%,#8b5cf6)}
.btn.ghost{background:#15131d;border:1px solid #262233;margin-top:10px}
.cap{background:#15131d;border:1px solid #262233;border-radius:18px;padding:16px;text-align:left}pre{white-space:pre-wrap;font-family:inherit;margin:0;color:#f4f1fb;font-size:14px}
.hint{font-size:14px}.apps{display:grid;grid-template-columns:1fr 1fr;gap:10px}.apps a{padding:12px;border-radius:14px;background:#15131d;border:1px solid #262233;color:#f4f1fb;text-decoration:none;font-weight:600}</style>
</head><body><main>${content}</main></body></html>`;
}

const PLANS = ["starter", "pro", "agency"] as const;

http.route({
  path: "/api/subscribe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const str = (k: string, max = 200) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
    const name = str("name");
    const email = str("email").toLowerCase();
    const phone = str("phone", 40);
    const website = str("website", 300);
    const plan = PLANS.find((p) => p === body.plan);

    if (!name) return json({ error: "Please enter your name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);
    if (phone.replace(/\D/g, "").length < 7) return json({ error: "Please enter the phone number you'll text from." }, 400);
    if (!plan) return json({ error: "Please pick a plan." }, 400);

    await ctx.runMutation(internal.subscribers.add, { name, email, phone, plan, website: website || undefined });
    return json({ ok: true });
  }),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export default http;
