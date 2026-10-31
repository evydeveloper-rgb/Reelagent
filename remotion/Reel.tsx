import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { linearTiming, springTiming, TransitionPresentation, TransitionPresentationComponentProps, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { RenderProps, Scene, TRANSITION_FRAMES } from "../shared/storyboard";
import { SceneView } from "./Scenes";

const ZoomPresentation: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const entering = presentationDirection === "entering";
  const scale = entering ? interpolate(p, [0, 1], [1.3, 1]) : interpolate(p, [0, 1], [1, 0.9]);
  return <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: entering ? p : 1 }}>{children}</AbsoluteFill>;
};
const zoom = (): TransitionPresentation<Record<string, never>> => ({ component: ZoomPresentation, props: {} });

function presentation(kind: Scene["transition"], i: number) {
  switch (kind) {
    case "slide":
      return slide({ direction: i % 2 ? "from-right" : "from-bottom" });
    case "wipe":
      return wipe({ direction: i % 2 ? "from-left" : "from-top-right" });
    case "zoom":
      return zoom();
    default:
      return fade();
  }
}

export const Reel: React.FC<RenderProps> = (props) => {
  const { durationInFrames, fps } = useVideoConfig();
  const hasVoice = props.scenes.some((s) => s.voUrl);

  // Where each scene starts on the global timeline (for voiceover placement).
  let cursor = 0;
  const starts = props.scenes.map((s, i) => {
    const start = cursor;
    cursor += s.durationInFrames - (i < props.scenes.length - 1 && s.transition !== "none" ? TRANSITION_FRAMES : 0);
    return start;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: props.storyboard.palette.background }}>
      <TransitionSeries>
        {props.scenes.flatMap((scene, i) => {
          const nodes = [
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={scene.durationInFrames}>
              <SceneView scene={scene} index={i} props={props} />
            </TransitionSeries.Sequence>,
          ];
          if (i < props.scenes.length - 1 && scene.transition !== "none") {
            nodes.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={presentation(scene.transition, i) as TransitionPresentation<Record<string, unknown>>}
                timing={
                  scene.transition === "slide"
                    ? springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES })
                    : linearTiming({ durationInFrames: TRANSITION_FRAMES })
                }
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>

      {/* Voiceover lives outside the transition series so it never gets cut by overlaps. */}
      {props.scenes.map((s, i) =>
        s.voUrl ? (
          <Sequence key={`vo${i}`} from={starts[i] + 4} durationInFrames={s.durationInFrames}>
            <Audio src={s.voUrl} />
          </Sequence>
        ) : null,
      )}

      {props.musicUrl && (
        <Audio
          src={/^https?:/.test(props.musicUrl) ? props.musicUrl : staticFile(props.musicUrl)}
          loop
          volume={(f) =>
            // Fade in/out; duck under the voiceover.
            interpolate(f, [0, fps / 2, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }) * (hasVoice ? 0.18 : 0.6)
          }
        />
      )}
    </AbsoluteFill>
  );
};
