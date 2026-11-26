import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/train-jump/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#ffb020";
const HER = "#2ee6c8";
const GHOST = "#ff4d5e";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const FREEZE = line("freeze");
const WHY = line("why");
const KEEPS = line("keeps");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_HALF = wordStart("meter", "half");
const T_FAR = wordStart("meter", "far");
const T_SLAM = wordStart("freeze", "slams");
const T_ALREADY = wordStart("why", "already");
const T_LANDS = wordStart("keeps", "lands");
const T_EQUATOR = wordStart("climax", "equator");
const T_FASTER = wordStart("climax", "faster");
const T_NEITHER = wordStart("payoff", "neither");

const V = 83.33; // 300 km/h in m/s
const AIR_M = 41.7; // metres the floor travels during a half-second jump
const CAR = 26; // carriage length, m
const WALL_GAP = 12.4; // from her to the back wall of her carriage, m

// Replay windows (slow motion), in video seconds
const R1 = [T_HALF - 0.1, T_FAR + 0.35];
const R2 = [FREEZE.start + 0.05, T_SLAM];
const R3 = [KEEPS.start + 0.1, T_LANDS + 0.55];

// Playback rate of the world (1 = real time) as a function of video time
const rate = (t: number) => {
  if (t < METER.start - 0.2) return 1;
  if (t < R1[0]) return interpolate(t, [METER.start - 0.2, R1[0]], [1, 0.05], clamp);
  if (t < R1[1]) return AIR_M / (V * (R1[1] - R1[0]));
  if (t < R2[0]) return 0.05;
  if (t < R2[1]) return (WALL_GAP - 0.4) / (V * (R2[1] - R2[0]));
  if (t < WHY.start) return 0.04;
  if (t < R3[0]) return interpolate(t, [WHY.start, WHY.start + 0.6, R3[0] - 0.4, R3[0]], [0.04, 0.5, 0.5, 0.04], clamp);
  if (t < R3[1]) return AIR_M / (V * (R3[1] - R3[0]));
  return 0.25;
};
// Train displacement over the ground (m), integrated frame by frame
const dispCache: number[] = [];
const disp = (t: number) => {
  const step = 1 / 120;
  const n = Math.floor(t / step);
  if (dispCache.length === 0) dispCache.push(0);
  for (let i = dispCache.length; i <= n; i++) dispCache.push(dispCache[i - 1] + V * rate((i - 1) * step) * step);
  return dispCache[n] + V * rate(n * step) * (t - n * step);
};

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(20,8,0,0.9)" }}>
    {children}
  </div>
);

// Generic person, drawn in metres (stylised, about 4.4 m tall in drawing units), feet at (0,0).
const Person: React.FC<{ x: number; y: number; crouch: number; color: string; o?: number; squash?: number }> = ({
  x, y, crouch, color, o = 1, squash = 1,
}) => {
  const k = crouch; // 0 standing, 1 crouched
  const hip = -2.0 + 0.5 * k;
  return (
    <g transform={`translate(${x} ${y}) scale(${squash} ${1 / squash})`} opacity={o}>
      <path d={`M -0.35 0 L ${-0.45 - 0.35 * k} ${hip / 2} L -0.2 ${hip} M 0.35 0 L ${0.45 + 0.35 * k} ${hip / 2} L 0.2 ${hip}`}
        stroke="#1d2b4a" strokeWidth={0.38} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x={-0.55} y={hip - 1.6} width={1.1} height={1.75} rx={0.45} fill={color} />
      <path d={`M -0.45 ${hip - 1.3} L ${-1.0} ${hip - 0.4 - 0.6 * k} M 0.45 ${hip - 1.3} L 1.0 ${hip - 0.4 - 0.6 * k}`}
        stroke={color} strokeWidth={0.32} strokeLinecap="round" fill="none" />
      <circle cx={0} cy={hip - 2.15} r={0.5} fill="#f2c9a0" />
      <path d={`M -0.5 ${hip - 2.25} Q 0 ${hip - 2.95} 0.5 ${hip - 2.25}`} fill="#3a2418" />
    </g>
  );
};

