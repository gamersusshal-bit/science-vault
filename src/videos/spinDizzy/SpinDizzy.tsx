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
import timelineJson from "../../../videos/spin-dizzy/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Story beats (all timing from the narration timeline) ----------
const T_STOP1 = wordStart("hook", "stopped"); // first stop: the opening event
const METER = line("meter");
const T_ZERO = wordStart("meter", "zero");
const T_INNER = wordStart("meter", "inner");
const CANAL = line("canal");
const T_THREE = wordStart("canal", "three");
const T_FLAP = wordStart("canal", "flap");
const T_HAIRS = wordStart("canal", "sensing");
const START = line("start");
const T_SPIN = wordStart("start", "start");
const T_LAGS = wordStart("start", "lags");
const T_BRAIN = wordStart("start", "brain");
const STEADY = line("steady");
const T_CATCH = wordStart("steady", "catches");
const T_STRAIGHT = wordStart("steady", "straightens");
const T_FEEL = wordStart("steady", "feeling");
const STOP = line("stop");
const T_STOP2 = wordStart("stop", "stop");
const T_KEEPS = wordStart("stop", "keeps");
const T_EARSAYS = wordStart("stop", "ear");
const T_EYES = wordStart("stop", "eyes");
const PAYOFF = line("payoff");
const T_NEVER = wordStart("payoff", "never");
const T_FLUID2 = wordStart("payoff", "fluid");

// ---------- Palette: warm anatomy-book cream with deep red, teal and blue ----------
const CREAM = "#f7ead9";
const INK = "#2b1d1a";
const RED = "#e2483d";
const TEAL = "#138a83";
const TEAL_L = "#5fd0c6";
const BLUE = "#2c5aa0";
const SKIN = "#e8a77f";
const HAIR = "#3a2418";
const MUSTARD = "#e3a52f";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const FPS = 30;

// ---------- Simplified canal model, integrated once ----------
// wH = head spin speed (1 = full spin), wF = fluid spin speed, both in the room's frame.
// The flap bends with the difference c = wH - wF; that difference is what the ear reports.
// Time is compressed for the video (labelled on screen as a simplified model).
const OMEGA = 1.6 * Math.PI; // rad/s at full spin
const ramp = (t: number, a: number, d: number) => interpolate(t, [a, a + d], [0, 1], clamp);
const headSpeed = (t: number) => {
  if (t < T_SPIN) return 1 - ramp(t, T_STOP1, 0.12);
  return ramp(t, T_SPIN + 0.05, 0.45) * (1 - ramp(t, T_STOP2, 0.12));
};
const tau = (t: number) => {
  if (t < T_FLAP) return 4; // fluid still sloshing after the first stop
  if (t < T_SPIN) return 0.7; // settles while the flap is introduced
  if (t < STEADY.start + 0.3) return 6; // spin-up: fluid lags far behind
  if (t < T_STOP2) return 0.9; // steady spin: fluid catches up
  return 4.5; // after the stop: fluid coasts on
};

const N = Math.ceil(timeline.duration * FPS) + 2;
const SUB = 6;
type State = { wH: number; wF: number; aH: number; aF: number; feel: number };
const RAW: State[] = (() => {
  const out: State[] = [];
  let wF = 1;
  let aH = 0;
  let aF = 0;
  let feel = 0;
  const dt = 1 / FPS / SUB;
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    out.push({ wH: headSpeed(t), wF, aH, aF, feel });
    for (let k = 0; k < SUB; k++) {
      const s = t + k * dt;
      const h = headSpeed(s);
      wF += ((h - wF) / tau(s)) * dt;
      aH += h * OMEGA * dt;
      aF += wF * OMEGA * dt;
      feel += -(h - wF) * OMEGA * 0.35 * dt; // how the room seems to swing
    }
  }
  return out;
})();
// Make both stops land with the figure facing up (whole turns), so the camera never unwinds.
const idx = (t: number) => Math.max(0, Math.min(N - 1, Math.round(t * FPS)));
const STOP1_I = idx(T_STOP1 + 0.2);
const SPIN_I = idx(T_SPIN);
const END_I = N - 1;
const A1 = RAW[STOP1_I].aH;
const A2 = RAW[END_I].aH - RAW[SPIN_I].aH;
const TURNS2 = Math.max(1, Math.round(A2 / (2 * Math.PI)));
const K2 = (TURNS2 * 2 * Math.PI) / A2;
const OFFSET1 = Math.ceil(A1 / (2 * Math.PI)) * 2 * Math.PI - A1;
const MODEL = RAW.map((s, i) => {
  const extra = i > SPIN_I ? (s.aH - RAW[SPIN_I].aH) * (K2 - 1) : 0;
  return { ...s, aH: s.aH + OFFSET1 + extra, c: s.wH - s.wF };
});
const at = (t: number) => MODEL[idx(t)];

