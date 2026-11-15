import React, { useMemo } from "react";
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
import timelineJson from "../../../videos/lightning-thunder/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Story beats ----------
const T_STRIKE = wordStart("hook", "lightning");
const T_BARS = wordStart("hook", "five");
const THIN = line("thin");
const HEAT = line("heat");
const T_HITS = wordStart("heat", "hits");
const T_BLAST = wordStart("explode", "explodes");
const THUNDER = line("thunder");
const COUNT = line("count");
const PAYOFF = line("payoff");

// ---------- World (1080 x 1920) ----------
const GROUND_Y = 1330;
const BOLT_TOP = { x: 600, y: 470 };
const BOLT_BOTTOM = { x: 640, y: GROUND_Y };
const HOUSE_X = 230;
const VIOLET = "#b7a4ff";
const HOT = "#fff4d6";
const AMBER = "#ffb347";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const makeBolt = (seed: string, a: { x: number; y: number }, b: { x: number; y: number }, n: number, jitter: number) =>
  new Array(n + 1).fill(0).map((_, i) => {
    const k = i / n;
    const edge = i === 0 || i === n ? 0 : 1;
    return {
      x: a.x + (b.x - a.x) * k + (random(`${seed}-${i}`) - 0.5) * 2 * jitter * edge,
      y: a.y + (b.y - a.y) * k,
    };
  });
const toPoints = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

const MAIN = makeBolt("main", BOLT_TOP, BOLT_BOTTOM, 15, 46);
const FOCUS = MAIN[8]; // the point the camera dives into
const BRANCHES = [
  makeBolt("b1", MAIN[4], { x: MAIN[4].x - 170, y: MAIN[4].y + 230 }, 6, 22),
  makeBolt("b2", MAIN[7], { x: MAIN[7].x + 150, y: MAIN[7].y + 190 }, 5, 20),
  makeBolt("b3", MAIN[11], { x: MAIN[11].x - 110, y: MAIN[11].y + 150 }, 4, 16),
];

const Bolt: React.FC<{ intensity: number; heat: number }> = ({ intensity, heat }) => {
  if (intensity <= 0.01) return null;
  const core = heat > 0.5 ? "#ffffff" : "#f4efff";
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible", opacity: intensity }}>
      <g style={{ filter: "blur(14px)" }}>
        <polyline points={toPoints(MAIN)} fill="none" stroke={heat > 0.5 ? "#ffd9a8" : "#8f78ff"} strokeWidth={30 + 26 * heat} strokeLinejoin="round" />
        {BRANCHES.map((b, i) => (
          <polyline key={i} points={toPoints(b)} fill="none" stroke="#8f78ff" strokeWidth={14} />
        ))}
      </g>
      {BRANCHES.map((b, i) => (
        <polyline key={i} points={toPoints(b)} fill="none" stroke="#d9d0ff" strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      <polyline points={toPoints(MAIN)} fill="none" stroke={VIOLET} strokeWidth={11} strokeLinejoin="round" opacity={0.7} />
      <polyline points={toPoints(MAIN)} fill="none" stroke={core} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
};

/** Sound front from a line source: a capsule growing around the bolt. */
const Front: React.FC<{ r: number; opacity: number; color: string; width?: number }> = ({ r, opacity, color, width = 5 }) =>
  opacity <= 0.01 || r <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: (BOLT_TOP.x + BOLT_BOTTOM.x) / 2 - r,
        top: BOLT_TOP.y + 40 - r * 0.1,
        width: r * 2,
        height: BOLT_BOTTOM.y - BOLT_TOP.y - 40 + r * 0.1,
        borderRadius: `${r}px ${r}px 0 0`,
        border: `${width}px solid ${color}`,
        borderBottom: "none",
        boxSizing: "border-box",
        boxShadow: `0 0 30px 4px ${color}55, inset 0 0 30px 4px ${color}33`,
        opacity,
      }}
    />
  );

const Label: React.FC<{ x: number; y: number; size?: number; color?: string; opacity: number; children: React.ReactNode }> = ({
  x,
  y,
  size = 34,
  color = "#ffffff",
  opacity,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: size * 0.12,
      color,
      opacity,
      whiteSpace: "nowrap",
      textShadow: "0 2px 14px rgba(0,0,0,0.95)",
    }}
  >
    {children}
  </div>
);