// Earth seen from above the North Pole; land patches rotate (east = counter-clockwise from above).
const Globe: React.FC<{ cx: number; cy: number; r: number; ang: number; hop: number }> = ({ cx, cy, r, ang, hop }) => {
  const lands = [
    [0.2, 0.55, 0.5], [1.4, 0.7, 0.35], [2.5, 0.45, 0.45], [3.6, 0.75, 0.3], [4.6, 0.5, 0.5], [5.5, 0.8, 0.25],
  ];
  const pa = ang + Math.PI * 1.5; // the person's longitude: starts at the top of the disc
  const px = cx + (r + hop) * Math.cos(pa);
  const py = cy + (r + hop) * Math.sin(pa);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 26} fill="rgba(120,200,255,0.18)" />
      <circle cx={cx} cy={cy} r={r} fill="#1f5fa8" />
      {lands.map(([a, d, s], i) => (
        <ellipse key={i} cx={cx + r * d * Math.cos(a + ang)} cy={cy + r * d * Math.sin(a + ang)} rx={r * s * 0.55} ry={r * s * 0.32}
          transform={`rotate(${((a + ang) * 180) / Math.PI} ${cx + r * d * Math.cos(a + ang)} ${cy + r * d * Math.sin(a + ang)})`}
          fill="#3fa65a" opacity={0.95} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.22} fill="#eaf6ff" opacity={0.9} />
      <text x={cx} y={cy + 12} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill="#1f5fa8">N</text>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ACCENT} strokeWidth={6} strokeDasharray="18 14" opacity={0.9} />
      <g transform={`translate(${px} ${py}) rotate(${(pa * 180) / Math.PI + 90}) scale(20)`}>
        <Person x={0} y={0} crouch={0} color={HER} />
      </g>
    </g>
  );
};

