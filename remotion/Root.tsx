import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, RenderProps, totalFrames, WIDTH } from "../shared/storyboard";
import { Reel } from "./Reel";
import { sampleProps } from "./sample";

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel as unknown as React.FC<Record<string, unknown>>}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={totalFrames(sampleProps.scenes)}
    defaultProps={sampleProps as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames((props as unknown as RenderProps).scenes),
    })}
  />
);
