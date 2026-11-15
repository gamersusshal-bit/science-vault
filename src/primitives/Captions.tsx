import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./useFonts";

export type Word = { text: string; start: number; end: number };
export type Line = { id: string; text: string; start: number; end: number; words: Word[] };

type Chunk = { words: Word[]; start: number; end: number };

/** Break narration into short on-screen phrases (max 3 words, split at punctuation). */
const toChunks = (lines: Line[], maxWords = 3, maxChars = 17): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const line of lines) {
    let cur: Word[] = [];
    const flush = () => {
      if (cur.length) {
        chunks.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
        cur = [];
      }
    };
    for (const w of line.words) {
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
      if (cur.length >= maxWords || (cur.length > 0 && chars > maxChars)) flush();
      cur.push(w);
      if (/[,.;:?!]$/.test(w.text)) flush();
    }
    flush();
  }
  return chunks;
};

export const Captions: React.FC<{
  lines: Line[];
  top: number;
  accent?: string;
}> = ({ lines, top, accent = "#ffd166" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => toChunks(lines), [lines]);

  const idx = chunks.findIndex((c, i) => {
    const next = chunks[i + 1];
    const until = next ? Math.min(next.start, c.end + 0.35) : c.end + 0.35;
    return t >= c.start - 0.03 && t < until;
  });
  if (idx === -1) return null;
  const chunk = chunks[idx];
  const pop = spring({
    frame: frame - Math.round((chunk.start - 0.03) * fps),
    fps,
    config: { damping: 16, stiffness: 260, mass: 0.5 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "0 20px",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 76,
        lineHeight: 1.1,
        letterSpacing: -1,
        textTransform: "uppercase",
        transform: `scale(${0.86 + 0.14 * pop})`,
        opacity: Math.min(1, pop * 1.4),
      }}
    >
      {chunk.words.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.02;
        const spoken = t >= w.start;
        return (
          <span
            key={i}
            style={{
              color: active ? accent : "#ffffff",
              opacity: spoken ? 1 : 0.55,
              textShadow: "0 4px 18px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,1)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
