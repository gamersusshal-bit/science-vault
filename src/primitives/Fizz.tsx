import React from "react";
import { AbsoluteFill, Audio, Sequence, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./useFonts";
import { Timeline } from "./timeline";

/**
 * Fizz: The Unknown Lab's mascot. A round-bottom flask with goggles, a cork and
 * glowing liquid. Fizz never speaks; it reacts to the narration on cue.
 *
 * Usage: <Fizz cues={autoFizzCues(timeline)} />  or wrap a whole scene with withFizz().
 * Placement: by default its feet stand at (165, 1428), the bottom-left corner just above
 * the captions. Scenes that use Fizz keep x 30-300, y 1120-1435 free of key visuals.
 */

export type FizzMood = "idle" | "wow" | "think" | "point" | "laugh" | "worried";
export type FizzCue = { at: number; mood: FizzMood };

type Pose = {
  px: number; // pupil offset x
  py: number; // pupil offset y
  pr: number; // pupil size factor
  happy: number; // 0 open eyes, 1 closed happy arcs
  browLY: number;
  browRY: number;
  browLT: number; // inner end up, degrees
  browRT: number;
  smile: number; // -1 frown .. 1.2 grin
  open: number; // 0 closed .. 1 wide open
  mouthW: number;
  bubbles: number; // 0..3
  slosh: number; // 0..1
  aL1: number; // left upper arm angle (deg, 0 = right, 90 = down)
  aL2: number; // left forearm
  aR1: number;
  aR2: number;
  lean: number;
};

const POSES: Record<FizzMood, Pose> = {
  idle: { px: 0, py: 0, pr: 1, happy: 0, browLY: 0, browRY: 0, browLT: 0, browRT: 0, smile: 0.5, open: 0, mouthW: 15, bubbles: 1, slosh: 0, aL1: 120, aL2: 100, aR1: 60, aR2: 80, lean: 0 },
  wow: { px: 0, py: -1, pr: 0.55, happy: 0, browLY: -9, browRY: -9, browLT: 6, browRT: 6, smile: 0, open: 1, mouthW: 17, bubbles: 3, slosh: 1, aL1: -150, aL2: -110, aR1: -30, aR2: -70, lean: 0 },
  think: { px: -6, py: -7, pr: 1, happy: 0, browLY: -8, browRY: 1, browLT: -4, browRT: 8, smile: -0.15, open: 0, mouthW: 9, bubbles: 0.6, slosh: 0, aL1: 150, aL2: 60, aR1: 110, aR2: 200, lean: -4 },
  point: { px: 7, py: -6, pr: 1, happy: 0, browLY: -4, browRY: -4, browLT: 0, browRT: 0, smile: 1, open: 0.3, mouthW: 18, bubbles: 1.5, slosh: 0.3, aL1: 120, aL2: 100, aR1: -35, aR2: -35, lean: 5 },
  laugh: { px: 0, py: 0, pr: 1, happy: 1, browLY: -5, browRY: -5, browLT: 0, browRT: 0, smile: 1.2, open: 0.85, mouthW: 20, bubbles: 2.5, slosh: 0.7, aL1: 80, aL2: 10, aR1: 100, aR2: 170, lean: 0 },
  worried: { px: 0, py: 3, pr: 0.85, happy: 0, browLY: -3, browRY: -3, browLT: 18, browRT: 18, smile: -0.8, open: 0.15, mouthW: 13, bubbles: 0.5, slosh: 0.2, aL1: -170, aL2: -60, aR1: -10, aR2: -120, lean: 0 },
};

const mix = (a: Pose, b: Pose, k: number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => {
    out[key] = a[key] + (b[key] - a[key]) * k;
  });
  return out;
};

const GLASS = "#E9FBFF";
const LIQ_TOP = "#3DF0D0";
const LIQ_BOTTOM = "#11A6C8";
const GOLD = "#FFD166";
const INK = "#0B1A2E";
const CORK = "#C8955A";

const rad = (d: number) => (d * Math.PI) / 180;

/** Default reactions from a narration timeline: surprise on the opening and the climax,
 *  thinking on the question, pointing at the explanation, delight on the payoff. */