export const TrainJump: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const D = disp(t);

  // ---------- camera ----------
  const ppm = interpolate(t, [0, METER.start, R1[0], R1[1] + 0.2, FREEZE.start, WHY.start, WHY.start + 0.6, KEEPS.start, KEEPS.start + 0.4],
    [34, 34, 19.5, 19.5, 27, 27, 29, 34, 19.5], { ...clamp, easing: ease });
  const camX = interpolate(t, [0, METER.start, R1[0], R1[1] + 0.2, FREEZE.start, WHY.start, WHY.start + 0.6, KEEPS.start, KEEPS.start + 0.4],
    [540, 540, 880, 880, 690, 690, 540, 540, 880], { ...clamp, easing: ease });
  const shake = 18 * Math.exp(-Math.max(0, t - T_SLAM) * 6) * (t >= T_SLAM ? 1 : 0);
  const shX = Math.sin(frame * 2.1) * shake;
  const shY = Math.cos(frame * 1.7) * shake;
  const RAIL = 1250;
  const PS = 1.5; // person drawing scale (stylised, not to scale)
  const sx = (m: number) => camX + m * ppm + shX; // train-frame metres -> screen x
  const gx = (g: number) => sx(g - D); // ground-frame metres -> screen x

  const earthO = interpolate(t, [CLIMAX.start - 0.1, CLIMAX.start + 0.7], [0, 1], clamp);
  const trainO = 1 - earthO;

  // ---------- her jump state ----------
  let airA = -1; // 0..1 while in the air
  if (t >= 0.3 && t < 0.85) airA = (t - 0.3) / 0.55;
  const stake1 = disp(R1[0]);
  const stake2 = disp(R2[0]);
  const stake3 = disp(R3[0]);
  if (t >= R1[0] && t < R1[1]) airA = (D - stake1) / AIR_M;
  if (t >= R2[0] && t < WHY.start) airA = Math.min(0.5, (D - stake2) / AIR_M);
  if (t >= WHY.start && t < R3[0]) airA = 0.5;
  if (t >= R3[0] && t < R3[1]) airA = Math.min(1, (D - stake3) / AIR_M);
  const inAir = airA >= 0 && airA <= 1;
  const hopH = inAir ? 4 * 1.6 * airA * (1 - airA) + (t >= WHY.start && t < R3[0] ? 0.15 * Math.sin(t * 5) : 0) : 0;
  const crouch = inAir ? 0.25 : t > 0.1 && t < 0.3 ? 0.9 : 0;

  // ghost (frozen thought experiment)
  const ghostOn = t >= R2[0] && t < WHY.start + 0.3;
  const ghostO = interpolate(t, [R2[0], R2[0] + 0.2, WHY.start - 0.1, WHY.start + 0.3], [0, 0.95, 0.95, 0], clamp);
  const ghostTrainX = t < T_SLAM ? stake2 - D : -WALL_GAP + 0.55; // ghost position in the train frame
  const hit = t >= T_SLAM;
  const herO = ghostOn ? interpolate(t, [R2[0], R2[0] + 0.2, WHY.start - 0.2, WHY.start], [1, 0.25, 0.25, 1], clamp) : 1;

  // ---------- labels / HUD ----------
  const titleO = interpolate(t, [0, 0.15, HOOK.end - 0.2, HOOK.end + 0.1], [1, 1, 1, 0], clamp);
  const slowO = interpolate(t, [R1[0] - 0.2, R1[0], KEEPS.end, KEEPS.end + 0.3], [0, 1, 1, 0], clamp) * (t > R1[1] + 0.3 && t < R3[0] - 0.3 ? 0.0 : 1);
  const airClock = t < R1[0] ? 0 : t < R1[1] ? Math.min(0.5, (0.5 * (D - stake1)) / AIR_M) : 0.5;
  const rulerO = interpolate(t, [R1[0] - 0.1, R1[0] + 0.2, FREEZE.start - 0.1, FREEZE.start + 0.2], [0, 1, 1, 0], clamp);
  const ruler3O = interpolate(t, [R3[0], R3[0] + 0.2, CLIMAX.start - 0.2, CLIMAX.start], [0, 1, 1, 0], clamp);
  const meterO = interpolate(t, [METER.start, METER.start + 0.3, FREEZE.start - 0.1, FREEZE.start + 0.1], [0, 1, 1, 0], clamp);
  const smashO = interpolate(t, [T_SLAM, T_SLAM + 0.1, WHY.start - 0.1, WHY.start + 0.2], [0, 1, 1, 0], clamp);
  const flash = interpolate(t, [T_SLAM, T_SLAM + 0.05, T_SLAM + 0.5], [0, 0.65, 0], clamp);
  const thoughtO = interpolate(t, [FREEZE.start, FREEZE.start + 0.2, WHY.start, WHY.start + 0.2], [0, 1, 1, 0], clamp);
  const whyO = interpolate(t, [WHY.start + 0.1, WHY.start + 0.4, KEEPS.start - 0.1, KEEPS.start + 0.2], [0, 1, 1, 0], clamp);
  const herBar = interpolate(t, [T_ALREADY - 0.1, T_ALREADY + 0.7], [0, 1], { ...clamp, easing: ease });
  const sameO = interpolate(t, [T_LANDS + 0.4, T_LANDS + 0.6, CLIMAX.start - 0.2, CLIMAX.start], [0, 1, 1, 0], clamp);
  const markO = interpolate(t, [R3[0] - 0.2, R3[0] + 0.1, CLIMAX.start - 0.2, CLIMAX.start], [0, 1, 1, 0], clamp);

  // ---------- Earth (climax/payoff) ----------
  const spin = (t - CLIMAX.start) * 0.55;
  const hopE = t > PAYOFF.start + 0.2 && t < PAYOFF.start + 1.2 ? 28 * Math.sin(((t - PAYOFF.start - 0.2) / 1.0) * Math.PI) : 0;
  const barG = (v: number) => (700 * v) / 1670;
  const bTrain = interpolate(t, [CLIMAX.start + 0.4, CLIMAX.start + 1.0], [0, 1], { ...clamp, easing: ease });
  const bJet = interpolate(t, [T_EQUATOR - 0.2, T_EQUATOR + 0.5], [0, 1], { ...clamp, easing: ease });
  const bGround = interpolate(t, [T_EQUATOR + 0.4, T_FASTER + 0.25], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const barsO = interpolate(t, [CLIMAX.start + 0.3, CLIMAX.start + 0.6, PAYOFF.end - 1.2, PAYOFF.end - 0.8], [0, 1, 1, 0], clamp);
  const pop = interpolate(t, [T_FASTER + 0.15, T_FASTER + 0.35, T_FASTER + 0.8], [1, 1.12, 1], clamp);
  const endA = interpolate(t, [PAYOFF.start, PAYOFF.start + 0.4], [0, 1], clamp);
  const endB = interpolate(t, [T_NEITHER, T_NEITHER + 0.4], [0, 1], clamp);

  // scenery
  const mod = (a: number, m: number) => ((a % m) + m) % m;
  const sky = interpolate(t, [0, CLIMAX.start], [0, 1], clamp);

  const carriage = (k: number) => {
    const x0 = sx(k * CAR - CAR / 2);
    const w = CAR * ppm;
    const h = 13.5 * ppm;
    const yTop = RAIL - 1.2 * ppm - h;
    const isHers = k === 0;
    return (
      <g key={k}>
        <rect x={x0 + 0.3 * ppm} y={yTop} width={w - 0.6 * ppm} height={h} rx={1.2 * ppm} fill="#e9edf2" stroke="#2a3346" strokeWidth={4} />
        {/* cut-away interior for her carriage, windows for the rest */}
        {isHers ? (
          <rect x={x0 + 1.0 * ppm} y={yTop + 1.0 * ppm} width={w - 2.0 * ppm} height={h - 1.8 * ppm} rx={0.5 * ppm} fill="#fff4dc" stroke="#2a3346" strokeWidth={3} />
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={x0 + (1.6 + i * 4) * ppm} y={yTop + 1.8 * ppm} width={2.8 * ppm} height={2.6 * ppm} rx={0.4 * ppm} fill="#9fc6e6" stroke="#2a3346" strokeWidth={2} />
          ))
        )}
        <rect x={x0 + 0.3 * ppm} y={yTop + h - 1.6 * ppm} width={w - 0.6 * ppm} height={0.8 * ppm} fill={ACCENT} />
        {[3.5, CAR - 3.5].map((wx) => (
          <circle key={wx} cx={x0 + wx * ppm} cy={RAIL - 0.6 * ppm} r={0.8 * ppm} fill="#2a3346" />
        ))}
        {isHers && (
          <>
            <rect x={x0 + 0.6 * ppm} y={yTop + 0.8 * ppm} width={0.6 * ppm} height={h - 1.4 * ppm} fill="#2a3346" />
          </>
        )}
      </g>
    );
  };
  const floorY = RAIL - 1.2 * ppm - 1.6 * ppm; // carriage floor (top of the orange band)

  return (
    <AbsoluteFill style={{ background: "#1b1030", overflow: "hidden" }}>
      <Audio src={staticFile("train-jump/narration.wav")} />
      <Audio src={staticFile("train-jump/bed.wav")} volume={0.6} />

      {/* ================= TRAIN WORLD (ground frame, camera rides with the train) ================= */}
      <AbsoluteFill style={{ opacity: trainO }}>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, #2a1a52 0%, #8a3d6b ${40 - 8 * sky}%, #ff9a4a 78%, #ffd27a 100%)` }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <circle cx={760} cy={720} r={120} fill="#ffe3a0" opacity={0.85} />
          {/* far hills, slow parallax */}
          {Array.from({ length: 8 }, (_, i) => {
            const x = mod(i * 300 - D * ppm * 0.04, 2400) - 400;
            return <ellipse key={i} cx={x} cy={RAIL - 120} rx={260} ry={150 + (i % 3) * 40} fill="#5a2a5e" opacity={0.85} />;
          })}
          {/* trees, mid parallax */}
          {Array.from({ length: 12 }, (_, i) => {
            const x = mod(i * 210 - D * ppm * 0.35, 2520) - 300;
            return (
              <g key={i}>
                <rect x={x - 8} y={RAIL - 150} width={16} height={90} fill="#3a1d33" />
                <circle cx={x} cy={RAIL - 170} r={52 + (i % 3) * 10} fill="#4b2140" />
              </g>
            );
          })}
          {/* poles on the ground frame */}
          {Array.from({ length: 30 }, (_, i) => {
            const g = Math.floor(D / 30) * 30 + (i - 12) * 30;
            const x = gx(g);
            if (x < -80 || x > 1160) return null;
            return <rect key={i} x={x - 6} y={RAIL - 330} width={12} height={330} fill="#2b1530" />;
          })}
          {/* ground and sleepers */}
          <rect x={0} y={RAIL} width={1080} height={1920 - RAIL} fill="#3b2030" />
          <rect x={0} y={RAIL + 4} width={1080} height={10} fill="#a89aa8" />
          {Array.from({ length: 120 }, (_, i) => {
            const g = Math.floor(D / 2) * 2 + (i - 60) * 2;
            const x = gx(g);
            if (x < -30 || x > 1110) return null;
            return <rect key={i} x={x - 0.4 * ppm} y={RAIL + 14} width={0.8 * ppm} height={16} fill="#6b4a3f" />;
          })}

          {/* train: four carriages, nose to the right */}
          {[-2, -1, 0, 1].map((k) => carriage(k))}
          <path d={`M ${sx(1.5 * CAR)} ${RAIL - 1.2 * ppm - 13.5 * ppm} Q ${sx(1.5 * CAR + 9)} ${RAIL - 1.2 * ppm - 9 * ppm} ${sx(1.5 * CAR + 10)} ${RAIL - 1.2 * ppm} L ${sx(1.5 * CAR)} ${RAIL - 1.2 * ppm} Z`}
            fill="#e9edf2" stroke="#2a3346" strokeWidth={4} />

          {/* floor mark that rides with the train (keeps) */}
          <g opacity={markO}>
            <rect x={sx(-0.9)} y={floorY - 6} width={1.8 * ppm} height={8} fill={HER} />
          </g>

          {/* her */}
          <g transform={`translate(${sx(0)} ${floorY - hopH * ppm * PS}) scale(${ppm * PS})`} opacity={herO}>
            <Person x={0} y={0} crouch={crouch} color={HER} />
          </g>
          {/* frozen ghost */}
          {ghostOn && (
            <g transform={`translate(${sx(ghostTrainX)} ${floorY - (hit ? 0.9 : 1.6) * ppm * PS}) scale(${ppm * PS})`} opacity={ghostO}>
              <Person x={0} y={0} crouch={0.25} color={GHOST} squash={hit ? 0.6 : 1} />
            </g>
          )}

          {/* ground stake + ruler (meter) */}
          {[stake1, stake3].map((sg, i) => {
            const o = i === 0 ? rulerO : ruler3O;
            if (o <= 0) return null;
            const xs = gx(sg);
            const xh = sx(0);
            return (
              <g key={i} opacity={o}>
                <rect x={xs - 7} y={RAIL - 70} width={14} height={110} fill={ACCENT} />
                <polygon points={`${xs - 22},${RAIL - 70} ${xs + 22},${RAIL - 70} ${xs},${RAIL - 40}`} fill={ACCENT} />
                <rect x={Math.min(xs, xh)} y={RAIL + 52} width={Math.abs(xh - xs)} height={22} rx={6} fill={ACCENT} />
                <rect x={xh - 4} y={RAIL + 40} width={8} height={46} fill="#ffffff" />
              </g>
            );
          })}
        </svg>

        {/* train speed chip on the ground when the ruler is not showing */}
        <div style={{ position: "absolute", top: 1300, width: "100%", display: "flex", justifyContent: "center", fontFamily: FONT,
          opacity: Math.max(0, 1 - rulerO - ruler3O) * interpolate(t, [0.2, 0.5], [0, 1], clamp) }}>
          <div style={{ fontWeight: 700, fontSize: 40, letterSpacing: 4, color: "#1a0d24", background: ACCENT, padding: "8px 26px", borderRadius: 14 }}>
            TRAIN → 300 KM/H
          </div>
        </div>
        {/* ruler label */}
        <Tag x={interpolate(t, [R1[0], R1[1]], [880, 520], clamp)} y={RAIL + 125} color={ACCENT} o={rulerO} size={40}>
          {`FLOOR MOVED ${Math.round(Math.max(0, Math.min(AIR_M, D - stake1)))} M`}
        </Tag>
        <Tag x={gx(stake1) + 10} y={floorY - 15 * ppm} color="#ffffff" o={rulerO * interpolate(t, [R1[0], R1[0] + 0.8], [1, 0], clamp)} size={34}>
          SHE JUMPED HERE
        </Tag>
        <Tag x={sx(-CAR / 2) + 110} y={floorY - 13.5 * ppm} color="#ffffff" o={interpolate(t, [FREEZE.start, FREEZE.start + 0.3, WHY.start, WHY.start + 0.3], [0, 1, 1, 0], clamp)} size={34}>
          BACK WALL
        </Tag>
        <Tag x={520} y={RAIL + 125} color={ACCENT} o={ruler3O} size={40}>
          {`FLOOR MOVED ${Math.round(Math.max(0, Math.min(AIR_M, D - stake3)))} M`}
        </Tag>
        <Tag x={sx(0)} y={floorY + 70} color={HER} o={sameO} size={40}>SAME SPOT ✓</Tag>

        {/* ghost labels */}
        <Tag x={540} y={300} color={GHOST} o={thoughtO} size={38}>THOUGHT EXPERIMENT</Tag>
        <Tag x={540} y={360} color="#ffffff" o={thoughtO} size={34}>FROZEN IN MID-AIR</Tag>
        <Tag x={540} y={500} color={GHOST} o={smashO} size={64}>SMASH!</Tag>
        <Tag x={540} y={570} color="#ffffff" o={smashO} size={36}>WALL HITS HER AT 300 KM/H</Tag>

        {/* slow-motion air clock */}
        <div style={{ position: "absolute", top: 250, left: 0, width: "100%", textAlign: "center", fontFamily: FONT, opacity: meterO }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: "#ffe6c0" }}>TIME IN THE AIR</div>
          <div style={{ fontWeight: 700, fontSize: 112, color: "#ffffff", letterSpacing: 2, textShadow: "0 4px 24px rgba(30,0,20,0.7)" }}>
            {airClock.toFixed(2)} <span style={{ fontSize: 56, color: ACCENT }}>/ 0.50 S</span>
          </div>
        </div>
        <Tag x={540} y={470} color={ACCENT} o={slowO * (t < FREEZE.start || t > KEEPS.start ? 1 : 0)} size={34}>SLOW MOTION</Tag>

        {/* speed bars (why) */}
        <div style={{ position: "absolute", top: 250, left: 150, width: 780, fontFamily: FONT, opacity: whyO, background: "rgba(30,10,30,0.72)", borderRadius: 20, padding: "18px 24px", boxSizing: "border-box" }}>
          <div style={{ fontWeight: 700, fontSize: 36, color: ACCENT, letterSpacing: 3 }}>TRAIN → 300 KM/H</div>
          <div style={{ height: 34, width: 700, background: ACCENT, borderRadius: 8, marginTop: 6 }} />
          <div style={{ fontWeight: 700, fontSize: 36, color: HER, letterSpacing: 3, marginTop: 16 }}>HER → {Math.round(300 * herBar)} KM/H</div>
          <div style={{ height: 34, width: 8 + 692 * herBar, background: HER, borderRadius: 8, marginTop: 6 }} />
        </div>
        {/* arrow above her during why */}
        <svg width={1080} height={1920} style={{ position: "absolute", opacity: whyO }}>
          <path d={`M ${sx(-1.6)} ${floorY - 9.0 * ppm} L ${sx(2.4)} ${floorY - 9.0 * ppm}`} stroke={HER} strokeWidth={12} strokeLinecap="round" />
          <polygon points={`${sx(2.4) + 34},${floorY - 9.0 * ppm} ${sx(2.4)},${floorY - 9.0 * ppm - 24} ${sx(2.4)},${floorY - 9.0 * ppm + 24}`} fill={HER} />
        </svg>
      </AbsoluteFill>

      {/* ================= EARTH (climax / payoff) ================= */}
      <AbsoluteFill style={{ opacity: earthO, background: "radial-gradient(circle at 50% 40%, #24124a 0%, #0c0620 70%)" }}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {Array.from({ length: 70 }, (_, i) => (
            <circle key={i} cx={(i * 397) % 1080} cy={(i * 613) % 1400 + 140} r={1.5 + (i % 3)} fill="#ffffff" opacity={0.5} />
          ))}
          <g transform={`translate(540 790) scale(${interpolate(t, [CLIMAX.start, CLIMAX.start + 1.2], [0.6, 1], { ...clamp, easing: ease })}) translate(-540 -790)`}>
            <Globe cx={540} cy={790} r={290} ang={-spin} hop={hopE} />
            {/* rotation arrow */}
            <path d={`M ${540 + 360 * Math.cos(-0.4)} ${790 + 360 * Math.sin(-0.4)} A 360 360 0 0 0 ${540 + 360 * Math.cos(-1.3)} ${790 + 360 * Math.sin(-1.3)}`}
              fill="none" stroke={ACCENT} strokeWidth={10} strokeLinecap="round" />
            <polygon points={`${540 + 360 * Math.cos(-1.3) - 30},${790 + 360 * Math.sin(-1.3) - 4} ${540 + 360 * Math.cos(-1.3) + 8},${790 + 360 * Math.sin(-1.3) - 26} ${540 + 360 * Math.cos(-1.3) + 10},${790 + 360 * Math.sin(-1.3) + 18}`} fill={ACCENT} />
          </g>
        </svg>
        <Tag x={540} y={300} color="#ffffff" o={interpolate(t, [CLIMAX.start + 0.3, CLIMAX.start + 0.6, PAYOFF.start - 0.2, PAYOFF.start], [0, 1, 1, 0], clamp)} size={36}>
          EARTH FROM ABOVE THE NORTH POLE
        </Tag>
        <Tag x={540} y={352} color={ACCENT} o={interpolate(t, [T_EQUATOR, T_EQUATOR + 0.3, PAYOFF.start - 0.2, PAYOFF.start], [0, 1, 1, 0], clamp)} size={34}>
          DASHED LINE = EQUATOR
        </Tag>
        <div style={{ position: "absolute", top: 1120, left: 150, width: 780, fontFamily: FONT, opacity: barsO }}>
          {[
            { n: "TRAIN", v: 300, b: bTrain, c: "#c7b8ff", s: "300" },
            { n: "JETLINER", v: 907, b: bJet, c: "#ffffff", s: "≈ 900" },
            { n: "GROUND AT EQUATOR", v: 1670, b: bGround, c: ACCENT, s: "≈ 1,670" },
          ].map((r) => (
            <div key={r.n} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 32, color: r.c, letterSpacing: 2, opacity: Math.min(1, r.b * 2) }}>{r.n} {r.s} KM/H</div>
              <div style={{ height: 30, width: 6 + barG(r.v) * r.b, background: r.c, borderRadius: 8, marginTop: 4, transform: r.n.startsWith("GROUND") ? `scaleY(${pop})` : undefined }} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontFamily: FONT }}>
          <div style={{ fontWeight: 700, fontSize: 70, color: "#ffffff", opacity: endA, transform: `translateY(${20 * (1 - endA)}px)`, textShadow: "0 6px 26px rgba(0,0,0,0.8)" }}>
            SHE NEVER STOPPED
          </div>
          <div style={{ fontWeight: 700, fontSize: 96, color: ACCENT, opacity: endB, transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
            NEITHER DO YOU
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "#ffffff", opacity: flash, pointerEvents: "none" }} />

      <SeriesTag name="What If" n={7} accent={ACCENT} until={HOOK.end} />
      {/* opening title */}
      <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, opacity: titleO }}>
        <div style={{ fontSize: 112, color: ACCENT, letterSpacing: -2, textShadow: "0 6px 30px rgba(40,0,30,0.8)" }}>300 KM/H</div>
        <div style={{ fontSize: 64, color: "#ffffff", lineHeight: 1.05, textShadow: "0 4px 24px rgba(40,0,30,0.85)", opacity: interpolate(t, [1.6, 1.9], [0, 1], clamp) }}>
          WHY DOESN'T SHE
          <br />
          FLY BACKWARD?
        </div>
      </div>
      <div style={{ position: "absolute", top: 1398, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 4,
        color: "rgba(255,240,225,0.85)", opacity: interpolate(t, [METER.start, METER.start + 0.3, CLIMAX.start - 0.3, CLIMAX.start], [0, 1, 1, 0], clamp) }}>
        NOT TO SCALE · SIMPLIFIED MODEL
      </div>
      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="What If" next={8} accent={ACCENT} />
    </AbsoluteFill>
  );
};
