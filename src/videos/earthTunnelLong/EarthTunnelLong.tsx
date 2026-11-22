import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/earth-tunnel-long/timeline.json";

/**
 * Weekly long video (1920x1080): "What If You Fell Through the Earth? The Full 38-Minute Trip".
 * One cut-away Earth, seen side on, with a horizontal tunnel through its centre. The camera moves the
 * Earth around the frame; each chapter adds its own world around it (gravity graph, race clocks,
 * slanted tunnels, obstacles, the orbiting satellite). All timing comes from the narration timeline.
 */

const timeline = timelineJson as { duration: number; lines: Line[] };
const L = (id: string) => timeline.lines.find((l) => l.id === id)!;
const S = (id: string) => L(id).start;
const E = (id: string) => L(id).end;
const W = (id: string, startsWith: string) =>
  L(id).words.find((w) => w.text.toLowerCase().replace(/[^a-z0-9']/g, "").startsWith(startsWith))!.start;

// ---------- Palette: blueprint teal night, molten layers, amber accent ----------
const AMBER = "#ffb347";
const TEAL = "#4fe3c1";
const ICE = "#bfefff";
const RED = "#ff5a4e";
const INK = "#06141b";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, d = 0.5) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: ease });
const win = (t: number, a: number, b: number, f = 0.35) =>
  b - a < 2 * f ? 0 : interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- World geometry (world units; Earth centre at 0,0) ----------
const R = 330; // Earth radius
const R_CORE = R * 0.546; // core-mantle boundary, 3480 of 6371 km
const R_INNER = R * 0.19; // inner core, 1220 km
const CRUST = 12; // drawn thicker than life
const R_ORB = R + 26; // satellite skimming the surface
const TUN = 13; // half-height of the tunnel

// ---------- Physics ----------
// Real Earth: gravity (in surface g) against radius, a smooth fit to PREM (Klotz 2015 Fig. 1):
// nearly flat through the mantle, peaking at about 1.09 g at the core boundary, then down to zero.
const G_PTS: [number, number][] = [
  [0, 0], [0.1, 0.25], [0.19, 0.455], [0.3, 0.66], [0.4, 0.84], [0.5, 1.02], [0.546, 1.088],
  [0.6, 1.06], [0.7, 1.03], [0.8, 1.01], [0.9, 1.0], [1, 1.0],
];
const gReal = (r: number) => {
  const x = Math.min(1, Math.abs(r));
  for (let i = 1; i < G_PTS.length; i++) {
    if (x <= G_PTS[i][0]) {
      const [a, ga] = G_PTS[i - 1];
      const [b, gb] = G_PTS[i];
      return ga + ((gb - ga) * (x - a)) / (b - a);
    }
  }
  return 1;
};
const gUni = (r: number) => Math.min(1, Math.abs(r));

// Integrate the real-Earth fall once (x in Earth radii, -1 = entry, +1 = far side).
const REAL_FALL_S = 38 * 60 + 11; // PREM, Klotz 2015
const UNI_FALL_S = 42 * 60 + 12; // uniform density
const REAL = (() => {
  const g0 = 9.82 / 6.371e6; // surface g in Earth radii per s^2
  const dt = 0.5;
  let x = -1;
  let v = 0;
  const xs: number[] = [x];
  const vs: number[] = [0];
  for (let i = 0; i < 20000; i++) {
    const a = -Math.sign(x) * gReal(x) * g0;
    v += a * dt;
    x += v * dt;
    xs.push(x);
    vs.push(v);
    if (x > 0 && v <= 0) break;
  }
  return { xs, vs, T: (xs.length - 1) * dt, dt };
})();
// Position along the diameter at a simulated time (seconds); time scaled so the model lands on 38:11.
const realX = (sec: number) => {
  const k = Math.max(0, Math.min(1, sec / REAL_FALL_S)) * (REAL.xs.length - 1);
  const i = Math.floor(k);
  const j = Math.min(REAL.xs.length - 1, i + 1);
  return lerp(REAL.xs[i], REAL.xs[j], k - i);
};
const uniX = (sec: number) => -Math.cos(Math.PI * Math.max(0, Math.min(1, sec / UNI_FALL_S)));
const uniSpeed = (sec: number) => (sec <= 0 || sec >= UNI_FALL_S ? 0 : Math.sin((Math.PI * sec) / UNI_FALL_S)); // 1 = 7.9 km/s

const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// ---------- Beats ----------
const T_FELL = W("hook", "fell");
const T_STOPQ = W("hook", "where");
const T_METER = S("meter");
const T_PERFECT = W("meter", "perfect");
const T_SOONER = W("meter", "four");
const T_PROMISE = S("promise");
const T_SAT_TEASE = W("promise", "satellite");
const T_LONDON_TEASE = W("promise", "london");

const CH1 = S("q1");
const T_SHELL = S("shell");
const T_ABOVE = W("shell", "rock");
const T_UNI = S("uniform");
const T_CORE = S("core");
const T_STRONG = S("stronger");
const T_STRONG_WORD = W("stronger", "gravity");
const T_PEAK = S("peak");
const T_CLUE = W("peak", "that");

const CH2 = S("q2");
const T_FLOAT = S("float");
const T_SPEED = S("speedup");
const T_CENTRE = S("centre");
const T_ORBSPEED = W("centre", "that's");
const T_COAST = S("coast");
const T_UPHILL = W("coast", "now");
const T_SOON2 = S("sooner");
const T_FOURMIN = W("sooner", "that's");
const T_BEHIND = S("behind");

const CH3 = S("q3");
const T_ANGLE = S("angle");
const T_WALL = W("angle", "now");
const T_CANCEL = S("cancel");
const T_CANCEL2 = W("cancel", "and");
const T_SAME = S("same");
const T_TINY = S("tiny");
const T_LON = S("london");
const T_WHY3 = S("why3");
const T_LONG3 = W("why3", "only");
const T_LON2 = W("london", "so");

const CH4 = S("q4");
const T_AIR = S("air");
const T_HEAT = S("heat");
const T_LIQ = S("liquid");
const T_WALLS = W("liquid", "no");
const T_KOLA = S("kola");
const T_PCT = W("kola", "that's");
const T_OVEN = W("kola", "rock");
const T_THOUGHT = S("thought");

const CH5 = S("q5");
const T_SAT = S("sat");
const T_PERIOD = S("period");
const T_HALF = W("period", "half");
const T_PULL = S("pull");
const T_SHADOW = S("shadow");
const T_EXACT = W("shadow", "exactly");
const T_EDGE = S("edgeon");
const T_TURN = W("edgeon", "turn");
const T_BEAT = W("edgeon", "and");
const T_PAY = S("payoff");
const T_DONT = W("payoff", "in");
const T_OUTRO = S("outro");

// Race in chapter 2: simulated seconds against video time, with a knot so the perfect-planet
// faller is at the centre as the "centre" line begins and lands as the "coast" line ends.
const raceSim = (t: number) =>
  interpolate(t, [T_FLOAT, T_CENTRE + 0.2, E("coast"), E("behind") - 0.3], [0, REAL_FALL_S / 2, REAL_FALL_S, UNI_FALL_S], clamp);
// Cold open: the first stretch of the same fall, slowed so the cold open covers its first minutes.
const openSim = (t: number) => interpolate(t, [T_FELL, CH1], [0, 900], clamp);

// Satellite phase (chapter 5 onward): angle measured from the tunnel entry, half a lap = one crossing.
const HALF_LAP_S = 8.5;
const satPhase = (t: number) => (Math.PI * (t - T_PERIOD)) / HALF_LAP_S;

