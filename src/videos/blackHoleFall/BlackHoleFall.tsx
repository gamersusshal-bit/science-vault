import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { Starfield } from "../../primitives/Starfield";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/black-hole-fall/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z]/g, "").startsWith(w))!.start;

const ACCENT = "#c792ff";
const HOT = "#ff9a5c";
const CYAN = "#7fe3ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

// Physics (labelled simplified model): 10 solar masses, 1.8 m person, a = 2GML/r^3.
const GM = 1.327e21; // m^3/s^2 for 10 Suns
const RS_KM = 29.5;
const tideG = (aboveKm: number) => (2 * GM * 1.8) / Math.pow((aboveKm + RS_KM) * 1000, 3) / 9.81;

const HOOK = line("hook");
const METER = line("meter");
const STRETCH = line("stretch");
const SPAG = line("spaghetti");
const TWIST = line("twist");
const GIANT = line("giant");
const PAYOFF = line("payoff");
const T_JUMP = wordStart("hook", "jump");
const T_HIT = wordStart("giant", "piece");
const T_OUT = wordStart("giant", "out");

const CX = 540;
const HOLE_Y = 1090;
const HOLE_R = 120;

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,0,0,0.95)" }}>
    {children}
  </div>
);

// A generic astronaut: helmet, visor, body, legs. Stretch s >= 1 lengthens it and thins it.
const Astronaut: React.FC<{ x: number; y: number; s: number; rot: number; glow: number }> = ({ x, y, s, rot, glow }) => {
  const thin = 1 / Math.sqrt(s);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${thin} ${s})`}>
      <ellipse cx={0} cy={0} rx={60} ry={70} fill={`rgba(199,146,255,${0.25 * glow})`} />
      <rect x={-20} y={-6} width={40} height={52} rx={14} fill="#e9ecf5" />
      <rect x={-26} y={0} width={12} height={36} rx={6} fill="#d5d9e6" />
      <rect x={14} y={0} width={12} height={36} rx={6} fill="#d5d9e6" />
      <rect x={-17} y={40} width={14} height={36} rx={6} fill="#d5d9e6" />
      <rect x={3} y={40} width={14} height={36} rx={6} fill="#d5d9e6" />
      <circle cx={0} cy={-26} r={22} fill="#f2f4fa" />
      <ellipse cx={0} cy={-26} rx={14} ry={10} fill="#3b2a66" />
      <ellipse cx={-4} cy={-29} rx={5} ry={3} fill="rgba(255,255,255,0.6)" />
    </g>
  );
};

export const BlackHoleFall: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Phase: small hole (0 .. twist), giant hole (twist .. end) ----------
  const toGiant = interpolate(t, [TWIST.start + 1.2, GIANT.start + 0.2], [0, 1], { ...clamp, easing: ease });

  // Distance above the small hole's edge, km: 5000 at the meter line, ~420 when the twist starts.
  const kmSmall = interpolate(t, [METER.start, SPAG.end], [5000, 420], { ...clamp, easing: Easing.in(Easing.quad) });
  // Giant: same 5000 km start, reaches the edge at T_HIT.
  const kmGiant = interpolate(t, [GIANT.start - 0.2, T_HIT], [5000, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const km = t < GIANT.start - 0.2 ? kmSmall : kmGiant;
  const g = t < GIANT.start - 0.2 ? tideG(kmSmall) : 0.0000002; // giant's tide is negligible

  // Visual stretch of the small-hole faller.
  const stretchVis =
    t < STRETCH.start ? 1 : 1 + Math.min(6.5, 0.85 * Math.pow(Math.max(0, Math.log10(tideG(kmSmall) / 3)), 1.55));

  // ---------- Faller position ----------
  const jump = spring({ frame: frame - Math.round(T_JUMP * fps), fps, config: { damping: 14, stiffness: 90 } });
  const screenAbove = (k: number) => 70 + 330 * Math.sqrt(k / 5000);
  const yStart = HOLE_Y - HOLE_R - screenAbove(5000);
  const ySmall = t < METER.start ? interpolate(jump, [0, 1], [500, yStart]) : HOLE_Y - HOLE_R - screenAbove(kmSmall);
  const xSmall = interpolate(jump, [0, 1], [300, CX]);
  const spin = (t < METER.start ? interpolate(t, [T_JUMP, METER.start], [0, 360], clamp) : 0) + Math.sin(t * 1.3) * 22 * (1 - interpolate(t, [STRETCH.start, STRETCH.start + 1], [0, 1], clamp));

  // Giant world: edge is a huge arc whose top sits at EDGE_Y.
  const EDGE_Y = 1120;
  const GR = 2600;
  const yGiant = EDGE_Y - 40 - 520 * Math.sqrt(kmGiant / 5000) + (t > T_HIT ? (t - T_HIT) * 70 : 0);

  // ---------- Camera ----------
  const zoomIn = interpolate(t, [STRETCH.start - 0.3, STRETCH.start + 0.8, SPAG.end - 0.2, TWIST.start + 0.6], [0, 1, 1, 0], {
    ...clamp, easing: ease,
  });
  const push = interpolate(t, [0, METER.end], [0.8, 1.14], { ...clamp, easing: Easing.out(Easing.quad) });
  const camScale = push + 0.4 * zoomIn;
  const camFocusY = ySmall + 40;
  const shake = 10 * Math.exp(-Math.max(0, t - T_JUMP) * 5) + 18 * (t > T_HIT ? Math.exp(-(t - T_HIT) * 5) : 0);
  const camTx = 540 - CX * camScale + Math.sin(frame * 2.1) * shake;
  const camTy = 930 - (930 + (camFocusY - 930) * zoomIn) * camScale + Math.cos(frame * 1.7) * shake;
  const camera = `translate(${camTx}px, ${camTy}px) scale(${camScale})`;
  const sx = (wx: number) => camTx + wx * camScale;
  const sy = (wy: number) => camTy + wy * camScale;

  // Small hole shrinks away during the twist; giant rises.
  const smallScale = interpolate(toGiant, [0, 1], [1, 0.12]);
  const smallShiftX = interpolate(toGiant, [0, 1], [0, -330]);
  const smallShiftY = interpolate(toGiant, [0, 1], [0, -560]);
  const giantRise = interpolate(toGiant, [0, 1], [900, 0]);

  // ---------- Labels ----------
  const fadeIO = (a: number, b: number, c: number, d: number) => interpolate(t, [a, b, c, d], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [HOOK.end - 0.1, HOOK.end + 0.3], [1, 0], clamp);
  const meterO = interpolate(t, [METER.start, METER.start + 0.4], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start], [1, 0], clamp);
  const meterPop = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 12, stiffness: 160 } });
  const sunsO = fadeIO(wordStart("meter", "weighs"), wordStart("meter", "weighs") + 0.3, STRETCH.start + 0.2, STRETCH.start + 0.6);
  const arrowsO = fadeIO(STRETCH.start + 0.2, STRETCH.start + 0.6, SPAG.start + 1.2, SPAG.start + 1.6);
  const spagO = fadeIO(wordStart("spaghetti", "like") - 0.1, wordStart("spaghetti", "like") + 0.3, TWIST.start + 0.4, TWIST.start + 0.8);
  const twistO = fadeIO(TWIST.start + 1.0, TWIST.start + 1.5, GIANT.start + 1.0, GIANT.start + 1.4);
  const hitFlash = interpolate(t, [T_HIT - 0.05, T_HIT, T_HIT + 0.6], [0, 1, 0], clamp);
  const crossedO = interpolate(t, [T_HIT, T_HIT + 0.3], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.3, PAYOFF.start], [1, 0], clamp);
  const trapO = interpolate(t, [T_OUT - 1.0, T_OUT - 0.5], [0, 1], clamp);
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "giants") * fps), fps, config: { damping: 11, stiffness: 170 } });

  // Stretch bar (log scale, 1 g .. 10^8 g)
  const barFrac = Math.max(0, Math.min(1, Math.log10(Math.max(g, 1e-9)) / 8));
  const barShown = t < GIANT.start - 0.2 ? barFrac : 0;
  const gLabel =
    t >= GIANT.start - 0.2 ? "STRETCH: NONE" : g < 10 ? `STRETCH ${g.toFixed(0)} G` : `STRETCH ${Math.round(g).toLocaleString("en-US")} G`;

  // Accretion ring rotation
  const ringRot = t * 40;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 58%, #1a0f33 0%, #0a0616 55%, #040209 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("black-hole-fall/narration.wav")} />
      <Audio src={staticFile("black-hole-fall/bed.wav")} volume={0.6} />
      <Starfield />

      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <radialGradient id="lens" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="rgba(255,154,92,0)" />
              <stop offset="62%" stopColor="rgba(255,190,120,0.9)" />
              <stop offset="70%" stopColor="rgba(199,146,255,0.55)" />
              <stop offset="100%" stopColor="rgba(199,146,255,0)" />
            </radialGradient>
            <linearGradient id="disk" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(255,120,60,0)" />
              <stop offset="0.3" stopColor="#ff9a5c" />
              <stop offset="0.5" stopColor="#fff0c8" />
              <stop offset="0.7" stopColor="#ff9a5c" />
              <stop offset="1" stopColor="rgba(255,120,60,0)" />
            </linearGradient>
          </defs>

          {/* ===== Giant black hole (rises from below during the twist) ===== */}
          <g transform={`translate(0 ${giantRise})`} opacity={toGiant > 0 ? 1 : 0}>
            <circle cx={CX} cy={EDGE_Y + GR} r={GR + 120} fill="rgba(199,146,255,0.10)" />
            <circle cx={CX} cy={EDGE_Y + GR} r={GR + 40} fill="none" stroke="rgba(255,190,120,0.55)" strokeWidth={26} />
            <circle cx={CX} cy={EDGE_Y + GR} r={GR} fill="#000" stroke={ACCENT} strokeWidth={5} />
            {[...Array(7)].map((_, i) => (
              <circle key={i} cx={CX} cy={EDGE_Y + GR} r={GR + 70 + i * 55 + ((t * 30) % 55)} fill="none"
                stroke="rgba(199,146,255,0.18)" strokeWidth={2} strokeDasharray="6 18" />
            ))}
          </g>

          {/* ===== Small black hole ===== */}
          <g transform={`translate(${CX + smallShiftX} ${HOLE_Y + smallShiftY}) scale(${smallScale})`} opacity={interpolate(toGiant, [0.8, 1], [1, 0.9])}>
            <circle r={HOLE_R * 2.6} fill="url(#lens)" opacity={0.9} />
            <ellipse rx={HOLE_R * 2.6} ry={HOLE_R * 0.42} fill="none" stroke="url(#disk)" strokeWidth={22}
              transform={`rotate(-8)`} strokeDasharray="40 14" strokeDashoffset={-ringRot * 3} />
            <circle r={HOLE_R} fill="#000" />
            <circle r={HOLE_R + 4} fill="none" stroke="rgba(255,226,180,0.9)" strokeWidth={4} />
            <path d={`M ${-HOLE_R * 2.6} 0 A ${HOLE_R * 2.6} ${HOLE_R * 0.42} -8 0 0 ${HOLE_R * 2.6} 0`} fill="none"
              stroke="url(#disk)" strokeWidth={22} transform="rotate(-8)" opacity={0.95} />
            {[...Array(16)].map((_, i) => {
              const a = t * (1.6 + (i % 5) * 0.35) + i * 2.1;
              const rr = HOLE_R * (1.5 + (i % 4) * 0.3);
              const x = Math.cos(a) * rr;
              const y = Math.sin(a) * rr * 0.17;
              const front = Math.sin(a) > 0;
              if (!front && Math.abs(x) < HOLE_R + 6) return null;
              return <circle key={i} cx={x} cy={y} r={5 + (i % 3) * 2} fill={front ? "#fff0c8" : "#ff9a5c"} opacity={front ? 0.95 : 0.5}
                transform="rotate(-8)" />;
            })}
            {/* the edge (event horizon) marker */}
            <circle r={HOLE_R + 16} fill="none" stroke={ACCENT} strokeWidth={3} strokeDasharray="10 10"
              transform={`rotate(${t * 20})`} opacity={meterO} />
          </g>

          {/* ===== Spaceship the faller jumps from ===== */}
          <g transform={`translate(${interpolate(t, [0, 4], [250, 120], clamp)} ${interpolate(t, [0, 4], [520, 470], clamp)})`}
            opacity={interpolate(t, [METER.start, METER.start + 1.5], [1, 0], clamp)}>
            <rect x={-120} y={-34} width={170} height={68} rx={30} fill="#2b2545" stroke="#8f86b8" strokeWidth={3} />
            <rect x={20} y={-22} width={36} height={44} rx={10} fill="#ffd27a" opacity={0.9} />
            <circle cx={-80} cy={0} r={12} fill={CYAN} />
          </g>

          {/* Pull arrows: feet pulled harder than head */}
          {(() => {
            const s = stretchVis;
            const head = ySmall - 50 * s;
            const feet = ySmall + 76 * s;
            return (
              <g opacity={arrowsO}>
                <line x1={CX + 120} y1={head} x2={CX + 120} y2={head + 70} stroke={CYAN} strokeWidth={10} strokeLinecap="round" />
                <polygon points={`${CX + 104},${head + 64} ${CX + 136},${head + 64} ${CX + 120},${head + 92}`} fill={CYAN} />
                <line x1={CX + 120} y1={feet - 30} x2={CX + 120} y2={feet + 120} stroke={HOT} strokeWidth={14} strokeLinecap="round" />
                <polygon points={`${CX + 100},${feet + 114} ${CX + 140},${feet + 114} ${CX + 120},${feet + 150}`} fill={HOT} />
              </g>
            );
          })()}

          {/* Small-hole faller */}
          <g opacity={1 - toGiant}>
            <Astronaut x={xSmall} y={ySmall} s={stretchVis} rot={spin} glow={interpolate(stretchVis, [1, 4], [0, 1], clamp)} />
          </g>

          {/* Giant-hole faller: same shape all the way in */}
          <g opacity={interpolate(toGiant, [0.6, 1], [0, 1])}>
            <g transform={`translate(${CX} ${yGiant}) scale(1.6) translate(${-CX} ${-yGiant})`}>
              <Astronaut x={CX} y={yGiant} s={1} rot={Math.sin(t * 1.4) * 10} glow={0} />
            </g>
          </g>
          {/* Light trying to escape bends back in */}
          <g opacity={trapO * interpolate(t, [PAYOFF.end, PAYOFF.end + 0.5], [1, 0.6], clamp)}>
            {[-1, 0, 1].map((k) => {
              const p = ((t - T_OUT + 1 + k * 0.3) % 1.4) / 1.4;
              const x0 = CX + k * 60;
              const y0 = yGiant - 60;
              const up = 180 * Math.sin(Math.PI * Math.max(0, p));
              return (
                <path key={k} d={`M ${x0} ${y0} Q ${x0 + k * 90} ${y0 - up * 1.6} ${x0 + k * 160} ${y0 + 20}`} fill="none"
                  stroke="#ffe7b0" strokeWidth={6} strokeDasharray="12 10" strokeLinecap="round" opacity={0.85} />
              );
            })}
          </g>
        </svg>

        {/* In-world labels */}
        <Tag x={CX + smallShiftX} y={HOLE_Y + smallShiftY + 200 * smallScale} color="#ffd9b0" o={sunsO} size={42}>
          10 SUNS OF MASS
        </Tag>
        <Tag x={CX - 330} y={HOLE_Y - 560 + 90} color="#ffd9b0" o={twistO} size={34}>SMALL ONE</Tag>
        <Tag x={CX} y={EDGE_Y + 150} color={ACCENT} o={twistO} size={52}>GIANT BLACK HOLE</Tag>
        <Tag x={CX} y={EDGE_Y + 215} color="rgba(230,215,255,0.85)" o={twistO} size={34}>MILLIONS OF SUNS</Tag>
        <Tag x={CX} y={EDGE_Y - 30} color={ACCENT} o={toGiant * (1 - crossedO)} size={34}>THE EDGE</Tag>
        <Tag x={CX} y={EDGE_Y + 250} color="#ffffff" o={crossedO * (1 - trapO)} size={50}>STILL IN ONE PIECE</Tag>
        <Tag x={CX} y={EDGE_Y + 250} color="#ff8a8a" o={trapO * crossedO} size={50}>NO WAY BACK OUT</Tag>
      </AbsoluteFill>

      {/* Labels pinned to the faller, drawn in screen space so the zoom never clips them */}
      <Tag x={250} y={sy(ySmall - 50 * stretchVis) + 20} color={CYAN} o={arrowsO} size={40}>HEAD: PULL</Tag>
      <Tag x={250} y={sy(ySmall + 76 * stretchVis) + 60} color={HOT} o={arrowsO} size={40}>FEET: PULL MORE</Tag>
      <Tag x={240} y={sy(ySmall) - 20} color="#ffe7b0" o={spagO} size={54}>SPAGHETTI</Tag>
      <Tag x={240} y={sy(ySmall) + 45} color="rgba(255,231,176,0.85)" o={spagO} size={34}>EDGE STILL FAR</Tag>

      {/* Edge-crossing flash */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 60%, rgba(220,190,255,${0.7 * hitFlash}) 0%, rgba(0,0,0,0) 60%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.6) 100%)" }} />

      <SeriesTag name="What If" n={4} accent={ACCENT} until={HOOK.end} />

      {/* Opening title */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700,
        fontSize: 84, lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: titleO, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        FALL INTO A
        <br />
        <span style={{ color: ACCENT }}>BLACK HOLE?</span>
      </div>

      {/* Meter: distance to the edge + stretch bar */}
      <div style={{ position: "absolute", top: 170, width: "100%", textAlign: "center", fontFamily: FONT, opacity: meterO,
        transform: `scale(${0.85 + 0.15 * Math.min(1, meterPop)})` }}>
        <div style={{ fontWeight: 500, fontSize: 30, letterSpacing: 7, color: "rgba(235,225,255,0.8)" }}>
          {t < GIANT.start - 0.2 ? "KM TO THE EDGE" : "KM TO THE GIANT'S EDGE"}
        </div>
        <div style={{ fontWeight: 700, fontSize: 150, lineHeight: 1.0, letterSpacing: -3, fontVariantNumeric: "tabular-nums",
          color: km < 1 ? "#ffffff" : ACCENT, textShadow: "0 0 40px rgba(199,146,255,0.45)" }}>
          {Math.round(km).toLocaleString("en-US")}
        </div>
        <div style={{ margin: "14px auto 0", width: 760, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.12)",
          border: "2px solid rgba(255,255,255,0.3)", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(2, barShown * 100)}%`, height: "100%",
            background: `linear-gradient(90deg, ${CYAN}, ${HOT} 60%, #ff4d6d)` }} />
        </div>
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 36, letterSpacing: 3, color: barShown > 0.35 ? "#ffb08a" : "#dfe8ff" }}>
          {gLabel}
        </div>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 76, color: HOT, opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          SMALL ONES SHRED
        </div>
        <div style={{ fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: "#fff", opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          GIANTS LET
          <br />
          <span style={{ color: ACCENT }}>YOU IN</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1395, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500,
        fontSize: 24, letterSpacing: 5, color: "rgba(220,210,255,0.6)", opacity: interpolate(t, [STRETCH.start - 0.4, STRETCH.start], [1, 0], clamp) }}>
        THOUGHT EXPERIMENT · SIMPLIFIED MODEL
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="What If" next={5} accent={ACCENT} />
    </AbsoluteFill>
  );
};