const deg = (r: number) => (r * 180) / Math.PI;
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

// ---------- World (1080 x 1920, figure seen from above) ----------
const C = { x: 540, y: 980 };
const A = { x: 540, y: 960 }; // camera anchor on screen
const HEAD_R = 88;
const RUG_R = 470;

const PARTICLES = new Array(54).fill(0).map((_, i) => ({
  a: (i / 54) * Math.PI * 2 + (random(`pa${i}`) - 0.5) * 0.08,
  r: (random(`pr${i}`) - 0.5) * 52,
  s: 5 + random(`ps${i}`) * 4.5,
  ph: random(`pp${i}`) * 6.28,
}));

const Room: React.FC<{ ghost?: boolean }> = ({ ghost }) => (
  <g>
    {!ghost && (
      <>
        <rect x={-2600} y={-2600} width={6280} height={7120} fill="#eedcc4" />
        {new Array(60).fill(0).map((_, i) => (
          <line key={i} x1={-2600 + i * 105} y1={-2600} x2={-2600 + i * 105} y2={4520} stroke="#e1c9ab" strokeWidth={5} />
        ))}
      </>
    )}
    {new Array(16).fill(0).map((_, i) => {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      return (
        <path
          key={i}
          d={`M ${C.x} ${C.y} L ${C.x + RUG_R * Math.cos(a0)} ${C.y + RUG_R * Math.sin(a0)} A ${RUG_R} ${RUG_R} 0 0 1 ${
            C.x + RUG_R * Math.cos(a1)
          } ${C.y + RUG_R * Math.sin(a1)} Z`}
          fill={ghost ? "none" : i % 2 ? "#f3d2b2" : "#f8e3cc"}
          stroke={ghost ? RED : "none"}
          strokeWidth={ghost ? 4 : 0}
        />
      );
    })}
    <circle cx={C.x} cy={C.y} r={RUG_R} fill="none" stroke={ghost ? RED : "#c8473b"} strokeWidth={ghost ? 6 : 16} />
    <circle cx={C.x} cy={C.y} r={RUG_R - 34} fill="none" stroke={ghost ? RED : TEAL} strokeWidth={ghost ? 3 : 6} />
    {!ghost && <circle cx={C.x} cy={C.y} r={150} fill="#ebbd97" />}
    {/* Furniture at the corners: fixed references that show the room is not moving */}
    <g opacity={ghost ? 0.9 : 1}>
      <rect x={C.x + 300} y={C.y + 300} width={170} height={150} rx={30} fill={ghost ? "none" : RED} stroke={ghost ? RED : "#a5302a"} strokeWidth={8} />
      <rect x={C.x + 320} y={C.y + 330} width={130} height={100} rx={18} fill={ghost ? "none" : "#f06b5e"} />
      <rect x={C.x - 500} y={C.y + 330} width={220} height={90} rx={10} fill={ghost ? "none" : "#8a5a3c"} stroke={ghost ? RED : "#6b4430"} strokeWidth={8} />
      <circle cx={C.x - 440} cy={C.y - 200} r={70} fill={ghost ? "none" : "#2f9c62"} stroke={ghost ? RED : "#1f7a4a"} strokeWidth={8} />
      <circle cx={C.x - 466} cy={C.y - 218} r={32} fill={ghost ? "none" : "#57c483"} />
      <circle cx={C.x + 440} cy={C.y - 200} r={60} fill={ghost ? "none" : MUSTARD} stroke={ghost ? RED : "#b9801c"} strokeWidth={8} />
      <circle cx={C.x + 440} cy={C.y - 200} r={22} fill={ghost ? "none" : "#fff3c9"} />
    </g>
  </g>
);