// ---------- Camera keyframes: where the Earth's centre sits on screen, and its scale ----------
type Cam = { t: number; x: number; y: number; s: number };
const CAMS: Cam[] = [
  { t: 0, x: 1190, y: 520, s: 1.0 },
  { t: T_PROMISE, x: 1190, y: 520, s: 1.0 },
  { t: T_PROMISE + 1.4, x: 1120, y: 525, s: 0.9 },
  { t: CH1 - 0.2, x: 1120, y: 525, s: 0.9 },
  { t: CH1 + 1.3, x: 560, y: 525, s: 0.95 },
  { t: T_UNI - 0.6, x: 560, y: 525, s: 0.95 },
  { t: T_UNI + 0.6, x: 520, y: 525, s: 0.9 },
  { t: CH2 - 0.2, x: 520, y: 525, s: 0.9 },
  { t: CH2 + 1.3, x: 1200, y: 520, s: 1.0 },
  { t: T_COAST, x: 1200, y: 520, s: 1.0 },
  { t: T_COAST + 1.5, x: 1210, y: 515, s: 1.03 },
  { t: CH3 - 0.2, x: 1210, y: 515, s: 1.03 },
  { t: CH3 + 1.3, x: 1180, y: 540, s: 1.0 },
  { t: T_ANGLE - 0.1, x: 1180, y: 540, s: 1.0 },
  { t: T_ANGLE + 1.2, x: 1180, y: 700, s: 1.45 },
  { t: T_SAME - 0.6, x: 1180, y: 700, s: 1.45 },
  { t: T_SAME + 0.8, x: 1180, y: 530, s: 1.0 },
  { t: T_TINY - 0.1, x: 1180, y: 530, s: 1.0 },
  { t: T_TINY + 1.0, x: 1180, y: 1000, s: 2.0 },
  { t: T_LON - 0.4, x: 1180, y: 1000, s: 2.0 },
  { t: T_LON + 0.6, x: 1180, y: 530, s: 1.0 },
  { t: CH4 - 0.2, x: 1180, y: 530, s: 1.0 },
  { t: CH4 + 1.2, x: 1180, y: 520, s: 1.0 },
  { t: T_KOLA - 0.3, x: 1180, y: 520, s: 1.0 },
  { t: T_KOLA + 1.0, x: 560, y: 560, s: 0.95 },
  { t: T_THOUGHT - 0.2, x: 560, y: 560, s: 0.95 },
  { t: T_THOUGHT + 1.2, x: 960, y: 530, s: 0.85 },
  { t: CH5 - 0.2, x: 960, y: 530, s: 0.85 },
  { t: CH5 + 1.2, x: 1060, y: 500, s: 0.95 },
  { t: T_PAY - 0.3, x: 1060, y: 500, s: 0.95 },
  { t: T_PAY + 1.2, x: 1180, y: 500, s: 0.95 },
  { t: 9999, x: 1180, y: 500, s: 0.95 },
];
const camAt = (t: number) => {
  let i = 0;
  while (i < CAMS.length - 2 && t > CAMS[i + 1].t) i++;
  const a = CAMS[i];
  const b = CAMS[i + 1];
  const k = interpolate(t, [a.t, b.t], [0, 1], { ...clamp, easing: ease });
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k) };
};

// ---------- Small building blocks ----------
const Label: React.FC<{
  x: number;
  y: number;
  color?: string;
  o: number;
  size?: number;
  anchor?: "middle" | "start" | "end";
  children: React.ReactNode;
  weight?: number;
}> = ({ x, y, color = "#fff", o, size = 34, anchor = "middle", children, weight = 700 }) =>
  o <= 0.001 ? null : (
    <text
      x={x}
      y={y}
      fill={color}
      opacity={o}
      fontFamily={FONT}
      fontWeight={weight}
      fontSize={size}
      letterSpacing={3}
      textAnchor={anchor}
      dominantBaseline="middle"
      style={{ paintOrder: "stroke", stroke: "rgba(4,10,14,0.9)", strokeWidth: 8, strokeLinejoin: "round" }}
    >
      {children}
    </text>
  );

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; w?: number; o?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  w = 6,
  o = 1,
}) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 4 || o <= 0.001) return null;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const h = Math.min(22, len * 0.5);
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={x2 - ux * h * 0.7} y2={y2 - uy * h * 0.7} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon
        points={`${x2},${y2} ${x2 - ux * h - uy * h * 0.55},${y2 - uy * h + ux * h * 0.55} ${x2 - ux * h + uy * h * 0.55},${
          y2 - uy * h - ux * h * 0.55
        }`}
        fill={color}
      />
    </g>
  );
};

const Capsule: React.FC<{ x: number; y: number; color: string; o?: number; r?: number; t: number }> = ({
  x,
  y,
  color,
  o = 1,
  r = 12,
  t,
}) =>
  o <= 0.001 ? null : (
    <g opacity={o}>
      <circle cx={x} cy={y} r={r * 2.6} fill={color} opacity={0.18 + 0.05 * Math.sin(t * 6)} />
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={3} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.32} fill="#fff" opacity={0.85} />
    </g>
  );

/** Top-left chapter chip and the chapter's opening question. */
const ChapterCard: React.FC<{ t: number; n: number; name: string; q: string; start: number; end: number; right?: boolean }> = ({
  t,
  n,
  name,
  q,
  start,
  end,
  right,
}) => {
  const chip = win(t, start, end, 0.4);
  const qo = win(t, start, Math.max(start + 2.4, E(`q${n}`) + 1.0), 0.4);
  if (chip <= 0 && qo <= 0) return null;
  const k = ramp(t, start, 0.5);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: right ? undefined : 64,
          right: right ? 64 : undefined,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 5,
          color: INK,
          background: AMBER,
          padding: "8px 22px",
          borderRadius: 30,
          opacity: chip,
        }}
      >
        CHAPTER {n} · {name}
      </div>
      <div
        style={{
          position: "absolute",
          top: 122,
          left: right ? undefined : 64,
          right: right ? 64 : undefined,
          width: 760,
          textAlign: right ? "right" : "left",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 58,
          lineHeight: 1.05,
          letterSpacing: -1,
          color: "#fff",
          opacity: qo,
          transform: `translateY(${20 * (1 - k)}px)`,
          textShadow: "0 4px 24px rgba(0,0,0,0.9)",
        }}
      >
        {q}
      </div>
    </>
  );
};

/** A HUD race clock. */
const Clock: React.FC<{ label: string; sec: number; target: number; color: string; o: number; done: boolean; big?: boolean }> = ({
  label,
  sec,
  target,
  color,
  o,
  done,
  big,
}) => (
  <div style={{ opacity: o, marginBottom: 26, fontFamily: FONT }}>
    <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: big ? 120 : 96,
          lineHeight: 1.0,
          letterSpacing: -3,
          fontVariantNumeric: "tabular-nums",
          color: done ? color : "#fff",
          textShadow: done ? `0 0 34px ${color}` : "0 4px 20px rgba(0,0,0,0.8)",
        }}
      >
        {mmss(Math.min(sec, target))}
      </div>
      <div style={{ fontWeight: 500, fontSize: 34, color: "rgba(255,255,255,0.6)", letterSpacing: 2 }}>/ {mmss(target)}</div>
    </div>
    <div style={{ width: 520, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.12)", marginTop: 8 }}>
      <div style={{ width: `${100 * Math.min(1, sec / target)}%`, height: 12, borderRadius: 6, background: color }} />
    </div>
  </div>
);

// ---------- Chords for chapter 3 (angles in degrees on the circle) ----------
const chord = (a1: number, a2: number) => {
  const p1 = { x: R * Math.cos((a1 * Math.PI) / 180), y: R * Math.sin((a1 * Math.PI) / 180) };
  const p2 = { x: R * Math.cos((a2 * Math.PI) / 180), y: R * Math.sin((a2 * Math.PI) / 180) };
  return { p1, p2 };
};
const LONDON = chord(-122, -58); // drawn far longer than life; labelled NOT TO SCALE
const CHORDS = [chord(180, 0), chord(-150, -20), chord(150, 40), LONDON];
const along = (c: { p1: { x: number; y: number }; p2: { x: number; y: number } }, k: number) => ({
  x: lerp(c.p1.x, c.p2.x, k),
  y: lerp(c.p1.y, c.p2.y, k),
});
const shm = (k: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, k)))) / 2;

// Dust drifting in the background, so the frame never freezes.
const DUST = new Array(70).fill(0).map((_, i) => ({
  x: random(`dx${i}`) * 1920,
  y: random(`dy${i}`) * 1080,
  r: 1 + random(`dr${i}`) * 2.2,
  v: 4 + random(`dv${i}`) * 10,
}));

