import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./useFonts";

/**
 * Series chip for a Short (PLAYBOOK section 2d): "HOW IT WORKS · #4".
 * Visible from frame 0 and fades out at `until` seconds (normally the end of the hook line).
 * Place it at the top of the safe zone (default top=150); keep the scene's own HUD clear of it while it shows.
 */
export const SeriesTag: React.FC<{ name: string; n: number; accent: string; until: number; top?: number }> = ({
  name,
  n,
  accent,
  until,
  top = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const o = interpolate(t, [until - 0.3, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top, width: "100%", display: "flex", justifyContent: "center", opacity: o, zIndex: 50 }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: 6,
          color: "#0a0a12",
          background: accent,
          padding: "10px 26px",
          borderRadius: 40,
          boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
        }}
      >
        {name.toUpperCase()} · #{n}
      </div>
    </div>
  );
};
