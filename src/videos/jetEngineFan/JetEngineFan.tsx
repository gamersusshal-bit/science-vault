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
import { Captions } from "../../primitives/Captions";
import { useTimeline } from "../../primitives/timeline";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/jet-engine-fan/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Story beats (all from the narration timeline) ----------
const T_PUSH = wordStart("hook", "push"); // ignition
const T_FIRE = wordStart("hook", "fire");
const RATIO = line("ratio");
const T_AIR = wordStart("ratio", "air");
const T_THROUGH = wordStart("ratio", "through");
const T_AROUND = wordStart("ratio", "around");
const T_TEN = wordStart("ratio", "ten");
const REMOVE = line("remove");
const T_RFAN = wordStart("remove", "fan");
const T_TURBOJET = wordStart("remove", "turbojet");
const T_LOUD = wordStart("remove", "loud");
const T_THIRSTY = wordStart("remove", "thirsty");
const CORE = line("core");
const T_SQUEEZE = wordStart("core", "squeezes");
const T_BURNS = wordStart("core", "burns");
const T_SEVENTEEN = wordStart("core", "seventeen");
const T_DEGREES = wordStart("core", "degrees");
const SHAFT = line("shaft");
const T_HOT = wordStart("shaft", "hot");
const T_TURBINES = wordStart("shaft", "turbines");
const T_SHAFTW = wordStart("shaft", "shaft");
const T_GIANT = wordStart("shaft", "giant");
const T_SFAN = wordStart("shaft", "fan");
const THRUST = line("thrust");
const T_TFAN = wordStart("thrust", "fan");
const T_EIGHTY = wordStart("thrust", "eighty");
const PAYOFF = line("payoff");
const T_PSPINS = wordStart("payoff", "spins");
const T_PFAN = wordStart("payoff", "fan");
const END = timeline.duration;

// ---------- Palette: graphite hangar, ice-blue cold air, orange hot core ----------
const COLD = "#7fe3ff";
const HOT = "#ff8a3d";
const WHITE_HOT = "#fff1c9";
const STEEL = "#6f7a86";
const STEEL_LIGHT = "#aeb8c3";
const STEEL_DARK = "#2b3138";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

// ---------- World geometry: engine axis horizontal, air flows left to right ----------
// World units: x along the axis (0 near the combustor), r = distance from the axis.
const AX = 560; // screen x of world x = 0 (before the camera)
const AY = 870; // screen y of the axis
type P = [number, number];
const pl = (pts: P[], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};

const NAC_IN: P[] = [[-490, 284], [-400, 300], [-200, 300], [170, 252]];
const NAC_OUT: P[] = [[-505, 300], [-470, 334], [-380, 348], [-100, 348], [170, 266]];
const COWL: P[] = [[-315, 110], [-260, 134], [80, 142], [330, 104]];
const CASING: P[] = [[-315, 106], [-60, 80], [100, 82], [330, 100]];
const HUB: P[] = [[-315, 42], [-60, 56], [100, 56], [330, 46]];
const FAN_X = -392;
const FAN_TIP = 296;
const FAN_ROOT = 74;

// Flow lanes (inner wall, outer wall) for the two streams
const BYP_IN: P[] = [[-680, 48], [-480, 62], [-392, 118], [-315, 120], [-260, 141], [80, 149], [330, 112], [440, 106], [1150, 112]];
const BYP_OUT: P[] = [[-680, 330], [-500, 288], [-400, 294], [-200, 294], [170, 246], [1150, 262]];
const CORE_LO: P[] = [[-680, 8], [-480, 14], [-440, 52], [-392, 78], [-315, 48], [-60, 60], [100, 60], [330, 50], [440, 10], [1150, 10]];
const CORE_HI: P[] = [[-680, 42], [-480, 56], [-392, 112], [-315, 102], [-60, 76], [100, 78], [330, 96], [440, 84], [1150, 98]];

/** Polygon for the top (sign -1) or bottom (sign 1) half of a wall between two radius curves. */
const wall = (inner: P[], outer: P[], x0: number, x1: number, sign: number, steps = 24) => {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push(`${x},${sign * pl(outer, x)}`);
  }
  for (let i = steps; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push(`${x},${sign * pl(inner, x)}`);
  }
  return pts.join(" ");
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, f: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = Math.max(0, Math.min(1, f));
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
};

// Compressor squeezes (rows get shorter), turbine expands (rows get taller).
const COMP_ROWS = [-292, -258, -224, -190, -156, -122, -90];
const TURB_ROWS = [120, 152, 186, 220, 256, 292];

