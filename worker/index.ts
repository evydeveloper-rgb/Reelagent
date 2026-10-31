// Long-running worker:
//  1. Photon (iMessage etc.) <-> Convex: forwards incoming chat messages/photos, delivers the outbox.
//  2. Remotion renderer: renders queued jobs to MP4 and uploads them to Convex storage.
import "./env";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Photon, PhotonContent, PhotonMessage } from "./photon";
import { createRenderer } from "./render";

const CONVEX_URL = must("CONVEX_URL");
const secret = must("WORKER_SECRET");
const convex = new ConvexClient(CONVEX_URL);

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

async function upload(bytes: Uint8Array | Buffer, contentType: string): Promise<Id<"_storage">> {
  const url = await convex.mutation(api.worker.generateUploadUrl, { secret });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body: new Uint8Array(bytes) });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  return ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
}

// ---------- Chat transport ----------

async function startChat() {
  const photon = new Photon(must("PHOTON_API_KEY"), must("PHOTON_PROJECT_ID"));

  // Deliver outbox messages produced by Convex.
  const inFlight = new Set<string>();
  convex.onUpdate(api.worker.pendingOutbox, { secret }, async (rows) => {
    for (const row of rows) {
      if (inFlight.has(row._id)) continue;
      inFlight.add(row._id);
      try {
        if (!row.agentId) throw new Error(`no agent line known for space ${row.spaceId}`);
        if (row.videoUrl) await sendVideo(photon, row.agentId, row.spaceId, row.videoUrl);
        if (row.text) await photon.sendText(row.agentId, row.spaceId, row.text);
        await convex.mutation(api.worker.markSent, { secret, id: row._id });
      } catch (e) {
        console.error("send failed", e);
      } finally {
        inFlight.delete(row._id);
      }
    }
  });

  console.log("💬 polling Photon for messages");
  await photon.poll(async (m: PhotonMessage) => {
    if (m.sentBy.kind === "agent") return;
    const base = {
      secret,
      platform: m.platform,
      spaceId: m.space.id,
      senderId: m.sentBy.id,
      agentId: m.receivedBy?.id,
    };
    await forward(photon, base, m.content);
  });
}

/** Photon's iMessage may not accept video; if the attachment fails, send a link instead. */
async function sendVideo(photon: Photon, agentId: string, spaceId: string, videoUrl: string) {
  try {
    const bytes = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
    const attachmentId = await photon.upload(bytes, "video/mp4", "reel.mp4");
    await photon.send(agentId, spaceId, { type: "attachment", attachmentId });
  } catch (e) {
    console.warn("video attachment failed, sending link", (e as Error).message);
    await photon.sendText(agentId, spaceId, `🎬 Watch your video: ${videoUrl}`);
  }
}

type Base = { secret: string; platform: string; spaceId: string; senderId: string; agentId?: string };

async function forward(photon: Photon, base: Base, content: PhotonContent): Promise<void> {
  switch (content.type) {
    case "text":
      await convex.mutation(api.worker.receive, { ...base, text: String(content.text) });
      return;
    case "attachment": {
      const { bytes, contentType } = await photon.download(String(content.attachmentId));
      if (!contentType.startsWith("image/")) {
        await convex.mutation(api.worker.receive, { ...base, text: `[sent a ${contentType} file I can't use yet]` });
        return;
      }
      const storageId = await upload(bytes, contentType);
      await convex.mutation(api.worker.receive, { ...base, storageId });
      return;
    }
    case "group":
      for (const part of content.parts as PhotonContent[]) await forward(photon, base, part);
      return;
  }
}

// ---------- Renderer ----------

async function startRenderer() {
  const render = await createRenderer();
  let busy = false;
  const pump = async (queue: { _id: Id<"jobs">; renderProps: unknown }[]) => {
    if (busy || !queue.length) return;
    busy = true;
    try {
      for (const job of queue) {
        if (!(await convex.mutation(api.worker.claimRender, { secret, jobId: job._id }))) continue;
        console.log(`🎬 rendering ${job._id}`);
        try {
          let last = -1;
          const mp4 = await render(job.renderProps, (p) => {
            const pct = Math.floor(p * 10) * 10;
            if (pct !== last) {
              last = pct;
              void convex.mutation(api.worker.renderProgress, { secret, jobId: job._id, progress: `rendering ${pct}%` });
            }
          });
          const storageId = await upload(mp4, "video/mp4");
          await convex.mutation(api.worker.renderDone, { secret, jobId: job._id, storageId });
          console.log(`✅ ${job._id} done`);
        } catch (e) {
          console.error(`render ${job._id} failed`, e);
          await convex.mutation(api.worker.renderFailed, { secret, jobId: job._id, error: String(e) });
        }
      }
    } finally {
      busy = false;
    }
  };
  convex.onUpdate(api.worker.renderQueue, { secret }, (q) => void pump(q));
  console.log("🎞️  renderer ready");
}

const mode = process.argv[2] ?? "all"; // all | chat | render
// Start both together: Remotion bundling is slow and shouldn't delay chat replies.
await Promise.all([
  mode !== "chat" ? startRenderer() : null,
  mode !== "render" ? startChat() : null,
]);
