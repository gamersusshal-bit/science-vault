import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/doubling-giant/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, s: string) => line(id).words.find((w) => w.text.toLowerCase().startsWith(s))!.start;

// ---------- Beats (from the narration timeline) ----------
const T_DOUBLE = wordStart("hook", "double");
const T_HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_PLANET = wordStart("meter", "planet");
const T_EV = line("everest").start;
const T_EVEREST = wordStart("everest", "everest");
const T_ADD = line("adder").start;
const T_RE = line("rehook").start;
const T_BEFORE = wordStart("rehook", "day");
const T_HALF = wordStart("rehook", "half");
const T_CL = line("climax").start;
const T_23 = wordStart("climax", "twenty");
const T_TALLER = wordStart("climax", "taller");
const T_PAY = line("payoff").start;
const T_TODAY = wordStart("payoff", "bigger");

// ---------- Numbers (sources in videos/doubling-giant/script.json) ----------
const START_M = 1.7;
const EARTH_D = 12_756_000; // m, NASA NSSDC equatorial diameter
const EARTH_R = EARTH_D / 2;
const EVEREST = 8849; // m (8,848.86)

// ---------- Palette: daylight sky to deep space, tangerine giant, ice-blue Earth ----------
const ORANGE = "#ff8a3d";
const ICE = "#7cc8ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.4) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const win = (t: number, a: number, b: number, f = 0.3) => interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);

// ---------- Day schedule: "raw" day value over time; each integer crossing is a doubling ----------
const KEYS: [number, number][] = [
  [0, -0.05],
  [T_DOUBLE - 0.02, 0.0],
  [T_HOOK_END, 3.6],
  [T_PLANET, 7.7],
  [T_EVEREST - 0.25, 13.0],
  [T_RE, 13.6],
  [T_BEFORE - 0.15, 22.0],
  [T_23 - 0.05, 22.95],
  [T_23 + 0.05, 23.0],
  [999, 23.4],
];
const rawDay = (t: number) =>
  interpolate(t, KEYS.map((k) => k[0]), KEYS.map((k) => k[1]), clamp);
// crossing times of each integer day
const CROSS: number[] = [];
for (let n = 1; n <= 23; n++) {
  let lo = 0, hi = 60;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (rawDay(m) >= n - 1e-6) hi = m; else lo = m;
  }
  CROSS.push(hi);
}
const pop = (x: number) => {
  // 0 -> 1 with a little overshoot, over ~0.22 s
  if (x <= 0) return 0;
  const u = Math.min(1, x / 0.22);
  const back = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
  return x > 0.22 ? 1 : back;
};
const giantDay = (t: number) => CROSS.reduce((s, c) => s + pop(t - c), 0);
const dayNow = (t: number) => CROSS.filter((c) => t >= c).length;
const camDay = (t: number) => {
  let s = 0;
  const w = t < T_RE ? 0.045 : 0.02;
  for (let i = 0; i < 6; i++) s += giantDay(t - w * i);
  return s / 6;
};

const fmtHeight = (m: number) =>
  m < 1000 ? `${Math.round(m).toLocaleString("en-US")} M` : `${Math.round(m / 1000).toLocaleString("en-US")} KM`;

// Generic person silhouette, feet at (0,0), height 1 (scaled by caller)
const Person: React.FC<{ x: number; y: number; h: number; fill: string; stroke: string; opacity?: number; dashed?: boolean }> = ({
  x, y, h, fill, stroke, opacity = 1, dashed,
}) => {
  if (h < 0.4) return null;
  const sw = Math.max(1.5, Math.min(6, h * 0.012));
  return (
    <g transform={`translate(${x} ${y}) scale(${h})`} opacity={opacity}>
      <g fill={fill} stroke={stroke} strokeWidth={sw / h} strokeDasharray={dashed ? `${10 / h} ${8 / h}` : undefined} strokeLinejoin="round">
        <circle cx={0} cy={-0.905} r={0.085} />
        <path d="M -0.13 -0.79 Q 0 -0.82 0.13 -0.79 L 0.17 -0.47 L 0.12 -0.46 L 0.1 -0.62 L 0.085 -0.47 L 0.075 0 L 0.012 0 L 0 -0.42 L -0.012 0 L -0.075 0 L -0.085 -0.47 L -0.1 -0.62 L -0.12 -0.46 L -0.17 -0.47 Z" />
      </g>
      {!dashed && (
        <g fill="#2a1406">
          <circle cx={-0.03} cy={-0.915} r={0.011} />
          <circle cx={0.03} cy={-0.915} r={0.011} />
        </g>
      )}
    </g>
  );
};