// Air parcels: about ten go around the core for every one that goes through it.
const N_BYP = 160;
const N_CORE = 16;
const BYPASS = new Array(N_BYP).fill(0).map((_, i) => ({
  lane: 0.06 + 0.88 * random(`bl-${i}`),
  side: i % 2 === 0 ? -1 : 1,
  ph: random(`bp-${i}`),
  len: 16 + 18 * random(`bn-${i}`),
}));
const COREP = new Array(N_CORE).fill(0).map((_, i) => ({
  lane: 0.2 + 0.6 * random(`cl-${i}`),
  side: i % 2 === 0 ? -1 : 1,
  ph: (Math.floor(i / 2) + 0.5 * random(`cp-${i}`)) / (N_CORE / 2),
}));
// Core parcels move slowly through the compressor and fast out of the turbine.
const CORE_SEG: P[] = [[0, -680], [0.2, -315], [0.52, -60], [0.7, 100], [0.8, 330], [1, 1150]];

const STREAKS = new Array(36).fill(0).map((_, i) => ({
  y: 140 + random(`sy-${i}`) * 1250,
  ph: random(`sx-${i}`),
  len: 60 + 140 * random(`sl-${i}`),
  v: 0.5 + random(`sv-${i}`),
}));

const smooth = (x: number) => {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
};
// Fan removed during the "break it" beat
const goneAt = (t: number) =>
  interpolate(t, [T_RFAN - 0.1, T_RFAN + 0.35, CORE.start - 0.35, CORE.start + 0.25], [0, 1, 1, 0], clamp);
const spoolAt = (t: number) => 0.12 + 0.88 * smooth(t / 1.3);
const fanOmegaAt = (t: number) =>
  spoolAt(t) * (1 - goneAt(t)) * (7 + 3 * interpolate(t, [T_SFAN - 0.2, T_SFAN + 0.3], [0, 1], clamp));

const Tag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; plain?: boolean; children: React.ReactNode }> = ({
  x,
  y,
  color,
  opacity,
  size = 38,
  plain = false,
  children,
}) =>
  opacity <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        left: AX + x,
        top: AY + y,
        transform: "translate(-50%, -50%)",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 4,
        color,
        opacity,
        whiteSpace: "nowrap",
        textShadow: plain ? "none" : "0 2px 12px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)",
      }}
    >
      {children}
    </div>
  );

const Hud: React.FC<{ top: number; opacity: number; y?: number; children: React.ReactNode }> = ({ top, opacity, y = 0, children }) =>
  opacity <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        top,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        opacity,
        transform: `translateY(${y}px)`,
        textShadow: "0 4px 24px rgba(0,0,0,0.85)",
      }}
    >
      {children}
    </div>
  );

/** A spinning blade row seen side-on: bright stripes sweep across it as it turns. */
const Rotor: React.FC<{ x: number; w: number; r0: number; r1: number; theta: number; blades: number; color: string; glow?: number }> = ({
  x,
  w,
  r0,
  r1,
  theta,
  blades,
  color,
  glow = 0,
}) => {
  const stripes: React.ReactNode[] = [];
  for (let i = 0; i < blades; i++) {
    const phi = theta + (i * 2 * Math.PI) / blades;
    const s = Math.sin(phi);
    if (s <= 0) continue;
    const y = r1 * Math.cos(phi);
    if (Math.abs(y) < r0 + 2) continue;
    const slant = Math.min(16, w * 0.35);
    stripes.push(
      <polygon
        key={i}
        points={`${x - w / 2},${y + slant} ${x + w / 2},${y - slant} ${x + w / 2},${y - slant + 5} ${x - w / 2},${y + slant + 5}`}
        fill={color}
        opacity={0.25 + 0.75 * s}
      />,
    );
  }
  return (
    <g>
      {[-1, 1].map((sg) => (
        <rect
          key={sg}
          x={x - w / 2}
          y={sg < 0 ? -r1 : r0}
          width={w}
          height={r1 - r0}
          rx={Math.min(6, w / 3)}
          fill={STEEL}
          stroke={glow > 0.01 ? color : STEEL_LIGHT}
          strokeWidth={1.5 + 3 * glow}
          opacity={0.92}
        />
      ))}
      {stripes}
    </g>
  );
};

