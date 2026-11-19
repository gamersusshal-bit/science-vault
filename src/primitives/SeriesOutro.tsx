import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./useFonts";

/**
 * End-of-Short follow prompt (PLAYBOOK section 3): "FOLLOW · WHY IT HAPPENS #6 NEXT".
 * Visual only, so the narration still loops cleanly into the hook. Shows for the last `seconds`
 * of the video at top=1330, between the world and the captions (keep that band clear at the end).
 * `next` is this Short's series number plus one.
 */
export const SeriesOutro: React.FC<{ name: string; next: number; accent: string; seconds?: number; top?: number }> = ({
  name,
  next,
  accent,
  seconds = 1.8,
  top = 1330,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const start = durationInFrames - Math.round(seconds * fps);
  if (frame < start) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 170 } });
  const o = interpolate(frame - start, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top, width: "100%", display: "flex", justifyContent: "center", opacity: o, zIndex: 60 }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 36,
          letterSpacing: 4,
          color: "#0a0a12",
          background: accent,
          padding: "12px 30px",
          borderRadius: 44,
          boxShadow: "0 8px 28px rgba(0,0,0,0.65)",
          transform: `scale(${0.8 + 0.2 * Math.min(1, s)})`,
          whiteSpace: "nowrap",
        }}
      >
        FOLLOW · {name.toUpperCase()} #{next} NEXT
      </div>
    </div>
  );
};