const STARS = Array.from({ length: 140 }, (_, i) => {
  const a = Math.sin(i * 127.1) * 43758.5453;
  const b = Math.sin(i * 311.7) * 24634.6345;
  return { x: (a - Math.floor(a)) * 1080, y: (b - Math.floor(b)) * 1920, r: 0.8 + ((i * 37) % 10) / 6 };
});

const CLOUDS = Array.from({ length: 14 }, (_, i) => ({
  x: (i - 7) * 5200 + ((i * 1777) % 1900),
  alt: 1600 + ((i * 731) % 1400),
  w: 2600 + ((i * 913) % 2400),
}));

const PROPS: { kind: string; h: number; x: number }[] = [
  { kind: "house", h: 7, x: 3.2 },
  { kind: "tree", h: 12, x: -7 },
  { kind: "block", h: 45, x: 22 },
  { kind: "tree", h: 12, x: 38 },
  { kind: "mast", h: 250, x: -170 },
  { kind: "block", h: 45, x: -60 },
  { kind: "hill", h: 1200, x: 1400 },
  { kind: "hill", h: 900, x: -2200 },
];

// Unit-height props, base at (0,0), drawn upward
const Prop: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === "house")
    return (
      <g>
        <rect x={0} y={-0.64} width={1} height={0.64} fill="#f2e3c6" />
        <path d="M -0.07 -0.64 L 0.5 -1 L 1.07 -0.64 Z" fill="#b5523b" />
        <rect x={0.42} y={-0.3} width={0.16} height={0.3} fill="#6b4a2b" />
        <rect x={0.12} y={-0.52} width={0.17} height={0.14} fill="#9fd3ff" />
        <rect x={0.71} y={-0.52} width={0.17} height={0.14} fill="#9fd3ff" />
      </g>
    );
  if (kind === "tree")
    return (
      <g>
        <rect x={-0.04} y={-0.4} width={0.08} height={0.4} fill="#6b4a2b" />
        <circle cx={0} cy={-0.62} r={0.3} fill="#2f7a3a" />
        <circle cx={-0.16} cy={-0.5} r={0.2} fill="#3a8a45" />
        <circle cx={0.17} cy={-0.52} r={0.2} fill="#358240" />
      </g>
    );
  if (kind === "block")
    return (
      <g>
        <rect x={0} y={-1} width={0.36} height={1} fill="#cfd6e2" />
        {Array.from({ length: 12 }, (_, r) => (
          <rect key={r} x={0.04} y={-0.96 + r * 0.08} width={0.28} height={0.04} fill="#7fa6cc" />
        ))}
      </g>
    );
  if (kind === "mast")
    return (
      <g stroke="#e05a4a" strokeWidth={0.012} fill="none">
        <path d="M -0.06 0 L 0 -1 L 0.06 0" />
        <path d="M -0.045 -0.25 L 0.045 -0.25 M -0.03 -0.5 L 0.03 -0.5 M -0.015 -0.75 L 0.015 -0.75" />
      </g>
    );
  return <path d="M -2.2 0 Q -1 -1.1 0 -1 Q 1.2 -0.9 2.4 0 Z" fill="#5f9a48" />;
};

