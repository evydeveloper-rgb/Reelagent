// One template per storyboard scene kind.
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderProps, RenderScene } from "../shared/storyboard";
import { Backdrop, BrandGradient, Captions, FadeUp, KineticText, Palette, SAFE } from "./parts";
import { BODY_FONT, FONTS } from "./fonts";

type SceneProps = {
  scene: RenderScene;
  index: number;
  props: RenderProps;
};

export const SceneView: React.FC<SceneProps> = (p) => {
  switch (p.scene.kind) {
    case "hook":
      return <Hook {...p} />;
    case "feature":
      return <Feature {...p} />;
    case "quote":
      return <Quote {...p} />;
    case "cta":
      return <Cta {...p} />;
    default:
      return <Media {...p} />;
  }
};

const style = (props: RenderProps) => {
  const sb = props.storyboard;
  const display = FONTS[sb.font];
  return { palette: sb.palette, display, upper: sb.font === "Bebas Neue" };
};

const Hook: React.FC<SceneProps> = ({ scene, index, props }) => {
  const { palette, display, upper } = style(props);
  const frame = useCurrentFrame();
  const punch = interpolate(frame, [0, 6], [1.15, 1], { extrapolateRight: "clamp" }); // camera punch-in on frame 1
  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      <Backdrop scene={scene} palette={palette} seed={index} dim={0.5} />
      <AbsoluteFill style={{ justifyContent: "center", padding: `0 ${SAFE.side}px`, paddingBottom: 200 }}>
        <KineticText text={scene.headline} font={display} size={upper ? 170 : 128} color="white" accent={palette.accent} uppercase={upper} />
        {scene.subtext && (
          <FadeUp delay={12} style={{ marginTop: 36 }}>
            <div style={{ fontFamily: BODY_FONT, fontWeight: 500, fontSize: 48, color: "rgba(255,255,255,0.9)" }}>{scene.subtext}</div>
          </FadeUp>
        )}
      </AbsoluteFill>
      <Captions words={scene.words} accent={palette.accent} />
    </AbsoluteFill>
  );
};

const Media: React.FC<SceneProps> = ({ scene, index, props }) => {
  const { palette, display, upper } = style(props);
  const hasCaptions = scene.words.length > 0;
  return (
    <AbsoluteFill>
      <Backdrop scene={scene} palette={palette} seed={index} />
      {/* Headline sits top when captions take the bottom, bottom otherwise */}
      <AbsoluteFill
        style={{
          padding: `${SAFE.top}px ${SAFE.side + 40}px ${hasCaptions ? 0 : SAFE.bottom}px ${SAFE.side}px`,
          justifyContent: hasCaptions ? "flex-start" : "flex-end",
        }}
      >
        <AccentBar color={palette.accent} />
        <KineticText text={scene.headline} font={display} size={upper ? 130 : 96} color="white" accent={palette.accent} uppercase={upper} delay={4} />
        {scene.subtext && (
          <FadeUp delay={14} style={{ marginTop: 24 }}>
            <div style={{ fontFamily: BODY_FONT, fontWeight: 500, fontSize: 44, color: "rgba(255,255,255,0.92)" }}>{scene.subtext}</div>
          </FadeUp>
        )}
      </AbsoluteFill>
      <Captions words={scene.words} accent={palette.accent} />
    </AbsoluteFill>
  );
};

