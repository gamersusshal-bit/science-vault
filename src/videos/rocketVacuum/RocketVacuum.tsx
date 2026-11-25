import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/rocket-vacuum/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#ff9a3c";
const GAS = "#ffd27a";
const AIRC = "#6fc3ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const SEAL = line("seal");
const OPEN = line("open");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_IGNITE = 0.25;
const T_SEAL = wordStart("seal", "seal");
const T_EVERY = wordStart("seal", "every");
const T_CANCEL = wordStart("seal", "cancel");
const T_OPEN = wordStart("open", "open");
const T_ESCAPES = wordStart("open", "escapes");
const T_FRONT = wordStart("open", "front");
const T_AIR = wordStart("twist", "air");
const T_EMPTY = wordStart("climax", "empty");
const T_HARDER = wordStart("climax", "harder");

// ---------- Engine cutaway geometry (screen px) ----------
const CH = { x0: 330, x1: 750, y0: 580, y1: 900 }; // combustion chamber
const THROAT = { y: 960, half: 62 };
const EXIT = { y: 1270, half: 250 };

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; pill?: boolean; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, pill = false, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.95)",
    ...(pill ? { background: "rgba(6,8,14,0.85)", padding: "6px 20px", borderRadius: 14, border: `2px solid ${color}` } : {}) }}>
    {children}
  </div>
);