export const autoFizzCues = (json: unknown): FizzCue[] => {
  const tl = json as Timeline;
  const L = tl.lines;
  const raw: FizzCue[] = [{ at: 0, mood: "idle" }];
  raw.push({ at: tl.beats?.drop ?? L[0].start + 0.4, mood: "wow" });
  // Think on the line that asks a question (else the second line); point at the answer that follows.
  const q = L.findIndex((l, k) => k > 0 && k < L.length - 1 && l.text.includes("?"));
  const thinkIdx = q > 0 ? q : L.length > 2 ? 1 : -1;
  if (thinkIdx > 0) raw.push({ at: L[thinkIdx].start + 0.2, mood: "think" });
  const pointIdx = thinkIdx > 0 && thinkIdx + 1 < L.length - 1 ? thinkIdx + 1 : Math.floor(L.length / 2);
  if (L.length > 3 && pointIdx !== thinkIdx) raw.push({ at: L[pointIdx].start + 0.3, mood: "point" });
  if (tl.beats?.hit !== undefined) raw.push({ at: tl.beats.hit, mood: "wow" });
  raw.push({ at: L[L.length - 1].start + 0.2, mood: "laugh" });
  raw.sort((a, b) => a.at - b.at);
  const spaced: FizzCue[] = [];
  for (const c of raw) {
    const prev = spaced[spaced.length - 1];
    if (prev && c.at - prev.at < 1.0) {
      if (c.mood === "wow" || c.mood === "laugh") spaced[spaced.length - 1] = c;
      continue;
    }
    spaced.push(c);
  }
  // Relax back to idle when a reaction would otherwise be held for a long time.
  const out: FizzCue[] = [];
  spaced.forEach((c, i) => {
    out.push(c);
    const next = spaced[i + 1];
    if (next && c.mood !== "idle" && next.at - c.at > 3.4) out.push({ at: c.at + 2.3, mood: "idle" });
  });
  return out;
};