export const DoublingGiant: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const gd = giantDay(t);
  const h = START_M * Math.pow(2, gd); // giant height in metres
  const cd = Math.max(0, camDay(t));
  const hc = START_M * Math.pow(2, cd);

  // ---------- Camera: metres per pixel, and where the ground (Earth's top) sits on screen ----------
  const space = interpolate(cd, [16.5, 20.5], [0, 1], { ...clamp, easing: ease }); // 0 = standing on flat ground, 1 = Earth in view
  const frameM = interpolate(space, [0, 1], [hc * 1.75, (hc + EARTH_D) * 1.1]);
  const visiblePx = interpolate(space, [0, 1], [1000, 880]);
  const drift = (t > T_TODAY ? 1 + 0.025 * (t - T_TODAY) : 1) * (1 - 0.16 * ramp(t, T_BEFORE, 3.6) + 0.16 * ramp(t, T_23 - 0.2, 0.4)) * (1 + 0.12 * ramp(t, T_ADD, 3.2) - 0.12 * ramp(t, T_RE, 0.4)); // slow push-in on day 22, pull-back in the payoff
  const mpp = (frameM / visiblePx) * drift;
  const earthPx = EARTH_D / mpp;
  const groundY = interpolate(space, [0, 1], [1400, 650 + h / mpp]);
  const giantX = interpolate(space, [0, 1], [400, 540]);
  const yOf = (alt: number) => groundY - alt / mpp;
  const xOf = (xm: number) => giantX + xm / mpp;

  // ---------- Sky ----------
  const skyDark = interpolate(Math.log10(frameM), [4.3, 5.4], [0, 1], clamp);
  const skyTop = `rgb(${Math.round(60 * (1 - skyDark) + 4 * skyDark)}, ${Math.round(140 * (1 - skyDark) + 6 * skyDark)}, ${Math.round(220 * (1 - skyDark) + 16 * skyDark)})`;
  const skyBot = `rgb(${Math.round(190 * (1 - skyDark) + 8 * skyDark)}, ${Math.round(225 * (1 - skyDark) + 10 * skyDark)}, ${Math.round(250 * (1 - skyDark) + 24 * skyDark)})`;

  // ---------- Landmarks ----------
  const housePx = 7 / mpp;
  const evX = 4200, evW = 6200;
  const evOn = interpolate(cd, [6.5, 8.0], [0, 1], clamp) * interpolate(cd, [16, 17.5], [1, 0], clamp);
  const evPassed = ramp(t, T_EVEREST - 0.15, 0.3);

  // ---------- Earth ----------
  const earthCx = giantX;
  const earthCy = groundY + EARTH_R / mpp;
  const rPx = EARTH_R / mpp;
  const flat = rPx > 30000;

  // ---------- HUD values ----------
  const day = dayNow(t);
  const dayPop = spring({ frame: frame - Math.round((CROSS[Math.max(0, day - 1)] ?? 0) * fps), fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
  const progress = Math.min(1, Math.log2(h / START_M) / Math.log2(EARTH_D / START_M));
  const meterIn = ramp(t, T_METER - 0.1, 0.45);
  const stopHit = spring({ frame: frame - Math.round(T_23 * fps), fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  const stopped = t >= T_23;

  // Adder inset (break it): one body added per day stays street-sized
  const insetOn = win(t, T_ADD - 0.15, T_RE + 0.25, 0.35);
  const stackN = Math.round(interpolate(t, [T_ADD + 0.1, T_ADD + 2.4], [1, 14], clamp));
  // Rehook comparison bars
  const barsOn = ramp(t, T_BEFORE - 0.1, 0.5) * (1 - ramp(t, T_PAY + 0.6, 0.5));
  const halfTag = win(t, T_HALF - 0.2, T_CL + 0.6, 0.3);
  const hitFlash = interpolate(t, [T_TALLER - 0.05, T_TALLER + 0.05, T_TALLER + 0.7], [0, 1, 0], clamp);
  const tallerTag = ramp(t, T_TALLER, 0.35) * (1 - ramp(t, T_PAY - 0.2, 0.3));
  const ghostOn = ramp(t, T_PAY - 0.1, 0.5);
  const tomorrow = 0;
  const shake = 14 * Math.exp(-Math.max(0, t - T_TALLER) * 6) * (t > T_TALLER ? 1 : 0)
    + 8 * Math.exp(-Math.max(0, t - T_DOUBLE) * 7) * (t > T_DOUBLE ? 1 : 0);
  const sx = Math.sin(frame * 2.1) * shake, sy = Math.cos(frame * 1.7) * shake;

  const giantPx = h / mpp;
  const ghostPx = giantPx / 2;
  const barX = 96;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBot} 100%)`, overflow: "hidden" }}>
      <Audio src={staticFile("doubling-giant/narration.wav")} />
      <Audio src={staticFile("doubling-giant/bed.wav")} volume={0.6} />

      {/* Stars fade in as we leave the sky */}
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: skyDark }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.35 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))} />
        ))}
      </svg>

      {/* ================= WORLD ================= */}
      <svg width={1080} height={1920} style={{ position: "absolute", transform: `translate(${sx}px, ${sy}px)`, overflow: "visible" }}>
        <defs>
          <radialGradient id="earthG" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#8fd3ff" />
            <stop offset="45%" stopColor="#2f7fcf" />
            <stop offset="100%" stopColor="#0b2b5c" />
          </radialGradient>
          <linearGradient id="evG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f8ff" />
            <stop offset="28%" stopColor="#c9d4e6" />
            <stop offset="45%" stopColor="#6c7891" />
            <stop offset="100%" stopColor="#3b4458" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Clouds (low) */}
        {CLOUDS.map((c, i) => {
          const w = c.w / mpp;
          if (w < 2 || w > 4000) return null;
          return (
            <ellipse key={i} cx={xOf(c.x + t * 700)} cy={yOf(c.alt)} rx={w / 2} ry={w / 7} fill="#ffffff"
              opacity={0.75 * (1 - skyDark) * interpolate(cd, [9, 11], [0, 1], clamp)} />
          );
        })}

        {/* Everest */}
        {evOn > 0 && (
          <g opacity={evOn}>
            <path
              d={`M ${xOf(evX - evW)} ${yOf(0)} L ${xOf(evX - evW * 0.45)} ${yOf(EVEREST * 0.55)} L ${xOf(evX - evW * 0.18)} ${yOf(EVEREST * 0.8)} L ${xOf(evX)} ${yOf(EVEREST)} L ${xOf(evX + evW * 0.3)} ${yOf(EVEREST * 0.7)} L ${xOf(evX + evW * 0.6)} ${yOf(EVEREST * 0.5)} L ${xOf(evX + evW)} ${yOf(0)} Z`}
              fill="url(#evG)"
            />
            <line x1={xOf(evX) - 220} x2={xOf(evX) + 60} y1={yOf(EVEREST)} y2={yOf(EVEREST)} stroke="#fff" strokeWidth={3} strokeDasharray="6 8" opacity={0.8} />
          </g>
        )}

        {/* Scale ladder: everyday things that shrink away as you grow (pictures only, no figures claimed) */}
        {PROPS.map((p, i) => {
          const px = p.h / mpp;
          if (px < 2 || px > 2600) return null;
          const o = interpolate(px, [2, 8], [0, 1], clamp) * interpolate(px, [1600, 2600], [1, 0], clamp) * (1 - space);
          return (
            <g key={i} transform={`translate(${xOf(p.x)} ${yOf(0)}) scale(${px})`} opacity={o}>
              <Prop kind={p.kind} />
            </g>
          );
        })}

        {/* Ground / Earth */}
        {flat ? (
          <g>
            <rect x={-200} y={groundY} width={1480} height={2400} fill="#4f8f3a" />
            <rect x={-200} y={groundY} width={1480} height={14} fill="#6fb24f" />
          </g>
        ) : (
          <g>
            <circle cx={earthCx} cy={earthCy} r={rPx * 1.035} fill="#7cc8ff" opacity={0.18 * space} />
            <circle cx={earthCx} cy={earthCy} r={rPx} fill="url(#earthG)" />
            <circle cx={earthCx} cy={earthCy} r={rPx} fill="#4f8f3a" opacity={1 - space} />
            {space > 0.3 && (
              <g opacity={space} fill="#5fae6a">
                <ellipse cx={earthCx - rPx * 0.35} cy={earthCy - rPx * 0.25} rx={rPx * 0.28} ry={rPx * 0.18} transform={`rotate(${-20 + t * 9} ${earthCx} ${earthCy})`} />
                <ellipse cx={earthCx + rPx * 0.3} cy={earthCy + rPx * 0.2} rx={rPx * 0.22} ry={rPx * 0.3} transform={`rotate(${-20 + t * 9} ${earthCx} ${earthCy})`} />
                <ellipse cx={earthCx + rPx * 0.05} cy={earthCy - rPx * 0.72} rx={rPx * 0.35} ry={rPx * 0.12} fill="#eef6ff" />
              </g>
            )}
          </g>
        )}

        {/* Yesterday's ghost (payoff) */}
        {ghostOn > 0 && (
          <Person x={giantX - giantPx * 0.42} y={groundY} h={ghostPx} fill="rgba(255,138,61,0.12)" stroke="#ffd2b0" opacity={ghostOn} dashed />
        )}

        {/* Tomorrow's size, foreshadowed on day 22 */}
        {tomorrow > 0 && (
          <Person x={giantX} y={groundY} h={giantPx * 2} fill="rgba(255,138,61,0.08)" stroke="#ffd2b0" opacity={tomorrow * (0.6 + 0.4 * Math.sin(t * 6))} dashed />
        )}

        {/* The giant */}
        <g filter="url(#glow)">
          <Person x={giantX} y={groundY} h={giantPx} fill={ORANGE} stroke="#ffe0c8" />
        </g>

        {/* Rehook / climax: height vs Earth's width bars */}
        {barsOn > 0 && (
          <g opacity={barsOn}>
            <line x1={barX} x2={barX} y1={groundY + earthPx} y2={groundY} stroke={ICE} strokeWidth={12} strokeLinecap="round" />
            <line x1={barX + 34} x2={barX + 34} y1={groundY + earthPx} y2={groundY + earthPx - giantPx} stroke={ORANGE} strokeWidth={12} strokeLinecap="round" />
            <line x1={barX - 30} x2={earthCx - rPx * 0.2} y1={groundY} y2={groundY} stroke={ICE} strokeWidth={2} strokeDasharray="4 8" />
          </g>
        )}
        {hitFlash > 0 && (
          <circle cx={giantX} cy={groundY - giantPx * 0.5} r={300 + 500 * hitFlash} fill="none" stroke="#fff" strokeWidth={10 * hitFlash} opacity={hitFlash} />
        )}
      </svg>

      {/* World labels (screen-space, placed from world coords) */}
      <WorldTag x={giantX + Math.max(70, giantPx * 0.2)} y={groundY - giantPx * 0.55} color="#fff" opacity={1 - ramp(t, T_RE, 0.4)} align="left">
        YOU
      </WorldTag>
      <WorldTag x={xOf(evX) + 40} y={yOf(EVEREST) - 50} color="#ffffff" opacity={evOn * win(t, T_EV - 0.3, T_RE, 0.3)} align="left">
        {evPassed > 0.5 ? "EVEREST ✓" : "EVEREST"}
      </WorldTag>
      <WorldTag x={earthCx} y={groundY + earthPx * 0.55} color="#eaf6ff" opacity={space * (1 - ramp(t, T_TALLER - 0.2, 0.3))} size={40}>
        EARTH
      </WorldTag>
      <WorldTag x={barX - 42} y={groundY + earthPx * 0.5} color={ICE} opacity={barsOn} size={30} rotate>
        EARTH'S WIDTH
      </WorldTag>
      <WorldTag x={barX + 76} y={groundY + earthPx - giantPx * 0.5} color={ORANGE} opacity={barsOn} size={30} rotate>
        YOUR HEIGHT
      </WorldTag>

      {/* Break it: one body added per day, same 13 days */}
      {insetOn > 0 && (
        <div style={{ position: "absolute", left: 30, top: 640, width: 460, height: 460, borderRadius: "50%", overflow: "hidden",
          border: `6px solid #fff`, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", opacity: insetOn, transform: `scale(${0.7 + 0.3 * insetOn})`,
          background: "linear-gradient(180deg, #8cc8f5 0%, #d8eefc 100%)" }}>
          <svg width={460} height={460}>
            <rect x={0} y={400} width={460} height={60} fill="#5a6470" />
            <rect x={0} y={394} width={460} height={8} fill="#c9ced6" />
            {/* building about as tall as the finished stack (~24 m) */}
            <rect x={270} y={86} width={130} height={308} fill="#d9cbb3" stroke="#6e5a3c" strokeWidth={3} />
            {Array.from({ length: 9 }, (_, r) => [0, 1, 2].map((c) => (
              <rect key={`${r}-${c}`} x={284 + c * 38} y={100 + r * 32} width={24} height={18} fill="#7fb6e0" />
            )))}
            {/* stacked bodies: one added per day */}
            {Array.from({ length: stackN }, (_, i) => (
              <g key={i} transform={`translate(190 ${394 - i * 22}) scale(2.4 1)`}><Person x={0} y={0} h={22} fill={i === stackN - 1 ? "#ffd2b0" : ORANGE} stroke="#5a2a0c" /></g>
            ))}
            {/* the giant's toe */}
            <path d="M -20 460 L -20 250 Q 50 225 90 290 L 100 400 L 100 460 Z" fill={ORANGE} stroke="#ffe0c8" strokeWidth={4} />
          </svg>
        </div>
      )}
      <WorldTag x={260} y={1135} color="#fff" opacity={insetOn} size={36}>
        +1 BODY A DAY
      </WorldTag>
      <WorldTag x={260} y={612} color="#fff" opacity={insetOn} size={32}>
        SAME 13 DAYS
      </WorldTag>

      {/* ================= HUD ================= */}
      {/* Title on frame 0, poses the question */}
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 84, lineHeight: 1.05,
        color: "#fff", textShadow: "0 4px 20px rgba(0,40,90,0.6)", opacity: 1 - ramp(t, T_HOOK_END - 0.2, 0.35) }}>
        DOUBLE EVERY DAY.
        <br />
        <span style={{ color: ORANGE }}>WHEN DO YOU</span>
        <br />
        <span style={{ color: ORANGE }}>OUTGROW EARTH?</span>
      </div>

      {/* Day counter */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, opacity: ramp(t, T_HOOK_END - 0.15, 0.35) }}>
        <div style={{ fontWeight: 700, fontSize: 120, letterSpacing: 4, color: stopped ? "#fff" : "#fff",
          textShadow: `0 0 ${30 + 30 * hitFlash}px ${ORANGE}, 0 4px 18px rgba(0,0,0,0.6)`, transform: `scale(${1 + 0.12 * (1 - Math.min(1, dayPop)) + 0.25 * (stopped ? 1 - Math.min(1, stopHit) : 0)})` }}>
          DAY {day}
        </div>
        <div style={{ fontWeight: 700, fontSize: 52, color: ORANGE, letterSpacing: 3, marginTop: -6, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>
          {fmtHeight(h)} TALL
        </div>
      </div>

      {/* Meter: height on a doubling scale, target = Earth's width */}
      <div style={{ position: "absolute", top: 450, left: 110, width: 860, opacity: meterIn * (1 - ramp(t, T_PAY + 0.8, 0.5)) }}>
        <div style={{ position: "relative", height: 30, borderRadius: 15, background: "rgba(10,20,40,0.55)", border: "3px solid rgba(255,255,255,0.8)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 15, background: `linear-gradient(90deg, #ffc08f, ${ORANGE})` }} />
        </div>
        <div style={{ position: "absolute", right: -46, top: -26, width: 82, height: 82, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #9fe0ff, #2f7fcf 55%, #0b2b5c)",
          border: "3px solid #fff", boxShadow: stopped ? `0 0 ${40 * (1 - Math.min(1, stopHit)) + 16}px #fff` : "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
          <span>YOU</span>
          <span>STOP AT EARTH'S WIDTH</span>
        </div>
      </div>

      {halfTag > 0 && (
        <Stamp top={575} color={ICE} opacity={halfTag}>DAY 22 · ONLY HALF</Stamp>
      )}
      {tallerTag > 0 && (
        <Stamp top={575} color={ORANGE} opacity={tallerTag} scale={0.8 + 0.2 * Math.min(1, stopHit)}>TALLER THAN EARTH IS WIDE</Stamp>
      )}
      {ghostOn > 0 && (
        <Stamp top={575} color="#ffd2b0" opacity={ghostOn * (1 - ramp(t, timeline.duration - 2.0, 0.3))}>
          YESTERDAY · TODAY
        </Stamp>
      )}

      <div style={{ position: "absolute", top: 1385, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 26, letterSpacing: 5,
        color: "rgba(255,255,255,0.85)", textShadow: "0 2px 8px rgba(0,0,0,0.6)", opacity: meterIn * (1 - ramp(t, T_RE, 0.4)) }}>
        THOUGHT EXPERIMENT · START 1.7 M · TO SCALE
      </div>

      <SeriesTag name="What If" n={3} accent={ORANGE} until={T_HOOK_END} />
      <Captions lines={timeline.lines} top={1440} accent={ORANGE} />
      <SeriesOutro name="What If" next={4} accent={ORANGE} />
    </AbsoluteFill>
  );
};

const WorldTag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; align?: "left" | "center"; rotate?: boolean; children: React.ReactNode }> = ({
  x, y, color, opacity, size = 36, align = "center", rotate, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: (align === "center" ? "translate(-50%, -50%)" : "translate(0, -50%)") + (rotate ? " rotate(-90deg)" : ""), fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 4, color, opacity, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
    {children}
  </div>
);

const Stamp: React.FC<{ top: number; color: string; opacity: number; scale?: number; children: React.ReactNode }> = ({ top, color, opacity, scale = 1, children }) => (
  <div style={{ position: "absolute", top, width: "100%", display: "flex", justifyContent: "center", opacity }}>
    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, letterSpacing: 3, color: "#0a0a12", background: color, padding: "12px 28px", borderRadius: 14,
      transform: `scale(${scale})`, boxShadow: "0 8px 28px rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>
      {children}
    </div>
  </div>
);