const Arrow: React.FC<{ x: number; y: number; dx: number; dy: number; len: number; color: string; w?: number; o?: number }> = ({
  x, y, dx, dy, len, color, w = 10, o = 1,
}) => {
  if (len <= 2) return null;
  const ex = x + dx * len;
  const ey = y + dy * len;
  const hs = w * 2.4;
  const nx = -dy;
  const ny = dx;
  const bx = ex - dx * hs * 1.1;
  const by = ey - dy * hs * 1.1;
  return (
    <g opacity={o}>
      <line x1={x} y1={y} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${ex},${ey} ${bx + nx * hs},${by + ny * hs} ${bx - nx * hs},${by - ny * hs}`} fill={color} />
    </g>
  );
};

// Bounce a coordinate inside [a, b] (triangle wave)
const bounce = (p: number, a: number, b: number) => {
  const L = b - a;
  const m = ((p % (2 * L)) + 2 * L) % (2 * L);
  return a + (m < L ? m : 2 * L - m);
};

export const RocketVacuum: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Story state ----------
  const ignite = t >= T_IGNITE;
  const sealed = t >= T_SEAL && t < T_OPEN;
  const plugIn = interpolate(t, [T_SEAL, T_SEAL + 0.35], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const plugOut = interpolate(t, [T_OPEN, T_OPEN + 0.45], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const plug = t < T_OPEN ? plugIn : 1 - plugOut;
  const thrusting = ignite && !(t >= T_SEAL + 0.2 && t < T_OPEN + 0.2);
  const airOn = interpolate(t, [T_AIR - 0.5, T_AIR + 0.1, T_EMPTY - 0.2, T_EMPTY + 0.4], [0, 1, 1, 0], clamp);

  // Speed meter (km/h). Climbs while thrusting, flat while sealed, hits orbit on "harder".
  const speed = interpolate(
    t,
    [0, METER.end, T_SEAL + 0.2, T_OPEN + 0.2, TWIST.end, T_HARDER],
    [20000, 22400, 22600, 22600, 25200, 28000],
    { ...clamp },
  );
  const orbit = t >= T_HARDER;

  // ---------- Views: full rocket (A) and engine cutaway (B) ----------
  const toB = interpolate(t, [SEAL.start - 0.6, SEAL.start + 0.1], [0, 1], { ...clamp, easing: ease });
  const backA = interpolate(t, [CLIMAX.start + 1.1, CLIMAX.start + 1.8], [0, 1], { ...clamp, easing: ease });
  const viewB = toB * (1 - backA);
  const aZoom = (1 + 2.2 * viewB) * (1 + 0.14 * interpolate(t, [METER.start, SEAL.start - 0.6], [0, 1], { ...clamp, easing: ease }) * (1 - backA)); // A zooms into its engine as B fades in

  // Stars stream down faster as the rocket speeds up (and stop while sealed... no: it coasts, so they keep moving)
  const starShift = t * 520 + 0;
  const stars = Array.from({ length: 110 }, (_, i) => {
    const x = random(`sx${i}`) * 1080;
    const y0 = random(`sy${i}`) * 2100;
    const z = 0.3 + random(`sz${i}`) * 0.7;
    const y = ((y0 + starShift * z) % 2100) - 90;
    return { x, y, z };
  });

  // Rocket (A)
  const rx = 540;
  const rTop = 470;
  const rBot = 1090;
  const shake = thrusting ? Math.sin(frame * 3.1) * 2.5 : 0;
  const igniteKick = spring({ frame: frame - Math.round(T_IGNITE * fps), fps, config: { damping: 9, stiffness: 160 } });
  const rise = ignite ? -40 * Math.min(1, igniteKick) : 0;
  const flameLen = (thrusting ? 1 : 0) * (250 + 30 * Math.sin(frame * 1.7)) * interpolate(t, [T_IGNITE, T_IGNITE + 0.2], [0, 1], clamp);
  const vacuumBloom = interpolate(t, [T_EMPTY, T_HARDER], [0, 1], { ...clamp, easing: ease });
  const flameW = 110 + 230 * vacuumBloom * backA;
  const igniteFlash = interpolate(t, [T_IGNITE, T_IGNITE + 0.5], [1, 0], clamp) * (ignite ? 1 : 0);

  // ---------- Gas molecules in the chamber (B) ----------
  const N = 70;
  const mols = Array.from({ length: N }, (_, i) => {
    const vx = (random(`vx${i}`) - 0.5) * 900;
    const vy = (random(`vy${i}`) - 0.5) * 900;
    const px = random(`px${i}`) * 2000;
    const py = random(`py${i}`) * 2000;
    return {
      x: bounce(px + vx * t, CH.x0 + 14, CH.x1 - 14),
      y: bounce(py + vy * t, CH.y0 + 14, CH.y1 - 14),
    };
  });
  // Exhaust stream out of the nozzle while open (B)
  const streaming = t >= T_OPEN + 0.15 || t < T_SEAL;
  const exhaust = Array.from({ length: 46 }, (_, i) => {
    const life = 0.55;
    const ph = (t / life + random(`ep${i}`)) % 1;
    const spread = (random(`es${i}`) - 0.5) * 2;
    const yy = THROAT.y - 20 + ph * (EXIT.y - THROAT.y + 260);
    const halfAt = interpolate(yy, [THROAT.y, EXIT.y, EXIT.y + 260], [THROAT.half, EXIT.half, EXIT.half + 260 * (0.2 + 0.9 * vacuumBloom - 0.25 * airOn)], clamp);
    return { x: 540 + spread * halfAt * 0.85, y: yy, o: 1 - ph * 0.8 };
  });
  // Air molecules crowding the nozzle exit at the launch pad (twist)
  const air = Array.from({ length: 34 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const r = random(`ar${i}`);
    const jitter = Math.sin(t * 6 + i) * 8;
    return { x: 540 + side * (EXIT.half + 30 + r * 150) + jitter, y: EXIT.y - 140 + random(`ay${i}`) * 260 + Math.cos(t * 5 + i) * 8 };
  });

  // Pressure arrows on the chamber walls
  const pIn = interpolate(t, [T_SEAL + 0.4, T_EVERY], [0, 1], { ...clamp, easing: ease });
  const pulse = 1 + 0.08 * Math.sin(t * 9);
  const sideLen = 70 * pIn * pulse;
  const plugArrow = 90 * pIn * pulse * (1 - plugOut);
  const frontBig = interpolate(t, [T_ESCAPES, T_FRONT], [0, 1], { ...clamp, easing: ease });
  const frontLen = (90 * pIn + 0) * pulse + 110 * frontBig;
  const arrowsO = interpolate(t, [TWIST.start, TWIST.start + 0.5], [1, 0], clamp);
  const cancelO = interpolate(t, [T_CANCEL - 0.2, T_CANCEL + 0.2, T_OPEN - 0.1, T_OPEN + 0.2], [0, 1, 1, 0], clamp);
  const pushO = interpolate(t, [T_FRONT - 0.5, T_FRONT, TWIST.start + 0.3, TWIST.start + 0.8], [0, 1, 1, 0], clamp);

  // ---------- HUD ----------
  const titleO = interpolate(t, [HOOK.end - 0.3, HOOK.end], [1, 0], clamp);
  const meterIn = interpolate(t, [METER.start - 0.2, METER.start + 0.3], [0, 1], clamp);
  const meterOut = interpolate(t, [PAYOFF.start - 0.2, PAYOFF.start + 0.2], [1, 0], clamp);
  const meterO = meterIn * meterOut;
  const orbitPop = spring({ frame: frame - Math.round(T_HARDER * fps), fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  const MAXS = 30000;
  const thrustO = interpolate(t, [TWIST.start + 0.4, TWIST.start + 0.9, CLIMAX.start + 1.0, CLIMAX.start + 1.5], [0, 1, 1, 0], clamp);
  const padBar = interpolate(t, [TWIST.start + 0.5, T_AIR + 0.3], [0, 0.78], { ...clamp, easing: ease });
  const spaceBar = interpolate(t, [T_EMPTY - 0.3, T_EMPTY + 0.5], [0, 0.88], { ...clamp, easing: ease });
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "own") * fps), fps, config: { damping: 11, stiffness: 170 } });
  const payArrows = interpolate(t, [PAYOFF.start, PAYOFF.start + 0.6], [0, 1], { ...clamp, easing: ease });

  const skyTint = airOn * viewB;

  return (
    <AbsoluteFill style={{ background: "#03050b", overflow: "hidden" }}>
      <Audio src={staticFile("rocket-vacuum/narration.wav")} />
      <Audio src={staticFile("rocket-vacuum/bed.wav")} volume={0.6} />

      {/* Space backdrop with Earth's limb far below */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 120%, #1b3f73 0%, #0a1630 30%, #04060d 62%)" }} />
      <div style={{ position: "absolute", left: -600, top: 1650 + t * 14, width: 2280, height: 1200, borderRadius: "50%",
        background: "radial-gradient(ellipse at 50% 0%, #6fb6ff 0%, #2d6fc0 8%, #123a6e 25%, #071a33 60%)",
        boxShadow: "0 -20px 80px 20px rgba(110,180,255,0.35)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {stars.map((s, i) => (
          <line key={i} x1={s.x} y1={s.y} x2={s.x} y2={s.y - 6 - 30 * s.z * (speed / 28000)} stroke="#ffffff" strokeWidth={1.5 + s.z * 1.5} opacity={0.35 + 0.5 * s.z} />
        ))}
      </svg>

      {/* ================= VIEW A: the whole rocket ================= */}
      <AbsoluteFill style={{ opacity: 1 - viewB, transform: `scale(${aZoom * (1 - 0.3 * payArrows)})`, transformOrigin: `540px ${1130 + 120 * payArrows}px` }}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="body" x1="0" x2="1">
              <stop offset="0%" stopColor="#9aa3b0" />
              <stop offset="35%" stopColor="#f4f6f9" />
              <stop offset="100%" stopColor="#8d96a3" />
            </linearGradient>
            <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#ffe6a3" />
              <stop offset="60%" stopColor={ACCENT} stopOpacity={0.85} />
              <stop offset="100%" stopColor="#ff4d1a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <g transform={`translate(${shake} ${rise})`}>
            {/* flame */}
            {flameLen > 0 && (
              <path
                d={(() => {
                  const y0 = rBot + 44;
                  const w = flameW / 2 + Math.sin(frame * 2.3) * 6;
                  const L = flameLen;
                  return `M ${rx - 60} ${y0} C ${rx - w} ${y0 + L * 0.25}, ${rx - w * 0.8} ${y0 + L * 0.6}, ${rx} ${y0 + L} C ${rx + w * 0.8} ${y0 + L * 0.6}, ${rx + w} ${y0 + L * 0.25}, ${rx + 60} ${y0} Z`;
                })()}
                fill="url(#flame)"
              />
            )}
            {/* engine bell */}
            <path d={`M ${rx - 34} ${rBot - 10} L ${rx - 66} ${rBot + 48} L ${rx + 66} ${rBot + 48} L ${rx + 34} ${rBot - 10} Z`} fill="#3c434f" stroke="#1d2129" strokeWidth={3} />
            {/* fins */}
            <path d={`M ${rx - 80} ${rBot - 190} L ${rx - 160} ${rBot - 10} L ${rx - 80} ${rBot - 30} Z`} fill={ACCENT} />
            <path d={`M ${rx + 80} ${rBot - 190} L ${rx + 160} ${rBot - 10} L ${rx + 80} ${rBot - 30} Z`} fill={ACCENT} />
            {/* body */}
            <rect x={rx - 80} y={rTop + 150} width={160} height={rBot - rTop - 150} rx={10} fill="url(#body)" />
            <path d={`M ${rx - 80} ${rTop + 152} Q ${rx - 70} ${rTop + 20} ${rx} ${rTop - 40} Q ${rx + 70} ${rTop + 20} ${rx + 80} ${rTop + 152} Z`} fill="url(#body)" />
            <rect x={rx - 80} y={rTop + 330} width={160} height={26} fill={ACCENT} />
            <rect x={rx - 80} y={rBot - 120} width={160} height={18} fill="#2b313b" />
            <circle cx={rx} cy={rTop + 240} r={30} fill="#1a2a44" stroke="#c9d2de" strokeWidth={6} />
          </g>
          {igniteFlash > 0 && <circle cx={rx} cy={rBot + 60} r={60 + 260 * (1 - igniteFlash)} fill="#fff1c9" opacity={0.7 * igniteFlash} />}
        </svg>
      </AbsoluteFill>
      {/* payoff arrows: exhaust thrown down, rocket pushed up */}
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: payArrows }}>
        <Arrow x={870} y={980} dx={0} dy={1} len={260 * payArrows} color={GAS} w={12} />
        <Arrow x={870} y={900} dx={0} dy={-1} len={260 * payArrows} color={ACCENT} w={12} />
      </svg>
      <Tag x={975} y={1130} color={GAS} o={payArrows} size={30}>EXHAUST</Tag>
      <Tag x={975} y={700} color={ACCENT} o={payArrows} size={30}>ROCKET</Tag>

      {/* ================= VIEW B: engine cutaway ================= */}
      <AbsoluteFill style={{ opacity: viewB, transform: `scale(${0.6 + 0.4 * toB})`, transformOrigin: "540px 1000px" }}>
        <AbsoluteFill style={{ background: `rgba(70,140,210,${0.28 * skyTint})` }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="hot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a1d0a" />
              <stop offset="100%" stopColor="#7a2c0c" />
            </linearGradient>
          </defs>
          {/* chamber + nozzle walls */}
          <path
            d={`M ${CH.x0} ${CH.y1} L ${CH.x0} ${CH.y0 + 40} Q ${CH.x0} ${CH.y0} ${CH.x0 + 40} ${CH.y0} L ${CH.x1 - 40} ${CH.y0} Q ${CH.x1} ${CH.y0} ${CH.x1} ${CH.y0 + 40} L ${CH.x1} ${CH.y1}
                Q ${CH.x1} ${THROAT.y - 30} ${540 + THROAT.half} ${THROAT.y} Q ${540 + EXIT.half * 0.6} ${EXIT.y - 140} ${540 + EXIT.half} ${EXIT.y}
                L ${540 - EXIT.half} ${EXIT.y} Q ${540 - EXIT.half * 0.6} ${EXIT.y - 140} ${540 - THROAT.half} ${THROAT.y} Q ${CH.x0} ${THROAT.y - 30} ${CH.x0} ${CH.y1} Z`}
            fill="url(#hot)" stroke="#c9d2de" strokeWidth={14} strokeLinejoin="round"
          />
          {/* exhaust */}
          {streaming && exhaust.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r={9} fill={GAS} opacity={e.o * 0.85} />)}
          {/* gas molecules */}
          {mols.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={10} fill={GAS} />)}
          {/* the plug */}
          {plug > 0.01 && (
            <g transform={`translate(${(1 - plug) * -520} ${plugOut * 80})`}>
              <rect x={540 - THROAT.half - 40} y={THROAT.y - 34} width={THROAT.half * 2 + 80} height={60} rx={10} fill="#5b6472" stroke="#e1e6ee" strokeWidth={5} />
              <rect x={540 - 30} y={THROAT.y - 20} width={60} height={32} rx={6} fill="#3a414c" />
            </g>
          )}
          {/* pressure arrows */}
          <g opacity={arrowsO}>
            {[400, 540, 680].map((x) => (
              <Arrow key={x} x={x} y={CH.y0 - 8} dx={0} dy={-1} len={x === 540 ? frontLen : 90 * pIn * pulse + 40 * frontBig} color={x === 540 && frontBig > 0.05 ? ACCENT : "#ffffff"} w={x === 540 ? 10 + 6 * frontBig : 10} />
            ))}
            {[660, 800].map((y) => (
              <React.Fragment key={y}>
                <Arrow x={CH.x0 - 8} y={y} dx={-1} dy={0} len={sideLen} color="#ffffff" />
                <Arrow x={CH.x1 + 8} y={y} dx={1} dy={0} len={sideLen} color="#ffffff" />
              </React.Fragment>
            ))}
            <Arrow x={540} y={THROAT.y + 30} dx={0} dy={1} len={plugArrow} color="#ffffff" />
          </g>
          {/* air at the launch pad pushing back into the nozzle */}
          {airOn > 0 && (
            <g opacity={airOn}>
              {air.map((a, i) => <circle key={i} cx={a.x} cy={a.y} r={11} fill={AIRC} />)}
              <Arrow x={540 - EXIT.half - 120} y={EXIT.y + 30} dx={0.75} dy={-0.66} len={110} color={AIRC} w={9} />
              <Arrow x={540 + EXIT.half + 120} y={EXIT.y + 30} dx={-0.75} dy={-0.66} len={110} color={AIRC} w={9} />
            </g>
          )}
        </svg>
        <Tag pill x={540} y={CH.y0 + 50} color="#ffffff" o={interpolate(t, [T_SEAL + 0.3, T_SEAL + 0.6, T_OPEN - 0.2, T_OPEN], [0, 1, 1, 0], clamp)} size={40}>
          SEALED
        </Tag>
        <Tag pill x={540} y={1345} color="#ffffff" o={cancelO} size={44}>PUSHES CANCEL</Tag>
        <Tag pill x={540} y={1345} color={GAS} o={interpolate(t, [T_ESCAPES, T_ESCAPES + 0.3, T_FRONT - 0.4, T_FRONT - 0.1], [0, 1, 1, 0], clamp)} size={42}>
          GAS ESCAPES
        </Tag>
        <Tag pill x={540} y={335} color={ACCENT} o={pushO} size={40}>UNBALANCED PUSH</Tag>
        <Tag pill x={540} y={1345} color={AIRC} o={airOn * interpolate(t, [T_AIR, T_AIR + 0.3], [0, 1], clamp)} size={40}>
          AIR PUSHES BACK
        </Tag>
        <Tag pill x={540} y={CH.y0 + 50} color={AIRC} o={airOn} size={34}>AT THE LAUNCH PAD</Tag>
      </AbsoluteFill>

      {/* ================= HUD ================= */}
      <SeriesTag name="How It Works" n={6} accent={ACCENT} until={HOOK.end} />
      <div style={{ position: "absolute", top: 225, width: "100%", textAlign: "center", fontFamily: FONT, opacity: titleO }}>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          NO AIR UP HERE
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: 1, color: ACCENT, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          SO WHAT'S IT PUSHING ON?
        </div>
      </div>

      {/* Speed meter */}
      <div style={{ position: "absolute", left: 100, top: 160, width: 880, height: 130, fontFamily: FONT, opacity: meterO }}>
        <div style={{ position: "absolute", left: 0, top: 0, fontSize: 32, fontWeight: 500, letterSpacing: 5, color: "rgba(255,255,255,0.85)" }}>SPEED</div>
        <div style={{ position: "absolute", right: 0, top: -8, fontSize: 48, fontWeight: 700, fontVariantNumeric: "tabular-nums",
          color: orbit ? "#7dff9a" : "#ffffff", transform: `scale(${orbit ? 1 + 0.2 * (1 - Math.min(1, orbitPop)) : 1})`, transformOrigin: "right center" }}>
          {Math.round(speed / 100) * 100 >= 28000 ? "28,000" : (Math.round(speed / 100) * 100).toLocaleString("en-US")} KM/H
        </div>
        <div style={{ position: "absolute", left: 0, top: 58, width: 880, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)" }} />
        <div style={{ position: "absolute", left: 0, top: 58, width: (880 * speed) / MAXS, height: 30, borderRadius: 15,
          background: orbit ? "#7dff9a" : ACCENT, boxShadow: `0 0 18px ${orbit ? "#7dff9a" : ACCENT}` }} />
        <div style={{ position: "absolute", left: (880 * 28000) / MAXS - 2, top: 46, width: 4, height: 54, background: "#7dff9a" }} />
        <div style={{ position: "absolute", left: (880 * 28000) / MAXS, top: 98, transform: "translateX(-60%)", fontSize: 30, fontWeight: 700, letterSpacing: 3, color: "#7dff9a" }}>
          ORBIT
        </div>
        <div style={{ position: "absolute", left: 0, top: 98, fontSize: 30, fontWeight: 700, letterSpacing: 3, color: "#ffffff",
          opacity: interpolate(t, [T_SEAL + 0.3, T_SEAL + 0.6, T_OPEN, T_OPEN + 0.3], [0, 1, 1, 0], clamp) }}>
          NO PUSH: NOT SPEEDING UP
        </div>
      </div>

      {/* Thrust comparison */}
      <div style={{ position: "absolute", left: 100, top: 330, width: 880, fontFamily: FONT, opacity: thrustO }}>
        {[
          { label: "THRUST AT LAUNCH PAD", v: padBar, c: AIRC },
          { label: "THRUST IN SPACE", v: spaceBar, c: ACCENT },
        ].map((b, i) => (
          <div key={b.label} style={{ position: "relative", height: 74 }}>
            <div style={{ position: "absolute", left: 0, top: i * 4, height: 56, width: 880 * b.v, borderRadius: 10, background: b.c, opacity: 0.9 }} />
            <div style={{ position: "absolute", left: 18, top: 10 + i * 4, fontSize: 32, fontWeight: 700, letterSpacing: 2, color: "#0a0a12", whiteSpace: "nowrap", opacity: b.v > 0.5 ? 1 : 0 }}>
              {b.label}
            </div>
          </div>
        ))}
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 180, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: 4, color: "#ffffff", opacity: Math.min(1, endA),
          transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`, textShadow: "0 4px 20px rgba(0,0,0,0.9)" }}>
          IT PUSHES ON
        </div>
        <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: ACCENT, opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          ITS OWN
          <br />
          EXHAUST
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="How It Works" next={7} accent={ACCENT} />
    </AbsoluteFill>
  );
};