/** Product/website shot floating in a card over the brand background. */
const Feature: React.FC<SceneProps> = ({ scene, index, props }) => {
  const { palette, display, upper } = style(props);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 16 } });
  const tilt = interpolate(frame, [0, durationInFrames], [8, -4]);
  const drift = interpolate(frame, [0, durationInFrames], [0, -60]);
  return (
    <AbsoluteFill>
      <BrandGradient palette={palette} />
      <AbsoluteFill style={{ padding: `${SAFE.top - 40}px ${SAFE.side}px 0`, justifyContent: "flex-start" }}>
        <KineticText text={scene.headline} font={display} size={upper ? 120 : 88} color={palette.text} accent={palette.accent} uppercase={upper} />
        {scene.subtext && (
          <FadeUp delay={10} style={{ marginTop: 20 }}>
            <div style={{ fontFamily: BODY_FONT, fontWeight: 500, fontSize: 42, color: palette.text, opacity: 0.85 }}>{scene.subtext}</div>
          </FadeUp>
        )}
      </AbsoluteFill>
      {scene.imageUrl && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 420, perspective: 1600 }}>
          <div
            style={{
              width: 860,
              height: 1000,
              borderRadius: 48,
              overflow: "hidden",
              boxShadow: "0 60px 120px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.15)",
              transform: `translateY(${(1 - enter) * 500 + drift}px) rotateX(${tilt}deg) rotateZ(${index % 2 ? 2 : -2}deg)`,
              opacity: enter,
              background: "#111",
            }}
          >
            <Img src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          </div>
        </AbsoluteFill>
      )}
      <Captions words={scene.words} accent={palette.accent} />
    </AbsoluteFill>
  );
};

const Quote: React.FC<SceneProps> = ({ scene, index, props }) => {
  const { palette, display } = style(props);
  return (
    <AbsoluteFill>
      <Backdrop scene={scene} palette={palette} seed={index} dim={0.6} />
      <AbsoluteFill style={{ justifyContent: "center", padding: `0 ${SAFE.side + 20}px`, paddingBottom: 160 }}>
        <FadeUp>
          <div style={{ fontFamily: FONTS["Playfair Display"], fontSize: 260, lineHeight: 0.6, color: palette.accent }}>“</div>
        </FadeUp>
        <KineticText text={scene.headline} font={display} size={80} color="white" accent={palette.accent} delay={6} />
        {scene.subtext && (
          <FadeUp delay={20} style={{ marginTop: 32 }}>
            <div style={{ fontFamily: BODY_FONT, fontWeight: 500, fontSize: 40, color: "rgba(255,255,255,0.85)" }}>— {scene.subtext}</div>
          </FadeUp>
        )}
      </AbsoluteFill>
      <Captions words={scene.words} accent={palette.accent} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<SceneProps> = ({ scene, props }) => {
  const { palette, display, upper } = style(props);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const pulse = 1 + 0.03 * Math.sin(frame / 5);
  const url = props.storyboard.ctaUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <AbsoluteFill>
      <BrandGradient palette={palette} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${SAFE.side}px`, paddingBottom: 260, gap: 48 }}>
        {props.logoUrl ? (
          <Img src={props.logoUrl} style={{ maxWidth: 420, maxHeight: 220, objectFit: "contain", transform: `scale(${logoIn})` }} />
        ) : props.brandName ? (
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 72, color: palette.text, transform: `scale(${logoIn})` }}>{props.brandName}</div>
        ) : null}
        <KineticText text={scene.headline} font={display} size={upper ? 140 : 100} color={palette.text} accent={palette.accent} align="center" delay={8} uppercase={upper} />
        {url && (
          <FadeUp delay={20}>
            <Pill palette={palette} scale={pulse}>{url}</Pill>
          </FadeUp>
        )}
        {scene.subtext && !url && (
          <FadeUp delay={20}>
            <Pill palette={palette} scale={pulse}>{scene.subtext}</Pill>
          </FadeUp>
        )}
      </AbsoluteFill>
      <Captions words={scene.words} accent={palette.accent} />
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ palette: Palette; scale: number; children: React.ReactNode }> = ({ palette, scale, children }) => (
  <div
    style={{
      fontFamily: BODY_FONT,
      fontWeight: 800,
      fontSize: 46,
      color: palette.background,
      background: palette.accent,
      padding: "26px 56px",
      borderRadius: 999,
      transform: `scale(${scale})`,
      boxShadow: `0 20px 60px ${palette.accent}66`,
    }}
  >
    {children}
  </div>
);

const AccentBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame, fps, config: { damping: 200 } }) * 120;
  return <div style={{ width: w, height: 12, borderRadius: 6, background: color, marginBottom: 28 }} />;
};
