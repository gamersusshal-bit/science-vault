import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, useFonts } from "./useFonts";

export type ThumbSpec = { at: number; text: string[]; accent: string };

/**
 * Thumbnail for a Short: one frame of the scene (scripts/thumb.sh picks it with --frame) with the scene's own title and
 * captions covered, and two big lines of text on top. YouTube crops Shorts thumbnails
 * toward the centre on some surfaces, so everything important stays between y=150 and y=1770.
 */
const fit = (line: string) => Math.min(176, Math.floor(980 / (line.length * 0.62)));

export const Thumbnail: React.FC<{ scene: React.FC; spec: ThumbSpec }> = ({ scene: Scene, spec }) => {
  useFonts();
  const [top, ...rest] = spec.text;
  const bottom = rest.join(" ");
  const base: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontFamily: FONT,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: -3,
    whiteSpace: "nowrap",
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Scene />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgb(6,8,14) 0px, rgb(6,8,14) 450px, rgba(6,8,14,0) 600px, rgba(6,8,14,0) 1290px, rgb(6,8,14) 1400px, rgb(6,8,14) 1920px)",
        }}
      />
      <div style={{ ...base, top: 330 - fit(top), fontSize: fit(top), color: "#ffffff" }}>{top}</div>
      <div style={{ ...base, top: 1450, fontSize: fit(bottom), color: spec.accent }}>{bottom}</div>
      <div style={{ ...base, top: 1680, fontSize: 52, letterSpacing: 14, color: "rgba(255,255,255,0.7)" }}>LEARNIT</div>
    </AbsoluteFill>
  );
};
