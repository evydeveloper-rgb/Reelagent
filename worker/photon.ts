// Minimal Photon v1 REST client (project API key): poll inbound messages, send text/attachments.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ORIGIN = process.env.PHOTON_API_ORIGIN ?? "https://api.photon.codes";
const CURSOR_FILE = ".photon-cursor";

export type PhotonContent =
  | { type: "text"; text: string; format?: string }
  | { type: "attachment"; attachmentId: string }
  | { type: "group"; parts: PhotonContent[] }
  | { type: string; [k: string]: unknown };

export type PhotonMessage = {
  id: string;
  createdAt: string;
  platform: string;
  content: PhotonContent;
  sentBy: { id: string; kind: string };
  receivedBy?: { id: string; kind: string };
  space: { id: string };
};

export class Photon {
  constructor(
    private apiKey: string,
    private projectId: string,
  ) {}

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(`${ORIGIN}/v1/projects/${this.projectId}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, ...init.headers },
    });
    if (!res.ok) throw new Error(`photon ${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
    return res;
  }

  /**
   * Calls onMessage for each new received message, oldest first. The cursor is saved to disk so a
   * restart neither replays old messages nor drops ones that arrived while we were down.
   */
  async poll(onMessage: (m: PhotonMessage) => Promise<void>, intervalMs = 2000): Promise<never> {
    let since = existsSync(CURSOR_FILE) ? readFileSync(CURSOR_FILE, "utf8").trim() : new Date().toISOString();
    const seen = new Set<string>(); // createdSince is inclusive
    for (;;) {
      try {
        const q = new URLSearchParams({ direction: "received", createdSince: since, order: "asc", orderBy: "created_at", pageSize: "100" });
        const page = (await (await this.req(`/messages?${q}`)).json()) as { items: PhotonMessage[] };
        for (const m of page.items) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          try {
            await onMessage(m);
          } catch (e) {
            console.error("handling message failed", m.id, e);
          }
          since = m.createdAt;
          writeFileSync(CURSOR_FILE, since);
        }
        if (seen.size > 5000) seen.clear();
      } catch (e) {
        console.warn("poll failed", (e as Error).message);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  async download(attachmentId: string): Promise<{ bytes: Buffer; contentType: string }> {
    const res = await this.req(`/attachments/${attachmentId}/content`);
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      contentType: (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0],
    };
  }

  async upload(bytes: Buffer, contentType: string, filename: string): Promise<string> {
    const boundary = `reelagent${Date.now()}`;
    const meta = JSON.stringify({ contentType, sizeBytes: bytes.length, filename });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await this.req("/attachments", {
      method: "POST",
      body,
      headers: {
        "content-type": `multipart/related; boundary=${boundary}`,
        "content-length": String(body.length),
        "idempotency-key": crypto.randomUUID(),
      },
    });
    return ((await res.json()) as { id: string }).id;
  }

  async send(senderId: string, spaceId: string, content: PhotonContent) {
    // A freshly uploaded attachment may not be ready yet (409 ATTACHMENT_NOT_READY, Retry-After: 5).
    for (let attempt = 0; ; attempt++) {
      try {
        await this.req("/messages", {
          method: "POST",
          body: JSON.stringify({ senderId, spaceId, content }),
          headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        });
        return;
      } catch (e) {
        if (attempt < 6 && String(e).includes("ATTACHMENT_NOT_READY")) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        throw e;
      }
    }
  }

  sendText(senderId: string, spaceId: string, text: string) {
    return this.send(senderId, spaceId, { type: "text", format: "plain", text });
  }
}