/** The spinner, seen from above: arms out, nose and eyes at the front (local -y). */
const Figure: React.FC<{ angle: number; trail: number; nys: number; earGlow: number }> = ({ angle, trail, nys, earGlow }) => {
  const arms = (o: number, key: string) => (
    <g key={key} opacity={o}>
      <line x1={-150} y1={0} x2={-292} y2={-10} stroke={BLUE} strokeWidth={40} strokeLinecap="round" />
      <line x1={150} y1={0} x2={292} y2={-10} stroke={BLUE} strokeWidth={40} strokeLinecap="round" />
      <circle cx={-310} cy={-10} r={28} fill={SKIN} />
      <circle cx={310} cy={-10} r={28} fill={SKIN} />
    </g>
  );
  return (
    <g transform={`translate(${C.x} ${C.y})`}>
      {trail > 0.02 &&
        [3, 2, 1].map((k) => (
          <g key={k} transform={`rotate(${-k * 11})`}>
            {arms(trail * (0.42 - k * 0.11), `t${k}`)}
          </g>
        ))}
      <g transform={`rotate(${angle})`}>
        <ellipse cx={0} cy={10} rx={176} ry={70} fill="rgba(43,29,26,0.15)" />
        {arms(1, "a")}
        <ellipse cx={0} cy={0} rx={165} ry={64} fill={BLUE} stroke="#1d3f73" strokeWidth={6} />
        {/* ears */}
        <circle cx={-HEAD_R} cy={-4} r={20} fill={SKIN} stroke="#c47f59" strokeWidth={4} />
        <circle cx={HEAD_R} cy={-4} r={20} fill={SKIN} stroke="#c47f59" strokeWidth={4} />
        {earGlow > 0.01 && (
          <circle cx={HEAD_R} cy={-4} r={34 + 10 * earGlow} fill="none" stroke={RED} strokeWidth={7} opacity={earGlow} />
        )}
        <circle cx={0} cy={0} r={HEAD_R} fill={SKIN} stroke="#c47f59" strokeWidth={5} />
        <circle cx={0} cy={22} r={80} fill={HAIR} />
        <path d={`M -14 ${-HEAD_R + 6} L 0 ${-HEAD_R - 18} L 14 ${-HEAD_R + 6} Z`} fill="#d98f66" />
        {[-34, 34].map((ex) => (
          <g key={ex}>
            <ellipse cx={ex} cy={-62} rx={19} ry={14} fill="#ffffff" stroke={INK} strokeWidth={3} />
            <circle cx={ex + nys} cy={-63} r={8} fill={INK} />
          </g>
        ))}
      </g>
    </g>
  );
};

const Tag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; align?: "left" | "center" | "right"; children: React.ReactNode }> = ({
  x,
  y,
  color,
  opacity,
  size = 38,
  align = "center",
  children,
}) =>
  opacity <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : align === "right" ? "-100%" : "0"}, -50%)`,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 3,
        color,
        opacity,
        whiteSpace: "nowrap",
        textAlign: align,
        lineHeight: 1.05,
      }}
    >
      {children}
    </div>
  );

/** Spinning arrow ring used in the readout cards. */
const Rotor: React.FC<{ angle: number; color: string; active: number }> = ({ angle, color, active }) => (
  <svg width={124} height={124} style={{ position: "absolute", left: 20, top: 58 }}>
    <circle cx={62} cy={62} r={54} fill="none" stroke="rgba(43,29,26,0.12)" strokeWidth={12} />
    <g transform={`rotate(${angle} 62 62)`} opacity={0.35 + 0.65 * active}>
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} 62 62)`}>
          <path d="M 62 8 A 54 54 0 0 1 108 34" fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
          <path d="M 116 22 L 112 48 L 92 36 Z" fill={color} />
        </g>
      ))}
    </g>
    <circle cx={62} cy={62} r={14} fill={color} />
  </svg>
);

const Card: React.FC<{
  x: number;
  title: string;
  word: string;
  color: string;
  level: number;
  angle: number;
  pulse: number;
  alarm: number;
}> = ({ x, title, word, color, level, angle, pulse, alarm }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 150,
      width: 450,
      height: 200,
      borderRadius: 26,
      background: "#fffaf2",
      border: `5px solid ${alarm > 0.5 ? RED : color}`,
      boxSizing: "border-box",
      boxShadow: `0 8px 0 rgba(43,29,26,0.18), 0 0 ${40 * pulse}px ${10 * pulse}px ${color}88`,
      transform: `scale(${1 + 0.06 * pulse})`,
      fontFamily: FONT,
      overflow: "hidden",
    }}
  >
    <div style={{ position: "absolute", left: 24, top: 12, fontSize: 34, fontWeight: 700, letterSpacing: 5, color }}>{title}</div>
    <Rotor angle={angle} color={color} active={Math.min(1, Math.abs(level) * 3)} />
    <div
      style={{
        position: "absolute",
        left: 160,
        top: 70,
        fontSize: 50,
        fontWeight: 700,
        letterSpacing: -1,
        color: alarm > 0.5 ? RED : INK,
        whiteSpace: "nowrap",
      }}
    >
      {word}
    </div>
    <div style={{ position: "absolute", left: 162, top: 140, width: 250, height: 18, borderRadius: 9, background: "rgba(43,29,26,0.12)" }}>
      <div style={{ width: `${Math.min(1, Math.abs(level)) * 100}%`, height: "100%", borderRadius: 9, background: color }} />
    </div>
  </div>
);

