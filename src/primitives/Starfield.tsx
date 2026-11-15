import React, { useMemo } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

type StarfieldProps = {
  count?: number;
  seed?: string;
  /** Upward drift in pixels per second for the nearest stars */
  drift?: number;
};

export const Starfield: React.FC<StarfieldProps> = ({
  count = 240,
  seed = "vault",
  drift = 6,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const stars = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const depth = random(`${seed}-depth-${i}`); // 0 = far, 1 = near
        return {
          x: random(`${seed}-x-${i}`) * width,
          y: random(`${seed}-y-${i}`) * height,
          depth,
          size: 1.5 + depth * 3,
          baseOpacity: 0.25 + depth * 0.6,
          twinkleSpeed: 0.3 + random(`${seed}-speed-${i}`) * 0.9,
          phase: random(`${seed}-phase-${i}`) * Math.PI * 2,
        };
      }),
    [count, seed, width, height],
  );

  const t = frame / fps;

  return (
    <AbsoluteFill>
      {stars.map((s, i) => {
        const y = (((s.y - t * drift * s.depth) % height) + height) % height;
        const twinkle =
          0.75 + 0.25 * Math.sin(t * s.twinkleSpeed * Math.PI * 2 + s.phase);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: y,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              backgroundColor: "#dbe7ff",
              opacity: s.baseOpacity * twinkle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
