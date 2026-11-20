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
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/shell-dissolving/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

// ---------- Beats ----------
const T_AIRW = wordStart("hook", "air");
const T_HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_THIRTY = wordStart("meter", "thirty");
const T_BREAK = line("breakit").start;
const T_AWAY = wordStart("breakit", "away");
const T_BUILDS = wordStart("breakit", "builds");
const T_ACID = line("acid").start;
const T_DISSOLVE = wordStart("acid", "dissolves");
const T_CARBONIC = wordStart("acid", "carbonic");
const T_GRAB = line("grab").start;
const T_FREES = wordStart("grab", "frees");
const T_GRABW = wordStart("grab", "grab");
const T_RE = line("rehook").start;
const T_SHORT = wordStart("rehook", "short");
const T_EATS = wordStart("rehook", "eats");
const T_RE_END = line("rehook").end;
const T_PAY = line("payoff").start;
const T_AIRDID = wordStart("payoff", "air");

// ---------- Palette: teal open ocean, pearl shell, magenta acid ----------
const AQUA = "#3de0c8";
const ACID = "#ff4fa3";
const CARB = "#8fb8ff";
const PEARL = "#f6eadb";
const O_RED = "#ff7a6b";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.5) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const win = (t: number, a: number, b: number, f = 0.3) => interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);

// ---------- World ----------
const SURFACE = 560;
const SX = 560; // shell centre
const SY = 1010;
const SHELL_R = 150;

// Coiled shell: a band between a log spiral and the same spiral one turn in.
const spiralPts = (scale: number) => {
  const outer: string[] = [];
  const inner: string[] = [];
  const a = 6;
  const b = 0.2;
  const th0 = 2 * Math.PI;
  const th1 = 2 * Math.PI + 3.1 * Math.PI;
  const k = (SHELL_R * scale) / (a * Math.exp(b * th1));
  for (let i = 0; i <= 90; i++) {
    const th = th0 + ((th1 - th0) * i) / 90;
    const ro = a * Math.exp(b * th) * k;
    const ri = a * Math.exp(b * (th - 2 * Math.PI)) * k;
    outer.push(`${(ro * Math.cos(th)).toFixed(1)},${(ro * Math.sin(th) * 0.86).toFixed(1)}`);
    inner.push(`${(ri * Math.cos(th)).toFixed(1)},${(ri * Math.sin(th) * 0.86).toFixed(1)}`);
  }
  return [...outer, ...inner.reverse()].join(" ");
};
// points on the shell band, for pits
const PITS = new Array(26).fill(0).map((_, i) => {
  const th = 2 * Math.PI + 3.1 * Math.PI * (0.25 + 0.72 * random(`pt${i}`));
  const a = 6;
  const b = 0.2;
  const k = SHELL_R / (a * Math.exp(b * (2 * Math.PI + 3.1 * Math.PI)));
  const ro = a * Math.exp(b * th) * k;
  const ri = a * Math.exp(b * (th - 2 * Math.PI)) * k;
  const rr = ri + (ro - ri) * (0.3 + 0.4 * random(`pr${i}`));
  return { x: rr * Math.cos(th), y: rr * Math.sin(th) * 0.86, order: random(`po${i}`), size: 0.6 + 0.6 * random(`ps${i}`) };
});

// Shell damage 0..1 through the story
const damageAt = (t: number) => {
  if (t < T_BREAK) return interpolate(t, [0, T_HOOK_END], [0.12, 0.26], clamp);
  if (t < T_ACID) return interpolate(t, [T_BUILDS - 0.2, T_BUILDS + 1.4], [0.26, 0], { ...clamp, easing: ease });
  if (t < T_RE) return interpolate(t, [T_GRABW, T_RE], [0, 0.08], clamp);
  return interpolate(t, [T_SHORT, T_EATS, T_RE_END], [0.08, 0.45, 0.85], { ...clamp, easing: Easing.out(Easing.quad) });
};