export const Fizz: React.FC<{
  cues: FizzCue[];
  x?: number;
  y?: number;
  size?: number;
  enterAt?: number;
  sounds?: boolean;
}> = ({ cues, x = 165, y = 1428, size = 0.8, enterAt = 0.15, sounds = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < enterAt) return null;

  // ---------- Current pose ----------
  let i = -1;
  cues.forEach((c, k) => {
    if (c.at <= t) i = k;
  });
  const cur = i >= 0 ? cues[i] : { at: -10, mood: "idle" as FizzMood };
  const prevMood = i > 0 ? cues[i - 1].mood : "idle";
  const dt = t - cur.at;
  const blend = Math.min(1, spring({ frame: Math.round(dt * fps), fps, config: { damping: 14, stiffness: 170 } }));
  const p = mix(POSES[prevMood], POSES[cur.mood], blend);
  const lively = cur.mood === "wow" || cur.mood === "laugh" || cur.mood === "point";

  // ---------- Body motion ----------
  const enter = spring({ frame: Math.round((t - enterAt) * fps), fps, config: { damping: 13, stiffness: 120 } });
  const enterY = (1 - enter) * 620;
  const bob = Math.sin(t * 2.2) * 4 * size;
  const hop = lively && dt < 0.34 ? -40 * size * Math.sin((dt / 0.34) * Math.PI) : 0;
  const imp = 0.11 * Math.exp(-dt * 7) * Math.cos(dt * 20);
  const sy = 1 - imp;
  const sx = 1 + imp * 0.6;
  const laughK = cur.mood === "laugh" ? blend : 0;
  const shake = Math.sin(t * 24) * 3 * laughK;
  const rot = p.lean + shake;

  // ---------- Face ----------
  const blinkPhase = (t + 0.7) % 3.4;
  const blink = p.happy < 0.3 && cur.mood !== "wow" && blinkPhase < 0.14 ? Math.sin((blinkPhase / 0.14) * Math.PI) : 0;
  const wander = cur.mood === "idle" ? 1 : 0.3;
  const pxs = p.px + Math.sin(t * 0.7) * 3 * wander;
  const pys = p.py + Math.sin(t * 0.9 + 1) * 2 * wander;
  const eyeOpen = Math.max(0, 1 - p.happy) * (1 - blink * 0.92);

  // ---------- Liquid ----------
  const level = 12;
  const amp = 2 + p.slosh * 7 + 6 * Math.exp(-dt * 3) * (lively ? 1 : 0);
  let wave = `M -100 ${level + 120}`;
  for (let xx = -100; xx <= 100; xx += 10) {
    wave += ` L ${xx} ${(level + Math.sin(xx * 0.06 + t * 3.2) * amp).toFixed(2)}`;
  }
  wave += " L 100 120 Z";
  const bubbleCount = Math.round(3 + p.bubbles * 3.5);

  // ---------- Cork and glyph ----------
  const corkPop = cur.mood === "wow" && dt < 0.5 ? 34 * Math.sin((dt / 0.5) * Math.PI) : 0;
  const glyph = cur.mood === "wow" ? "!" : cur.mood === "think" ? "?" : null;
  const glyphK = glyph ? Math.min(1, spring({ frame: Math.round(dt * fps), fps, config: { damping: 9, stiffness: 200 } })) : 0;
  const glyphFade = glyph ? Math.max(0, Math.min(1, (2.0 - dt) / 0.4)) : 0;

  // ---------- Arms ----------
  const arm = (sx0: number, a1: number, a2: number) => {
    const ex = sx0 + 38 * Math.cos(rad(a1));
    const ey = 30 + 38 * Math.sin(rad(a1));
    const hx = ex + 34 * Math.cos(rad(a2));
    const hy = ey + 34 * Math.sin(rad(a2));
    return { d: `M ${sx0} 30 L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${hx.toFixed(1)} ${hy.toFixed(1)}`, hx, hy };
  };
  const armL = arm(-84, p.aL1, p.aL2);
  const armR = arm(84, p.aR1, p.aR2);

  // ---------- Mouth ----------
  const cy = -p.smile * 7;
  const upper = cy + p.smile * 14;
  const lower = upper + p.open * 34 + 1;
  const mouth = `M ${-p.mouthW} ${cy} Q 0 ${upper} ${p.mouthW} ${cy} Q 0 ${lower} ${-p.mouthW} ${cy} Z`;

  // ---------- Steam on surprise ----------
  const steam =
    cur.mood === "wow" && dt < 1.2
      ? [0, 1, 2].map((k) => {
          const s = Math.max(0, dt - k * 0.12);
          return { cx: (k - 1) * 16 + Math.sin(s * 6 + k) * 6, cy: -190 - s * 120, r: 8 + s * 22, o: Math.max(0, 0.55 - s * 0.5) };
        })
      : [];

  const eye = (cx: number, browY: number, browT: number, side: -1 | 1) => (
    <g>
      <circle cx={cx} cy={-18} r={27} fill="#1B2A47" stroke={GOLD} strokeWidth={5} />
      <ellipse cx={cx} cy={-18} rx={21} ry={21 * eyeOpen} fill="#F4F8FF" />
      {eyeOpen > 0.15 && (
        <g>
          <circle
            cx={cx + Math.max(-9, Math.min(9, pxs))}
            cy={-18 + Math.max(-9, Math.min(9, pys)) * eyeOpen}
            r={10 * p.pr * Math.min(1, eyeOpen * 1.4)}
            fill={INK}
          />
          <circle cx={cx + pxs + 3} cy={-18 + pys * eyeOpen - 4} r={3 * p.pr} fill="#FFFFFF" opacity={0.9} />
        </g>
      )}
      {p.happy > 0.5 && (
        <path
          d={`M ${cx - 13} ${-12} Q ${cx} ${-30} ${cx + 13} ${-12}`}
          fill="none"
          stroke="#F4F8FF"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={Math.min(1, (p.happy - 0.5) * 2)}
        />
      )}
      {blink > 0.6 && <line x1={cx - 15} y1={-18} x2={cx + 15} y2={-18} stroke="#F4F8FF" strokeWidth={4} strokeLinecap="round" />}
      <line
        x1={cx - 13}
        y1={-56 + browY}
        x2={cx + 13}
        y2={-56 + browY}
        stroke={GLASS}
        strokeWidth={5.5}
        strokeLinecap="round"
        transform={`rotate(${side === -1 ? -browT : browT} ${cx} ${-56 + browY})`}
      />
    </g>
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sounds &&
        cues
          .filter((c) => c.mood !== "idle" && c.at >= enterAt)
          .map((c, k) => (
            <Sequence key={k} from={Math.round(c.at * fps)} durationInFrames={Math.round(0.8 * fps)}>
              <Audio src={staticFile(c.mood === "wow" ? "fizz/pop.wav" : "fizz/bloop.wav")} volume={0.45} />
            </Sequence>
          ))}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} aria-hidden="true">
        <defs>
          <clipPath id="fizz-bulb">
            <circle cx={0} cy={0} r={92} />
          </clipPath>
          <linearGradient id="fizz-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LIQ_TOP} />
            <stop offset="1" stopColor={LIQ_BOTTOM} />
          </linearGradient>
        </defs>
        {/* ground shadow */}
        <ellipse cx={x} cy={y + 4} rx={70 * size * (1 - imp)} ry={11 * size} fill="rgba(0,0,0,0.45)" />
        <g transform={`translate(${x} ${y + bob + hop + enterY}) rotate(${rot}) scale(${size * sx} ${size * sy}) translate(0 -118)`}>
          {/* legs and feet */}
          <path d="M -30 86 L -36 108 M 30 86 L 36 108" stroke={GLASS} strokeWidth={7} strokeLinecap="round" />
          <ellipse cx={-40} cy={112} rx={17} ry={8} fill={GLASS} />
          <ellipse cx={40} cy={112} rx={17} ry={8} fill={GLASS} />
          {/* glass body */}
          <g style={{ filter: "drop-shadow(0 0 12px rgba(94,230,255,0.45))" }}>
            <circle cx={0} cy={0} r={93} fill="rgba(190,240,255,0.10)" />
            <rect x={-26} y={-150} width={52} height={62} fill="rgba(190,240,255,0.10)" />
            <g clipPath="url(#fizz-bulb)">
              <path d={wave} fill="url(#fizz-liquid)" opacity={0.95} />
              {new Array(bubbleCount).fill(0).map((_, k) => {
                const bx = (random(`fb-x-${k}`) - 0.5) * 120;
                const speed = 34 + random(`fb-s-${k}`) * 40;
                const range = 86 - level;
                const yy = 86 - ((t * speed + random(`fb-p-${k}`) * range) % range);
                return <circle key={k} cx={bx + Math.sin(t * 3 + k) * 3} cy={yy} r={2.5 + random(`fb-r-${k}`) * 4} fill="rgba(255,255,255,0.75)" />;
              })}
              <rect x={-100} y={-34} width={200} height={16} fill="#2A3A5C" />
            </g>
            <path d="M 26 -91.4 A 95 95 0 1 1 -26 -91.4 L -26 -150 M 26 -150 L 26 -91.4" fill="none" stroke={GLASS} strokeWidth={6} strokeLinejoin="round" />
            <rect x={-33} y={-158} width={66} height={11} rx={5.5} fill="rgba(190,240,255,0.25)" stroke={GLASS} strokeWidth={5} />
            <path d="M -72 -38 A 80 80 0 0 1 -34 -76" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.55} />
          </g>
          {/* cork */}
          <rect x={-21} y={-184 - corkPop} width={42} height={30} rx={7} fill={CORK} stroke="#8A5A2B" strokeWidth={3} />
          <line x1={-10} y1={-174 - corkPop} x2={-4} y2={-170 - corkPop} stroke="#8A5A2B" strokeWidth={3} strokeLinecap="round" />
          <line x1={6} y1={-165 - corkPop} x2={12} y2={-162 - corkPop} stroke="#8A5A2B" strokeWidth={3} strokeLinecap="round" />
          {steam.map((s, k) => (
            <circle key={k} cx={s.cx} cy={s.cy} r={s.r} fill="#FFFFFF" opacity={s.o} />
          ))}
          {/* face */}
          {eye(-34, p.browLY, p.browLT, -1)}
          {eye(34, p.browRY, p.browRT, 1)}
          <path d={mouth} transform="translate(0 46)" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          {/* arms, in front of the body so hands can reach the face and belly */}
          <path d={armL.d} fill="none" stroke={GLASS} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <path d={armR.d} fill="none" stroke={GLASS} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={armL.hx} cy={armL.hy} r={9} fill={GLASS} />
          <circle cx={armR.hx} cy={armR.hy} r={9} fill={GLASS} />

          {glyph && (
            <text
              x={78}
              y={-170}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={78}
              fill={GOLD}
              opacity={glyphFade}
              transform={`rotate(12 78 -170) scale(${glyphK})`}
              style={{ transformOrigin: "78px -190px", transformBox: "view-box" as React.CSSProperties["transformBox"] }}
            >
              {glyph}
            </text>
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Wrap any scene so Fizz appears on top of it, reacting to that scene's timeline. */
export const withFizz = (Scene: React.FC, timeline: unknown, cues?: FizzCue[]): React.FC => {
  const list = cues ?? autoFizzCues(timeline);
  const Wrapped: React.FC = () => (
    <AbsoluteFill>
      <Scene />
      <Fizz cues={list} />
    </AbsoluteFill>
  );
  return Wrapped;
};

/** Character sheet: every mood side by side (1920 x 1080). */
export const FizzSheet: React.FC = () => {
  const moods: FizzMood[] = ["idle", "wow", "think", "point", "laugh", "worried"];
  const labels: Record<FizzMood, string> = {
    idle: "IDLE",
    wow: "WOW",
    think: "THINK",
    point: "POINT",
    laugh: "LAUGH",
    worried: "WORRIED",
  };
  return (
    <AbsoluteFill style={{ background: "#070B18", fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 56, width: "100%", textAlign: "center", color: "#F4F6FF", fontWeight: 700, fontSize: 84, letterSpacing: -2 }}>
        FIZZ
      </div>
      <div style={{ position: "absolute", top: 156, width: "100%", textAlign: "center", color: "#AEB8D6", fontWeight: 500, fontSize: 30 }}>
        The Unknown Lab's mascot. Reacts to every reveal; never narrates.
      </div>
      {moods.map((m, k) => {
        const col = k % 3;
        const row = Math.floor(k / 3);
        const cx = 360 + col * 600;
        const base = 560 + row * 420;
        return (
          <React.Fragment key={m}>
            <Fizz cues={[{ at: -10, mood: m }]} x={cx} y={base} size={1} enterAt={-10} sounds={false} />
            <div style={{ position: "absolute", left: cx - 150, width: 300, top: base + 24, textAlign: "center", color: "#FFD166", fontWeight: 700, fontSize: 30, letterSpacing: 5 }}>
              {labels[m]}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
