import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/oxygen-vanishes/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z]/g, "").startsWith(w))!.start;

const ACCENT = "#ff9f1c";
const O2 = "#ff3d5a";
const N2 = "#6fa8ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const CHOKE = line("choke");
const WHY = line("why");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_CHOKE = wordStart("choke", "choke");
const T_OUT = wordStart("choke", "out");
const T_FW = wordStart("twist", "fireworks");
const T_KEEP = wordStart("twist", "keep");
const T_LOCKED = wordStart("climax", "locked");
const T_GONE = 0.45; // oxygen starts popping out of the air in the first second
const CLOCK_END = PAYOFF.end - 0.2;

const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 * s + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,0,0,0.95)" }}>
    {children}
  </div>
);

// A flickering flame of height h (0 = out) with its base at (0,0).
const Flame: React.FC<{ h: number; w: number; t: number; seed: number; blue?: boolean }> = ({ h, w, t, seed, blue }) => {
  if (h < 2) return null;
  const f = 1 + 0.12 * Math.sin(t * 17 + seed) + 0.08 * Math.sin(t * 29 + seed * 2);
  const hh = h * f;
  const sway = Math.sin(t * 7 + seed) * w * 0.18;
  const outer = blue ? "#3b7bff" : "#ff7a1a";
  const inner = blue ? "#a9d2ff" : "#ffe066";
  return (
    <g>
      <path d={`M ${-w / 2} 0 Q ${-w * 0.6} ${-hh * 0.45} ${sway} ${-hh} Q ${w * 0.6} ${-hh * 0.45} ${w / 2} 0 Z`} fill={outer} opacity={0.95} />
      <path d={`M ${-w / 4} 0 Q ${-w * 0.3} ${-hh * 0.35} ${sway * 0.7} ${-hh * 0.62} Q ${w * 0.3} ${-hh * 0.35} ${w / 4} 0 Z`} fill={inner} />
    </g>
  );
};

