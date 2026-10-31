// Building blocks shared by all scene templates.
import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderScene, Storyboard, Word } from "../shared/storyboard";
import { BODY_FONT } from "./fonts";

// Instagram Reels UI covers the bottom and right edges; keep text inside this box.
export const SAFE = { top: 220, bottom: 420, side: 90 };

export type Palette = Storyboard["palette"];

/** Full-bleed visual: AI clip > Ken Burns image > animated brand gradient. */
export const Backdrop: React.FC<{ scene: RenderScene; palette: Palette; seed: number; dim?: number }> = ({
  scene,
  palette,
  seed,
  dim = 0.35,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = frame / durationInFrames;

  let visual: React.ReactNode;
  if (scene.clipUrl) {
    const clipFrames = 5 * fps;
    visual = (
      <OffthreadVideo
        src={scene.clipUrl}
        muted
        playbackRate={Math.min(1, clipFrames / durationInFrames)} // stretch rather than freeze
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  } else if (scene.imageUrl) {
    // Alternate push-in / pull-out and pan direction so consecutive scenes don't feel identical.
    const zoomIn = seed % 2 === 0;
    const scale = zoomIn ? interpolate(t, [0, 1], [1.05, 1.2]) : interpolate(t, [0, 1], [1.2, 1.05]);
    const dx = interpolate(t, [0, 1], [0, seed % 3 === 0 ? -40 : 40]);
    visual = (
      <AbsoluteFill style={{ transform: `scale(${scale}) translateX(${dx}px)` }}>
        {/* Blurred fill behind so non-9:16 images never show bars */}
        <Img
          src={scene.imageUrl}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.7)", transform: "scale(1.2)" }}
        />
        <Img src={scene.imageUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  } else {
    visual = <BrandGradient palette={palette} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, overflow: "hidden" }}>
      {visual}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${dim}) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 50%, rgba(0,0,0,${dim + 0.3}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const BrandGradient: React.FC<{ palette: Palette }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const a = frame * 0.6;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, overflow: "hidden" }}>
      <div style={blob(palette.primary, 900, 200 + Math.sin(a / 40) * 120, 300 + Math.cos(a / 50) * 140)} />
      <div style={blob(palette.accent, 800, 700 + Math.cos(a / 45) * 140, 1300 + Math.sin(a / 35) * 160)} />
      <AbsoluteFill style={{ backdropFilter: "blur(120px)" }} />
    </AbsoluteFill>
  );
};

const blob = (color: string, size: number, x: number, y: number): React.CSSProperties => ({
  position: "absolute",
  width: size,
  height: size,
  left: x - size / 2,
  top: y - size / 2,
  borderRadius: "50%",
  background: color,
  opacity: 0.55,
  filter: "blur(160px)",
});

/** Headline with words springing in one after another; the last word gets the accent color. */
export const KineticText: React.FC<{
  text: string;
  font: string;
  size: number;
  color: string;
  accent: string;
  align?: "left" | "center";
  delay?: number;
  uppercase?: boolean;
}> = ({ text, font, size, color, accent, align = "left", delay = 0, uppercase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.02,
        color,
        textAlign: align,
        textTransform: uppercase ? "uppercase" : "none",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0 ${size * 0.25}px`,
        textShadow: "0 6px 30px rgba(0,0,0,0.35)",
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * 3, fps, config: { damping: 14, stiffness: 160 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - s) * size * 0.6}px) scale(${0.85 + 0.15 * s})`,
              opacity: s,
              color: i === words.length - 1 && words.length > 1 ? accent : color,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return <div style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)`, ...style }}>{children}</div>;
};

/** Karaoke-style captions synced to the voiceover; the spoken word pops in the accent color. */
export const Captions: React.FC<{ words: Word[]; accent: string }> = ({ words, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!words.length) return null;

  // Show words in chunks of up to 4 so the eye isn't chasing a long line.
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4));
  const chunk = chunks.find((c) => t < c[c.length - 1].end + 0.15) ?? null;
  if (!chunk || t < chunk[0].start - 0.05) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        right: SAFE.side + 40,
        bottom: SAFE.bottom,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 18px",
        fontFamily: BODY_FONT,
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.15,
        textAlign: "center",
      }}
    >
      {chunk.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.05;
        const pop = spring({ frame: frame - Math.round(w.start * fps), fps, config: { damping: 12, stiffness: 200 } });
        return (
          <span
            key={i}
            style={{
              color: active ? accent : "white",
              transform: `scale(${active ? 1 + 0.08 * pop : 1})`,
              display: "inline-block",
              WebkitTextStroke: "2px rgba(0,0,0,0.6)",
              paintOrder: "stroke fill",
              textShadow: "0 4px 18px rgba(0,0,0,0.6)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
