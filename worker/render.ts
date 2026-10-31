import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { RenderProps } from "../shared/storyboard";

const ROOT = resolve(import.meta.dirname, "..");

/** Bundle the Remotion project once; returns a function that renders props to MP4 bytes. */
export async function createRenderer() {
  const serveUrl = await bundle({ entryPoint: join(ROOT, "remotion/index.ts"), publicDir: join(ROOT, "public") });

  return async (raw: unknown, onProgress: (p: number) => void): Promise<Buffer> => {
    const props = raw as RenderProps;
    // Music: drop royalty-free tracks in public/music/<mood>.mp3 (see README).
    const mood = props.storyboard.musicMood;
    if (!props.musicUrl && mood !== "none" && existsSync(join(ROOT, "public/music", `${mood}.mp3`))) {
      props.musicUrl = `music/${mood}.mp3`;
    }
    const inputProps = props as unknown as Record<string, unknown>;
    const composition = await selectComposition({ serveUrl, id: "Reel", inputProps });

    const dir = join(tmpdir(), "reelagent");
    mkdirSync(dir, { recursive: true });
    const out = join(dir, `${Date.now()}.mp4`);
    // Instagram Reels: H.264 + AAC, 30fps, 1080x1920.
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      audioCodec: "aac",
      crf: 18,
      pixelFormat: "yuv420p",
      outputLocation: out,
      inputProps,
      timeoutInMilliseconds: 120_000, // remote AI clips can be slow to fetch
      onProgress: ({ progress }) => onProgress(progress),
    });
    const bytes = readFileSync(out);
    rmSync(out, { force: true });
    return bytes;
  };
}