export const LightningThunder: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Bolt state ----------
  const flicker = 0.78 + 0.22 * random(`flick-${frame}`);
  const strike1 =
    t < T_STRIKE
      ? 0
      : t < T_STRIKE + 0.4
        ? flicker
        : interpolate(t, [T_STRIKE + 0.4, T_STRIKE + 0.8, T_BLAST + 0.25, T_BLAST + 1.1], [1, 0.9, 0.9, 0], clamp);
  const strike2 =
    t < COUNT.start ? 0 : interpolate(t, [COUNT.start, COUNT.start + 0.25, COUNT.start + 0.9], [1, 0.9, 0], clamp) * (t < COUNT.start + 0.25 ? flicker : 1);
  const T_LAST = wordStart("payoff", "lightning");
  const strike3 = t < T_LAST ? 0 : interpolate(t, [T_LAST, T_LAST + 0.25, T_LAST + 0.9], [1, 0.9, 0], clamp) * (t < T_LAST + 0.25 ? flicker : 1);
  const boltI = Math.max(strike1, strike2, strike3);
  const ghostBolt = t > T_BLAST + 0.6 ? 0.2 * (1 - Math.min(1, boltI * 2)) : 0;
  const flash =
    interpolate(t, [T_STRIKE, T_STRIKE + 0.06, T_STRIKE + 0.5], [0, 1, 0], clamp) +
    interpolate(t, [COUNT.start, COUNT.start + 0.06, COUNT.start + 0.45], [0, 0.8, 0], clamp) +
    interpolate(t, [T_BLAST, T_BLAST + 0.05, T_BLAST + 0.35], [0, 0.5, 0], clamp) +
    interpolate(t, [wordStart("payoff", "lightning"), wordStart("payoff", "lightning") + 0.06, wordStart("payoff", "lightning") + 0.45], [0, 0.8, 0], clamp);
  const heat = interpolate(t, [T_HITS, T_HITS + 0.7], [0, 1], clamp);

  // ---------- Camera: dive into the channel, then pull back out ----------
  const zoomK = interpolate(
    t,
    [THIN.start - 0.25, THIN.start + 0.9, T_BLAST + 0.3, T_BLAST + 1.3],
    [0, 1, 1, 0],
    { ...clamp, easing: ease },
  );
  const scale = Math.pow(9, zoomK);
  const fx = 540 + (FOCUS.x - 540) * zoomK;
  const fy = 960 + (FOCUS.y - 960) * zoomK;
  const shakeAmp =
    18 * Math.exp(-Math.max(0, t - T_STRIKE) * 8) * (t >= T_STRIKE ? 1 : 0) +
    30 * Math.exp(-Math.max(0, t - T_BLAST) * 4) * (t >= T_BLAST ? 1 : 0) +
    14 * Math.exp(-Math.max(0, t - COUNT.end) * 5) * (t >= COUNT.end ? 1 : 0);
  const camera = `translate(${540 - fx * scale + Math.sin(frame * 2.3) * shakeAmp}px, ${
    960 - fy * scale + Math.cos(frame * 1.9) * shakeAmp
  }px) scale(${scale})`;

  // ---------- Air molecules around the channel (visible only when zoomed in) ----------
  const molecules = useMemo(
    () =>
      new Array(90).fill(0).map((_, i) => ({
        dx: (random(`mx-${i}`) - 0.5) * 110,
        dy: (random(`my-${i}`) - 0.5) * 200,
        ph: random(`mp-${i}`) * 6.28,
        sp: 0.6 + random(`ms-${i}`),
      })),
    [],
  );
  const blastT = Math.max(0, t - T_BLAST);

  // ---------- Thunder fronts ----------
  const front1R = blastT * 170;
  const front1O = t >= T_BLAST ? interpolate(blastT, [0, 0.2, 2.6, 3.6], [0, 1, 0.8, 0], clamp) : 0;
  const countK = interpolate(t, [COUNT.start, COUNT.end], [0, 1], clamp);
  const distPx = (BOLT_TOP.x + BOLT_BOTTOM.x) / 2 - HOUSE_X;
  const front2R = t >= COUNT.start ? ((t - COUNT.start) / (COUNT.end - COUNT.start)) * distPx : 0;
  const front2O = t >= COUNT.start ? interpolate(t, [COUNT.start, COUNT.start + 0.3, PAYOFF.start + 0.6, PAYOFF.start + 1.6], [0, 1, 0.9, 0], clamp) : 0;
  const front3T = Math.max(0, t - wordStart("payoff", "lightning"));
  const front3R = front3T * 190;
  const front3O = front3T > 0 ? interpolate(front3T, [0, 0.3, 3.5], [0, 1, 0.85], clamp) : 0;
  const houseShake = 7 * Math.exp(-Math.max(0, t - COUNT.end) * 4) * (t >= COUNT.end ? 1 : 0) * Math.sin(frame * 2.7);

  // ---------- HUD timing ----------
  const titleOut = interpolate(t, [T_BARS - 0.15, T_BARS + 0.15], [0, 1], clamp);
  const barsIn = spring({ frame: frame - Math.round(T_BARS * fps), fps, config: { damping: 16, stiffness: 120 } });
  const barsOut = interpolate(t, [THIN.start - 0.1, THIN.start + 0.4], [1, 0], clamp);
  const thumbO = interpolate(t, [wordStart("thin", "barely"), wordStart("thin", "barely") + 0.4, HEAT.start + 0.6, HEAT.start + 1.0], [0, 1, 1, 0], clamp);
  const tempO = interpolate(t, [T_HITS - 0.2, T_HITS + 0.1, T_BLAST + 0.9, T_BLAST + 1.4], [0, 1, 1, 0], clamp);
  const tempVal = Math.round(interpolate(t, [T_HITS, T_HITS + 0.9], [20, 28000], { ...clamp, easing: Easing.out(Easing.cubic) }) / (t < T_HITS + 0.9 ? 10 : 1000)) * (t < T_HITS + 0.9 ? 10 : 1000);
  const thunderO = interpolate(t, [THUNDER.start, THUNDER.start + 0.25, COUNT.start - 0.2, COUNT.start + 0.1], [0, 1, 1, 0], clamp);
  const countO = interpolate(t, [COUNT.start + 0.1, COUNT.start + 0.4, PAYOFF.start - 0.3, PAYOFF.start], [0, 1, 1, 0], clamp);
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 15, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "air") * fps) + 20, fps, config: { damping: 11, stiffness: 170 } });

  const skyLift = Math.min(1, flash + boltI * 0.25);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #1c1640 0%, #120f2c 38%, #0a0919 70%, #05050d 100%)",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("lightning-thunder/narration.wav")} />
      <Audio src={staticFile("lightning-thunder/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        {/* Sky glow from the bolt */}
        <div
          style={{
            position: "absolute",
            left: 600 - 900,
            top: 900 - 900,
            width: 1800,
            height: 1800,
            background: "radial-gradient(circle, rgba(150,125,255,0.45) 0%, rgba(120,100,255,0.12) 40%, rgba(120,100,255,0) 70%)",
            opacity: boltI * 0.9,
          }}
        />
        {/* Storm clouds */}
        {[
          [-80, 90, 620, 330], [300, 40, 700, 380], [720, 110, 560, 300], [120, 260, 520, 260], [520, 250, 560, 270], [-200, 300, 500, 220], [860, 300, 460, 230],
        ].map(([x, y, w, h], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin(t * 0.12 + i) * 14,
              top: y,
              width: w,
              height: h,
              borderRadius: "50%",
              background: `rgb(${22 + 60 * skyLift}, ${20 + 52 * skyLift}, ${48 + 90 * skyLift})`,
              filter: "blur(26px)",
            }}
          />
        ))}

        {/* Thunder fronts */}
        <Front r={front1R} opacity={front1O} color={HOT} width={6} />
        <Front r={front1R - 46} opacity={front1O * 0.5} color={VIOLET} width={3} />
        <Front r={front1R - 92} opacity={front1O * 0.28} color={VIOLET} width={3} />
        <Front r={front2R} opacity={front2O} color={HOT} width={6} />
        <Front r={front2R - 40} opacity={front2O * 0.5} color={VIOLET} width={3} />
        <Front r={front2R - 80} opacity={front2O * 0.28} color={VIOLET} width={3} />
        <Front r={front3R} opacity={front3O} color={HOT} width={6} />
        <Front r={front3R - 46} opacity={front3O * 0.5} color={VIOLET} width={3} />
        <Front r={front3R - 92} opacity={front3O * 0.28} color={VIOLET} width={3} />
        {/* Where the bolt was */}
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible", opacity: ghostBolt }}>
          <polyline points={toPoints(MAIN)} fill="none" stroke="#ffffff" strokeWidth={3} strokeDasharray="4 12" />
        </svg>

        <Bolt intensity={boltI} heat={heat} />

        {/* Air molecules: calm, then superheated, then thrown outward */}
        {zoomK > 0.05 &&
          molecules.map((m, i) => {
            const side = m.dx >= 0 ? 1 : -1;
            const jitter = 0.5 + 3.5 * heat;
            const out = blastT > 0 ? side * (40 + Math.abs(m.dx)) * (1 - Math.exp(-blastT * 3.2)) * 2.2 : 0;
            const x = FOCUS.x + m.dx * (0.35 + 0.65 * (1 - heat * 0.4)) + Math.sin(t * 9 * m.sp + m.ph) * jitter + out;
            const y = FOCUS.y + m.dy + Math.cos(t * 8 * m.sp + m.ph) * jitter;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: 2.4,
                  height: 2.4,
                  borderRadius: "50%",
                  background: heat > 0.3 ? (i % 3 === 0 ? "#ffffff" : AMBER) : "#9fb4ff",
                  boxShadow: heat > 0.3 ? `0 0 4px 1px ${AMBER}` : "none",
                  opacity: zoomK * (0.55 + 0.45 * heat) * (blastT > 0 ? Math.max(0, 1 - blastT * 0.9) : 1),
                }}
              />
            );
          })}

        {/* Thumb for scale, drawn beside the channel */}
        <div style={{ position: "absolute", left: FOCUS.x + 12, top: FOCUS.y - 9, opacity: thumbO * zoomK }}>
          <div style={{ width: 7, height: 17, borderRadius: "3.5px 3.5px 1.5px 1.5px", border: "0.7px solid #ffffff", boxSizing: "border-box", background: "rgba(255,255,255,0.08)" }}>
            <div style={{ margin: "1.3px auto 0", width: 3.6, height: 4.2, borderRadius: "1.8px 1.8px 0.8px 0.8px", border: "0.5px solid rgba(255,255,255,0.8)", boxSizing: "border-box" }} />
          </div>
        </div>
        {/* Width bracket across the channel */}
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible", opacity: thumbO * zoomK }}>
          <line x1={FOCUS.x - 3.2} y1={FOCUS.y} x2={FOCUS.x + 3.2} y2={FOCUS.y} stroke="#101020" strokeWidth={0.7} />
          <line x1={FOCUS.x - 3.2} y1={FOCUS.y - 1.8} x2={FOCUS.x - 3.2} y2={FOCUS.y + 1.8} stroke="#ffffff" strokeWidth={0.6} />
          <line x1={FOCUS.x + 3.2} y1={FOCUS.y - 1.8} x2={FOCUS.x + 3.2} y2={FOCUS.y + 1.8} stroke="#ffffff" strokeWidth={0.6} />
        </svg>

        {/* Ground, hills and the listener's house */}
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <path d={`M -1400 ${GROUND_Y + 20} C -700 ${GROUND_Y - 70}, -200 ${GROUND_Y + 30}, 150 ${GROUND_Y} S 700 ${GROUND_Y - 6}, 1080 ${GROUND_Y + 4} S 2000 ${GROUND_Y - 50}, 2500 ${GROUND_Y + 10} L 2500 3400 L -1400 3400 Z`} fill={`rgb(${6 + 14 * skyLift}, ${6 + 12 * skyLift}, ${14 + 26 * skyLift})`} />
          <g transform={`translate(${HOUSE_X + houseShake}, ${GROUND_Y - 2})`}>
            <rect x={-34} y={-46} width={68} height={48} fill="#04040a" />
            <polygon points="-44,-46 0,-84 44,-46" fill="#04040a" />
            <rect x={-10} y={-34} width={20} height={18} fill="#ffd27a" opacity={0.9} />
          </g>
          {/* Distance ruler */}
          <g opacity={countO}>
            <line x1={HOUSE_X} y1={GROUND_Y + 46} x2={HOUSE_X + distPx} y2={GROUND_Y + 46} stroke="#ffffff" strokeWidth={3} strokeDasharray="3 9" />
            <line x1={HOUSE_X} y1={GROUND_Y + 34} x2={HOUSE_X} y2={GROUND_Y + 58} stroke="#ffffff" strokeWidth={3} />
            <line x1={HOUSE_X + distPx} y1={GROUND_Y + 34} x2={HOUSE_X + distPx} y2={GROUND_Y + 58} stroke="#ffffff" strokeWidth={3} />
          </g>
        </svg>
        <Label x={HOUSE_X + distPx / 2} y={GROUND_Y + 84} opacity={countO}>
          ABOUT 1 KM
        </Label>
        <Label x={(BOLT_TOP.x + BOLT_BOTTOM.x) / 2} y={BOLT_TOP.y - 20 - front1R * 0.1} color={HOT} size={64} opacity={thunderO * (1 - zoomK)}>
          THUNDER
        </Label>
      </AbsoluteFill>

      {/* Rain (screen space) */}
      <AbsoluteFill style={{ opacity: 0.35 * (1 - zoomK) }}>
        {new Array(70).fill(0).map((_, i) => {
          const x0 = random(`rx-${i}`) * 1300 - 100;
          const sp = 900 + random(`rs-${i}`) * 700;
          const y = ((random(`ry-${i}`) * 2100 + t * sp) % 2100) - 100;
          return (
            <div key={i} style={{ position: "absolute", left: x0 - y * 0.12, top: y, width: 2, height: 46, background: "rgba(190,200,255,0.55)", transform: "rotate(7deg)" }} />
          );
        })}
      </AbsoluteFill>

      {/* Flash */}
      <AbsoluteFill style={{ background: "#efeaff", opacity: Math.min(0.85, flash * 0.8) }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />

      {/* ================= HUD ================= */}
      {/* Opening title, on screen from frame 0 */}
      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 96, lineHeight: 1.04, letterSpacing: -2, color: "#fff", opacity: 1 - titleOut, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        HOTTER THAN
        <br />
        <span style={{ color: AMBER }}>THE SUN?</span>
      </div>

      {/* Temperature comparison */}
      <div style={{ position: "absolute", top: 180, left: 90, right: 90, fontFamily: FONT, opacity: Math.min(1, barsIn * 1.5) * barsOut }}>
        {[
          { name: "SUN'S SURFACE", value: "5,500°C", w: 0.196, color: AMBER, delay: 0 },
          { name: "LIGHTNING", value: "28,000°C", w: 1, color: VIOLET, delay: 0.35 },
        ].map((b) => {
          const g = spring({ frame: frame - Math.round((T_BARS + b.delay) * fps), fps, config: { damping: 18, stiffness: 90 } });
          return (
            <div key={b.name} style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 40, letterSpacing: 3, color: "#fff" }}>
                <span>{b.name}</span>
                <span style={{ color: b.color }}>{b.value}</span>
              </div>
              <div style={{ marginTop: 10, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", width: `${Math.max(0, g) * b.w * 100}%`, borderRadius: 17, background: b.color, boxShadow: `0 0 26px ${b.color}` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Channel width call-out */}
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", fontFamily: FONT, opacity: thumbO }}>
        <div style={{ fontWeight: 500, fontSize: 32, letterSpacing: 7, color: "rgba(255,255,255,0.8)" }}>THE CHANNEL IS ONLY</div>
        <div style={{ fontWeight: 700, fontSize: 150, lineHeight: 1.05, letterSpacing: -3, color: VIOLET, textShadow: "0 0 40px rgba(150,125,255,0.5)" }}>
          2–5 cm
        </div>
        <div style={{ fontWeight: 700, fontSize: 40, letterSpacing: 5, color: "#fff" }}>WIDE</div>
      </div>

      {/* Temperature counter */}
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", fontFamily: FONT, opacity: tempO }}>
        <div style={{ fontWeight: 500, fontSize: 32, letterSpacing: 7, color: "rgba(255,255,255,0.8)" }}>AIR IN THE CHANNEL</div>
        <div style={{ fontWeight: 700, fontSize: 170, lineHeight: 1.05, letterSpacing: -4, fontVariantNumeric: "tabular-nums", color: heat > 0.6 ? HOT : AMBER, textShadow: "0 0 50px rgba(255,180,80,0.55)" }}>
          {tempVal.toLocaleString("en-US")}°C
        </div>
      </div>

      {/* Flash-to-thunder counter */}
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontFamily: FONT, opacity: countO }}>
        <div style={{ fontWeight: 500, fontSize: 32, letterSpacing: 7, color: "rgba(255,255,255,0.8)" }}>FLASH TO THUNDER</div>
        <div style={{ fontWeight: 700, fontSize: 190, lineHeight: 1.05, letterSpacing: -4, fontVariantNumeric: "tabular-nums", color: countK >= 1 ? HOT : VIOLET }}>
          {(countK * 3).toFixed(1)} s
        </div>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 50, letterSpacing: 6, color: VIOLET, opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)` }}>
          YOU NEVER HEAR LIGHTNING
        </div>
        <div style={{ fontWeight: 700, fontSize: 104, lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          YOU HEAR
          <br />
          <span style={{ color: AMBER }}>AIR EXPLODING</span>
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={AMBER} />
    </AbsoluteFill>
  );
};
