import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/gps-listening/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#5ef0c8"; // mint
const SIGNAL = "#7cc4ff";
const WARN = "#ff5a6e";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const TIME = line("time");
const RING = line("ring");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_SAT = wordStart("hook", "satellites");
const T_BROADCAST = wordStart("time", "broadcasts");
const T_LATE = wordStart("time", "late");
const T_DELAY = wordStart("ring", "delay");
const T_RINGWORD = wordStart("ring", "ring");
const T_CLOCK = wordStart("twist", "clock");
const T_THREE = wordStart("twist", "three");
const T_MORE = wordStart("climax", "more");
const T_CANCEL = wordStart("climax", "cancels");
const T_MEET = wordStart("climax", "meet");

// ---------- world (1080 x 1920) ----------
const P = { x: 540, y: 1180 }; // the phone, on the ground
const SATS = [
  { x: 540, y: 560 },
  { x: 190, y: 700 },
  { x: 890, y: 650 },
  { x: 350, y: 480 },
];
const dist = (a: { x: number; y: number }) => Math.hypot(a.x - P.x, a.y - P.y);
const BIAS = 70; // px of extra range from a clock that is off (same for every satellite)

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div
    style={{
      position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
      fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,5,20,0.95)",
    }}
  >
    {children}
  </div>
);