export const EarthTunnelLong: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = camAt(t);

  // Which chapter are we in?
  const inOpen = t < CH1;
  const in1 = t >= CH1 && t < CH2;
  const in2 = t >= CH2 && t < CH3;
  const in3 = t >= CH3 && t < CH4;
  const in4 = t >= CH4 && t < CH5;
  const in5 = t >= CH5;

  // ---------- Main faller position along the diameter (x in Earth radii) ----------
  let fx = -1;
  let fy = 0;
  let ghostX = -1;
  let ghostO = 0;
  let mainO = 1;
  if (inOpen) {
    // Drops from above into the tunnel mouth, then the first minutes of the fall.
    const drop = interpolate(t, [0, T_FELL], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    fx = t < T_FELL ? -1 - 0.45 * (1 - drop) : realX(openSim(t));
    fy = 0;
    ghostX = uniX(openSim(t));
    ghostO = ramp(t, T_PERFECT, 0.5) * (1 - ramp(t, T_PROMISE + 0.5, 0.6));
  } else if (in1) {
    // Rewind to the entry, then a slow descent that matches the marker on the gravity graph.
    const from = realX(openSim(CH1 - 0.01));
    const dep = interpolate(t, [T_UNI, T_CORE - 0.2], [0, 1], clamp); // uniform pass
    const realDep = interpolate(t, [T_STRONG, T_PEAK - 0.2, T_PEAK, T_CLUE], [0, 0.454, 0.454, 1], clamp);
    if (t < T_SHELL) fx = lerp(from, -0.62, ramp(t, CH1 + 0.2, 1.4));
    else if (t < T_UNI) fx = -0.62;
    else if (t < T_STRONG) fx = lerp(-0.62, -1, ramp(t, T_UNI, 0.6));
    else fx = -1 + realDep;
    ghostX = -1 + dep;
    ghostO = win(t, T_UNI, T_STRONG + 0.4);
  } else if (in2) {
    const sim = raceSim(t);
    fx = t < T_FLOAT ? lerp(-0.2, -1, ramp(t, CH2, 1.2)) : realX(sim);
    ghostX = t < T_FLOAT ? -1 : uniX(sim);
    ghostO = ramp(t, T_FLOAT - 0.4, 0.5);
  } else if (in3) {
    mainO = 1 - ramp(t, CH3, 0.8);
    fx = 1;
  } else if (in4) {
    // Air: a damped swing that settles at the centre.
    const k = Math.max(0, t - T_AIR);
    const ampl = Math.exp(-0.42 * k);
    fx = t < T_AIR ? -1 : -ampl * Math.cos(Math.PI * k * 0.75);
    mainO = ramp(t, CH4, 0.6) * (1 - ramp(t, T_HEAT, 0.6));
  } else {
    const ph = Math.max(0, satPhase(t));
    fx = t < T_PERIOD ? -1 : -Math.cos(ph);
    mainO = ramp(t, CH5 + 0.3, 0.6);
  }

  // ---------- Chapter-specific values ----------
  const titleO = 1 - ramp(t, E("hook") - 0.2, 0.5);
  const stopQ = win(t, T_STOPQ - 0.1, T_METER + 0.4);
  const clocksO = inOpen ? ramp(t, T_METER, 0.5) * (1 - ramp(t, T_PROMISE + 0.3, 0.6)) : 0;
  const openSec = openSim(t);
  const soonerBadge = win(t, T_SOONER - 0.1, T_PROMISE + 0.6);
  const teaseSat = win(t, T_SAT_TEASE - 0.2, T_LONDON_TEASE + 0.2);
  const teaseLon = win(t, T_LONDON_TEASE - 0.2, CH1 + 0.2);

  // Chapter 1
  const shellO = in1 ? win(t, T_SHELL, T_UNI + 0.3) : 0;
  const aboveO = in1 ? win(t, T_ABOVE, T_UNI + 0.3) : 0;
  const graphO = in1 ? ramp(t, T_UNI - 0.3, 0.6) * (1 - ramp(t, CH2 - 0.5, 0.5)) : 0;
  const uniDraw = interpolate(t, [T_UNI, T_CORE - 0.2], [0, 1], clamp);
  const coreHi = in1 ? win(t, T_CORE, T_STRONG + 1.2) : 0;
  const realDraw = interpolate(t, [T_STRONG, T_PEAK - 0.2, T_PEAK, T_CLUE], [0, 0.454, 0.454, 1], clamp);
  const strongerTag = in1 ? win(t, T_STRONG_WORD, T_PEAK + 0.8) : 0;
  const peakTag = in1 ? ramp(t, T_PEAK + 0.5, 0.5) : 0;
  const clue = in1 ? win(t, T_CLUE, CH2 + 0.2) : 0;

  // Chapter 2
  const sim2 = raceSim(t);
  const hud2 = in2 ? ramp(t, E("q2") + 0.9, 0.5) : 0;
  const floatO = in2 ? win(t, T_FLOAT, T_SPEED + 0.8) : 0;
  const speedO = in2 ? ramp(t, T_SPEED - 0.2, 0.5) * (1 - ramp(t, T_SOON2, 0.5)) : 0;
  const zeroTag = in2 ? win(t, T_CENTRE + 0.2, T_COAST + 0.3) : 0;
  const orbMark = in2 ? win(t, T_ORBSPEED, T_COAST + 1.5) : 0;
  const uphill = in2 ? win(t, T_UPHILL, T_SOON2) : 0;
  const realDone = sim2 >= REAL_FALL_S;
  const uniDone = sim2 >= UNI_FALL_S;
  const fourMin = in2 ? ramp(t, T_FOURMIN - 0.2, 0.4) : 0;

  // Chapter 3
  const diaDim = in3 ? 0.35 + 0.65 * (1 - ramp(t, T_ANGLE, 0.6)) : 1;
  const lonDraw = in3 ? ramp(t, CH3 + 1.2, 1.4) : 0;
  const lonBallK = in3 && t < T_SAME ? shm((t - T_WALL) / (T_SAME - T_WALL)) * 0.15 : 0;
  const decomp = in3 ? win(t, T_WALL, T_SAME - 0.2) : 0;
  const cancelO = in3 ? win(t, T_CANCEL, T_SAME + 0.3) : 0;
  const cancelEq = in3 ? ramp(t, T_CANCEL2, 0.5) : 0;
  const allO = in3 ? win(t, T_SAME - 0.3, T_TINY + 0.3) : 0;
  const tinyO = in3 ? win(t, T_TINY, T_LON + 0.2) : 0;
  const tinyK = shm((t - (T_TINY + 0.9)) / Math.max(1, E("tiny") - T_TINY - 0.9));
  const why3O = in3 ? ramp(t, T_WHY3, 0.6) : 0;
  const long3 = in3 ? ramp(t, T_LONG3, 0.5) : 0;
  const allK = shm((t - (T_SAME + 0.4)) / Math.max(1, E("same") - T_SAME - 0.4));
  const lonRaceO = in3 ? ramp(t, T_LON - 0.2, 0.5) : 0;
  const lonRaceK = (t - (T_LON + 0.3)) / Math.max(1, T_LON2 - T_LON - 0.3);
  const lonK = shm(lonRaceK);
  const diaK = shm(lonRaceK * (UNI_FALL_S / REAL_FALL_S)); // diameter (38 min) lands first
  const lonVerdict = in3 ? ramp(t, T_LON2, 0.5) : 0;

  // Chapter 4
  const airO = in4 ? win(t, T_AIR - 0.2, T_HEAT + 0.2) : 0;
  const heatO = in4 ? win(t, T_HEAT, T_LIQ + 0.4) : 0;
  const thermo = interpolate(t, [T_HEAT + 0.6, W("heat", "roughly")], [0, 1], { ...clamp, easing: ease });
  const kolaO = in4 ? win(t, T_KOLA + 0.4, T_THOUGHT + 0.6) : 0;
  const liqO = in4 ? win(t, T_LIQ - 0.2, T_KOLA + 0.4) : 0;
  const crack = in4 ? ramp(t, T_WALLS, 0.8) * (1 - ramp(t, T_KOLA, 0.5)) : 0;
  const pctO = in4 ? ramp(t, T_PCT, 0.5) : 0;
  const ovenO = in4 ? ramp(t, T_OVEN, 0.5) : 0;
  const stamp = in4 ? win(t, T_THOUGHT, CH5 + 0.3) : 0;
  const stampS = spring({ frame: frame - Math.round(T_THOUGHT * fps), fps, config: { damping: 11, stiffness: 160 } });

  // Chapter 5
  const orbitO = in5 ? ramp(t, CH5 + 0.4, 1.0) : 0;
  const satO = t >= T_SAT - 0.2 ? ramp(t, T_SAT - 0.2, 0.6) : 0;
  const ph = satPhase(t);
  const lapSec = Math.max(0, (ph / (2 * Math.PI)) * 84 * 60);
  const lapO = in5 ? win(t, T_PERIOD, T_PULL + 0.3) : 0;
  const pullO = in5 ? win(t, T_PULL, T_SHADOW + 0.6) : 0;
  const shadowO = t >= T_SHADOW ? ramp(t, T_SHADOW, 0.5) * (1 - ramp(t, T_PAY - 0.3, 0.4)) : 0;
  const exactHit = interpolate(t, [T_EXACT - 0.05, T_EXACT, T_EXACT + 0.8], [0, 1, 0], clamp);
  const sameO = t >= T_EXACT ? win(t, T_EXACT, T_EDGE + 0.2) : 0;
  const squash = in5 ? interpolate(t, [T_TURN - 0.2, T_TURN + 1.6, T_BEAT + 0.4, T_BEAT + 1.8], [1, 0.04, 0.04, 1], { ...clamp, easing: ease }) : 1;
  const edgeTag = in5 ? win(t, T_EDGE + 0.3, T_BEAT + 0.6) : 0;
  const beatO = in5 ? win(t, T_BEAT + 0.4, T_PAY + 0.4) : 0;
  const neverO = t >= T_DONT ? ramp(t, T_DONT, 0.4) * (1 - ramp(t, T_OUTRO + 1.2, 0.5)) : 0;
  const neverS = spring({ frame: frame - Math.round(T_DONT * fps), fps, config: { damping: 10, stiffness: 150 } });

  // Shake on the opening drop and on the climax.
  const shake =
    (t >= T_FELL ? 10 * Math.exp(-(t - T_FELL) * 6) : 0) + (t >= T_EXACT ? 12 * Math.exp(-(t - T_EXACT) * 5) : 0);
  const sx = Math.sin(frame * 2.1) * shake;
  const sy = Math.cos(frame * 1.7) * shake;

  // Core glow (heat chapter makes it white-hot)
  const heatGlow = heatO;

  // Faller world coordinates
  const FX = fx * (R - 4);
  const FY = fy * R;
  const GX = ghostX * (R - 4);

  // Gravity arrow on the faller (chapters 1-2): length follows the real-Earth model.
  const gArrowO = in1 ? win(t, CH1 + 0.6, T_SHELL + 0.4) + win(t, T_STRONG, CH2) : in2 ? win(t, T_SPEED - 0.2, T_SOON2) : 0;
  const gLen = 110 * gReal(fx);

  const satA = Math.PI + ph; // satellite angle on its orbit
  const satX = R_ORB * Math.cos(satA);
  const satY = R_ORB * Math.sin(satA) * squash;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 60% 45%, #0f3440 0%, #08202a 45%, #040d12 100%)",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("earth-tunnel-long/narration.wav")} />
      <Audio src={staticFile("earth-tunnel-long/bed.wav")} volume={0.6} />

      {/* Blueprint grid and drifting dust */}
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse" patternTransform={`translate(${(-t * 6) % 60} 0)`}>
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(120,220,220,0.06)" strokeWidth={1.5} />
          </pattern>
        </defs>
        <rect width={1920} height={1080} fill="url(#grid)" />
        {DUST.map((d, i) => (
          <circle key={i} cx={(d.x + t * d.v) % 1920} cy={d.y + 6 * Math.sin(t * 0.4 + i)} r={d.r} fill="rgba(190,240,255,0.28)" />
        ))}
      </svg>

      {/* ================= WORLD ================= */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", overflow: "visible" }}
      >
        <defs>
          <radialGradient id="mantle" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#f08a3c" />
            <stop offset="100%" stopColor="#9b3a22" />
          </radialGradient>
          <radialGradient id="outer" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor="#ffd36b" />
            <stop offset="100%" stopColor="#ff9a2e" />
          </radialGradient>
          <radialGradient id="inner" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fff0a8" />
          </radialGradient>
          <clipPath id="earthClip">
            <circle cx={0} cy={0} r={R} />
          </clipPath>
        </defs>
        <g transform={`translate(${cam.x + sx} ${cam.y + sy}) scale(${cam.s})`}>
          {/* Atmosphere and orbit */}
          <circle cx={0} cy={0} r={R + 18} fill="none" stroke="rgba(120,230,255,0.25)" strokeWidth={14} />
          <g transform={`scale(1 ${squash})`} opacity={Math.max(orbitO, teaseSat * 0.8)}>
            <circle cx={0} cy={0} r={R_ORB} fill="none" stroke={ICE} strokeWidth={3 / squash > 30 ? 3 : 3} strokeDasharray="6 12" opacity={0.7} />
          </g>

          {/* Earth cut-away */}
          <circle cx={0} cy={0} r={R} fill="#4a3a2e" />
          <circle cx={0} cy={0} r={R - CRUST} fill="url(#mantle)" />
          <circle
            cx={0}
            cy={0}
            r={R_CORE}
            fill="url(#outer)"
            stroke={coreHi > 0 ? "#fff" : "none"}
            strokeWidth={6 * coreHi}
            style={{ filter: `drop-shadow(0 0 ${20 + 60 * (coreHi + heatGlow)}px rgba(255,190,90,${0.5 + 0.4 * heatGlow}))` }}
          />
          <circle cx={0} cy={0} r={R_INNER * (1 + 0.04 * Math.sin(t * 2))} fill="url(#inner)" />
          {heatGlow > 0 && (
            <circle cx={0} cy={0} r={R_CORE * (1 + 0.06 * Math.sin(t * 5))} fill="#fff7d6" opacity={0.55 * heatGlow} />
          )}
          {/* Mantle convection swirls, slowly turning */}
          <g clipPath="url(#earthClip)" opacity={0.25}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 + t * 0.05;
              const rr = (R_CORE + R) / 2;
              return (
                <circle
                  key={i}
                  cx={rr * Math.cos(a)}
                  cy={rr * Math.sin(a)}
                  r={52}
                  fill="none"
                  stroke="#ffe0b0"
                  strokeWidth={3}
                  strokeDasharray="30 18"
                  transform={`rotate(${(t * 20 * (i % 2 ? 1 : -1)) % 360} ${rr * Math.cos(a)} ${rr * Math.sin(a)})`}
                />
              );
            })}
          </g>
          {/* Surface: thin ocean and land rim */}
          <circle cx={0} cy={0} r={R - 2} fill="none" stroke="#2f8fb0" strokeWidth={5} strokeDasharray="80 30 40 60" />

          {/* Diameter tunnel */}
          <g opacity={diaDim}>
            <rect x={-R - 6} y={-TUN} width={2 * R + 12} height={2 * TUN} fill="#0a1a22" />
            <line x1={-R - 6} y1={-TUN} x2={R + 6} y2={-TUN} stroke={ICE} strokeWidth={2.5} opacity={0.8} />
            <line x1={-R - 6} y1={TUN} x2={R + 6} y2={TUN} stroke={ICE} strokeWidth={2.5} opacity={0.8} />
            {/* Air haze in the air chapter */}
            {airO > 0 && (
              <g opacity={airO}>
                <rect x={-R} y={-TUN + 2} width={2 * R} height={2 * TUN - 4} fill="rgba(140,200,255,0.35)" />
                {new Array(16).fill(0).map((_, i) => (
                  <line
                    key={i}
                    x1={((i * 47 + t * 160) % (2 * R)) - R}
                    y1={-6 + (i % 3) * 6}
                    x2={((i * 47 + t * 160) % (2 * R)) - R + 22}
                    y2={-6 + (i % 3) * 6}
                    stroke="#e6f6ff"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                ))}
              </g>
            )}
          </g>

          {/* --- Chapter 1: shell picture --- */}
          {shellO > 0 && (
            <g>
              <circle cx={0} cy={0} r={Math.abs(FX)} fill="rgba(79,227,193,0.22)" stroke={TEAL} strokeWidth={4} opacity={shellO} />
              {aboveO > 0 && (
                <g opacity={aboveO}>
                  <circle
                    cx={0}
                    cy={0}
                    r={(Math.abs(FX) + R) / 2}
                    fill="none"
                    stroke="rgba(20,30,40,0.55)"
                    strokeWidth={R - Math.abs(FX)}
                  />
                  {[-2.4, -1.6, -0.9, 0.9, 1.6, 2.4].map((a, i) => {
                    const len = 44 + 10 * Math.sin(t * 3 + i);
                    return (
                      <Arrow
                        key={i}
                        x1={FX + 90 * Math.cos(a + Math.PI)}
                        y1={90 * Math.sin(a + Math.PI)}
                        x2={FX + (90 - len) * Math.cos(a + Math.PI)}
                        y2={(90 - len) * Math.sin(a + Math.PI)}
                        color="#cfd8de"
                        w={4}
                      />
                    );
                  })}
                  <Label x={-R * 0.84} y={-R * 0.62} o={aboveO} color="#e6eef2">
                    ROCK ABOVE: CANCELS
                  </Label>
                </g>
              )}
              <Label x={0} y={R_CORE * 0.15 + 70} o={shellO} color={TEAL}>
                ONLY THIS PULLS
              </Label>
            </g>
          )}
          {coreHi > 0 && (
            <Label x={0} y={-R_CORE - 34} o={coreHi} color="#fff">
              IRON CORE · DENSEST
            </Label>
          )}

          {/* --- Chapter 3: slanted tunnels --- */}
          {in3 && (
            <g>
              {/* London to Paris tunnel */}
              <g opacity={lonDraw * (1 - tinyO)}>
                <line
                  x1={LONDON.p1.x}
                  y1={LONDON.p1.y}
                  x2={lerp(LONDON.p1.x, LONDON.p2.x, lonDraw)}
                  y2={lerp(LONDON.p1.y, LONDON.p2.y, lonDraw)}
                  stroke="#0a1a22"
                  strokeWidth={20}
                />
                <line
                  x1={LONDON.p1.x}
                  y1={LONDON.p1.y}
                  x2={lerp(LONDON.p1.x, LONDON.p2.x, lonDraw)}
                  y2={lerp(LONDON.p1.y, LONDON.p2.y, lonDraw)}
                  stroke={ICE}
                  strokeWidth={2}
                  strokeDasharray="10 6"
                />
                <Label x={LONDON.p1.x - 30} y={LONDON.p1.y - 34} o={lonDraw * (1 - allO * 0.7)} size={30} anchor="end">
                  LONDON
                </Label>
                <Label x={LONDON.p2.x + 30} y={LONDON.p2.y - 34} o={lonDraw * (1 - allO * 0.7)} size={30} anchor="start">
                  PARIS
                </Label>
              </g>
              {/* Ball on the slanted tunnel with its gravity split in two */}
              {t < T_SAME &&
                (() => {
                  const p = along(LONDON, lonBallK);
                  const d = Math.hypot(p.x, p.y);
                  const gx = (-p.x / d) * 120;
                  const gy = (-p.y / d) * 120;
                  const ux = (LONDON.p2.x - LONDON.p1.x) / Math.hypot(LONDON.p2.x - LONDON.p1.x, LONDON.p2.y - LONDON.p1.y);
                  const uy = (LONDON.p2.y - LONDON.p1.y) / Math.hypot(LONDON.p2.x - LONDON.p1.x, LONDON.p2.y - LONDON.p1.y);
                  const a = gx * ux + gy * uy;
                  return (
                    <g opacity={lonDraw}>
                      <Arrow x1={p.x} y1={p.y} x2={p.x + gx} y2={p.y + gy} color="#ffffff" w={5} o={decomp} />
                      <Arrow x1={p.x} y1={p.y} x2={p.x + gx - a * ux} y2={p.y + gy - a * uy} color="#8a99a3" w={5} o={decomp} />
                      <Arrow x1={p.x} y1={p.y} x2={p.x + a * ux} y2={p.y + a * uy} color={TEAL} w={7} o={decomp} />
                      <Label x={p.x + gx - a * ux - 10} y={p.y + gy - a * uy + 34} o={decomp} size={28} color="#cbd5db" anchor="end">
                        INTO THE WALL
                      </Label>
                      <Label x={p.x + a * ux + 16} y={p.y + a * uy + 30} o={decomp} size={28} color={TEAL} anchor="start">
                        PULLS YOU ALONG
                      </Label>
                      <Capsule x={p.x} y={p.y} color={AMBER} t={t} r={9} />
                    </g>
                  );
                })()}
              {/* All tunnels race together (perfect planet) */}
              {allO > 0 &&
                CHORDS.map((c, i) => {
                  const p = along(c, allK);
                  return (
                    <g key={i} opacity={allO}>
                      {i !== 0 && i !== 3 && <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#0a1a22" strokeWidth={20} />}
                      <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke={ICE} strokeWidth={2} strokeDasharray="10 6" />
                      <Capsule x={p.x} y={p.y} color={[AMBER, TEAL, "#ff8fb1", "#ffe66b"][i]} t={t} r={9} />
                    </g>
                  );
                })}
              {/* Real Earth: London-Paris against straight through */}
              {lonRaceO > 0 &&
                (() => {
                  const pl = along(LONDON, lonK);
                  const pd = along(CHORDS[0], diaK);
                  return (
                    <g opacity={lonRaceO}>
                      <Capsule x={pd.x} y={pd.y} color={TEAL} t={t} r={10} />
                      <Capsule x={pl.x} y={pl.y} color={AMBER} t={t} r={10} />
                      <Label x={R + 30} y={60} o={ramp(t, T_LON + 0.3 + (E("london") - T_LON - 0.6) * (REAL_FALL_S / UNI_FALL_S), 0.4)} color={TEAL} anchor="start" size={30}>
                        ARRIVED
                      </Label>
                    </g>
                  );
                })()}
            </g>
          )}

          {/* --- Chapter 5: chords swinging to the same beat --- */}
          {beatO > 0 &&
            CHORDS.slice(1).map((c, i) => {
              const p = along(c, (1 - Math.cos(Math.max(0, ph))) / 2);
              return (
                <g key={i} opacity={beatO}>
                  <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#0a1a22" strokeWidth={18} />
                  <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke={ICE} strokeWidth={2} strokeDasharray="10 6" />
                  <Capsule x={p.x} y={p.y} color={[TEAL, "#ff8fb1", "#ffe66b"][i]} t={t} r={8} />
                </g>
              );
            })}


          {/* Chapter 3: tiny tunnel under one city */}
          {tinyO > 0 &&
            (() => {
              const c = chord(-97, -83);
              const p = along(c, tinyK);
              return (
                <g opacity={tinyO}>
                  <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#0a1a22" strokeWidth={9} />
                  <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke={ICE} strokeWidth={1.5} strokeDasharray="5 3" />
                  <Capsule x={p.x} y={p.y} color={AMBER} t={t} r={5} />
                  {[-1, 0, 1, 2].map((i) => (
                    <rect key={i} x={-34 + i * 16} y={-R - 6 - (10 + (i % 2) * 8)} width={12} height={10 + (i % 2) * 8} fill="#9fb3bf" />
                  ))}
                  <Label x={0} y={-R - 52} o={tinyO} size={20} color="#fff">UNDER ONE CITY</Label>
                </g>
              );
            })()}
          {/* Chapter 3: where the extra pull lives */}
          {why3O > 0 && (
            <g opacity={why3O}>
              <circle cx={0} cy={0} r={R_CORE + 30} fill="none" stroke={AMBER} strokeWidth={60} opacity={0.28 + 0.1 * Math.sin(t * 4)} />
              <line x1={-R} y1={0} x2={R} y2={0} stroke={TEAL} strokeWidth={6} opacity={long3} />
              <Label x={0} y={R_CORE + 96} o={why3O} color={AMBER} size={30}>EXTRA PULL</Label>
              <Label x={0} y={-R * 0.6} o={why3O * (1 - long3)} color={ICE} size={30}>OUTER ROCK ONLY</Label>
              <Label x={0} y={-40} o={long3} color={TEAL} size={30}>DIVES DEEP</Label>
            </g>
          )}
          {/* Chapter 4: liquid outer core, crushing pressure, failing walls */}
          {liqO > 0 && (
            <g opacity={liqO}>
              {new Array(10).fill(0).map((_, i) => {
                const a0 = (i / 10) * 360 + t * 40;
                const rr = R_INNER + 30 + (i % 3) * 30;
                return (
                  <circle key={i} cx={0} cy={0} r={rr} fill="none" stroke="#fff6d8" strokeWidth={4} strokeDasharray={`${40 + (i % 4) * 12} ${rr * 2}`} transform={`rotate(${a0})`} opacity={0.75} />
                );
              })}
              {new Array(12).fill(0).map((_, i) => {
                const a = (i / 12) * Math.PI * 2 + 0.26;
                if (Math.sin(a) > 0.55) return null; // keep the caption band clear
                const pulse = 16 * Math.sin(t * 5 + i);
                return (
                  <Arrow key={i} x1={(R + 110 + pulse) * Math.cos(a)} y1={(R + 110 + pulse) * Math.sin(a)} x2={(R + 30) * Math.cos(a)} y2={(R + 30) * Math.sin(a)} color={RED} w={6} />
                );
              })}
              <Label x={0} y={R_INNER + 130} o={liqO} color="#fff" size={34}>LIQUID METAL</Label>
              {crack > 0 &&
                new Array(9).fill(0).map((_, i) => (
                  <polygon
                    key={i}
                    points={`${-R_CORE + i * 40},${-TUN} ${-R_CORE + i * 40 + 20},${-TUN + 14 * crack} ${-R_CORE + i * 40 + 40},${-TUN}`}
                    fill="#ffd36b"
                    opacity={crack}
                  />
                ))}
            </g>
          )}
          {/* Chapter 5: the satellite's pull and its sideways part */}
          {pullO > 0 &&
            (() => {
              const d = Math.hypot(satX, satY);
              const gx = (-satX / d) * 120;
              const gy = (-satY / d) * 120;
              return (
                <g opacity={pullO}>
                  <Arrow x1={satX} y1={satY} x2={satX + gx} y2={satY + gy} color="#ffffff" w={5} />
                  <Arrow x1={satX} y1={satY} x2={satX + gx} y2={satY} color={TEAL} w={7} />
                  <Arrow x1={FX} y1={34} x2={FX + gx} y2={34} color={TEAL} w={7} />
                  <Label x={0} y={-R_ORB - 52} o={pullO} color={TEAL} size={34}>SAME SIDEWAYS PULL</Label>
                </g>
              );
            })()}
          {/* Kola: where the deepest hole is, on the surface */}
          {kolaO > 0 && (
            <g opacity={kolaO}>
              <circle cx={0} cy={-R} r={16 + 4 * Math.sin(t * 5)} fill="none" stroke={RED} strokeWidth={5} />
              <line x1={14} y1={-R - 10} x2={R * 1.25} y2={-R + 40} stroke={RED} strokeWidth={3} strokeDasharray="8 8" />
            </g>
          )}

          {/* Gravity arrow on the faller */}
          <Arrow
            x1={FX}
            y1={FY}
            x2={FX + (fx < 0 ? 1 : -1) * gLen}
            y2={FY}
            color={TEAL}
            w={7}
            o={gArrowO * mainO * (Math.abs(fx) > 0.02 ? 1 : 0)}
          />
          {/* Perfect-planet ghost faller */}
          <Capsule x={GX} y={0} color={TEAL} o={ghostO * 0.85} t={t} r={10} />
          {/* Main faller (the viewer) */}
          {!in3 && <Capsule x={FX} y={FY} color={AMBER} o={mainO} t={t} />}
          {/* Entry splash */}
          {t >= T_FELL && t < T_FELL + 0.8 && (
            <circle
              cx={-R}
              cy={0}
              r={20 + 120 * (t - T_FELL)}
              fill="none"
              stroke="#fff"
              strokeWidth={5}
              opacity={1 - (t - T_FELL) / 0.8}
            />
          )}

          {/* Labels in the world */}
          <Label x={GX} y={-48} o={ghostO * (in1 ? 0 : 1) * (in2 ? 1 - win(t, T_BEHIND, CH3) : 1)} color={TEAL} size={30}>
            PERFECT PLANET
          </Label>
          <Label x={FX} y={52} o={(inOpen ? ramp(t, T_PERFECT, 0.5) * (1 - ramp(t, T_PROMISE, 0.5)) : 0) + (in2 ? hud2 * (1 - floatO) : 0)} color={AMBER} size={30}>
            YOU · REAL EARTH
          </Label>
          <Label x={GX} y={-56} o={in2 ? win(t, T_BEHIND, CH3) : 0} color={TEAL} size={34}>
            STILL CLIMBING
          </Label>
          <Label x={0} y={-110} o={zeroTag} color="#fff" size={38}>
            GRAVITY ZERO
          </Label>
          {uphill > 0 && (
            <g>
              <Arrow x1={FX} y1={FY + 60} x2={FX - 90} y2={FY + 60} color={RED} w={7} o={uphill} />
              <Label x={FX - 45} y={FY + 104} o={uphill} color={RED} size={30}>
                UPHILL
              </Label>
            </g>
          )}
          <Label x={-R * 0.25} y={R * 0.22} o={heatO} color="#fff" size={40}>
            ≈ 6,000 °C
          </Label>

          {/* Satellite and its shadow */}
          {satO > 0 && (
            <g opacity={satO * (in5 ? 1 : 0)}>
              {shadowO > 0 && (
                <line x1={satX} y1={satY} x2={FX} y2={0} stroke={ICE} strokeWidth={3} strokeDasharray="4 10" opacity={shadowO} />
              )}
              <g transform={`translate(${satX} ${satY}) rotate(${(satA * 180) / Math.PI + 90})`}>
                <rect x={-26} y={-6} width={18} height={12} fill="#7ec8ff" stroke="#fff" strokeWidth={1.5} />
                <rect x={8} y={-6} width={18} height={12} fill="#7ec8ff" stroke="#fff" strokeWidth={1.5} />
                <rect x={-8} y={-9} width={16} height={18} rx={3} fill="#e8eef2" />
              </g>
              <circle cx={satX} cy={satY} r={28} fill="none" stroke={ICE} strokeWidth={2} opacity={0.5 + 0.3 * Math.sin(t * 6)} />
              <Label x={satX} y={satY - 48} o={win(t, T_SAT + 0.3, T_SHADOW + 0.4)} color={ICE} size={30}>
                SATELLITE
              </Label>
            </g>
          )}
          {teaseSat > 0 && (
            <g opacity={teaseSat}>
              {(() => {
                const a = Math.PI + (t - T_SAT_TEASE) * 0.5;
                return <circle cx={R_ORB * Math.cos(a)} cy={R_ORB * Math.sin(a)} r={10} fill={ICE} />;
              })()}
            </g>
          )}
          {teaseLon > 0 && (
            <g opacity={teaseLon}>
              <line x1={LONDON.p1.x} y1={LONDON.p1.y} x2={LONDON.p2.x} y2={LONDON.p2.y} stroke={ICE} strokeWidth={4} strokeDasharray="10 6" />
              <Label x={0} y={LONDON.p1.y - 40} o={teaseLon} size={30} color={ICE}>
                LONDON → PARIS
              </Label>
            </g>
          )}
          {exactHit > 0 && (
            <g>
              <circle cx={FX} cy={0} r={30 + 160 * (1 - exactHit)} fill="none" stroke="#fff" strokeWidth={6} opacity={exactHit} />
              <circle cx={satX} cy={satY} r={30 + 160 * (1 - exactHit)} fill="none" stroke={ICE} strokeWidth={6} opacity={exactHit} />
            </g>
          )}
          <Label x={0} y={-R_ORB - 52} o={sameO} color="#fff" size={38}>
            SAME MOTION
          </Label>
          <Label x={0} y={-90} o={edgeTag} color={ICE} size={40}>
            AN ORBIT, SEEN EDGE ON
          </Label>
          <Label x={0} y={-R_ORB - 52} o={beatO * (1 - neverO)} color={TEAL} size={36}>
            EVERY TUNNEL · SAME BEAT
          </Label>
        </g>
      </svg>

      {/* ================= HUD ================= */}
      {/* Cold open title (frame 0) */}
      {titleO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 150, width: 760, fontFamily: FONT, opacity: titleO }}>
          <div style={{ fontWeight: 500, fontSize: 30, letterSpacing: 8, color: "rgba(200,240,240,0.7)" }}>THOUGHT EXPERIMENT</div>
          <div style={{ fontWeight: 700, fontSize: 72, lineHeight: 1.04, letterSpacing: -2, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
            WHAT IF YOU FELL
            <br />
            <span style={{ color: AMBER }}>THROUGH THE EARTH?</span>
          </div>
        </div>
      )}
      {stopQ > 0 && (
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 560,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 70,
            color: "#fff",
            opacity: stopQ,
            transform: `scale(${0.9 + 0.1 * ramp(t, T_STOPQ, 0.3)})`,
            transformOrigin: "left center",
            textShadow: "0 6px 30px rgba(0,0,0,0.9)",
          }}
        >
          WHERE DO YOU <span style={{ color: AMBER }}>STOP?</span>
        </div>
      )}
      {clocksO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 150 + 30 * (1 - clocksO) }}>
          <Clock label="REAL EARTH" sec={(openSec / 900) * 900} target={REAL_FALL_S} color={AMBER} o={clocksO} done={false} big />
          <Clock label="PERFECT PLANET" sec={openSec} target={UNI_FALL_S} color={TEAL} o={clocksO * ramp(t, T_PERFECT, 0.5)} done={false} />
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 56,
              color: INK,
              background: AMBER,
              display: "inline-block",
              padding: "6px 22px",
              borderRadius: 14,
              opacity: soonerBadge,
              transform: `scale(${1 + 0.05 * Math.sin(t * 8)})`,
              transformOrigin: "left center",
            }}
          >
            4 MINUTES SOONER?
          </div>
        </div>
      )}
      {/* Promise: two things we'll see */}
      {inOpen && t > T_PROMISE && (
        <div style={{ position: "absolute", left: 64, top: 180, fontFamily: FONT, width: 720 }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 6, color: "rgba(255,255,255,0.7)", opacity: ramp(t, T_PROMISE + 0.3, 0.5) }}>
            BY THE END
          </div>
          <div style={{ fontWeight: 700, fontSize: 50, lineHeight: 1.08, color: ICE, opacity: ramp(t, T_SAT_TEASE - 0.2, 0.5) }}>
            YOUR FALL = A SATELLITE
          </div>
          <div style={{ fontWeight: 700, fontSize: 50, lineHeight: 1.08, color: AMBER, opacity: ramp(t, T_LONDON_TEASE - 0.2, 0.5), marginTop: 16 }}>
            LONDON → PARIS
            <br />
            &gt; WHOLE PLANET
          </div>
        </div>
      )}

      <ChapterCard t={t} n={1} name="GRAVITY" q="AS YOU FALL, DOES GRAVITY GET STRONGER OR WEAKER?" start={CH1} end={CH2} right />
      <ChapterCard t={t} n={2} name="THE RIDE" q="WHAT DOES THE RIDE FEEL LIKE?" start={CH2} end={CH3} />
      <ChapterCard t={t} n={3} name="SLANTED TUNNELS" q="DOES IT HAVE TO GO THROUGH THE MIDDLE?" start={CH3} end={CH4} />
      <ChapterCard t={t} n={4} name="THE CATCH" q="WHY HASN'T ANYONE BUILT ONE?" start={CH4} end={CH5} />
      <ChapterCard t={t} n={5} name="THE SECRET" q="REMEMBER THAT TOP SPEED?" start={CH5} end={T_PAY} />

      {/* Chapter 1: gravity against depth */}
      {graphO > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: graphO }}>
          {(() => {
            const gx0 = 1060;
            const gx1 = 1820;
            const gy0 = 800; // zero gravity
            const gy1 = 380; // 1 g
            const X = (depth: number) => gx0 + (gx1 - gx0) * depth;
            const Y = (g: number) => gy0 - (gy0 - gy1) * g;
            const N = 60;
            const uni = new Array(N + 1).fill(0).map((_, i) => i / N).filter((d) => d <= uniDraw + 1e-6);
            const real = new Array(N * 2 + 1).fill(0).map((_, i) => i / (N * 2)).filter((d) => d <= realDraw + 1e-6);
            const path = (pts: number[], f: (r: number) => number) =>
              pts.map((d, i) => `${i ? "L" : "M"} ${X(d)} ${Y(f(1 - d))}`).join(" ");
            const md = Math.max(0, Math.min(1, 1 - Math.abs(fx)));
            return (
              <g>
                <rect x={gx0 - 90} y={gy1 - 150} width={gx1 - gx0 + 130} height={gy0 - gy1 + 230} rx={18} fill="rgba(4,14,20,0.72)" stroke="rgba(150,230,230,0.25)" />
                <line x1={gx0} y1={gy0} x2={gx1} y2={gy0} stroke="#fff" strokeWidth={3} />
                <line x1={gx0} y1={gy0} x2={gx0} y2={gy1 - 90} stroke="#fff" strokeWidth={3} />
                <line x1={gx0} y1={gy1} x2={gx1} y2={gy1} stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeDasharray="6 8" />
                <line x1={X(0.454)} y1={gy0} x2={X(0.454)} y2={gy1 - 90} stroke="rgba(255,190,90,0.45)" strokeWidth={2} strokeDasharray="6 8" opacity={ramp(t, T_CORE, 0.5)} />
                <Label x={gx0 - 16} y={gy1 - 110} o={1} anchor="start" size={34}>GRAVITY</Label>
                <Label x={gx0 - 30} y={gy1} o={1} anchor="end" size={30} color="rgba(255,255,255,0.75)">1 G</Label>
                <Label x={gx0} y={gy0 + 40} o={1} anchor="start" size={30} color="rgba(255,255,255,0.75)">SURFACE</Label>
                <Label x={gx1} y={gy0 + 40} o={1} anchor="end" size={30} color="rgba(255,255,255,0.75)">CENTRE</Label>
                <Label x={X(0.454)} y={gy0 + 40} o={ramp(t, T_CORE, 0.5)} size={30} color={AMBER}>CORE EDGE</Label>
                {uni.length > 1 && <path d={path(uni, gUni)} stroke={TEAL} strokeWidth={6} fill="none" strokeDasharray="14 8" />}
                <Label x={X(0.5)} y={Y(0.5) + 44} o={ramp(t, T_UNI + 1, 0.5)} color={TEAL} size={30} anchor="end">PERFECT PLANET</Label>
                {real.length > 1 && <path d={path(real, gReal)} stroke={AMBER} strokeWidth={8} fill="none" strokeLinecap="round" />}
                <Label x={X(0.2)} y={Y(1.088) - 40} o={strongerTag} color={AMBER} size={34}>STRONGER!</Label>
                <g opacity={peakTag}>
                  <circle cx={X(0.454)} cy={Y(1.088)} r={12 + 3 * Math.sin(t * 6)} fill={AMBER} />
                  <Label x={X(0.454) + 24} y={Y(1.088) - 40} o={peakTag} color="#fff" size={34} anchor="start">PEAK · ~1.09 G</Label>
                </g>
                {/* Marker riding the curve at the faller's depth */}
                {t >= T_STRONG && <circle cx={X(md)} cy={Y(gReal(1 - md))} r={11} fill="#fff" stroke={AMBER} strokeWidth={4} />}
                {t >= T_UNI && t < T_STRONG && (
                  <circle cx={X(Math.max(0, Math.min(1, 1 - Math.abs(ghostX))))} cy={Y(gUni(ghostX))} r={11} fill="#fff" stroke={TEAL} strokeWidth={4} />
                )}
              </g>
            );
          })()}
        </svg>
      )}
      {clue > 0 && (
        <div style={{ position: "absolute", left: 64, top: 60, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: INK, background: AMBER, padding: "6px 22px", borderRadius: 14, opacity: clue }}>
          CLUE 1 · EXTRA PULL DEEP DOWN
        </div>
      )}

      {/* Chapter 2: race clocks, weightless inset, speed bar */}
      {hud2 > 0 && (
        <div style={{ position: "absolute", left: 64, top: 150 + 20 * (1 - hud2), opacity: hud2 * (1 - floatO) }}>
          <Clock label="YOU · REAL EARTH" sec={sim2} target={REAL_FALL_S} color={AMBER} o={1} done={realDone} big />
          <Clock label="PERFECT PLANET" sec={sim2} target={UNI_FALL_S} color={TEAL} o={1} done={uniDone} />
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 56,
              color: INK,
              background: AMBER,
              display: "inline-block",
              padding: "6px 22px",
              borderRadius: 14,
              opacity: fourMin,
              transform: `scale(${0.8 + 0.2 * fourMin})`,
              transformOrigin: "left center",
            }}
          >
            4 MINUTES SOONER
          </div>
        </div>
      )}
      {floatO > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: floatO }}>
          {(() => {
            const cx = 370;
            const cy = 470;
            const rot = t * 25;
            return (
              <g>
                <circle cx={cx} cy={cy} r={250} fill="rgba(6,20,28,0.9)" stroke={AMBER} strokeWidth={5} />
                <g transform={`translate(${cx} ${cy + 10 * Math.sin(t * 1.3)}) rotate(${rot})`}>
                  <circle cx={0} cy={-62} r={24} fill="none" stroke="#fff" strokeWidth={7} />
                  <line x1={0} y1={-38} x2={0} y2={30} stroke="#fff" strokeWidth={8} strokeLinecap="round" />
                  <line x1={0} y1={-20} x2={-48} y2={-40 + 10 * Math.sin(t * 2)} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
                  <line x1={0} y1={-20} x2={50} y2={-30 - 10 * Math.sin(t * 2)} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
                  <line x1={0} y1={30} x2={-34} y2={82} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
                  <line x1={0} y1={30} x2={38} y2={78} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
                </g>
                {[0, 1, 2, 3].map((i) => (
                  <rect
                    key={i}
                    x={cx - 150 + i * 90 + 14 * Math.sin(t + i)}
                    y={cy + 130 - 30 * Math.sin(t * 0.8 + i * 1.7)}
                    width={26}
                    height={18}
                    rx={4}
                    fill={[TEAL, AMBER, ICE, "#ff8fb1"][i]}
                    transform={`rotate(${t * 40 * (i % 2 ? 1 : -1)} ${cx - 137 + i * 90} ${cy + 139})`}
                  />
                ))}
                <Label x={cx} y={cy - 290} o={1} color={AMBER} size={44}>WEIGHTLESS</Label>
              </g>
            );
          })()}
        </svg>
      )}
      {speedO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 640, width: 640, fontFamily: FONT, opacity: speedO }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: TEAL }}>SPEED · PERFECT PLANET</div>
          <div style={{ position: "relative", height: 40, borderRadius: 20, background: "rgba(255,255,255,0.12)", marginTop: 10 }}>
            <div style={{ width: `${88 * uniSpeed(sim2)}%`, height: 40, borderRadius: 20, background: `linear-gradient(90deg, ${TEAL}, #b6fff0)` }} />
            <div style={{ position: "absolute", left: "88%", top: -14, width: 5, height: 68, background: "#fff", opacity: 0.4 + 0.6 * orbMark }} />
          </div>
          <div style={{ marginLeft: "50%", marginTop: 10, fontWeight: 700, fontSize: 34, color: "#fff", opacity: orbMark, whiteSpace: "nowrap" }}>
            ORBITAL SPEED ≈ 8 KM/S
          </div>
        </div>
      )}

      {in3 && (
        <div style={{ position: "absolute", left: 64, top: 800, fontFamily: FONT, fontWeight: 500, fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.7)", opacity: lonDraw }}>
          SLANTED TUNNELS NOT TO SCALE
        </div>
      )}
      {/* Chapter 3: cancel bars and verdicts */}
      {cancelO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 230, width: 640, fontFamily: FONT, opacity: cancelO }}>
          {[
            ["PULL ALONG THE TUNNEL", TEAL, 1 - 0.55 * ramp(t, T_CANCEL, 1.0)],
            ["DISTANCE TO COVER", ICE, 1 - 0.55 * ramp(t, T_CANCEL + 0.4, 1.0)],
          ].map(([name, c, w]) => (
            <div key={name as string} style={{ marginBottom: 26 }}>
              <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 3, color: c as string }}>{name as string}</div>
              <div style={{ width: `${100 * (w as number)}%`, height: 34, borderRadius: 17, background: c as string, marginTop: 8 }} />
            </div>
          ))}
          <div style={{ fontWeight: 700, fontSize: 64, color: "#fff", opacity: cancelEq }}>= SAME TIME</div>
        </div>
      )}
      {Math.max(allO, tinyO) > 0 && (
        <div style={{ position: "absolute", left: 64, top: 240, fontFamily: FONT, opacity: Math.max(allO, tinyO) }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: TEAL }}>EVERY TUNNEL · PERFECT PLANET</div>
          <div style={{ fontWeight: 700, fontSize: 130, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: -3 }}>
            {mmss((t >= T_TINY ? tinyK : allK) * UNI_FALL_S)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            {[AMBER, TEAL, "#ff8fb1", "#ffe66b"].map((c) => (
              <div key={c} style={{ width: 46, height: 46, borderRadius: 23, background: c, opacity: (t >= T_TINY ? tinyK : allK) >= 0.999 ? 1 : 0.4 }} />
            ))}
          </div>
        </div>
      )}
      {lonRaceO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 230, width: 700, fontFamily: FONT, opacity: lonRaceO }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: "rgba(255,255,255,0.75)" }}>REAL EARTH</div>
          {[
            ["THROUGH THE CENTRE", TEAL, 38, REAL_FALL_S / UNI_FALL_S],
            ["LONDON → PARIS", AMBER, 42, 1],
          ].map(([name, c, min, frac]) => (
            <div key={name as string} style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 38, color: c as string }}>
                {name as string} · ≈ {min as number} MIN
              </div>
              <div style={{ width: `${88 * Math.min(1, Math.max(0, lonRaceK) / (frac as number)) * (frac as number)}%`, height: 34, borderRadius: 17, background: c as string, marginTop: 8 }} />
            </div>
          ))}
          <div style={{ fontWeight: 700, fontSize: 52, lineHeight: 1.1, color: "#fff", marginTop: 30, opacity: lonVerdict }}>
            THE SHORT TRIP
            <br />
            <span style={{ color: AMBER }}>TAKES LONGER</span>
          </div>
        </div>
      )}

      {/* Chapter 4: air trace, thermometer, Kola depth bar, stamp */}
      {airO > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: airO }}>
          {(() => {
            const x0 = 80;
            const x1 = 700;
            const y0 = 470;
            const A = 150;
            const k = Math.max(0, t - T_AIR);
            const span = Math.max(1, E("air") - T_AIR);
            const pts = [] as string[];
            for (let i = 0; i <= 160; i++) {
              const kk = (i / 160) * span;
              if (kk > k) break;
              const v = -Math.exp(-0.42 * kk) * Math.cos(Math.PI * kk * 0.75);
              pts.push(`${i ? "L" : "M"} ${x0 + ((x1 - x0) * kk) / span} ${y0 + A * v}`);
            }
            return (
              <g>
                <rect x={x0 - 30} y={y0 - A - 110} width={x1 - x0 + 60} height={2 * A + 190} rx={18} fill="rgba(4,14,20,0.72)" />
                <Label x={x0} y={y0 - A - 70} o={1} anchor="start" color={ICE} size={36}>WITH AIR IN THE TUNNEL</Label>
                <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="6 8" />
                <Label x={x1} y={y0 - 26} o={1} anchor="end" size={28} color="rgba(255,255,255,0.7)">CENTRE</Label>
                <path d={pts.join(" ")} stroke={ICE} strokeWidth={6} fill="none" />
                <Label x={(x0 + x1) / 2} y={y0 + A + 46} o={ramp(t, W("air", "until"), 0.5)} color="#fff" size={36}>STUCK AT THE CENTRE</Label>
              </g>
            );
          })()}
        </svg>
      )}
      {heatO > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: heatO }}>
          {(() => {
            const x = 300;
            const yTop = 230;
            const yBot = 780;
            const H = yBot - yTop;
            const sunY = yBot - H * (5500 / 6500);
            const fillY = yBot - H * (6000 / 6500) * thermo;
            return (
              <g>
                <rect x={x - 34} y={yTop} width={68} height={H} rx={34} fill="rgba(255,255,255,0.1)" stroke="#fff" strokeWidth={3} />
                <rect x={x - 22} y={fillY} width={44} height={yBot - fillY} rx={22} style={{ fill: thermo > 0.85 ? "#fff3c2" : "#ff8a3c" }} />
                <circle cx={x} cy={yBot + 30} r={52} fill={thermo > 0.85 ? "#fff3c2" : "#ff8a3c"} />
                <line x1={x - 60} y1={sunY} x2={x + 60} y2={sunY} stroke={AMBER} strokeWidth={4} />
                <Label x={x + 80} y={sunY} o={ramp(t, W("heat", "roughly"), 0.5)} color={AMBER} anchor="start" size={34}>SUN&apos;S SURFACE</Label>
                <Label x={x + 80} y={fillY} o={thermo} color="#fff" anchor="start" size={40}>
                  {`${Math.round((6000 * thermo) / 100) * 100} °C`}
                </Label>
                <Label x={x} y={yTop - 40} o={1} color="#fff" size={34}>NEAR THE CENTRE</Label>
              </g>
            );
          })()}
        </svg>
      )}
      {kolaO > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", opacity: kolaO }}>
          {(() => {
            const bx = 1180;
            const top = 200;
            const bot = 820;
            const zx = 1330;
            const zy = 240;
            const zw = 500;
            const zh = 420;
            const holeDepth = zh * 0.62;
            const drill = ramp(t, T_KOLA + 0.8, 1.6);
            return (
              <g>
                {/* Full depth bar: surface to centre */}
                <rect x={bx - 18} y={top} width={36} height={bot - top} rx={6} fill="#c25a2c" stroke="#fff" strokeWidth={2} />
                <rect x={bx - 18} y={top} width={36} height={Math.max(2, (bot - top) * 0.0019)} fill={RED} />
                <Label x={bx} y={top - 34} o={1} size={30}>SURFACE</Label>
                <Label x={bx} y={bot + 36} o={1} size={30}>CENTRE</Label>
                <line x1={bx + 18} y1={top} x2={zx} y2={zy} stroke={RED} strokeWidth={2} strokeDasharray="6 6" />
                <line x1={bx + 18} y1={top + 4} x2={zx} y2={zy + zh} stroke={RED} strokeWidth={2} strokeDasharray="6 6" />
                {/* Zoom box: the top sliver */}
                <rect x={zx} y={zy} width={zw} height={zh} rx={14} fill="#3d2d22" stroke={RED} strokeWidth={4} />
                <rect x={zx} y={zy} width={zw} height={40} fill="#2f8fb0" opacity={0.0} />
                {[0.25, 0.5, 0.75].map((k) => (
                  <line key={k} x1={zx} y1={zy + zh * k} x2={zx + zw} y2={zy + zh * k + 8 * Math.sin(k * 9)} stroke="rgba(255,220,180,0.18)" strokeWidth={3} />
                ))}
                <rect x={zx + zw / 2 - 7} y={zy} width={14} height={holeDepth * drill} fill="#0a0a0a" />
                <rect x={zx + zw / 2 - 16} y={zy - 30} width={32} height={30} fill="#9aa5ad" />
                <Label x={zx + zw / 2 + 30} y={zy + holeDepth * drill} o={drill} anchor="start" color="#fff" size={34}>12 KM</Label>
                <Label x={zx + zw / 2} y={zy + zh - 40} o={ovenO} color={AMBER} size={34}>≈ 180 °C · OVEN-HOT</Label>
                <Label x={zx + zw / 2} y={zy - 64} o={1} color={RED} size={34}>DEEPEST HOLE EVER</Label>
                <Label x={zx + zw / 2} y={zy + zh + 70} o={pctO} color="#fff" size={44}>0.19% OF THE WAY</Label>
              </g>
            );
          })()}
        </svg>
      )}
      {stamp > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 120,
            textAlign: "center",
            opacity: stamp,
            transform: `scale(${1.3 - 0.3 * Math.min(1, stampS)}) rotate(-4deg)`,
          }}
        >
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 66, letterSpacing: 8, color: AMBER, border: `6px solid ${AMBER}`, padding: "8px 30px", borderRadius: 12, background: "rgba(4,12,16,0.7)" }}>
            THOUGHT EXPERIMENT
          </span>
        </div>
      )}

      {/* Chapter 5: lap clock */}
      {lapO > 0 && (
        <div style={{ position: "absolute", left: 64, top: 250, fontFamily: FONT, opacity: lapO }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: ICE }}>ONE LAP · PERFECT PLANET</div>
          <div style={{ fontWeight: 700, fontSize: 120, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: -3 }}>
            {mmss(Math.min(lapSec, 84 * 60))}
          </div>
          <div style={{ fontWeight: 700, fontSize: 46, color: TEAL, opacity: ramp(t, T_HALF, 0.4) }}>HALF A LAP = 42:00</div>
        </div>
      )}
      {neverO > 0 && (
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 300,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 110,
            lineHeight: 1.0,
            letterSpacing: -2,
            color: "#fff",
            opacity: neverO,
            transform: `scale(${0.85 + 0.15 * Math.min(1, neverS)})`,
            transformOrigin: "left center",
            textShadow: "0 6px 30px rgba(0,0,0,0.9)",
          }}
        >
          YOU
          <br />
          <span style={{ color: AMBER }}>NEVER STOP</span>
        </div>
      )}
      {t >= T_PAY && t < T_DONT && (
        <div style={{ position: "absolute", left: 64, top: 300, fontFamily: FONT, fontWeight: 700, fontSize: 84, color: "#fff", opacity: ramp(t, T_PAY, 0.4) }}>
          SO WHERE DO
          <br />
          YOU <span style={{ color: AMBER }}>STOP?</span>
        </div>
      )}

      {/* Vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <SeriesOutro name="What If" next={4} accent={AMBER} seconds={3} top={790} />
      <Captions lines={timeline.lines} top={880} accent={AMBER} />
    </AbsoluteFill>
  );
};