export const SpinDizzy: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const m = at(t);
  const prev = at(t - 1 / fps);
  const c = m.c;

  // ---------- Camera: wide on the spinner, then into the right ear, riding with the head ----------
  const zin = interpolate(t, [T_INNER - 0.25, T_INNER + 0.9], [0, 1], { ...clamp, easing: ease });
  const zout = interpolate(t, [PAYOFF.start - 0.15, PAYOFF.start + 1.3], [0, 1], { ...clamp, easing: ease });
  const z = zin * (1 - zout);
  const hookPush = interpolate(t, [0, METER.end], [0, 1], clamp);
  const sWide = 1.0 + 0.06 * hookPush * (1 - zout) + 0.28 * zout + 0.2 * interpolate(t, [PAYOFF.start + 1.3, timeline.duration], [0, 1], clamp);
  const fWide = { x: C.x, y: C.y - 40 * zout };
  const headDeg = deg(m.aH);
  const ear = {
    x: C.x + HEAD_R * Math.cos(m.aH) - -4 * Math.sin(m.aH),
    y: C.y + HEAD_R * Math.sin(m.aH) + -4 * Math.cos(m.aH),
  };
  const S = sWide + (2.4 - sWide) * z;
  const F = { x: fWide.x + (ear.x - fWide.x) * z, y: fWide.y + (ear.y - fWide.y) * z };
  const R = -z * wrapDeg(headDeg);
  const shake =
    16 * Math.exp(-Math.max(0, t - T_STOP1) * 7) * (t >= T_STOP1 ? 1 : 0) +
    20 * Math.exp(-Math.max(0, t - T_STOP2) * 6) * (t >= T_STOP2 ? 1 : 0);
  const shX = Math.sin(frame * 2.3) * shake;
  const shY = Math.cos(frame * 1.7) * shake;
  const cam = (p: { x: number; y: number }) => {
    const dx = (p.x - F.x) * S;
    const dy = (p.y - F.y) * S;
    const r = (R * Math.PI) / 180;
    return { x: A.x + shX + dx * Math.cos(r) - dy * Math.sin(r), y: A.y + shY + dx * Math.sin(r) + dy * Math.cos(r) };
  };
  const camT = `translate(${A.x + shX} ${A.y + shY}) rotate(${R}) scale(${S}) translate(${-F.x} ${-F.y})`;

  // ---------- Figure details ----------
  const trail = Math.max(0, (m.wH - 0.3) / 0.7) * (1 - z);
  const nysAmp = 9 * Math.min(1, Math.abs(c) * 3) * (m.wH < 0.05 ? 1 : 0);
  const ph = (t * 2.3) % 1;
  const saw = ph < 0.82 ? ph / 0.82 : 1 - (ph - 0.82) / 0.18;
  const nys = (saw - 0.5) * 2 * nysAmp * Math.sign(c || 1);
  const earGlow = interpolate(t, [T_INNER - 0.4, T_INNER, T_INNER + 0.9, T_INNER + 1.3], [0, 1, 1, 0], clamp);
  const ghost = Math.min(1, 0.15 + Math.abs(c) * 3) * (t >= T_STOP2 ? 1 : 1 - z) * 0.55;
  const stopBurst1 = interpolate(t, [T_STOP1, T_STOP1 + 0.7], [0, 1], clamp);

  // ---------- Lens into the inner ear ----------
  const open =
    interpolate(t, [T_INNER + 0.25, T_INNER + 1.05], [0, 1], { ...clamp, easing: ease }) *
    (1 - interpolate(t, [PAYOFF.start - 0.1, PAYOFF.start + 0.8], [0, 1], { ...clamp, easing: ease }));
  const earS = cam(ear);
  const LC = { x: earS.x + (540 - earS.x) * open, y: earS.y + (960 - earS.y) * open };
  const L = 400 * open;
  const cz =
    1 +
    0.1 * interpolate(t, [CANAL.start, START.start], [0, 1], { ...clamp, easing: ease }) -
    0.1 * interpolate(t, [START.start, T_LAGS], [0, 1], { ...clamp, easing: ease }) +
    0.06 * interpolate(t, [T_STOP2, PAYOFF.start], [0, 1], { ...clamp, easing: ease });
  const ls = L / 400;
  const lz = ls * cz; // scale of the canal drawing inside the lens
  const RR = 235;
  const vRelRaw = (m.aF - m.aH - (prev.aF - prev.aH)) * 0.3 * fps; // rad/s relative flow
  const vRel = vRelRaw;
  const flowO = Math.min(1, Math.abs(vRelRaw) / 0.6);
  const flowDir = Math.sign(vRelRaw || 1);
  const phi = (m.aF - m.aH) * 0.3; // fluid angle relative to the canal (scaled down to stay readable)
  const bend = Math.max(-1, Math.min(1, c * 1.15));
  const tipX = -bend * 62;
  const flapGlow = interpolate(t, [T_FLAP - 0.1, T_FLAP + 0.3, T_FLAP + 1.6, T_FLAP + 2.2], [0, 1, 1, 0], clamp);
  const hairGlow = interpolate(t, [T_HAIRS - 0.1, T_HAIRS + 0.3, START.start, START.start + 0.5], [0, 1, 1, 0], clamp);
  const stopFlash = interpolate(t, [T_STOP2, T_STOP2 + 0.6], [0, 1], clamp);

  // ---------- Center text inside the ring ----------
  const pop = (at0: number) =>
    spring({ frame: frame - Math.round(at0 * fps), fps, config: { damping: 13, stiffness: 190 } });
  const threeIn = pop(T_THREE) * interpolate(t, [START.start - 0.3, START.start], [1, 0], clamp);
  type Msg = { from: number; to: number; a: string; b: string; color: string };
  const MSGS: Msg[] = [
    { from: T_INNER + 0.9, to: CANAL.start, a: "STILL", b: "SLOSHING", color: RED },
    { from: T_LAGS - 0.1, to: STEADY.start + 0.2, a: "FLUID", b: "LAGS", color: TEAL },
    { from: T_CATCH, to: T_FEEL - 0.1, a: "CAUGHT", b: "UP", color: TEAL },
    { from: T_FEEL - 0.1, to: STOP.start, a: "FEELS", b: "STILL", color: RED },
    { from: T_KEEPS - 0.1, to: PAYOFF.start, a: "KEEPS", b: "GOING", color: RED },
  ];
  const msg = MSGS.find((q) => t >= q.from && t < q.to);
  const msgPop = msg ? pop(msg.from) : 0;
  const flapTag = interpolate(t, [T_FLAP - 0.1, T_FLAP + 0.3], [0, 1], clamp) * open;
  const fluidTag = interpolate(t, [CANAL.start + 0.1, CANAL.start + 0.5], [0, 1], clamp) * open;
  const modelTag = interpolate(t, [CANAL.start, CANAL.start + 0.5], [0, 1], clamp) * open;

  // ---------- HUD ----------
  const headWord = m.wH > 0.05 ? "SPINNING" : "STOPPED";
  const fluidWord = Math.abs(m.wF) > 0.06 ? "MOVING" : "STILL";
  const headPulse =
    interpolate(t, [T_ZERO - 0.1, T_ZERO + 0.2, T_ZERO + 0.9], [0, 1, 0], clamp) +
    interpolate(t, [T_FEEL - 0.1, T_FEEL + 0.2, T_FEEL + 1.2], [0, 1, 0], clamp) +
    interpolate(t, [T_STOP2 - 0.05, T_STOP2 + 0.2, T_STOP2 + 0.9], [0, 1, 0], clamp);
  const fluidPulse =
    interpolate(t, [T_INNER - 0.1, T_INNER + 0.2, T_INNER + 1.0], [0, 1, 0], clamp) +
    interpolate(t, [T_CATCH - 0.1, T_CATCH + 0.2, T_CATCH + 0.9], [0, 1, 0], clamp) +
    interpolate(t, [T_KEEPS - 0.1, T_KEEPS + 0.2, T_KEEPS + 1.0], [0, 1, 0], clamp);
  const headAlarm = t >= T_FEEL && t < STOP.start ? 1 : 0; // still spinning, but feels still
  const earRow = interpolate(t, [T_STOP1 + 0.15, T_STOP1 + 0.45], [0, 1], clamp);
  const earWord = c > 0.12 ? "SPIN RIGHT" : c < -0.12 ? "SPIN LEFT" : "NO SPIN";
  const earPulse =
    interpolate(t, [T_BRAIN - 0.1, T_BRAIN + 0.2, T_BRAIN + 1.0], [0, 1, 0], clamp) +
    interpolate(t, [T_EARSAYS - 0.1, T_EARSAYS + 0.2, T_EARSAYS + 1.0], [0, 1, 0], clamp);
  const eyesIn = pop(T_EYES - 0.05) * interpolate(t, [PAYOFF.start + 0.2, PAYOFF.start + 0.6], [1, 0], clamp);

  const titleOut = interpolate(t, [METER.start + 0.1, METER.start + 0.5], [0, 1], clamp);
  const titleIn = spring({ frame, fps, from: 0.92, to: 1, config: { damping: 12 } });
  const roomTag =
    interpolate(t, [T_STOP1 + 0.5, T_STOP1 + 0.9, T_INNER - 0.3, T_INNER], [0, 1, 1, 0], clamp) +
    interpolate(t, [PAYOFF.start + 0.9, PAYOFF.start + 1.3], [0, 1], clamp);
  const endA = pop(T_NEVER - 0.25);
  const endB = pop(T_FLUID2 - 0.1);
  const eyesTag = interpolate(t, [PAYOFF.start + 1.2, PAYOFF.start + 1.6], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: CREAM, overflow: "hidden" }}>
      <Audio src={staticFile("spin-dizzy/narration.wav")} />
      <Audio src={staticFile("spin-dizzy/bed.wav")} volume={0.6} />

      {/* ================= WORLD (top-down room, camera rides with the head when zoomed) ================= */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g transform={camT}>
          <Room />
          {ghost > 0.01 && (
            <g opacity={ghost} transform={`rotate(${deg(m.feel)} ${C.x} ${C.y})`}>
              <Room ghost />
            </g>
          )}
          {stopBurst1 > 0 && stopBurst1 < 1 && (
            <circle cx={C.x} cy={C.y} r={180 + 300 * stopBurst1} fill="none" stroke={RED} strokeWidth={14 * (1 - stopBurst1)} opacity={1 - stopBurst1} />
          )}
          <Figure angle={headDeg} trail={trail} nys={nys} earGlow={earGlow} />
        </g>
      </svg>

      {/* ================= LENS: one canal of the right inner ear, seen from above ================= */}
      {L > 2 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <clipPath id="lens">
              <circle cx={LC.x} cy={LC.y} r={L} />
            </clipPath>
            <radialGradient id="tissue" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#fbe3d4" />
              <stop offset="100%" stopColor="#efbfa8" />
            </radialGradient>
          </defs>
          <circle cx={LC.x} cy={LC.y} r={L + 14 * ls} fill={RED} />
          <g clipPath="url(#lens)">
            <circle cx={LC.x} cy={LC.y} r={L} fill="url(#tissue)" />
            <g transform={`translate(${LC.x} ${LC.y}) scale(${lz})`}>
              {/* canal walls + ampulla bulge */}
              <circle r={RR} fill="none" stroke={INK} strokeWidth={92} />
              <ellipse cx={0} cy={-RR} rx={80} ry={72} fill={INK} />
              <circle r={RR} fill="none" stroke={TEAL} strokeWidth={80} />
              <ellipse cx={0} cy={-RR} rx={74} ry={66} fill={TEAL} />
              <circle r={RR} fill="none" stroke={TEAL_L} strokeWidth={6} opacity={0.55} />
              {/* fluid tracers */}
              {PARTICLES.map((p, i) => {
                const a = p.a + phi + 0.015 * Math.sin(t * 2 + p.ph);
                const d = Math.abs(((((a + Math.PI / 2) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
                const o = interpolate(d, [0.14, 0.32], [0, 1], clamp);
                if (o <= 0.01) return null;
                const r = RR + p.r;
                const tail = Math.max(-0.5, Math.min(0.5, vRel * 0.12));
                const x = r * Math.cos(a);
                const y = r * Math.sin(a);
                return (
                  <g key={i} opacity={o}>
                    {Math.abs(tail) > 0.02 && (
                      <line
                        x1={x}
                        y1={y}
                        x2={r * Math.cos(a - tail)}
                        y2={r * Math.sin(a - tail)}
                        stroke="rgba(255,250,240,0.55)"
                        strokeWidth={p.s * 1.3}
                        strokeLinecap="round"
                      />
                    )}
                    <circle cx={x} cy={y} r={p.s} fill="#fffaf0" />
                  </g>
                );
              })}
              {/* flow arrows: which way the fluid moves relative to the canal */}
              {flowO > 0.02 &&
                [Math.PI * 0.18, Math.PI * 0.82, Math.PI * 0.5].map((a0, i) => {
                  const a1 = a0 + flowDir * 0.55;
                  const p0 = { x: RR * Math.cos(a0), y: RR * Math.sin(a0) };
                  const p1 = { x: RR * Math.cos(a1), y: RR * Math.sin(a1) };
                  const tx = -Math.sin(a1) * flowDir;
                  const ty = Math.cos(a1) * flowDir;
                  const nx = Math.cos(a1);
                  const ny = Math.sin(a1);
                  return (
                    <g key={i} opacity={flowO}>
                      <path
                        d={`M ${p0.x} ${p0.y} A ${RR} ${RR} 0 0 ${flowDir > 0 ? 1 : 0} ${p1.x} ${p1.y}`}
                        fill="none"
                        stroke={MUSTARD}
                        strokeWidth={16}
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${p1.x + tx * 34} ${p1.y + ty * 34} L ${p1.x + nx * 26} ${p1.y + ny * 26} L ${p1.x - nx * 26} ${p1.y - ny * 26} Z`}
                        fill={MUSTARD}
                      />
                    </g>
                  );
                })}
              {/* crista + hair cells + cupula (the flap) */}
              <ellipse cx={0} cy={-RR - 58} rx={58} ry={22} fill="#c86a5a" />
              {[-32, -16, 0, 16, 32].map((hx) => (
                <line
                  key={hx}
                  x1={hx}
                  y1={-RR - 56}
                  x2={hx + tipX * 0.35}
                  y2={-RR - 16}
                  stroke={hairGlow > 0.05 ? MUSTARD : "#7a2a22"}
                  strokeWidth={6 + 4 * hairGlow}
                  strokeLinecap="round"
                />
              ))}
              <path
                d={`M -40 ${-RR - 56} Q ${-34 + tipX * 0.5} ${-RR - 10} ${-22 + tipX} ${-RR + 34} Q ${tipX} ${-RR + 46} ${22 + tipX} ${-RR + 34} Q ${
                  34 + tipX * 0.5
                } ${-RR - 10} 40 ${-RR - 56} Z`}
                fill="rgba(255,244,228,0.82)"
                stroke={Math.abs(bend) > 0.15 ? RED : "#b9573f"}
                strokeWidth={6 + 4 * flapGlow}
              />
              {flapGlow > 0.01 && (
                <ellipse cx={tipX * 0.5} cy={-RR - 10} rx={70} ry={70} fill="none" stroke={MUSTARD} strokeWidth={6} opacity={flapGlow} />
              )}
              {stopFlash > 0 && stopFlash < 1 && (
                <circle r={RR + 60 + 120 * stopFlash} fill="none" stroke={RED} strokeWidth={18 * (1 - stopFlash)} opacity={1 - stopFlash} />
              )}
              {/* three canals per ear */}
              {threeIn > 0.01 && (
                <g transform={`translate(0 -30) scale(${threeIn})`} opacity={Math.min(1, threeIn)}>
                  <circle cx={-100} cy={0} r={38} fill="none" stroke={TEAL} strokeWidth={12} />
                  <ellipse cx={0} cy={0} rx={40} ry={14} fill="none" stroke={TEAL} strokeWidth={12} />
                  <ellipse cx={100} cy={0} rx={14} ry={40} fill="none" stroke={TEAL} strokeWidth={12} />
                </g>
              )}
            </g>
          </g>
          <circle cx={LC.x} cy={LC.y} r={L} fill="none" stroke={INK} strokeWidth={8 * ls} />
        </svg>
      )}

      {/* Lens labels (screen space, only while the lens is fully open) */}
      <Tag x={LC.x} y={LC.y + 60 * cz} color={INK} opacity={Math.min(1, threeIn) * open} size={46}>
        3 PER EAR
      </Tag>
      {msg && (
        <div
          style={{
            position: "absolute",
            left: LC.x,
            top: LC.y - 2,
            transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * msgPop})`,
            opacity: Math.min(1, msgPop) * open,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 66,
            lineHeight: 1,
            letterSpacing: -1,
            textAlign: "center",
            color: msg.color,
            whiteSpace: "nowrap",
          }}
        >
          {msg.a}
          <br />
          {msg.b}
        </div>
      )}
      <Tag x={LC.x + 108 * cz} y={LC.y - (RR + 40) * cz} color={RED} opacity={flapTag * (1 - zout)} align="left" size={40}>
        FLAP
      </Tag>
      <Tag x={LC.x - 100 * cz} y={LC.y - (RR + 40) * cz} color="#9a5a12" opacity={hairGlow * open} align="right" size={40}>
        HAIRS
      </Tag>
      <Tag x={LC.x} y={LC.y + 145 * cz} color={TEAL} opacity={fluidTag * (t < START.start ? 1 : 0.0)} size={40}>
        FLUID
      </Tag>
      <Tag x={LC.x} y={LC.y + 330} color="rgba(43,29,26,0.75)" opacity={modelTag} size={34}>
        SIMPLIFIED MODEL
      </Tag>

      {/* ================= HUD ================= */}
      <Card x={75} title="HEAD" word={headWord} color={BLUE} level={m.wH} angle={deg(m.aH) * 0.5} pulse={Math.min(1, headPulse)} alarm={headAlarm} />
      <Card
        x={555}
        title="EAR FLUID"
        word={fluidWord}
        color={TEAL}
        level={m.wF}
        angle={deg(m.aF) * 0.5}
        pulse={Math.min(1, fluidPulse)}
        alarm={0}
      />
      <div
        style={{
          position: "absolute",
          left: 75,
          top: 372,
          width: 930,
          height: 92,
          borderRadius: 22,
          background: INK,
          opacity: earRow,
          transform: `scale(${1 + 0.05 * Math.min(1, earPulse)})`,
          boxShadow: `0 0 ${36 * Math.min(1, earPulse)}px ${8 * Math.min(1, earPulse)}px ${RED}88`,
          fontFamily: FONT,
        }}
      >
        <div style={{ position: "absolute", left: 26, top: 24, fontSize: 36, fontWeight: 700, letterSpacing: 3, color: "#f7ead9" }}>EAR SAYS</div>
        <svg width={330} height={92} style={{ position: "absolute", left: 250, top: 0 }}>
          <rect x={0} y={34} width={330} height={24} rx={12} fill="rgba(247,234,217,0.18)" />
          <line x1={165} y1={22} x2={165} y2={70} stroke="#f7ead9" strokeWidth={4} />
          {Math.abs(c) > 0.02 && (
            <>
              <rect
                x={c > 0 ? 165 : 165 - 150 * Math.min(1, Math.abs(c))}
                y={34}
                width={150 * Math.min(1, Math.abs(c))}
                height={24}
                fill={RED}
              />
              <path
                d={
                  c > 0
                    ? `M ${165 + 150 * Math.min(1, c)} 26 L ${165 + 150 * Math.min(1, c) + 22} 46 L ${165 + 150 * Math.min(1, c)} 66 Z`
                    : `M ${165 - 150 * Math.min(1, -c)} 26 L ${165 - 150 * Math.min(1, -c) - 22} 46 L ${165 - 150 * Math.min(1, -c)} 66 Z`
                }
                fill={RED}
              />
            </>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            right: 26,
            top: 18,
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: 1,
            color: earWord === "NO SPIN" ? "#f7ead9" : "#ff6a5c",
          }}
        >
          {earWord}
        </div>
      </div>
      {eyesIn > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 512,
            transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * Math.min(1, eyesIn)})`,
            opacity: Math.min(1, eyesIn),
            padding: "8px 30px",
            borderRadius: 18,
            background: "#fffaf2",
            border: `5px solid ${BLUE}`,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: 2,
            color: BLUE,
            whiteSpace: "nowrap",
          }}
        >
          EYES SAY: <span style={{ color: INK }}>STILL</span>
        </div>
      )}

      {/* Opening question: on screen from frame 0 */}
      {titleOut < 1 && (
        <div
          style={{
            position: "absolute",
            top: 492,
            left: 50,
            right: 50,
            padding: "10px 0 14px",
            borderRadius: 30,
            background: "rgba(247,234,217,0.86)",
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 86,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: INK,
            opacity: 1 - titleOut,
            transform: `translateY(${-30 * titleOut}px) scale(${titleIn})`,
            textShadow: "0 0 18px #f7ead9, 0 0 6px #f7ead9",
          }}
        >
          WHY IS THE ROOM
          <br />
          <span style={{ color: RED }}>STILL TURNING?</span>
        </div>
      )}

      <Tag x={540} y={1338} color={RED} opacity={Math.min(1, roomTag)} size={40}>
        ROOM SEEMS TO SPIN
      </Tag>
      <Tag x={540} y={790} color={BLUE} opacity={eyesTag} size={38}>
        EYES FLICK
      </Tag>

      {/* Payoff */}
      <div
        style={{
          position: "absolute",
          top: 478,
          left: 30,
          right: 30,
          padding: "8px 0 14px",
          borderRadius: 30,
          background: `rgba(247,234,217,${0.86 * Math.min(1, endA)})`,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            fontSize: 74,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: INK,
            opacity: Math.min(1, endA),
            transform: `translateY(${20 * (1 - Math.min(1, endA))}px)`,
            textShadow: "0 0 18px #f7ead9, 0 0 6px #f7ead9",
          }}
        >
          THE ROOM NEVER MOVED.
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 74,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: RED,
            opacity: Math.min(1, endB),
            transform: `scale(${0.8 + 0.2 * endB})`,
            textShadow: "0 0 18px #f7ead9, 0 0 6px #f7ead9",
          }}
        >
          YOUR EAR FLUID DID.
        </div>
      </div>

      {/* Dark band so captions stay readable on the light scene */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1410, height: 250, background: "rgba(43,29,26,0.9)" }} />
      <Captions lines={timeline.lines} top={1440} accent="#ff7a5c" />
    </AbsoluteFill>
  );
};