const Tag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; children: React.ReactNode }> = ({
  x,
  y,
  color,
  opacity,
  size = 34,
  children,
}) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 3,
        color,
        opacity,
        whiteSpace: "nowrap",
        textShadow: "0 2px 12px rgba(0,10,20,0.95), 0 0 2px rgba(0,0,0,1)",
      }}
    >
      {children}
    </div>
  );

const CO2: React.FC<{ x: number; y: number; o: number; rot: number; s?: number }> = ({ x, y, o, rot, s = 1 }) => (
  <svg width={80} height={40} viewBox="-40 -20 80 40" style={{ position: "absolute", left: x - 40, top: y - 20, opacity: o, transform: `rotate(${rot}deg) scale(${s})`, overflow: "visible" }}>
    <line x1={-22} y1={0} x2={22} y2={0} stroke="#cfd8dc" strokeWidth={4} />
    <circle cx={-22} cy={0} r={11} fill={O_RED} />
    <circle cx={22} cy={0} r={11} fill={O_RED} />
    <circle cx={0} cy={0} r={12} fill="#2a2f36" stroke="#cfd8dc" strokeWidth={2} />
  </svg>
);

// carbonate ion: a small triangle
const Carb: React.FC<{ x: number; y: number; o: number; rot: number; color?: string; s?: number }> = ({ x, y, o, rot, color = CARB, s = 1 }) => (
  <svg width={40} height={40} viewBox="-20 -20 40 40" style={{ position: "absolute", left: x - 20, top: y - 20, opacity: o, transform: `rotate(${rot}deg) scale(${s})`, overflow: "visible" }}>
    <path d="M0 -15 L13 9 L-13 9 Z" fill={color} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
  </svg>
);

const Hplus: React.FC<{ x: number; y: number; o: number; s?: number }> = ({ x, y, o, s = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x - 9 * s,
      top: y - 9 * s,
      width: 18 * s,
      height: 18 * s,
      borderRadius: "50%",
      background: ACID,
      boxShadow: `0 0 14px 4px rgba(255,79,163,0.7)`,
      opacity: o,
    }}
  />
);