// A firework burst: shells of sparks around (x,y) at age a (seconds).
const Burst: React.FC<{ x: number; y: number; a: number; color: string; n?: number; r?: number }> = ({ x, y, a, color, n = 36, r = 300 }) => {
  if (a < 0 || a > 3.2) return null;
  const R = r * (1 - Math.exp(-a * 2.6));
  const o = interpolate(a, [0, 0.1, 2.2, 3.2], [0, 1, 0.8, 0], clamp);
  return (
    <g opacity={o}>
      <circle cx={x} cy={y} r={R * 0.35} fill={color} opacity={0.18 * Math.exp(-a * 2)} />
      {Array.from({ length: n }, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + rnd(i, 3) * 0.1;
        const rr = R * (0.85 + 0.15 * rnd(i, 7));
        const sag = 60 * a * a;
        const px = x + Math.cos(ang) * rr;
        const py = y + Math.sin(ang) * rr + sag;
        const tx = x + Math.cos(ang) * rr * 0.8;
        const ty = y + Math.sin(ang) * rr * 0.8 + sag * 0.8;
        return (
          <g key={i}>
            <line x1={tx} y1={ty} x2={px} y2={py} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
            <circle cx={px} cy={py} r={7} fill="#fff8e0" />
            <circle cx={px} cy={py} r={13} fill={color} opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
};

export const OxygenVanishes: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Oxygen in the air: 1 = normal, 0 = gone ----------
  const oxGone = interpolate(t, [T_GONE, T_GONE + 0.9], [0, 1], clamp);
  const oxBack = interpolate(t, [CLOCK_END, CLOCK_END + 0.6], [0, 1], clamp);
  const oxygen = Math.max(1 - oxGone, oxBack);

  // ---------- Flames: shrink on "choke", gone by "out" ----------
  const flameK = interpolate(t, [T_GONE + 0.6, CHOKE.start, T_CHOKE, T_CHOKE + 0.6], [1, 0.8, 0.55, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  // Before the choke line they sputter a little (no new oxygen arriving)
  const sputter = t > T_GONE + 0.5 && t < CHOKE.start ? 0.85 + 0.15 * Math.sin(t * 23) : 1;
  const flame = flameK * sputter;
  const relight = interpolate(t, [CLOCK_END + 0.2, CLOCK_END + 1.0], [0, 1], clamp);
  const flameNow = flame + 0 * relight; // fires do not relight on their own

  // ---------- Countdown (slow motion): 5.00 -> 0.00 from METER.start to CLOCK_END ----------
  const clock = interpolate(t, [METER.start, CLOCK_END], [5, 0], clamp);

  // ---------- Camera ----------
  // wide yard -> zoom on campfire for "why" -> pull out and up to the sky for fireworks -> zoom on a firework star -> wide
  const zoomFire = interpolate(t, [WHY.start - 0.2, WHY.start + 0.8, WHY.end - 0.2, TWIST.start + 0.4], [0, 1, 1, 0], { ...clamp, easing: ease });
  const zoomStar = interpolate(t, [CLIMAX.start - 0.1, CLIMAX.start + 0.8, CLIMAX.end + 0.1, PAYOFF.start + 0.6], [0, 1, 1, 0], { ...clamp, easing: ease });
  const shake = (t > T_GONE ? 10 * Math.exp(-(t - T_GONE) * 4) : 0) + (t > T_KEEP ? 14 * Math.exp(-(t - T_KEEP) * 5) : 0);
  const scale = 1.35 + 0.03 * Math.sin(t * 0.4) + 1.3 * zoomFire;
  const originY = 1330;
  const camera = `translate(${Math.sin(frame * 2.1) * shake}px, ${Math.cos(frame * 1.7) * shake}px) scale(${scale})`;

  // ---------- Fireworks ----------
  const launches = [
    { t0: T_FW - 0.9, x: 330, y: 760, c: "#ff4fd8" },
    { t0: T_KEEP - 0.55, x: 700, y: 720, c: "#ffd23f" },
    { t0: TWIST.end - 0.2, x: 470, y: 880, c: "#4fffc1" },
    { t0: CLIMAX.end - 0.3, x: 700, y: 820, c: "#ff6a3d" },
    { t0: PAYOFF.start + 0.4, x: 330, y: 960, c: "#9d7bff" },
    { t0: PAYOFF.start + 1.3, x: 700, y: 980, c: "#ffd23f" },
  ];
  const RISE = 0.7;

  // ---------- Air molecules ----------
  const mols = Array.from({ length: 46 }, (_, i) => {
    const isO = i % 5 === 0; // one in five is oxygen
    const x = (rnd(i, 1) * 1180 + t * (14 + rnd(i, 2) * 20)) % 1180 - 50;
    const y = 520 + rnd(i, 5) * 820 + Math.sin(t * 1.3 + i) * 18;
    const rot = t * (40 + rnd(i, 9) * 80) + i * 30;
    return { x, y, rot, isO, i };
  });
  // each oxygen molecule pops at its own moment across the first second
  const popAt = (i: number) => T_GONE + 0.7 * rnd(i, 11);

  // ---------- Labels ----------
  const fadeIO = (a: number, b: number, c: number, d: number) => interpolate(t, [a, b, c, d], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [HOOK.end - 0.15, HOOK.end + 0.25], [1, 0], clamp);
  const hudO = 1;
  const clockO = interpolate(t, [METER.start - 0.15, METER.start + 0.25], [0, 1], clamp) * interpolate(t, [timeline.duration - 0.4, timeline.duration - 0.1], [1, 0.0], clamp);
  const hudPop = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 12, stiffness: 160 } });
  const fifthO = fadeIO(METER.start + 0.2, METER.start + 0.6, CHOKE.start, CHOKE.start + 0.4);
  const outO = fadeIO(T_CHOKE + 0.6, T_CHOKE + 0.9, WHY.start, WHY.start + 0.3);
  const coalO = fadeIO(T_OUT, T_OUT + 0.4, WHY.start, WHY.start + 0.3);
  const whyA = fadeIO(WHY.start + 0.5, WHY.start + 0.9, wordStart("why", "no") - 0.1, wordStart("why", "no") + 0.2);
  const whyB = fadeIO(wordStart("why", "no"), wordStart("why", "no") + 0.3, WHY.end + 0.1, WHY.end + 0.4);
  const keepO = fadeIO(T_KEEP, T_KEEP + 0.3, CLIMAX.start, CLIMAX.start + 0.3);
  const insideO = fadeIO(CLIMAX.start + 0.5, CLIMAX.start + 0.9, T_LOCKED - 0.3, T_LOCKED);
  const lockedO = fadeIO(T_LOCKED, T_LOCKED + 0.3, CLIMAX.end + 0.1, PAYOFF.start + 0.3);
  const backO = fadeIO(CLOCK_END, CLOCK_END + 0.3, timeline.duration - 0.4, timeline.duration - 0.1);
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "brought") * fps), fps, config: { damping: 11, stiffness: 170 } });
  const endO = 1;
  const noteO = interpolate(t, [METER.start, METER.start + 0.4], [0, 1], clamp) * interpolate(t, [CHOKE.end, CHOKE.end + 0.4], [1, 0], clamp);
  const flash = interpolate(t, [T_KEEP - 0.05, T_KEEP + 0.05, T_KEEP + 0.7], [0, 1, 0], clamp);

  // Sky brightens with each burst
  let skyGlow = 0;
  launches.forEach((l) => {
    const a = t - l.t0 - RISE;
    if (a > 0) skyGlow += 0.5 * Math.exp(-a * 1.6);
  });
  const fireGlow = 0.55 * flameNow;

  // ---------- World geometry ----------
  const GROUND = 1180;
  const FIRE_X = 540;
  const FIRE_Y = 1265;

  return (
    <AbsoluteFill style={{ background: "#05060d", overflow: "hidden" }}>
      <Audio src={staticFile("oxygen-vanishes/narration.wav")} />
      <Audio src={staticFile("oxygen-vanishes/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: `${FIRE_X}px ${originY}px` }}>
        {/* Night sky */}
        <AbsoluteFill style={{ background: `linear-gradient(180deg, #070a1f 0%, #14163a 45%, #2a1f3d 70%, #3a2433 100%)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, rgba(255,200,140,${Math.min(0.35, skyGlow * 0.4)}) 0%, rgba(0,0,0,0) 65%)` }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {/* stars */}
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} cx={rnd(i, 21) * 1080} cy={rnd(i, 23) * 640} r={1.5 + rnd(i, 25) * 2}
              fill="#ffffff" opacity={0.3 + 0.4 * Math.abs(Math.sin(t * 1.5 + i))} />
          ))}
          {/* hills and trees */}
          <path d={`M 0 ${GROUND - 90} Q 200 ${GROUND - 170} 420 ${GROUND - 110} Q 700 ${GROUND - 40} 1080 ${GROUND - 150} L 1080 1920 L 0 1920 Z`} fill="#141127" />
          {[90, 170, 940, 1010].map((x, i) => (
            <path key={i} d={`M ${x} ${GROUND - 60} L ${x - 50} ${GROUND + 10} L ${x + 50} ${GROUND + 10} Z M ${x} ${GROUND - 140} L ${x - 40} ${GROUND - 40} L ${x + 40} ${GROUND - 40} Z`} fill="#0c0a1a" />
          ))}
          {/* ground */}
          <rect x={0} y={GROUND} width={1080} height={800} fill="#1b1424" />
          <ellipse cx={FIRE_X} cy={FIRE_Y + 10} rx={420} ry={110} fill={`rgba(255,140,40,${0.25 * fireGlow + 0.05 * skyGlow})`} />

          {/* ----- Candles on a small table (left) ----- */}
          <g transform="translate(250 1215)">
            <rect x={-120} y={0} width={240} height={18} rx={4} fill="#3b2a2a" />
            <rect x={-100} y={18} width={14} height={90} fill="#2b1f22" />
            <rect x={86} y={18} width={14} height={90} fill="#2b1f22" />
            {[-70, -20, 30, 80].map((cx, i) => (
              <g key={i} transform={`translate(${cx} 0)`}>
                <rect x={-10} y={-70 + (i % 2) * 14} width={20} height={70 - (i % 2) * 14} rx={3} fill="#f3e6d0" />
                <line x1={0} y1={-70 + (i % 2) * 14} x2={0} y2={-80 + (i % 2) * 14} stroke="#222" strokeWidth={3} />
                <g transform={`translate(0 ${-80 + (i % 2) * 14})`}>
                  <Flame h={48 * flameNow} w={20} t={t} seed={i * 3.1} />
                  {flameNow < 0.05 && t < CLOCK_END && (
                    <path d={`M 0 0 q 10 -30 -4 -60 q -12 -30 6 -70`} fill="none" stroke="rgba(200,200,220,0.35)" strokeWidth={4}
                      strokeDasharray="10 12" strokeDashoffset={-t * 40} />
                  )}
                </g>
              </g>
            ))}
          </g>

          {/* ----- Camping stove (right, inside the safe area) ----- */}
          <g transform="translate(755 1230)">
            <rect x={-80} y={0} width={160} height={70} rx={8} fill="#5a6473" />
            <rect x={-60} y={-8} width={120} height={10} fill="#8892a0" />
            <rect x={-70} y={-70} width={140} height={46} rx={6} fill="#31384a" />
            <rect x={-80} y={-28} width={160} height={8} fill="#222" />
            <g transform="translate(0 -20)">
              {[-40, -20, 0, 20, 40].map((x, i) => (
                <g key={i} transform={`translate(${x} 0)`}>
                  <Flame h={30 * flameNow} w={14} t={t} seed={i * 1.7 + 9} blue />
                </g>
              ))}
            </g>
          </g>

          {/* ----- Campfire (centre) ----- */}
          <g transform={`translate(${FIRE_X} ${FIRE_Y})`}>
            {/* stones */}
            {Array.from({ length: 9 }, (_, i) => {
              const a = (i / 9) * Math.PI;
              return <ellipse key={i} cx={Math.cos(a) * 150} cy={30 + Math.sin(a) * 26} rx={36} ry={22} fill="#4a4458" />;
            })}
            {/* logs */}
            <rect x={-130} y={-10} width={260} height={34} rx={17} fill="#5b3a24" transform="rotate(-14)" />
            <rect x={-130} y={-10} width={260} height={34} rx={17} fill="#6b4529" transform="rotate(14)" />
            {/* glowing coals stay hot after the flames go out */}
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={-90 + i * 14} cy={10 + Math.sin(i * 2.3) * 8} r={9}
                fill={`rgba(255,${80 + 40 * Math.sin(t * 3 + i)},30,${0.55 + 0.3 * Math.sin(t * 2.5 + i)})`} />
            ))}
            {/* flames */}
            {[-60, -25, 10, 45, 75].map((x, i) => (
              <g key={i} transform={`translate(${x} 0)`}>
                <Flame h={(150 + 60 * Math.sin(i * 1.3)) * flameNow} w={70} t={t} seed={i * 2.2} />
              </g>
            ))}
            {/* smoke after it goes out */}
            {flameNow < 0.3 && Array.from({ length: 8 }, (_, i) => {
              const age = ((t * 0.6 + i / 8) % 1);
              return <circle key={i} cx={Math.sin(i * 2 + t) * 30 + age * 40} cy={-40 - age * 420} r={20 + age * 50}
                fill="rgba(170,170,190,0.12)" opacity={(1 - age) * (1 - flameNow / 0.3)} />;
            })}
            {/* Zoomed mechanism: oxygen arriving at the fuel (before) vs nothing arriving (now) */}
            {zoomFire > 0.05 && (
              <g opacity={zoomFire}>
                {Array.from({ length: 10 }, (_, i) => {
                  const ph = ((t * 0.9 + i / 10) % 1);
                  const sx = -150 + i * 32;
                  const sy = -260 + ph * 240;
                  const show = whyA;
                  return (
                    <g key={i} opacity={show * (ph < 0.85 ? 1 : (1 - ph) / 0.15)} transform={`translate(${sx} ${sy}) rotate(${i * 40 + t * 90})`}>
                      <circle cx={-9} cy={0} r={10} fill={O2} />
                      <circle cx={9} cy={0} r={10} fill={O2} />
                    </g>
                  );
                })}
                {/* sparks where oxygen meets fuel */}
                {Array.from({ length: 10 }, (_, i) => {
                  const ph = ((t * 0.9 + i / 10) % 1);
                  return ph > 0.82 ? (
                    <circle key={i} cx={-150 + i * 32} cy={-30} r={18 * (1 - ph) / 0.18 + 6} fill="#ffe066" opacity={whyA} />
                  ) : null;
                })}
                {/* empty arrows: nothing to grab */}
                {[-120, -40, 40, 120].map((x, i) => (
                  <g key={i} opacity={whyB}>
                    <circle cx={x} cy={-160} r={24} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={4} strokeDasharray="8 8" />
                    <line x1={x - 14} y1={-174} x2={x + 14} y2={-146} stroke={O2} strokeWidth={5} />
                  </g>
                ))}
              </g>
            )}
          </g>

          {/* ----- Air molecules (oxygen pops out in the first second, returns at zero) ----- */}
          {mols.map((m) => {
            if (m.isO) {
              const p = popAt(m.i);
              const popped = t > p && t < CLOCK_END + 0.2 * rnd(m.i, 4);
              const pop = interpolate(t, [p, p + 0.12, p + 0.35], [0, 1, 0], clamp);
              const back = interpolate(t, [CLOCK_END + 0.2 * rnd(m.i, 4), CLOCK_END + 0.2 * rnd(m.i, 4) + 0.3], [0, 1], clamp);
              return (
                <g key={m.i}>
                  {(!popped || back > 0) && (
                    <g transform={`translate(${m.x} ${m.y}) rotate(${m.rot}) scale(${t > p ? back : 1})`} opacity={0.95 * (1 - zoomFire * 0.7)}>
                      <circle cx={-13} cy={0} r={14} fill={O2} />
                      <circle cx={13} cy={0} r={14} fill={O2} />
                    </g>
                  )}
                  {pop > 0 && <circle cx={m.x} cy={m.y} r={14 + 40 * (t - p) * 3} fill="none" stroke="#ffffff" strokeWidth={4} opacity={pop} />}
                </g>
              );
            }
            return (
              <g key={m.i} transform={`translate(${m.x} ${m.y}) rotate(${m.rot})`} opacity={0.55 * (1 - zoomFire * 0.7)}>
                <circle cx={-10} cy={0} r={10} fill={N2} />
                <circle cx={10} cy={0} r={10} fill={N2} />
              </g>
            );
          })}

          {/* ----- Fireworks ----- */}
          {launches.map((l, i) => {
            const a = t - l.t0;
            if (a < 0) return null;
            const p = Math.min(1, a / RISE);
            const sx = l.x - 40 + 40 * p;
            const sy = GROUND - (GROUND - l.y) * Easing.out(Easing.quad)(p);
            return (
              <g key={i}>
                {a < RISE && (
                  <>
                    <line x1={sx} y1={sy} x2={l.x - 40 + 40 * Math.max(0, p - 0.25)} y2={GROUND - (GROUND - l.y) * Easing.out(Easing.quad)(Math.max(0, p - 0.25))}
                      stroke="#ffd9a0" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
                    <circle cx={sx} cy={sy} r={9} fill="#fff4d0" />
                  </>
                )}
                <Burst x={l.x} y={l.y} a={a - RISE} color={l.c} r={210} />
              </g>
            );
          })}

          {/* ----- Zoom into one firework star: oxidizer grains release oxygen to fuel grains ----- */}
          {zoomStar > 0.02 && (
            <g opacity={zoomStar} transform={`translate(540 920) scale(${0.5 + 0.3 * zoomStar})`}>
              <circle cx={0} cy={0} r={300} fill="#1a1020" stroke={ACCENT} strokeWidth={8} />
              <circle cx={0} cy={0} r={300} fill="none" stroke="#ffd23f" strokeWidth={30} opacity={0.15 + 0.1 * Math.sin(t * 9)} />
              {Array.from({ length: 34 }, (_, i) => {
                const a = i * 2.399;
                const r = 250 * Math.sqrt((i + 0.5) / 34);
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                const oxid = i % 2 === 0;
                return oxid ? (
                  <g key={i}>
                    <rect x={x - 26} y={y - 26} width={52} height={52} rx={10} fill="#e8e4f4" />
                    {[0, 1, 2].map((k) => {
                      const ph = ((t * 1.2 + i * 0.13 + k / 3) % 1);
                      const ang = a + k * 2.1;
                      return <circle key={k} cx={x + Math.cos(ang) * 50 * ph} cy={y + Math.sin(ang) * 50 * ph} r={9} fill={O2} opacity={1 - ph * 0.6} />;
                    })}
                  </g>
                ) : (
                  <circle key={i} cx={x} cy={y} r={24} fill="#2b2b2b" stroke="#ff9f1c" strokeWidth={3 + 3 * Math.abs(Math.sin(t * 8 + i))} />
                );
              })}
            </g>
          )}
        </svg>

        {/* World labels */}
        <Tag x={FIRE_X} y={FIRE_Y - 330} color="#ffffff" o={outO} size={46}>FLAMES: OUT</Tag>
        <Tag x={FIRE_X} y={FIRE_Y - 245} color="#ffb070" o={coalO} size={30}>COALS STILL HOT</Tag>
        <Tag x={250} y={1340} color="#f3e6d0" o={fadeIO(CHOKE.start + 0.6, CHOKE.start + 0.9, WHY.start, WHY.start + 0.2)} size={34}>CANDLES</Tag>
        <Tag x={755} y={1335} color="#a9d2ff" o={fadeIO(CHOKE.start + 0.9, CHOKE.start + 1.2, WHY.start, WHY.start + 0.2)} size={34}>STOVE</Tag>
        <Tag x={FIRE_X} y={FIRE_Y - 245} color="#ffe066" o={whyA * zoomFire} size={26}>FUEL + OXYGEN = FIRE</Tag>
        <Tag x={FIRE_X} y={FIRE_Y - 245} color="#ffffff" o={whyB * zoomFire} size={26}>NOTHING TO GRAB</Tag>
        <Tag x={540} y={1010} color="#ffffff" o={keepO} size={46}>STILL BURNING</Tag>
        <Tag x={540} y={1180} color="#ffffff" o={insideO} size={34}>INSIDE ONE SPARK</Tag>
        <Tag x={540} y={1180} color="#ffffff" o={lockedO} size={36}>OXYGEN PACKED IN</Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: `rgba(255,230,160,${0.3 * flash})` }} />

      {/* HUD: slow-motion clock + air composition bar */}
      <div style={{ position: "absolute", top: 170, width: "100%", textAlign: "center", fontFamily: FONT, opacity: clockO,
        transform: `scale(${0.85 + 0.15 * Math.min(1, hudPop)})` }}>
        <div style={{ fontWeight: 500, fontSize: 28, letterSpacing: 7, color: "rgba(255,235,210,0.85)" }}>{clock > 0 ? "OXYGEN BACK IN" : "OXYGEN: BACK"}</div>
        <div style={{ fontWeight: 700, fontSize: 140, lineHeight: 1.0, letterSpacing: -3, fontVariantNumeric: "tabular-nums",
          color: ACCENT, textShadow: "0 0 40px rgba(255,159,28,0.45)" }}>
          {clock.toFixed(2)} S
        </div>
        <div style={{ margin: "14px auto 0", width: 760, opacity: hudO }}>
          <div style={{ display: "flex", height: 56, borderRadius: 12, overflow: "hidden", border: "3px solid rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.4)" }}>
            <div style={{ width: "78%", background: N2, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#0a1430" }}>NITROGEN</div>
            <div style={{ width: `${21 * oxygen}%`, background: O2, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 26, color: "#2a0008", overflow: "hidden" }}>O₂</div>
            <div style={{ flex: 1, border: oxygen < 0.5 ? `3px dashed ${O2}` : "none" }} />
          </div>
        </div>
      </div>
      <Tag x={880} y={455} color={O2} o={fifthO * hudO} size={34}>A FIFTH: GONE</Tag>

      <SeriesTag name="What If" n={5} accent={ACCENT} until={HOOK.end} />

      {/* Opening title */}
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700,
        fontSize: 86, lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: titleO, textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>
        WHAT IF OXYGEN
        <br />
        <span style={{ color: O2 }}>VANISHED?</span>
        <div style={{ fontSize: 40, letterSpacing: 4, marginTop: 14, color: ACCENT }}>
          FOR 5 SECONDS
        </div>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 480, width: "100%", textAlign: "center", fontFamily: FONT, opacity: endO }}>
        <div style={{ fontWeight: 700, fontSize: 66, color: "#ffffff", opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          THE ONLY FIRE LEFT
        </div>
        <div style={{ fontWeight: 700, fontSize: 92, lineHeight: 1.05, color: ACCENT, opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 0 40px rgba(255,159,28,0.5)" }}>
          BROUGHT ITS
          <br />
          OWN OXYGEN
        </div>
      </div>
      

      <div style={{ position: "absolute", top: 1395, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500,
        fontSize: 24, letterSpacing: 4, color: "rgba(255,235,210,0.7)", opacity: noteO }}>
        THOUGHT EXPERIMENT · SLOW MOTION
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="What If" next={6} accent={ACCENT} />
    </AbsoluteFill>
  );
};