const Satellite: React.FC<{ x: number; y: number; s: number; glow: number; t: number }> = ({ x, y, s, glow, t }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${8 * Math.sin(t * 0.7 + x)})`}>
    <rect x={-92} y={-16} width={62} height={32} rx={3} fill="#1b3d7a" stroke="#8fb8ff" strokeWidth={2.5} />
    <rect x={30} y={-16} width={62} height={32} rx={3} fill="#1b3d7a" stroke="#8fb8ff" strokeWidth={2.5} />
    {[-76, -60, -46, 46, 60, 76].map((lx) => (
      <line key={lx} x1={lx} y1={-16} x2={lx} y2={16} stroke="#8fb8ff" strokeWidth={1.5} opacity={0.6} />
    ))}
    <line x1={-30} y1={0} x2={30} y2={0} stroke="#cfd8e8" strokeWidth={4} />
    <rect x={-22} y={-26} width={44} height={52} rx={8} fill="#d9dee8" stroke="#ffffff" strokeWidth={2} />
    <circle cx={0} cy={34} r={9} fill={ACCENT} opacity={0.4 + 0.6 * glow} />
    <circle cx={0} cy={34} r={20 + 16 * glow} fill={ACCENT} opacity={0.25 * glow} />
  </g>
);

export const GpsListening: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- satellite appearance ----------
  const satIn = [
    spring({ frame, fps, config: { damping: 13, stiffness: 120 } }),
    spring({ frame: frame - Math.round(T_MORE * fps), fps, config: { damping: 12, stiffness: 140 } }),
    spring({ frame: frame - Math.round((T_MORE + 0.18) * fps), fps, config: { damping: 12, stiffness: 140 } }),
    spring({ frame: frame - Math.round((T_MORE + 0.36) * fps), fps, config: { damping: 12, stiffness: 140 } }),
  ];

  // ---------- phase values ----------
  const titleOut = interpolate(t, [HOOK.end - 0.35, HOOK.end], [0, 1], clamp);
  const qMark = interpolate(t, [T_BROADCAST - 0.3, T_BROADCAST], [1, 0], clamp);
  const receiveOnly = interpolate(t, [0.9, 1.3, METER.end - 0.4, METER.end], [0, 1, 1, 0], clamp);
  const packetP = interpolate(t, [T_BROADCAST, T_LATE + 0.15], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const timeTags = interpolate(t, [T_BROADCAST - 0.1, T_BROADCAST + 0.3, RING.start + 0.6, RING.start + 1.0], [0, 1, 1, 0], clamp);
  const heardTag = interpolate(t, [T_LATE + 0.1, T_LATE + 0.4, RING.start + 0.6, RING.start + 1.0], [0, 1, 1, 0], clamp);
  const ring1 = interpolate(t, [T_DELAY + 0.2, T_RINGWORD + 0.1], [0, 1], { ...clamp, easing: ease });
  const ringTag = interpolate(t, [T_RINGWORD - 0.2, T_RINGWORD + 0.2, TWIST.start + 0.2, TWIST.start + 0.6], [0, 1, 1, 0], clamp);
  const speedTag = interpolate(t, [T_DELAY + 0.3, T_DELAY + 0.7, T_RINGWORD - 0.4, T_RINGWORD], [0, 1, 1, 0], clamp);
  const inset = interpolate(t, [T_CLOCK - 0.3, T_CLOCK + 0.3, CLIMAX.start - 0.1, CLIMAX.start + 0.35], [0, 1, 1, 0], { ...clamp, easing: ease });
  const wrongSplit = interpolate(t, [T_THREE - 0.2, T_THREE + 0.6], [0, 1], { ...clamp, easing: ease });
  // climax rings: grow with the clock error, then the error is solved away
  const grow = interpolate(t, [T_MORE + 0.2, T_CANCEL - 0.1], [0, 1], { ...clamp, easing: ease });
  const cancel = interpolate(t, [T_CANCEL, T_MEET + 0.1], [0, 1], { ...clamp, easing: ease });
  const meetFlash = interpolate(t, [T_MEET, T_MEET + 0.12, T_MEET + 0.9], [0, 1, 0], clamp);
  const pinDrop = spring({ frame: frame - Math.round(T_MEET * fps), fps, config: { damping: 9, stiffness: 160 } });
  const payoffA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const payoffB = spring({ frame: frame - Math.round(wordStart("payoff", "listened") * fps), fps, config: { damping: 11, stiffness: 170 } });

  // ---------- meter: how wrong is the position? (log scale bar) ----------
  const meterIn = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 14, stiffness: 170 } });
  const meterOut = interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start - 0.05], [1, 0], clamp);
  // 0 = whole planet, 0.62 = 300 m, 1 = a few metres
  const cursor =
    t < T_THREE
      ? 0.02 * Math.sin(t * 3)
      : t < T_MEET
        ? interpolate(t, [T_THREE, T_THREE + 0.6], [0, 0.62], { ...clamp, easing: ease })
        : interpolate(t, [T_MEET, T_MEET + 0.6], [0.62, 1], { ...clamp, easing: ease });
  const cursorColor = t >= T_MEET + 0.3 ? ACCENT : t >= T_THREE ? WARN : "#ffffff";

  // ---------- camera ----------
  const zoom = 1 + 0.06 * interpolate(t, [0, HOOK.end], [1, 0], { ...clamp, easing: ease }) + 0.03 * interpolate(t, [CLIMAX.start, PAYOFF.end], [0, 1], clamp);
  const shake = 10 * Math.exp(-Math.max(0, t - T_MEET) * 7) * (t > T_MEET ? 1 : 0);
  const camera = `translate(${Math.sin(frame * 2.1) * shake}px, ${Math.cos(frame * 1.7) * shake}px) scale(${zoom})`;

  // pulses: expanding wavefronts from active satellites
  const pulses: React.ReactNode[] = [];
  SATS.forEach((s, i) => {
    const active = i === 0 ? t > 0.4 : t > T_MORE + 0.15 * i;
    if (!active) return;
    const start = i === 0 ? 0.4 : T_MORE + 0.15 * i;
    const period = 1.3;
    const R = dist(s);
    for (let k = 0; k < 3; k++) {
      const age = ((t - start) - k * period / 3 + 100 * period) % period;
      const firstAge = t - start - k * period / 3;
      if (firstAge < 0) continue;
      const r = (age / period) * (R + 40);
      pulses.push(
        <circle key={`p${i}-${k}`} cx={s.x} cy={s.y} r={Math.max(1, r)} fill="none" stroke={SIGNAL} strokeWidth={3}
          opacity={0.45 * (1 - age / period) * satIn[i] * (1 - 0.6 * inset)} />,
      );
    }
  });

  const rings: React.ReactNode[] = [];
  SATS.forEach((s, i) => {
    const R = dist(s);
    if (i === 0) {
      if (ring1 <= 0) return;
      const extra = i === 0 ? BIAS * grow * (1 - cancel) : 0;
      rings.push(
        <circle key="r0" cx={s.x} cy={s.y} r={R * ring1 + extra} fill="none" stroke={t >= T_CANCEL ? ACCENT : "#ffffff"}
          strokeWidth={5} opacity={0.9 * (1 - 0.5 * inset)} strokeDasharray={t < TWIST.start ? "0" : "14 10"} />,
      );
      return;
    }
    if (t < T_MORE + 0.15 * i) return;
    const r = interpolate(t, [T_MORE + 0.15 * i, T_MORE + 0.15 * i + 0.8], [0, R + BIAS], { ...clamp, easing: ease });
    const rr = r - BIAS * cancel;
    rings.push(
      <circle key={`r${i}`} cx={s.x} cy={s.y} r={Math.max(1, rr)} fill="none" stroke={t >= T_CANCEL ? ACCENT : WARN}
        strokeWidth={5} opacity={0.9} strokeDasharray="14 10" strokeDashoffset={-t * 40} />,
    );
  });

  // uncertainty circle around the phone: whole planet -> 300 m (clock error) -> a few metres
  const T_SHRINK = wordStart("meter", "shrink");
  const uncR =
    t < T_THREE
      ? interpolate(t, [METER.start - 0.2, T_SHRINK], [0, 1150], { ...clamp, easing: ease })
      : t < T_MEET
        ? interpolate(t, [T_THREE - 0.1, T_THREE + 0.7], [1150, 230], { ...clamp, easing: ease })
        : interpolate(t, [T_MEET - 0.05, T_MEET + 0.5], [230, 34], { ...clamp, easing: ease });
  const uncColor = t >= T_MEET ? ACCENT : WARN;
  const goalO = interpolate(t, [T_SHRINK, T_SHRINK + 0.4, T_MEET + 0.4, T_MEET + 0.7], [0, 1, 1, 0], clamp);
  const anywhereO = interpolate(t, [T_SHRINK + 0.2, T_SHRINK + 0.6, TIME.start + 0.4, TIME.start + 0.8], [0, 1, 1, 0], clamp);

  const packet = { x: SATS[0].x + (P.x - SATS[0].x) * packetP, y: SATS[0].y + (P.y - SATS[0].y) * packetP };
  const packetO = interpolate(t, [T_BROADCAST - 0.05, T_BROADCAST + 0.1, T_LATE + 0.15, T_LATE + 0.3], [0, 1, 1, 0], clamp);
  const arrived = t > T_LATE + 0.15;
  const phoneGlow = Math.max(meetFlash, arrived ? interpolate(t, [T_LATE + 0.15, T_LATE + 0.7], [1, 0], clamp) : 0);

  // satellite clock display
  const satClock = (t * 1000) % 1000;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #050b1c 0%, #0a1834 45%, #10264a 70%, #0b1a33 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("gps-listening/narration.wav")} />
      <Audio src={staticFile("gps-listening/bed.wav")} volume={0.6} />

      {/* faint grid of the sky */}
      <AbsoluteFill style={{ opacity: 0.22, backgroundImage: "radial-gradient(rgba(160,200,255,0.8) 1.5px, transparent 1.5px)", backgroundSize: "54px 54px", backgroundPosition: `${(t * 6) % 54}px 0px` }} />

      <AbsoluteFill style={{ transform: camera, transformOrigin: `${P.x}px ${P.y - 300}px` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <radialGradient id="land" cx="50%" cy="0%" r="70%">
              <stop offset="0%" stopColor="#1d5a57" />
              <stop offset="60%" stopColor="#0f3540" />
              <stop offset="100%" stopColor="#081c26" />
            </radialGradient>
          </defs>
          {/* Earth: curved ground */}
          <circle cx={540} cy={P.y + 3000} r={3000} fill="url(#land)" stroke={ACCENT} strokeOpacity={0.35} strokeWidth={4} />
          {/* city lights around the phone */}
          {Array.from({ length: 46 }).map((_, i) => {
            const a = Math.sin(i * 91.7) * 0.5 + 0.5;
            const b = Math.sin(i * 37.3 + 2) * 0.5 + 0.5;
            const x = 120 + a * 840;
            const y = P.y + 30 + b * 200;
            return <circle key={i} cx={x} cy={y} r={2 + 2 * ((i * 7) % 3)} fill="#ffd98a" opacity={0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i))} />;
          })}
          {/* uncertainty: where the phone could be */}
          {uncR > 1 && (
            <>
              <circle cx={P.x} cy={P.y} r={uncR} fill={uncColor} fillOpacity={0.1} stroke={uncColor} strokeWidth={6} strokeOpacity={0.85} />
              <circle cx={P.x} cy={P.y} r={uncR + 14 + 6 * Math.sin(t * 5)} fill="none" stroke={uncColor} strokeWidth={2} strokeOpacity={0.4} />
            </>
          )}
          <circle cx={P.x} cy={P.y} r={34} fill="none" stroke={ACCENT} strokeWidth={4} strokeDasharray="8 7" opacity={goalO} transform={`rotate(${t * 40} ${P.x} ${P.y})`} />
          {/* beam carrying the time signal */}
          <line x1={SATS[0].x} y1={SATS[0].y} x2={packet.x} y2={packet.y} stroke={SIGNAL} strokeWidth={10} strokeLinecap="round" opacity={0.5 * packetO} />
          {pulses}
          {rings}
          {/* the one signal packet that carries the time */}
          <circle cx={packet.x} cy={packet.y} r={26} fill="#ffffff" opacity={packetO} />
          <circle cx={packet.x} cy={packet.y} r={58} fill={SIGNAL} opacity={0.35 * packetO} />
          {/* the satellites */}
          {SATS.map((s, i) => (
            <Satellite key={i} x={s.x} y={s.y - 260 * (1 - Math.min(1, satIn[i]))} s={1.3 * Math.min(1, satIn[i])} glow={0.5 + 0.5 * Math.sin(t * 6 + i)} t={t} />
          ))}
          {/* meeting flash */}
          <circle cx={P.x} cy={P.y} r={40 + 220 * meetFlash} fill="none" stroke="#ffffff" strokeWidth={6} opacity={meetFlash} />
        </svg>

        {/* phone */}
        <div style={{ position: "absolute", left: P.x - 40, top: P.y - 140, width: 80, height: 140, borderRadius: 16, background: "#0d1626", border: "4px solid #dfe8f5", boxShadow: `0 0 ${20 + 60 * phoneGlow}px ${6 + 20 * phoneGlow}px rgba(94,240,200,${0.25 + 0.5 * phoneGlow})` }}>
          <div style={{ position: "absolute", left: 26, top: 56, width: 20, height: 20, borderRadius: "50%", background: "#4aa3ff", boxShadow: "0 0 14px 4px rgba(74,163,255,0.8)", transform: `scale(${1 + 0.25 * Math.sin(t * 6)})` }} />
        </div>
        {/* location pin once the rings meet */}
        {t > T_MEET && (
          <div style={{ position: "absolute", left: P.x - 34, top: P.y - 250 - 80 * (1 - Math.min(1, pinDrop)), width: 68, height: 68, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: ACCENT, boxShadow: "0 6px 20px rgba(0,0,0,0.6)", opacity: Math.min(1, pinDrop * 2) }}>
            <div style={{ position: "absolute", left: 20, top: 20, width: 28, height: 28, borderRadius: "50%", background: "#06231b" }} />
          </div>
        )}
        <Tag x={P.x} y={P.y - 205} color="#ffffff" o={qMark} size={92}>?</Tag>
        <Tag x={P.x} y={880} color={WARN} o={anywhereO} size={40}>YOU: ANYWHERE ON EARTH</Tag>
        <Tag x={P.x + 150} y={P.y - 40} color={ACCENT} o={goalO * (t < TIME.start ? 1 : 0)} size={34}>GOAL</Tag>
        <Tag x={packet.x + 150} y={packet.y} color="#ffffff" o={packetO} size={36}>THE TIME</Tag>
        <Tag x={P.x} y={P.y + 70} color={ACCENT} o={receiveOnly} size={38}>RECEIVE ONLY · SENDS NOTHING</Tag>
        <Tag x={SATS[0].x} y={SATS[0].y - 85} color="#ffffff" o={timeTags} size={36}>
          SENT 12:00:00.{String(Math.floor(satClock)).padStart(3, "0")}
        </Tag>
        <Tag x={P.x} y={P.y + 70} color={SIGNAL} o={heardTag} size={38}>HEARD ≈0.07 S LATE</Tag>
        <Tag x={300} y={900} color="#ffffff" o={speedTag} size={38}>DELAY × LIGHT SPEED</Tag>
        <Tag x={300} y={950} color={SIGNAL} o={speedTag} size={36}>= DISTANCE</Tag>
        <Tag x={P.x} y={P.y + 70} color="#ffffff" o={ringTag} size={38}>YOU: SOMEWHERE ON THIS RING</Tag>
        <div style={{ position: "absolute", left: P.x, top: P.y + 140, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 3, color: "#06231b", background: ACCENT, padding: "8px 22px", borderRadius: 30, whiteSpace: "nowrap", opacity: interpolate(t, [T_MEET + 0.2, T_MEET + 0.5], [0, 1], clamp) * meterOut }}>FOUND: WITHIN METRES</div>
        <Tag x={200} y={1010} color={WARN} o={interpolate(t, [T_MORE + 0.5, T_MORE + 0.9, T_CANCEL, T_CANCEL + 0.3], [0, 1, 1, 0], clamp)} size={36}>CLOCK ERROR</Tag>
      </AbsoluteFill>

      {/* ---------- twist inset: a street map, true spot vs wrong spot ---------- */}
      {inset > 0 && (
        <div style={{ position: "absolute", left: 540 - 300, top: 560, width: 600, height: 520, borderRadius: 36, overflow: "hidden", border: `5px solid ${WARN}`, background: "#0c1b2c", opacity: inset, transform: `scale(${0.85 + 0.15 * inset})`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
          <svg width={600} height={520} style={{ position: "absolute" }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 75 + 10} y1={0} x2={i * 75 + 10} y2={520} stroke="#2f5873" strokeWidth={i % 3 === 0 ? 14 : 6} />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 75 + 20} x2={600} y2={i * 75 + 20} stroke="#2f5873" strokeWidth={i % 3 === 1 ? 14 : 6} />
            ))}
            {/* true spot */}
            <circle cx={160} cy={320} r={22} fill="#4aa3ff" />
            <circle cx={160} cy={320} r={40 + 8 * Math.sin(t * 6)} fill="none" stroke="#4aa3ff" strokeWidth={3} />
            {/* wrong spot drifts away */}
            <line x1={160} y1={320} x2={160 + 300 * wrongSplit} y2={320 - 120 * wrongSplit} stroke={WARN} strokeWidth={4} strokeDasharray="10 8" opacity={wrongSplit} />
            <circle cx={160 + 300 * wrongSplit} cy={320 - 120 * wrongSplit} r={24} fill={WARN} opacity={0.4 + 0.6 * wrongSplit} />
            {/* scale bar */}
            <line x1={150} y1={470} x2={150 + 323} y2={470} stroke="#ffffff" strokeWidth={6} opacity={wrongSplit} />
          </svg>
          <Tag x={160} y={250} color="#9fd0ff" o={1} size={34}>YOU</Tag>
          <Tag x={420} y={118} color={WARN} o={wrongSplit} size={34}>PHONE THINKS</Tag>
          <Tag x={311} y={430} color="#ffffff" o={wrongSplit} size={36}>300 M ≈ 1,000 FT</Tag>
          <Tag x={300} y={46} color={WARN} o={interpolate(t, [T_CLOCK, T_CLOCK + 0.4], [0, 1], clamp)} size={36}>CLOCK OFF BY 0.000001 S</Tag>
        </div>
      )}

      {/* ---------- HUD ---------- */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 86, lineHeight: 1.04, letterSpacing: -2, color: "#fff", opacity: 1 - titleOut, transform: `translateY(${-30 * titleOut}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        HOW DOES YOUR PHONE
        <br />
        <span style={{ color: ACCENT }}>FIND YOU?</span>
      </div>

      {/* error meter */}
      <div style={{ position: "absolute", top: 190, left: 90, width: 900, fontFamily: FONT, opacity: Math.min(1, meterIn) * meterOut * (t > HOOK.end - 0.2 ? 1 : 0), transform: `translateY(${20 * (1 - Math.min(1, meterIn))}px)` }}>
        <div style={{ fontWeight: 700, fontSize: 36, letterSpacing: 6, color: "rgba(255,255,255,0.85)", textAlign: "center" }}>HOW WRONG IS YOUR DOT?</div>
        <div style={{ position: "relative", marginTop: 26, height: 30, borderRadius: 15, background: "linear-gradient(90deg, #ff5a6e 0%, #ffb14e 55%, #5ef0c8 100%)", opacity: 0.9 }}>
          <div style={{ position: "absolute", left: `${cursor * 100}%`, top: -18, width: 30, height: 66, marginLeft: -15, borderRadius: 10, background: cursorColor, border: "4px solid #0a1834", boxShadow: "0 0 20px rgba(255,255,255,0.6)" }} />
        </div>
        <div style={{ position: "relative", height: 50, marginTop: 16, fontWeight: 700, fontSize: 34, letterSpacing: 2 }}>
          <span style={{ position: "absolute", left: 0, color: "#ffb0b8" }}>WHOLE PLANET</span>
          <span style={{ position: "absolute", left: "62%", transform: "translateX(-50%)", color: "#ffd59a", opacity: t > T_THREE ? 1 : 0.35 }}>300 M</span>
          <span style={{ position: "absolute", right: 0, color: ACCENT }}>A FEW M</span>
        </div>
      </div>

      {/* payoff */}
      <div style={{ position: "absolute", top: 220, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 60, letterSpacing: 4, color: "#ffffff", opacity: Math.min(1, payoffA), transform: `translateY(${24 * (1 - Math.min(1, payoffA))}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          IT NEVER ASKED.
        </div>
        <div style={{ fontWeight: 700, fontSize: 116, letterSpacing: -2, color: ACCENT, opacity: Math.min(1, payoffB), transform: `scale(${0.8 + 0.2 * payoffB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          IT LISTENED.
        </div>
      </div>

      <SeriesTag name="How It Works" n={7} accent={ACCENT} until={HOOK.end} />
      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="How It Works" next={8} accent={ACCENT} />
    </AbsoluteFill>
  );
};