export const JetEngineFan: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 14, stiffness = 170) =>
    Math.min(1.15, spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } }));
  const win = (a: number, b: number, fade = 0.3) => interpolate(t, [a, a + fade, b - fade, b], [0, 1, 1, 0], clamp);

  // ---------- Integrated motion (fan angle, distance travelled by the air) ----------
  let theta = 0;
  let sByp = 0;
  let sCore = 0;
  for (let k = 0; k < frame; k++) {
    const tk = k / fps;
    theta += fanOmegaAt(tk) / fps;
    sByp += spoolAt(tk) / fps;
    sCore += (spoolAt(tk) * (1 + 0.7 * goneAt(tk))) / fps;
  }
  const gone = goneAt(t);
  const spool = spoolAt(t);
  const ignite = interpolate(t, [T_PUSH - 0.05, T_PUSH + 0.25], [0, 1], clamp);
  const igniteFlash = interpolate(t, [T_PUSH - 0.02, T_PUSH + 0.6], [0, 1], clamp);
  const burnBoost = interpolate(t, [T_BURNS - 0.1, T_BURNS + 0.4, SHAFT.start, SHAFT.start + 1], [0, 1, 1, 0.35], clamp);
  const squeeze = win(T_SQUEEZE - 0.1, T_BURNS + 0.3, 0.25);
  const turbGlow = interpolate(t, [T_HOT, T_TURBINES + 0.2], [0, 1], clamp) * interpolate(t, [THRUST.start, THRUST.start + 0.8], [1, 0.4], clamp);
  const power = interpolate(t, [T_TURBINES, T_SHAFTW + 0.1], [0, 1], clamp);
  const fanFlash = Math.max(
    interpolate(t, [T_SFAN - 0.05, T_SFAN + 0.2, T_SFAN + 1.2], [0, 1, 0.3], clamp),
    interpolate(t, [T_PFAN - 0.05, T_PFAN + 0.2, T_PFAN + 1.4], [0, 1, 0.4], clamp),
  );
  const push = interpolate(t, [T_EIGHTY - 0.3, T_EIGHTY + 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const hit = t >= T_EIGHTY;
  const hitFlare = hit ? Math.exp(-(t - T_EIGHTY) * 1.4) : 0;
  const thrustGlow = interpolate(t, [T_TFAN, T_EIGHTY], [0, 0.6], clamp) + 0.6 * hitFlare;

  // ---------- Camera ----------
  const camT = [0, RATIO.start, REMOVE.start, T_RFAN + 0.3, CORE.start - 0.2, CORE.start + 0.8, T_BURNS, T_DEGREES, SHAFT.start + 0.6, T_SHAFTW, T_SFAN + 0.2, T_EIGHTY - 0.3, PAYOFF.start, END];
  const camX = [-330, -60, -60, 40, 40, -150, -150, -20, 200, 180, -330, -20, -20, -40];
  const camS = [1.38, 1.0, 1.0, 0.92, 0.92, 1.75, 1.75, 1.85, 1.75, 1.7, 1.3, 0.98, 0.98, 1.06];
  const fx = AX + interpolate(t, camT, camX, { ...clamp, easing: ease });
  const scale = interpolate(t, camT, camS, { ...clamp, easing: ease }) + 0.012 * Math.sin(t * 0.7);
  const shakeAmp =
    (t >= T_PUSH ? 12 * Math.exp(-(t - T_PUSH) * 6) : 0) +
    (t >= T_LOUD ? 7 * Math.exp(-(t - T_LOUD) * 4) : 0) +
    (hit ? 20 * Math.exp(-(t - T_EIGHTY) * 5) : 0) +
    1.2 * spool;
  const camera = `translate(${540 - fx * scale + Math.sin(frame * 2.3) * shakeAmp}px, ${
    AY - AY * scale + Math.cos(frame * 1.9) * shakeAmp
  }px) scale(${scale})`;

  // ---------- HUD timing ----------
  const titleOut = interpolate(t, [RATIO.start - 0.35, RATIO.start], [0, 1], clamp);
  const meter = win(RATIO.start - 0.1, CORE.start + 0.1, 0.3);
  const fillN = interpolate(t, [T_AIR, T_TEN + 0.15], [0, 10], clamp) * (1 - gone);
  const throughOn = interpolate(t, [T_THROUGH, T_THROUGH + 0.25], [0, 1], clamp);
  const coreHud = win(CORE.start, SHAFT.start + 0.05, 0.3);
  const temp = Math.round(interpolate(t, [T_BURNS, T_DEGREES], [20, 1700], { ...clamp, easing: Easing.out(Easing.cubic) }) / 10) * 10;
  const shaftHud = win(SHAFT.start, THRUST.start + 0.05, 0.3);
  const thrustHud = win(THRUST.start, PAYOFF.start, 0.3);
  const thrustFill = interpolate(t, [T_TFAN, T_EIGHTY + 0.15], [0, 0.8], { ...clamp, easing: ease });
  const eighty = sp(T_EIGHTY, 8, 200);
  const endA = sp(PAYOFF.start);
  const endB = sp(T_PSPINS, 11);

  const chip = (at: number, label: string, color: string) => {
    const k = Math.min(1, sp(at));
    return (
      <span
        style={{
          display: "inline-block",
          padding: "6px 18px",
          margin: "0 6px",
          borderRadius: 14,
          border: `3px solid ${k > 0.5 ? color : "rgba(255,255,255,0.25)"}`,
          color: k > 0.5 ? color : "rgba(255,255,255,0.35)",
          background: k > 0.5 ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.25)",
          transform: `scale(${1 + 0.12 * Math.max(0, Math.sin(Math.min(1, k) * Math.PI))})`,
        }}
      >
        {label}
      </span>
    );
  };

  // ---------- World pieces ----------
  const bypassOpacity = 1 - gone;
  const engineGhost = 1 - 0.82 * gone;
  const plumeLen = 360 + 520 * gone;
  const coreHeat = ignite;
  const coreColorAt = (x: number) => {
    if (x < -315) return COLD;
    if (x < -60) return mix(COLD, "#e6f8ff", ((x + 315) / 255) * (0.4 + 0.6 * squeeze));
    if (x < 30) return mix("#e6f8ff", WHITE_HOT, coreHeat * ((x + 60) / 90));
    if (x < 330) return mix(coreHeat > 0.5 ? WHITE_HOT : "#e6f8ff", HOT, coreHeat * ((x - 30) / 300));
    return coreHeat > 0.5 ? HOT : COLD;
  };

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #1d2126 0%, #15181c 45%, #0c0e11 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("jet-engine-fan/narration.wav")} />
      <Audio src={staticFile("jet-engine-fan/bed.wav")} volume={0.6} />

      {/* Blueprint grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(170,185,200,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(170,185,200,0.06) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `${(-t * 40 * spool) % 90}px 0px`,
        }}
      />
      {/* Free-stream air rushing past */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {STREAKS.map((s, i) => {
          const x = ((s.ph * 1500 + t * 520 * s.v * spool) % 1500) - 250;
          return <line key={i} x1={x} y1={s.y} x2={x + s.len} y2={s.y} stroke="rgba(200,215,230,0.13)" strokeWidth={3} strokeLinecap="round" />;
        })}
      </svg>

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <linearGradient id="coreGlow" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={WHITE_HOT} stopOpacity={1} />
              <stop offset="0.35" stopColor="#ffc06a" stopOpacity={0.9} />
              <stop offset="1" stopColor={HOT} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="plume" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#ffb25c" stopOpacity={0.85} />
              <stop offset="0.4" stopColor={HOT} stopOpacity={0.4} />
              <stop offset="1" stopColor={HOT} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="coldPlume" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={COLD} stopOpacity={0.55} />
              <stop offset="1" stopColor={COLD} stopOpacity={0} />
            </linearGradient>
            <radialGradient id="flame">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor={WHITE_HOT} />
              <stop offset="0.7" stopColor="#ffa040" stopOpacity={0.85} />
              <stop offset="1" stopColor={HOT} stopOpacity={0} />
            </radialGradient>
          </defs>
          <g transform={`translate(${AX} ${AY})`}>
            {/* Cold bypass jet leaving the fan nozzle */}
            {[-1, 1].map((sg) => (
              <polygon
                key={`cp${sg}`}
                points={`170,${sg * 112} 170,${sg * 250} ${700 + 200 * hitFlare},${sg * 270} ${700 + 200 * hitFlare},${sg * 112}`}
                fill="url(#coldPlume)"
                opacity={bypassOpacity * (0.25 + thrustGlow)}
              />
            ))}
            {/* Hot core jet */}
            <polygon
              points={`330,-98 ${330 + plumeLen},${-60 - 30 * (1 - gone)} ${330 + plumeLen},${60 + 30 * (1 - gone)} 330,98`}
              fill="url(#plume)"
              opacity={coreHeat * (0.75 + 0.15 * Math.sin(t * 23)) * (1 + 0.3 * gone)}
            />

            {/* Bypass air (cold) */}
            {bypassOpacity > 0.01 &&
              BYPASS.map((b, i) => {
                const p = (b.ph + sByp / 1.7) % 1;
                const x = -680 + 1830 * p;
                const r = pl(BYP_IN, x) + b.lane * (pl(BYP_OUT, x) - pl(BYP_IN, x));
                const len = b.len * (0.4 + spool);
                return (
                  <line
                    key={i}
                    x1={x - len}
                    y1={b.side * r}
                    x2={x}
                    y2={b.side * r}
                    stroke={COLD}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    opacity={bypassOpacity * (0.75 + 0.25 * thrustGlow) * interpolate(x, [-680, -600, 1000, 1150], [0, 1, 1, 0], clamp)}
                  />
                );
              })}

            {/* Nacelle (cut away) */}
            <g opacity={engineGhost}>
              {[-1, 1].map((sg) => (
                <polygon key={`n${sg}`} points={wall(NAC_IN, NAC_OUT, -505, 170, sg)} fill={STEEL_DARK} stroke={STEEL_LIGHT} strokeWidth={3} />
              ))}
            </g>
            {gone > 0.05 &&
              [-1, 1].map((sg) => (
                <polygon
                  key={`ng${sg}`}
                  points={wall(NAC_IN, NAC_OUT, -505, 170, sg)}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={3}
                  strokeDasharray="10 10"
                  opacity={gone}
                />
              ))}

            {/* Core cowl (wall between the two streams) */}
            {[-1, 1].map((sg) => (
              <polygon key={`c${sg}`} points={wall(CASING, COWL, -315, 330, sg)} fill="#4a535d" stroke={STEEL_LIGHT} strokeWidth={2.5} />
            ))}

            {/* Glow of burning gas in the core */}
            {[-1, 1].map((sg) => (
              <polygon
                key={`g${sg}`}
                points={wall(HUB, CASING, -40, 330, sg, 16)}
                fill="url(#coreGlow)"
                opacity={coreHeat * (0.35 + 0.35 * burnBoost + 0.1 * gone) * (0.9 + 0.1 * Math.sin(t * 17))}
              />
            ))}
            {/* Squeeze: pressure rises through the compressor */}
            {[-1, 1].map((sg) => (
              <polygon
                key={`sq${sg}`}
                points={wall(HUB, CASING, -315, -60, sg, 16)}
                fill={COLD}
                opacity={0.12 + 0.3 * squeeze * (0.7 + 0.3 * Math.sin(t * 10))}
              />
            ))}

            {/* Hub, shaft and exhaust plug */}
            <polygon points={`${wall([[-315, 0], [330, 0]], HUB, -315, 330, -1, 8)}`} fill={STEEL_DARK} />
            <polygon points={`${wall([[-315, 0], [330, 0]], HUB, -315, 330, 1, 8)}`} fill={STEEL_DARK} />
            <polygon points="330,-46 445,0 330,46" fill={STEEL} stroke={STEEL_LIGHT} strokeWidth={2} />
            <rect x={-392} y={-15} width={700} height={30} rx={8} fill={mix("#8c96a3", "#ffcf8a", power * 0.8)} />
            {power > 0.01 &&
              [0, 1, 2, 3].map((k) => {
                const a = ((t - T_TURBINES) / 0.9 + k / 4) % 1;
                const x = 300 - 690 * a;
                return <ellipse key={k} cx={x} cy={0} rx={46} ry={14} fill="#fff4d0" opacity={power * (1 - a * 0.5)} />;
              })}

            {/* Compressor and turbine blade rows */}
            {COMP_ROWS.map((x, i) =>
              i % 2 === 0 ? (
                <Rotor key={`cr${i}`} x={x} w={16} r0={pl(HUB, x)} r1={pl(CASING, x)} theta={theta * 1.6 + i} blades={18} color="#dff6ff" glow={squeeze} />
              ) : (
                [-1, 1].map((sg) => (
                  <rect key={`cs${i}${sg}`} x={x - 5} y={sg < 0 ? -pl(CASING, x) : pl(HUB, x)} width={10} height={pl(CASING, x) - pl(HUB, x)} fill="#525c67" />
                ))
              ),
            )}
            {TURB_ROWS.map((x, i) =>
              i % 2 === 0 ? (
                <Rotor key={`tr${i}`} x={x} w={18} r0={pl(HUB, x)} r1={pl(CASING, x)} theta={theta * 1.6 + i} blades={18} color={turbGlow > 0.3 ? "#ffd29a" : "#dff6ff"} glow={turbGlow} />
              ) : (
                [-1, 1].map((sg) => (
                  <rect key={`ts${i}${sg}`} x={x - 5} y={sg < 0 ? -pl(CASING, x) : pl(HUB, x)} width={10} height={pl(CASING, x) - pl(HUB, x)} fill="#5a5048" />
                ))
              ),
            )}

            {/* Combustor: liner, fuel injector and flame */}
            {[-1, 1].map((sg) => {
              const flick = 0.85 + 0.15 * Math.sin(t * 31 + sg) + 0.08 * Math.sin(t * 13);
              const f = coreHeat * (0.7 + 0.5 * burnBoost + 0.25 * gone) * flick;
              return (
                <g key={`f${sg}`}>
                  <rect x={-50} y={sg * 68 - 12} width={140} height={24} rx={12} fill="none" stroke="#c9a27a" strokeWidth={2.5} opacity={0.8} />
                  <rect x={-74} y={sg * 68 - 6} width={26} height={12} rx={3} fill={STEEL_LIGHT} />
                  {f > 0.01 && <ellipse cx={25} cy={sg * 68} rx={80 * f} ry={18 + 6 * f} fill="url(#flame)" />}
                </g>
              );
            })}
            {/* Fuel drops (many more when the engine is a turbojet) */}
            {coreHeat > 0.01 &&
              new Array(10).fill(0).map((_, k) => {
                const sg = k % 2 === 0 ? -1 : 1;
                const dense = interpolate(t, [T_THIRSTY - 0.4, T_THIRSTY], [0, 1], clamp) * gone;
                if (k >= 2 && dense < 0.05) return null;
                const a = (t * (1.8 + 1.6 * dense) + k * 0.137) % 1;
                return <circle key={`d${k}`} cx={-48 + 60 * a} cy={sg * (68 + ((k * 7) % 5) - 2)} r={4 + 2 * dense} fill="#ffe27a" opacity={(1 - a) * (k >= 2 ? dense : 1)} />;
              })}
            {/* Ignition flash */}
            {igniteFlash > 0 && igniteFlash < 1 && (
              <circle cx={20} cy={0} r={60 + 380 * igniteFlash} fill="none" stroke={WHITE_HOT} strokeWidth={10 * (1 - igniteFlash)} opacity={1 - igniteFlash} />
            )}

            {/* Core air (one parcel for about every ten that go around) */}
            {COREP.map((c, i) => {
              const p = (c.ph + sCore / 2.3) % 1;
              const x = interpolate(p, CORE_SEG.map((s) => s[0]), CORE_SEG.map((s) => s[1]));
              const r = pl(CORE_LO, x) + c.lane * (pl(CORE_HI, x) - pl(CORE_LO, x));
              const col = coreColorAt(x);
              const fade = interpolate(x, [-680, -600, 900, 1150], [0, 1, 1, 0], clamp);
              const hotX = x > 0 && coreHeat > 0.5;
              return (
                <g key={i} opacity={fade}>
                  {hotX && <circle cx={x} cy={c.side * r} r={20} fill={col} opacity={0.3} />}
                  <circle cx={x} cy={c.side * r} r={hotX ? 10 : 8.5} fill={col} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
                </g>
              );
            })}

            {/* Fan, spinner */}
            <g opacity={1 - 0.88 * gone}>
              <Rotor x={FAN_X} w={46} r0={FAN_ROOT} r1={FAN_TIP} theta={theta} blades={16} color={mix("#e8fbff", COLD, fanFlash)} glow={Math.max(fanFlash, hitFlare)} />
              <path d="M -470 0 Q -455 -62 -395 -74 L -315 -42 L -315 42 L -395 74 Q -455 62 -470 0 Z" fill={STEEL} stroke={STEEL_LIGHT} strokeWidth={2.5} />
              <path
                d={`M -462 0 L ${-430 + 14 * Math.sin(theta)} ${-30 * Math.cos(theta)}`}
                stroke={STEEL_LIGHT}
                strokeWidth={4}
                opacity={0.7}
              />
            </g>
            {gone > 0.05 && (
              <rect x={FAN_X - 23} y={-FAN_TIP} width={46} height={FAN_TIP * 2} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeDasharray="10 10" opacity={gone} />
            )}

            {/* Loud: sound waves from the bare hot jet */}
            {gone > 0.01 &&
              t > T_LOUD - 0.3 &&
              [0, 1, 2, 3, 4].map((k) => {
                let a = t - (T_LOUD - 0.3) - k * 0.28;
                if (a < 0) return null;
                a = (a % 1.4) / 1.4;
                const r = 70 + 330 * a;
                const c = 450;
                const a0 = (-125 * Math.PI) / 180;
                const a1 = (125 * Math.PI) / 180;
                return (
                  <path
                    key={`w${k}`}
                    d={`M ${c + r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 1 1 ${c + r * Math.cos(a1)} ${r * Math.sin(a1)}`}
                    fill="none"
                    stroke="#ffd2a6"
                    strokeWidth={8}
                    strokeLinecap="round"
                    opacity={gone * (1 - a) * 0.85}
                  />
                );
              })}

            {/* Fan diameter */}
            {(() => {
              const k = win(T_GIANT - 0.2, THRUST.start + 0.6, 0.3);
              if (k <= 0.01) return null;
              const d = interpolate(t, [T_GIANT - 0.2, T_GIANT + 0.4], [0, 1], { ...clamp, easing: ease });
              return (
                <g opacity={k}>
                  <line x1={-520} y1={-FAN_TIP * d} x2={-520} y2={FAN_TIP * d} stroke={COLD} strokeWidth={5} />
                  <line x1={-540} y1={-FAN_TIP * d} x2={-500} y2={-FAN_TIP * d} stroke={COLD} strokeWidth={5} />
                  <line x1={-540} y1={FAN_TIP * d} x2={-500} y2={FAN_TIP * d} stroke={COLD} strokeWidth={5} />
                </g>
              );
            })()}

            {/* The push: thrust points forward, opposite to the exhaust */}
            {push > 0.01 && (
              <g opacity={Math.min(1, push)}>
                <polygon
                  points={`${260},${372} ${260 - 560 * push},${372} ${260 - 560 * push},${352} ${260 - 640 * push},${400} ${260 - 560 * push},${448} ${260 - 560 * push},${428} ${260},${428}`}
                  fill={COLD}
                  opacity={0.85 + 0.15 * Math.sin(t * 6)}
                  stroke="#ffffff"
                  strokeWidth={2 + 4 * hitFlare}
                />
                <rect x={260} y={384} width={70} height={32} fill={HOT} opacity={0.9} />
              </g>
            )}

            {/* Leader lines for the bottom labels */}
            <line x1={FAN_X} y1={300} x2={FAN_X} y2={372} stroke="rgba(255,255,255,0.6)" strokeWidth={3} opacity={win(T_FIRE - 0.2, REMOVE.start + 0.2)} />
            <line x1={40} y1={92} x2={40} y2={372} stroke="rgba(255,190,140,0.7)" strokeWidth={3} strokeDasharray="6 6" opacity={win(T_THROUGH - 0.2, REMOVE.start + 0.2)} />
          </g>
        </svg>

        {/* World labels */}
        <Tag x={FAN_X} y={405} color="#ffffff" opacity={win(T_FIRE - 0.2, REMOVE.start + 0.2)}>
          FAN
        </Tag>
        <Tag x={40} y={405} color={HOT} opacity={win(T_THROUGH - 0.2, REMOVE.start + 0.2)}>
          CORE
        </Tag>
        <Tag x={-110} y={-222} color={COLD} opacity={win(T_AROUND - 0.4, REMOVE.start + 0.2)}>
          BYPASS AIR
        </Tag>
        <Tag x={-40} y={420} color="#ffffff" opacity={win(T_TURBOJET - 0.15, CORE.start - 0.1)} size={44}>
          OLD TURBOJET
        </Tag>
        <Tag x={330} y={-300} color="#ffe6cc" opacity={win(T_LOUD - 0.1, CORE.start - 0.1)} size={56}>
          LOUD
        </Tag>
        <Tag x={10} y={238} color="#ffe27a" opacity={win(T_THIRSTY - 0.1, CORE.start - 0.1)} size={46}>
          THIRSTY
        </Tag>
        <Tag x={10} y={296} color="#ffe9a8" opacity={win(T_THIRSTY + 0.1, CORE.start - 0.1)} size={34}>
          MORE FUEL PER PUSH
        </Tag>
        <Tag x={-185} y={212} color="#dff6ff" opacity={win(T_SQUEEZE - 0.15, SHAFT.start)} size={26}>
          COMPRESSOR
        </Tag>
        <Tag x={20} y={-205} color={WHITE_HOT} opacity={win(T_BURNS - 0.1, SHAFT.start + 0.4)} size={26}>
          COMBUSTOR
        </Tag>
        <Tag x={215} y={-205} color="#ffd29a" opacity={win(T_TURBINES - 0.15, THRUST.start)} size={26}>
          TURBINES
        </Tag>
        <Tag x={40} y={205} color="#fff4d0" opacity={win(T_SHAFTW - 0.1, THRUST.start)} size={30}>
          SHAFT ←
        </Tag>
        <Tag x={-615} y={0} color={COLD} opacity={win(T_GIANT, THRUST.start + 0.4)} size={34}>
          3.4 M
        </Tag>
        <Tag x={-30} y={-222} color={COLD} opacity={win(T_TFAN - 0.2, PAYOFF.start + 0.2)} size={40}>
          FAN AIR
        </Tag>
        <Tag x={-20} y={400} color="#08161c" opacity={interpolate(push, [0.6, 1], [0, 1], clamp)} size={40} plain>
          PUSH
        </Tag>
        <Tag x={385} y={0} color={HOT} opacity={win(T_EIGHTY - 0.2, PAYOFF.start + 0.2)} size={36}>
          CORE
        </Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,12,15,0.7) 0px, rgba(10,12,15,0.7) 300px, rgba(10,12,15,0) 470px, rgba(10,12,15,0) 1340px, rgba(10,12,15,0.8) 1430px, rgba(10,12,15,0.8) 1650px, rgba(10,12,15,0) 1770px)",
        }}
      />
      <div style={{ position: "absolute", top: 1378, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 7, color: "rgba(200,212,225,0.55)", opacity: interpolate(scale, [1.12, 1.25], [1, 0], clamp) }}>
        SIMPLIFIED CUTAWAY · NOT TO SCALE
      </div>

      {/* Opening title: on screen from frame 0 */}
      <Hud top={180} opacity={1 - titleOut} y={-40 * titleOut}>
        <div style={{ fontSize: 92, lineHeight: 1.05, letterSpacing: -2, color: "#ffffff" }}>
          WHAT ACTUALLY
          <br />
          <span style={{ color: HOT }}>PUSHES A JET?</span>
        </div>
      </Hud>

      {/* Meter: air around the core vs through it, target 10 : 1 */}
      <Hud top={160} opacity={meter}>
        <div style={{ fontWeight: 500, fontSize: 34, letterSpacing: 6, color: "rgba(255,255,255,0.85)" }}>
          AIR <span style={{ color: COLD }}>AROUND</span> THE CORE : <span style={{ color: HOT }}>THROUGH</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 9, marginTop: 18 }}>
          {new Array(10).fill(0).map((_, i) => {
            const f = Math.max(0, Math.min(1, fillN - i));
            return (
              <div key={i} style={{ width: 60, height: 60, borderRadius: 10, border: `3px solid ${COLD}`, boxSizing: "border-box", background: `rgba(127,227,255,${0.95 * f})`, opacity: 0.55 + 0.45 * f, transform: `scale(${0.85 + 0.15 * f})` }} />
            );
          })}
          <div style={{ fontSize: 60, color: "#ffffff", margin: "0 6px" }}>:</div>
          <div style={{ width: 60, height: 60, borderRadius: 10, border: `3px solid ${HOT}`, boxSizing: "border-box", background: `rgba(255,138,61,${0.95 * throughOn})` }} />
        </div>
        <div style={{ fontSize: 120, lineHeight: 1.1, letterSpacing: -3, fontVariantNumeric: "tabular-nums", marginTop: 6, color: gone > 0.5 ? "#ff6b5a" : "#ffffff" }}>
          <span style={{ color: gone > 0.5 ? "#ff6b5a" : COLD }}>{Math.round(fillN)}</span> : 1
          {gone > 0.5 && <span style={{ fontSize: 48, letterSpacing: 4, marginLeft: 24 }}>NO FAN</span>}
        </div>
      </Hud>

      {/* Core: squeeze, then burn */}
      <Hud top={160} opacity={coreHud}>
        <div style={{ fontSize: 44, letterSpacing: 2 }}>
          {chip(T_SQUEEZE, "SQUEEZE", "#dff6ff")}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>→</span>
          {chip(T_BURNS, "BURN", HOT)}
        </div>
        <div
          style={{
            fontSize: 150,
            lineHeight: 1.1,
            letterSpacing: -4,
            fontVariantNumeric: "tabular-nums",
            color: mix("#ffd9a8", HOT, (temp - 20) / 1680),
            opacity: interpolate(t, [T_BURNS - 0.1, T_BURNS + 0.2], [0, 1], clamp),
            textShadow: `0 0 ${20 + 30 * interpolate(t, [T_SEVENTEEN, T_DEGREES], [0, 1], clamp)}px rgba(255,138,61,0.55)`,
          }}
        >
          {temp.toLocaleString("en-US")} °C
        </div>
      </Hud>

      {/* Shaft: fire drives the fan */}
      <Hud top={175} opacity={shaftHud}>
        <div style={{ fontSize: 46, letterSpacing: 1, whiteSpace: "nowrap" }}>
          {chip(T_HOT, "HOT GAS", HOT)}→{chip(T_TURBINES, "TURBINES", "#ffd29a")}
        </div>
        <div style={{ fontSize: 46, letterSpacing: 1, whiteSpace: "nowrap", marginTop: 18 }}>
          →{chip(T_SHAFTW, "SHAFT", "#fff4d0")}→{chip(T_SFAN, "FAN", COLD)}
        </div>
      </Hud>

      {/* Share of thrust */}
      <Hud top={160} opacity={thrustHud}>
        <div style={{ fontWeight: 500, fontSize: 34, letterSpacing: 7, color: "rgba(255,255,255,0.85)" }}>WHERE THE THRUST COMES FROM</div>
        <div style={{ position: "relative", margin: "16px auto 0", width: 880, height: 96, borderRadius: 18, background: "rgba(255,138,61,0.85)", border: "4px solid rgba(255,255,255,0.8)", overflow: "hidden", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${thrustFill * 100}%`, background: COLD }} />
          <div style={{ position: "absolute", left: 30, top: 0, lineHeight: "88px", fontSize: 46, letterSpacing: 3, color: "#0c1a20", textShadow: "none", opacity: interpolate(thrustFill, [0.15, 0.3], [0, 1], clamp) }}>FAN</div>
          <div style={{ position: "absolute", right: 22, top: 0, lineHeight: "88px", fontSize: 40, letterSpacing: 2, color: "#2a1205", textShadow: "none" }}>CORE</div>
        </div>
        <div
          style={{
            fontSize: 130,
            lineHeight: 1.1,
            letterSpacing: -3,
            color: COLD,
            marginTop: 4,
            opacity: Math.min(1, eighty),
            transform: `scale(${0.7 + 0.3 * eighty})`,
          }}
        >
          <span style={{ fontSize: 60, letterSpacing: 2, color: "#ffffff" }}>UP TO </span>80%
        </div>
      </Hud>

      {/* Payoff, echoing the hook */}
      <Hud top={185} opacity={1}>
        <div style={{ fontSize: 56, letterSpacing: 4, color: HOT, opacity: Math.min(1, endA), transform: `translateY(${22 * (1 - Math.min(1, endA))}px)` }}>
          THE FIRE SPINS THE FAN
        </div>
        <div style={{ fontSize: 96, lineHeight: 1.05, letterSpacing: -2, color: "#ffffff", marginTop: 10, opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})` }}>
          THE <span style={{ color: COLD }}>FAN</span> PUSHES
          <br />
          THE PLANE
        </div>
      </Hud>

      <Captions lines={timeline.lines} top={1440} accent={HOT} />
    </AbsoluteFill>
  );
};