export const ShellDissolving: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shellPoly = useMemo(() => spiralPts(1), []);

  // ---------- Camera ----------
    const zShell = win(t, T_GRAB + 0.2, T_PAY + 0.2, 0.7); // onto the shell: ions grab carbonate, acid eats shell
  const zHook = 1 - ramp(t, 0.3, T_METER + 0.3 - 0.3);
  const scale = 1 + 0.3 * zShell + 0.05 * zHook;
  const fx = 540 + (SX - 540) * (zShell + zHook);
  const fy = 900 * (1 - zShell - zHook) + SY * (zShell + zHook);
  const ay = 900 + 60 * zShell + 110 * zHook;
  const shake = t > T_EATS ? 12 * Math.exp(-(t - T_EATS) * 5) : 0;
  const camera = `translate(${540 - fx * scale + Math.sin(frame * 2.2) * shake}px, ${ay - fy * scale + Math.cos(frame * 1.8) * shake}px) scale(${scale})`;

  // ---------- CO2 supply ----------
  // On from frame 0; switched off for the break-it test; back on from "Put it back".
  const co2On = 1 - interpolate(t, [T_AWAY - 0.5, T_AWAY + 0.1], [0, 1], clamp) + interpolate(t, [T_ACID, T_ACID + 0.4], [0, 1], clamp);
  const noCO2 = win(t, T_AWAY - 0.3, T_ACID + 0.2, 0.25);
  const molecules = new Array(16).fill(0).map((_, i) => {
    const period = 3.2 + random(`mp${i}`) * 1.5;
    const ph = random(`mph${i}`) * period;
    const k = ((t + ph) % period) / period; // 0..1 along the path
    const x = 120 + random(`mx${i}`) * 840 + Math.sin(t * 0.9 + i) * 20;
    const y = 440 + k * 420;
    const cycleStart = t - k * period;
    // a molecule only exists if CO2 was on when its trip began
    const born = 1 - interpolate(cycleStart, [T_AWAY - 0.6, T_AWAY - 0.1], [0, 1], clamp) + interpolate(cycleStart, [T_ACID - 0.4, T_ACID], [0, 1], clamp);
    const fadeDeep = interpolate(y, [SURFACE + 120, SURFACE + 290], [1, 0], clamp);
    const converted = y > SURFACE + 60; // once dissolved it is drawn as acid
    return { x, y, o: Math.min(1, born) * Math.min(1, co2On + 0.0001 > 0 ? 1 : 0) * fadeDeep * interpolate(y, [440, 480], [0, 1], clamp), rot: t * 40 + i * 30, converted, i };
  });

  // ---------- Carbonate ions around the shell ----------
  const ions = new Array(18).fill(0).map((_, i) => {
    const ang = random(`ia${i}`) * Math.PI * 2;
    const rad = 230 + random(`ir${i}`) * 170;
    const bx = SX + Math.cos(ang + t * 0.08) * rad;
    const by = SY - 40 + Math.sin(ang + t * 0.08) * rad * 0.75 + Math.sin(t * 1.3 + i) * 10;
    // break-it: the first 8 join the shell edge
    const join = i < 8 ? interpolate(t, [T_BUILDS - 0.2 + i * 0.12, T_BUILDS + 0.7 + i * 0.12], [0, 1], { ...clamp, easing: ease }) : 0;
    const respawn = i < 8 ? interpolate(t, [T_GRAB - 0.5, T_GRAB], [0, 1], clamp) : 0;
    // grab: ions 8..17 are taken by hydrogen ions, one after another
    const gi = i - 8;
    const grabAt = T_GRABW - 0.6 + gi * 0.22;
    const grab = i >= 8 ? interpolate(t, [grabAt, grabAt + 0.5], [0, 1], clamp) : interpolate(t, [T_GRABW + 0.3 + i * 0.2, T_GRABW + 0.8 + i * 0.2], [0, 1], clamp) * respawn;
    const jx = SX + Math.cos(ang) * SHELL_R * 0.95;
    const jy = SY + Math.sin(ang) * SHELL_R * 0.8;
    const usedUp = join >= 1 && respawn <= 0;
    const x = bx + (jx - bx) * join * (1 - respawn);
    const y = by + (jy - by) * join * (1 - respawn);
    return { x, y, join, respawn, grab, usedUp, i, grabAt };
  });

  // ---------- Hydrogen ions ----------
  const hOn = interpolate(t, [T_FREES - 0.1, T_FREES + 0.3], [0, 1], clamp);
  const attack = interpolate(t, [T_SHORT - 0.2, T_SHORT + 0.3], [0, 1], clamp);

  // ---------- Damage, flakes, growth ----------
  const d = damageAt(t);
  const grow = ramp(t, T_BUILDS - 0.1, 1.4) * (1 - ramp(t, T_ACID + 0.5, 1.5));
  const flakes = new Array(22).fill(0).map((_, i) => {
    const start = i < 5 ? T_AIRW - 0.1 + i * 0.35 : T_SHORT + (i - 5) * 0.2;
    const k = t - start;
    if (k < 0 || k > 3.5) return null;
    const p = PITS[i % PITS.length];
    return {
      x: SX + p.x + k * (30 + 40 * random(`fx${i}`)) * (random(`fs${i}`) > 0.5 ? 1 : -1),
      y: SY + p.y + k * 70 + Math.sin(k * 4 + i) * 10,
      o: interpolate(k, [0, 0.15, 2.6, 3.5], [0, 1, 0.8, 0], clamp),
      r: k * 120 + i * 40,
      s: (i < 5 ? 16 : 8) + 8 * random(`fz${i}`),
    };
  });
  const eatPulse = spring({ frame: frame - Math.round(T_EATS * fps), fps, config: { damping: 8, stiffness: 150 } });

  // ---------- Meter (ocean acidity vs pre-industrial) ----------
  const meterIn = spring({ frame: frame - Math.round((T_HOOK_END - 0.1) * fps), fps, config: { damping: 14, stiffness: 170 } });
  const meterOut = 1 - ramp(t, T_PAY - 0.2, 0.35);
  const TODAY = 0.3;
  const FUT = 1.5; // pH 7.8 vs 8.2: about 2.5x the hydrogen ions
  const MAXV = 1.6;
  const level =
    t < T_METER
      ? TODAY
      : t < T_BREAK
        ? interpolate(t, [T_METER, T_THIRTY + 0.6], [0, TODAY], { ...clamp, easing: ease })
        : t < T_ACID
          ? interpolate(t, [T_AWAY - 0.2, T_AWAY + 0.5], [TODAY, 0], { ...clamp, easing: ease })
          : t < T_RE
            ? interpolate(t, [T_ACID, T_ACID + 0.8], [0, TODAY], { ...clamp, easing: ease })
            : TODAY;
  const futureGhost = ramp(t, T_SHORT, 0.8);
  const thirtyPop = spring({ frame: frame - Math.round(T_THIRTY * fps), fps, config: { damping: 8, stiffness: 160 } });

  const titleOut = ramp(t, T_HOOK_END - 0.35, 0.3);
  const worldMask = ramp(t, T_HOOK_END - 0.3, 0.4) * (1 - ramp(t, T_PAY - 0.2, 0.5));
  const endA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 15, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(T_AIRDID * fps), fps, config: { damping: 11, stiffness: 170 } });

  const wing = Math.sin(t * 7) * 18;

  return (
    <AbsoluteFill style={{ background: "#02121c", overflow: "hidden" }}>
      <Audio src={staticFile("shell-dissolving/narration.wav")} />
      <Audio src={staticFile("shell-dissolving/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ background: "#0c1a2e" }} />
      <AbsoluteFill
        style={{
          WebkitMaskImage: `linear-gradient(180deg, rgba(0,0,0,${1 - worldMask}) 0px, rgba(0,0,0,${1 - worldMask}) 345px, #000 420px)`,
          maskImage: `linear-gradient(180deg, rgba(0,0,0,${1 - worldMask}) 0px, rgba(0,0,0,${1 - worldMask}) 345px, #000 420px)`,
        }}
      >
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        {/* air */}
        <div style={{ position: "absolute", left: -600, top: -600, width: 2280, height: SURFACE + 600, background: "linear-gradient(180deg, #0c1a2e 0%, #1b3550 70%, #2b4d68 100%)" }} />
        {/* ocean */}
        <div style={{ position: "absolute", left: -600, top: SURFACE, width: 2280, height: 2400, background: "linear-gradient(180deg, #0f6f86 0%, #0a4c63 18%, #06303f 45%, #031923 80%)" }} />
        {/* light rays */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 100 + i * 260 + Math.sin(t * 0.5 + i) * 30,
              top: SURFACE,
              width: 90,
              height: 1000,
              background: "linear-gradient(180deg, rgba(160,240,255,0.16), rgba(160,240,255,0))",
              transform: `skewX(${-12 + i * 4}deg)`,
            }}
          />
        ))}
        {/* surface wave line */}
        <svg width={2280} height={60} style={{ position: "absolute", left: -600, top: SURFACE - 30, overflow: "visible" }}>
          <path
            d={`M0 30 ${new Array(48).fill(0).map((_, i) => `Q ${i * 50 + 25} ${30 + (i % 2 ? 1 : -1) * 9 * Math.sin(t * 2 + i)} ${(i + 1) * 50} 30`).join(" ")}`}
            fill="none"
            stroke="rgba(200,250,255,0.8)"
            strokeWidth={4}
          />
        </svg>
        <Tag x={170} y={SURFACE - 70} color="#d6ecff" opacity={win(t, 0, T_BREAK + 0.2, 0.2) + win(t, T_PAY, 40, 0.3)} size={38}>
          AIR
        </Tag>
        <Tag x={170} y={SURFACE + 60} color="#bff6ff" opacity={win(t, 0, T_BREAK + 0.2, 0.2)} size={38}>
          SEAWATER
        </Tag>

        {/* CO2 molecules falling from the air into the sea; below the surface they become carbonic acid */}
        {molecules.map((m) =>
          m.o <= 0.01 ? null : m.converted ? (
            <div key={m.i}>
              <CO2 x={m.x} y={m.y} o={m.o * 0.35} rot={m.rot} s={0.85} />
              <div style={{ position: "absolute", left: m.x - 26, top: m.y - 26, width: 52, height: 52, borderRadius: "50%", border: `3px solid ${ACID}`, opacity: m.o * 0.85, boxShadow: `0 0 14px rgba(255,79,163,0.5)` }} />
            </div>
          ) : (
            <CO2 key={m.i} x={m.x} y={m.y} o={m.o} rot={m.rot} />
          ),
        )}
        <Tag x={760} y={SURFACE - 70} color="#ffd0c8" opacity={win(t, T_HOOK_END, T_BREAK, 0.25) + win(t, T_ACID, T_GRAB, 0.25)} size={36}>
          CARBON DIOXIDE
        </Tag>
        <Tag x={540} y={SURFACE + 150} color={ACID} opacity={win(t, T_CARBONIC - 0.15, T_GRAB + 0.3, 0.25)} size={40}>
          CO2 + WATER = CARBONIC ACID
        </Tag>

        {/* hydrogen ions released from the acid, heading for carbonate (grab) and then for the shell (rehook) */}
        {hOn > 0 &&
          ions.map((ion) => {
            if (ion.i < 8) return null;
            const srcX = 200 + random(`hx${ion.i}`) * 700;
            const srcY = SURFACE + 160 + random(`hy${ion.i}`) * 120;
            const k = interpolate(t, [T_FREES + (ion.i - 8) * 0.12, ion.grabAt + 0.4], [0, 1], { ...clamp, easing: ease });
            const x = srcX + (ion.x - srcX) * k;
            const y = srcY + (ion.y - srcY) * k;
            return <Hplus key={`h${ion.i}`} x={x} y={y} o={hOn * (1 - interpolate(ion.grab, [0.6, 1], [0, 1], clamp))} />;
          })}
        {/* the second wave of hydrogen ions attacks the shell itself */}
        {attack > 0 &&
          PITS.slice(0, 16).map((p, i) => {
            const s0 = T_SHORT - 0.1 + i * 0.16;
            const k = interpolate(t, [s0, s0 + 0.7], [0, 1], { ...clamp, easing: ease });
            const srcX = SX + Math.cos(i * 2.4) * 420;
            const srcY = SY + Math.sin(i * 2.4) * 330;
            return k <= 0 || k >= 1 ? null : <Hplus key={`a${i}`} x={srcX + (SX + p.x - srcX) * k} y={srcY + (SY + p.y - srcY) * k} o={attack} s={1.1} />;
          })}

        {/* carbonate ions */}
        {ions.map((ion) => {
          if (ion.usedUp) return null;
          const grabbed = ion.grab > 0.5;
          return (
            <Carb
              key={ion.i}
              x={ion.x + (grabbed ? (ion.grab - 0.5) * 80 : 0)}
              y={ion.y + (grabbed ? (ion.grab - 0.5) * 60 : 0)}
              o={(grabbed ? 0.45 : 1) * (ion.join > 0.98 && ion.respawn <= 0 ? 0 : 1)}
              rot={t * 30 + ion.i * 20}
              color={grabbed ? "#5c6f88" : CARB}
              s={grabbed ? 0.9 : 1}
            />
          );
        })}
        <Tag x={540} y={SY - 300} color={CARB} opacity={win(t, T_BUILDS - 0.3, T_ACID + 0.3, 0.25) + win(t, T_GRABW - 0.5, T_RE, 0.25)} size={36}>
          {t < T_GRAB ? "CARBONATE: SHELL BRICKS" : "CARBONATE GRABBED"}
        </Tag>

        {/* ---------- Sea butterfly (pteropod) ---------- */}
        <div style={{ position: "absolute", left: SX, top: SY, transform: `translate(${Math.sin(t * 1.1) * 8}px, ${Math.sin(t * 1.6) * 10}px)` }}>
          {/* wings */}
          <svg width={10} height={10} style={{ position: "absolute", overflow: "visible", transform: "scale(0.72) translateY(40px)" }}>
            <path d={`M -10 -110 C -120 ${-230 - wing} -230 ${-170 - wing} -200 ${-90 + wing * 0.3} C -170 -40 -80 -70 -10 -110 Z`} fill="rgba(255,150,120,0.5)" stroke="rgba(255,200,180,0.9)" strokeWidth={3} />
            <path d={`M 10 -110 C 120 ${-230 - wing} 230 ${-170 - wing} 200 ${-90 + wing * 0.3} C 170 -40 80 -70 10 -110 Z`} fill="rgba(255,150,120,0.5)" stroke="rgba(255,200,180,0.9)" strokeWidth={3} />
            <ellipse cx={0} cy={-105} rx={26} ry={30} fill="rgba(255,170,130,0.85)" />
          </svg>
          {/* shell */}
          <svg width={10} height={10} style={{ position: "absolute", overflow: "visible" }}>
            <defs>
              <radialGradient id="pearl" cx="45%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                <stop offset="60%" stopColor={PEARL} stopOpacity={0.88} />
                <stop offset="100%" stopColor="#c9b8a6" stopOpacity={0.85} />
              </radialGradient>
            </defs>
            <g transform={`scale(${1 + 0.07 * grow}) rotate(-20)`}>
              {/* growth glow */}
              <polygon points={shellPoly} fill="none" stroke={AQUA} strokeWidth={22} opacity={0.85 * grow} />
              <polygon points={shellPoly} fill="url(#pearl)" stroke="#fff6ea" strokeWidth={3} opacity={1 - 0.35 * Math.max(0, d - 0.5)} />
              <polyline points={shellPoly.split(" ").slice(91).join(" ")} fill="none" stroke="rgba(150,120,100,0.7)" strokeWidth={3} />
              {/* pits */}
              {PITS.map((p, i) => {
                const a = d - p.order * 0.8;
                if (a <= 0) return null;
                const rr = Math.min(26, 6 + 40 * a) * p.size;
                return <ellipse key={i} cx={p.x} cy={p.y} rx={rr} ry={rr * 0.75} fill="rgba(4,30,44,0.9)" stroke="rgba(255,79,163,0.55)" strokeWidth={2} />;
              })}
            </g>
          </svg>
        </div>
        {/* eat flash */}
        <div style={{ position: "absolute", left: SX - 220, top: SY - 220, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,79,163,0.55) 0%, rgba(255,79,163,0) 65%)", opacity: t > T_EATS ? Math.max(0, 1 - Math.min(1, eatPulse)) : 0 }} />
        {/* flakes */}
        {flakes.map((f, i) =>
          f ? (
            <div key={i} style={{ position: "absolute", left: f.x - f.s / 2, top: f.y - f.s / 2, width: f.s, height: f.s * 0.7, background: PEARL, opacity: f.o, transform: `rotate(${f.r}deg)`, borderRadius: 2 }} />
          ) : null,
        )}
        <Tag x={SX} y={SY + 220} color="#ffe2d2" opacity={win(t, T_HOOK_END - 0.4, T_BREAK + 0.2, 0.3)} size={34}>
          SEA BUTTERFLY SHELL
        </Tag>
        <Tag x={SX} y={SY + 220} color={AQUA} opacity={win(t, T_BUILDS + 0.2, T_ACID + 0.3, 0.3)} size={40}>
          SHELL GROWS
        </Tag>
        <Tag x={SX - 10} y={SY + 215} color={ACID} opacity={win(t, T_EATS - 0.1, T_PAY + 0.3, 0.25)} size={42}>
          SHELL DISSOLVING
        </Tag>
      </AbsoluteFill>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,8,14,0.55) 100%)" }} />
      <SeriesTag name="Why It Happens" n={6} accent={AQUA} until={T_HOOK_END} />

      {/* no-CO2 stamp */}
      <div style={{ position: "absolute", top: 470, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 46, letterSpacing: 4, color: "#ffffff", opacity: noCO2 }}>
        <span style={{ background: "rgba(2,18,28,0.85)", border: `3px solid ${AQUA}`, borderRadius: 14, padding: "6px 20px" }}>TEST: NO CO2 IN THE AIR</span>
      </div>

      {/* Opening question */}
      <div
        style={{
          position: "absolute",
          top: 235,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 84,
          lineHeight: 1.04,
          letterSpacing: -2,
          color: "#ffffff",
          opacity: 1 - titleOut,
          transform: `translateY(${-30 * titleOut}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)",
        }}
      >
        WHY IS THIS SHELL
        <br />
        <span style={{ color: AQUA }}>DISSOLVING?</span>
      </div>

      {/* Acidity meter */}
      <div style={{ position: "absolute", top: 160, left: 90, right: 90, fontFamily: FONT, opacity: Math.min(1, meterIn) * meterOut, transform: `translateY(${20 * (1 - Math.min(1, meterIn))}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 5, color: "#ffffff" }}>OCEAN ACIDITY</div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 84,
              letterSpacing: -2,
              color: level > 0.01 ? ACID : AQUA,
              fontVariantNumeric: "tabular-nums",
              transform: `scale(${t > T_THIRTY ? 1 + 0.2 * (1 - Math.min(1, thirtyPop)) : 1})`,
              textShadow: "0 0 30px rgba(255,79,163,0.35)",
            }}
          >
            +{Math.round(level * 100)}%
          </div>
        </div>
        <div style={{ position: "relative", height: 40, marginTop: 6, borderRadius: 20, background: "rgba(255,255,255,0.12)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.3)" }}>
          {/* projected 2100 */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(100 * FUT) / MAXV}%`, borderRadius: 20, border: `3px dashed rgba(255,79,163,0.8)`, boxSizing: "border-box", opacity: futureGhost }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(100 * level) / MAXV}%`, borderRadius: 20, background: `linear-gradient(90deg, ${AQUA}, ${ACID})` }} />
          <div style={{ position: "absolute", left: `${(100 * TODAY) / MAXV}%`, top: -8, bottom: -8, width: 4, background: "#ffffff" }} />
        </div>
        <div style={{ position: "relative", height: 40, marginTop: 6, fontSize: 26, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.8)" }}>
          <span style={{ position: "absolute", left: 0 }}>1800s</span>
          <span style={{ position: "absolute", left: `${(100 * TODAY) / MAXV}%`, transform: "translateX(-50%)" }}>TODAY</span>
          <span style={{ position: "absolute", right: `${100 - (100 * FUT) / MAXV}%`, transform: "translateX(50%)", color: ACID, opacity: futureGhost }}>2100?</span>
        </div>
      </div>

      {/* Lab label during the climax */}
      <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 27, letterSpacing: 3, color: "rgba(255,225,240,0.9)", opacity: win(t, T_EATS + 0.2, T_PAY + 0.1, 0.3) }}>
        LAB TEST: 2100-LEVEL SEAWATER DISSOLVED SHELLS IN 45 DAYS
      </div>
      <div style={{ position: "absolute", top: 1375, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 5, color: "rgba(200,240,240,0.65)", opacity: win(t, T_METER, T_EATS + 0.1, 0.3) }}>
        SIMPLIFIED MODEL
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 54, letterSpacing: 5, color: "#ffffff", opacity: Math.min(1, endA), transform: `translateY(${20 * (1 - Math.min(1, endA))}px)` }}>
          NOBODY POURED ACID IN
        </div>
        <div style={{ fontWeight: 700, fontSize: 120, lineHeight: 1.05, letterSpacing: -2, color: AQUA, opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          THE AIR DID
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={AQUA} />
      <SeriesOutro name="Why It Happens" next={7} accent={AQUA} />
    </AbsoluteFill>
  );
};
