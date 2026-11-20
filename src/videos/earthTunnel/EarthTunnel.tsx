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
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { Starfield } from "../../primitives/Starfield";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/earth-tunnel/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

// ---------- Beats (all from the narration timeline) ----------
const T_JUMP = wordStart("hook", "jump");
const T_HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_WATCH = wordStart("meter", "watch");
const T_AIR = line("air").start;
const T_STUCK = wordStart("air", "stuck");
const T_VAC = line("vacuum").start;
const T_G = wordStart("vacuum", "gravity");
const T_RE = line("rehook").start;
const T_ZERO = wordStart("rehook", "zero");
const T_WHY = wordStart("rehook", "so");
const T_THRU = line("through").start;
const T_SHOOT = wordStart("through", "shoot");
const T_ARR = line("through").end;
const T_PAY = line("payoff").start;
const T_NEVER = wordStart("payoff", "never");

const TRIP_MIN = 38 + 11 / 60; // PREM fall time, Klotz 2015

// ---------- Palette: night-violet space, molten Earth, electric lime HUD ----------
const LIME = "#c6ff3d";
const VIOLET = "#b18cff";
const AIRBLUE = "#9fd8ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.4) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const win = (t: number, a: number, b: number, f = 0.3) => interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);

// ---------- World geometry ----------
const CX = 540;
const CY = 860;
const R = 430;
const TUNNEL_W = 64;

// ---------- Motion model ----------
// Position along the tunnel u: -1 = near surface (top), 0 = centre, +1 = far surface (bottom).
// Simple swing u = -A cos(pi s); s is the fraction of one crossing, so the clock is s * 38:11.
const HALF_A = 6.1; // first run (hook + meter): reaches the centre about when the meter line ends
const AIR_RATE = 0.95; // crossings per second while the "with air" swings are fast-forwarded
const sAirStart = Math.max(0, T_AIR - T_JUMP) / (2 * HALF_A);

type State = { u: number; s: number; amp: number; run: "air" | "rewind" | "vac" };
const stateAt = (t: number): State => {
  if (t < T_VAC) {
    let s = Math.max(0, t - T_JUMP) / (2 * HALF_A);
    let amp = 1;
    if (t > T_AIR) {
      s = sAirStart + (t - T_AIR) * AIR_RATE;
      amp = Math.exp(-1.05 * (t - T_AIR));
    }
    return { u: -amp * Math.cos(Math.PI * s), s, amp, run: "air" };
  }
  if (t < T_G) {
    const end = stateAt(T_VAC - 0.001);
    const k = interpolate(t, [T_VAC, T_G - 0.15], [0, 1], { ...clamp, easing: ease });
    return { u: end.u + (-1 - end.u) * k, s: end.s * (1 - k), amp: 1, run: "rewind" };
  }
  let s: number;
  if (t < T_ZERO) s = 0.5 * (t - T_G) / (T_ZERO - T_G);
  else if (t < T_THRU) s = 0.5 + 0.035 * (t - T_ZERO) / (T_THRU - T_ZERO);
  else if (t < T_ARR) s = 0.535 + 0.465 * (t - T_THRU) / (T_ARR - T_THRU);
  else if (t < T_ARR + 0.45) s = 1;
  else s = 1 + 0.16 * (t - T_ARR - 0.45);
  return { u: -Math.cos(Math.PI * s), s, amp: 1, run: "vac" };
};

const mmss = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
        textShadow: "0 2px 12px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)",
      }}
    >
      {children}
    </div>
  );

const Traveller: React.FC<{ x: number; y: number; tilt: number; glow: number }> = ({ x, y, tilt, glow }) => (
  <div style={{ position: "absolute", left: x - 22, top: y - 34, width: 44, height: 68, transform: `rotate(${tilt}deg)` }}>
    <svg width={44} height={68} viewBox="0 0 44 68" style={{ overflow: "visible" }}>
      <circle cx={22} cy={22} r={30} fill={`rgba(198,255,61,${0.25 * glow})`} />
      {/* suit */}
      <rect x={9} y={22} width={26} height={30} rx={11} fill="#f2f4ff" stroke="#1b1530" strokeWidth={2.5} />
      {/* arms up while falling */}
      <path d="M10 28 L1 12 M34 28 L43 12" stroke="#f2f4ff" strokeWidth={7} strokeLinecap="round" />
      <path d="M16 50 L13 66 M28 50 L31 66" stroke="#f2f4ff" strokeWidth={7} strokeLinecap="round" />
      {/* helmet */}
      <circle cx={22} cy={14} r={12} fill="#f2f4ff" stroke="#1b1530" strokeWidth={2.5} />
      <rect x={14} y={9} width={16} height={9} rx={4} fill={LIME} />
    </svg>
  </div>
);

export const EarthTunnel: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const st = stateAt(t);
  const prev = stateAt(t - 1 / fps);
  const vel = (st.u - prev.u) * fps; // screen velocity (for streaks)
  // the jump: a hop up off the rim, then into the hole
  const hopK = interpolate(t, [T_JUMP - 0.05, T_JUMP + 0.45], [0, 1], clamp);
  const ty = CY + R * st.u - 70 * Math.sin(Math.PI * hopK) * (t < T_AIR ? 1 : 0);
  const r = Math.abs(st.u);
  const speedModel = st.run === "rewind" ? 0 : st.amp * Math.abs(Math.sin(Math.PI * st.s)); // 0..1, physical speed

  // ---------- Camera ----------
  // Starts close on the rim (frame 0 poses the question), pulls back to the whole planet by the meter line,
  // pushes in on the centre for the re-hook, pulls back for the shoot-through.
  const intro = 1 - interpolate(t, [0.45, T_METER + 0.4], [0, 1], { ...clamp, easing: ease });
  const followW = ramp(t, T_AIR - 0.4, 0.8) * (1 - ramp(t, T_PAY, 0.9));
  const scale = 1 + 0.75 * intro + 0.24 * followW;
  const followY = Math.max(CY - R * 0.5, Math.min(CY + R * 0.5, ty));
  const focusX = CX;
  const focusY = intro * (CY - R + 80) + followW * followY + Math.max(0, 1 - intro - followW) * CY;
  const anchorY = intro * 900 + followW * 920 + Math.max(0, 1 - intro - followW) * 880;
  const worldMask = ramp(t, T_HOOK_END - 0.3, 0.4);
  const shake =
    (t > T_SHOOT ? 12 * Math.exp(-(t - T_SHOOT) * 5) : 0) + (t > T_ARR ? 10 * Math.exp(-(t - T_ARR) * 6) : 0) +
    (t > T_JUMP ? 6 * Math.exp(-(t - T_JUMP) * 6) : 0);
  const camera = `translate(${540 - focusX * scale + Math.sin(frame * 2.1) * shake}px, ${
    anchorY - focusY * scale + Math.cos(frame * 1.7) * shake
  }px) scale(${scale})`;

  // ---------- Air ----------
  const airOn = interpolate(t, [T_AIR - 0.2, T_AIR + 0.4], [0, 1], clamp) * (1 - interpolate(t, [T_VAC + 0.1, T_G], [0, 1], clamp));
  const drain = interpolate(t, [T_VAC + 0.1, T_G], [0, 1], clamp);
  const stuckTag = win(t, T_STUCK - 0.1, T_VAC + 0.3, 0.25);
  const airParticles = new Array(70).fill(0).map((_, i) => {
    const px = CX + (random(`ax${i}`) - 0.5) * (TUNNEL_W - 12);
    const base = CY - R + random(`ay${i}`) * 2 * R;
    const wob = Math.sin(t * (1 + random(`aw${i}`) * 2) + i) * 8;
    const y = base - drain * drain * 1400 * (0.6 + random(`ad${i}`));
    return { x: px + wob * 0.3, y: y + wob, s: 3 + random(`as${i}`) * 4 };
  });

  // ---------- Gravity arrow ----------
  const gravOn = interpolate(t, [T_G - 0.2, T_G + 0.3], [0, 1], clamp) * (1 - ramp(t, T_PAY + 0.5, 0.5));
  const gLen = 150 * r * gravOn;
  const gDir = st.u < 0 ? 1 : -1; // always points toward the centre
  const zeroPulse = spring({ frame: frame - Math.round(T_ZERO * fps), fps, config: { damping: 9, stiffness: 140 } });
  const zeroTag = win(t, T_ZERO - 0.1, T_THRU + 0.2, 0.25);

  // ---------- Arrival ----------
  const arrFlash = interpolate(t, [T_ARR - 0.05, T_ARR + 0.05, T_ARR + 0.7], [0, 1, 0], clamp);
  const arrivedTag = win(t, T_ARR, T_PAY + 0.6, 0.25);

  // ---------- HUD values ----------
  const minutes = st.s * TRIP_MIN;
  const clockIn = spring({ frame: frame - Math.round((T_HOOK_END - 0.15) * fps), fps, config: { damping: 14, stiffness: 170 } });
  const clockOut = 1 - ramp(t, T_PAY - 0.2, 0.35);
  const airFail = t > T_AIR && t < T_G && minutes > TRIP_MIN; // with air: the clock runs past arrival time
  const arrived = t >= T_ARR && t < T_PAY;
  const arrivePop = spring({ frame: frame - Math.round(T_ARR * fps), fps, config: { damping: 7, stiffness: 200, mass: 0.6 } });
  const watchPulse = spring({ frame: frame - Math.round(T_WATCH * fps), fps, config: { damping: 8, stiffness: 160 } });
  const clockColor = airFail ? "#ff5d6c" : arrived ? "#ffffff" : LIME;
  const titleOut = ramp(t, T_HOOK_END - 0.35, 0.3);
  const endA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 15, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(T_NEVER * fps), fps, config: { damping: 11, stiffness: 170 } });
  const runLabel = st.run === "air" && t > T_AIR - 0.2 ? "WITH AIR · FAST-FORWARD" : st.run === "rewind" ? "PUMPING AIR OUT" : t >= T_G ? "NO AIR" : "";

  // Ghost trail of earlier positions (the endless swing) in the payoff
  const trail = new Array(14).fill(0).map((_, i) => {
    const tt = t - i * 0.12;
    const s2 = stateAt(tt);
    return { y: CY + R * s2.u, o: (1 - i / 14) * 0.5 };
  });
  const trailOn = ramp(t, T_SHOOT - 0.2, 0.3) * (t < T_ARR ? 1 : 1);

  // Streaks while moving fast
  const streak = Math.min(1, Math.abs(vel) / 900);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, #1d1238 0%, #0b0716 58%, #040309 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("earth-tunnel/narration.wav")} />
      <Audio src={staticFile("earth-tunnel/bed.wav")} volume={0.6} />
      <Starfield seed="tunnel" count={200} drift={4} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill
        style={{
          WebkitMaskImage: `linear-gradient(180deg, rgba(0,0,0,${1 - worldMask}) 0px, rgba(0,0,0,${1 - worldMask}) 395px, #000 455px)`,
          maskImage: `linear-gradient(180deg, rgba(0,0,0,${1 - worldMask}) 0px, rgba(0,0,0,${1 - worldMask}) 395px, #000 455px)`,
        }}
      >
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        {/* Planet cross-section: crust, mantle, outer core, inner core (radii to scale) */}
        <div
          style={{
            position: "absolute",
            left: CX - R,
            top: CY - R,
            width: 2 * R,
            height: 2 * R,
            borderRadius: "50%",
            background: `radial-gradient(circle closest-side, #fff6c8 0%, #ffd45c ${19 * 0.98}%, #ff9d2e ${19}%, #ff7a1f ${40}%, #f0581c ${54.6}%, #b8321f ${55}%, #8a2a22 ${78}%, #5a1d22 ${97}%, #2f7a4a ${97.2}%, #1f5a39 100%)`,
            boxShadow: "0 0 120px 20px rgba(255,120,40,0.18), inset 0 0 40px rgba(0,0,0,0.5)",
          }}
        />
        {/* layer outlines + slow mantle convection */}
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <g transform={`rotate(${t * 9} ${CX} ${CY})`} opacity={0.35}>
            {new Array(9).fill(0).map((_, i) => {
              const rr = R * (0.62 + 0.3 * random(`cr${i}`));
              const a0 = (i / 9) * Math.PI * 2;
              const a1 = a0 + 0.5 + 0.4 * random(`ca${i}`);
              return (
                <path
                  key={i}
                  d={`M ${CX + rr * Math.cos(a0)} ${CY + rr * Math.sin(a0)} A ${rr} ${rr} 0 0 1 ${CX + rr * Math.cos(a1)} ${CY + rr * Math.sin(a1)}`}
                  fill="none"
                  stroke="#ffcf9a"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <circle cx={CX} cy={CY} r={R * 0.546} fill="none" stroke="rgba(255,240,200,0.35)" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={R * 0.19} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} />
          {/* gravity-zero ring at the centre */}
          <circle
            cx={CX}
            cy={CY}
            r={20 + 90 * Math.min(1, zeroPulse)}
            fill="none"
            stroke={VIOLET}
            strokeWidth={5}
            opacity={zeroTag * (1 - 0.6 * Math.min(1, zeroPulse))}
          />
        </svg>

        {/* Tunnel */}
        <div
          style={{
            position: "absolute",
            left: CX - TUNNEL_W / 2,
            top: CY - R - 6,
            width: TUNNEL_W,
            height: 2 * R + 12,
            background: "linear-gradient(90deg, #09060f 0%, #150d24 50%, #09060f 100%)",
            boxShadow: "0 0 0 3px rgba(255,255,255,0.35), 0 0 30px 6px rgba(0,0,0,0.6)",
            borderRadius: 8,
          }}
        />
        {/* Air in the tunnel */}
        {airOn > 0.01 && (
          <>
            <div
              style={{
                position: "absolute",
                left: CX - TUNNEL_W / 2 + 3,
                top: CY - R - 3 - drain * 2 * R,
                width: TUNNEL_W - 6,
                height: 2 * R + 6,
                background: `linear-gradient(180deg, rgba(159,216,255,${0.32 * airOn}), rgba(159,216,255,${0.18 * airOn}))`,
                clipPath: `inset(${drain * 2 * R}px 0 0 0)`,
              }}
            />
            {airParticles.map((p, i) =>
              p.y > CY - R && p.y < CY + R ? (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: p.x - p.s / 2,
                    top: p.y - p.s / 2,
                    width: p.s,
                    height: p.s,
                    borderRadius: "50%",
                    background: AIRBLUE,
                    opacity: 0.8 * airOn,
                  }}
                />
              ) : null,
            )}
          </>
        )}

        {/* Ghost trail (shoot-through and the endless swing) */}
        {trail.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: CX - 10,
              top: p.y - 10,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: LIME,
              opacity: p.o * trailOn * (i === 0 ? 0 : 1),
            }}
          />
        ))}

        {/* Speed streaks */}
        {streak > 0.05 &&
          [-1, 1].map((side) => (
            <div
              key={side}
              style={{
                position: "absolute",
                left: CX + side * 34 - 2,
                top: ty - (vel > 0 ? 120 : -20) * streak - 20,
                width: 4,
                height: 140 * streak,
                background: `linear-gradient(${vel > 0 ? 180 : 0}deg, rgba(198,255,61,0), rgba(198,255,61,0.9))`,
                borderRadius: 2,
              }}
            />
          ))}

        {/* Gravity arrow toward the centre */}
        {gLen > 4 && (
          <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
            <line x1={CX + 70} y1={ty} x2={CX + 70} y2={ty + gDir * gLen} stroke={VIOLET} strokeWidth={9} strokeLinecap="round" />
            <path
              d={`M ${CX + 52} ${ty + gDir * (gLen - 6)} L ${CX + 70} ${ty + gDir * (gLen + 18)} L ${CX + 88} ${ty + gDir * (gLen - 6)} Z`}
              fill={VIOLET}
            />
          </svg>
        )}
        <Tag x={CX + 175} y={ty + gDir * Math.max(30, gLen * 0.5)} color={VIOLET} opacity={gravOn * interpolate(r, [0.22, 0.32], [0, 1], clamp)}>
          GRAVITY
        </Tag>

        {/* Drag arrows against the motion while air is in */}
        {airOn > 0.05 && t > T_AIR && Math.abs(vel) > 80 && (
          <Tag x={CX - 150} y={ty} color={AIRBLUE} opacity={airOn * Math.min(1, Math.abs(vel) / 300)}>
            {vel > 0 ? "DRAG ▲" : "DRAG ▼"}
          </Tag>
        )}

        {/* Traveller */}
        <Traveller x={CX} y={ty} tilt={Math.sin(t * 3) * 8} glow={speedModel} />

        {/* Arrival flash at the far surface */}
        <div
          style={{
            position: "absolute",
            left: CX - 160,
            top: CY + R - 160,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(198,255,61,0.5) 35%, rgba(198,255,61,0) 70%)",
            opacity: arrFlash,
            transform: `scale(${0.5 + arrFlash})`,
          }}
        />

        {/* World labels */}
        <Tag x={CX + 250} y={CY - R * 0.78} color="#ffd2b0" opacity={win(t, T_METER, T_AIR + 0.4)}>
          MANTLE
        </Tag>
        <Tag x={CX - 230} y={CY - R * 0.3} color="#fff0c0" opacity={win(t, T_METER + 0.6, T_AIR + 0.4)}>
          OUTER CORE
        </Tag>
        <Tag x={CX + 200} y={CY + R * 0.06} color="#ffffff" opacity={win(t, T_METER + 1.2, T_AIR + 0.4)}>
          INNER CORE
        </Tag>
        <Tag x={CX + 150} y={CY - R - 30} color="#bff5c8" opacity={win(t, 0, T_HOOK_END - 0.1)} size={30}>
          YOU ARE HERE
        </Tag>
        <Tag x={CX} y={CY + R + 44} color={LIME} opacity={win(t, T_WATCH - 0.2, T_AIR + 0.2) + arrivedTag} size={34}>
          {arrived ? "ARRIVED · SPEED ZERO" : "THE OTHER SIDE"}
        </Tag>
        <Tag x={CX + 190} y={CY + 6} color="#ff8a95" opacity={stuckTag} size={40}>
          STUCK
        </Tag>
        <Tag x={CX - 210} y={CY - 70} color={VIOLET} opacity={zeroTag} size={38}>
          GRAVITY: ZERO
        </Tag>
        <Tag x={CX + 210} y={CY + 70} color={LIME} opacity={win(t, T_WHY, T_SHOOT + 0.8, 0.25)} size={38}>
          TOP SPEED
        </Tag>
      </AbsoluteFill>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)" }} />

      {/* backing for the captions where the planet passes behind them */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1390, height: 260, opacity: ramp(t, T_HOOK_END - 0.2, 0.5), background: "linear-gradient(180deg, rgba(8,5,16,0) 0%, rgba(8,5,16,0.5) 35%, rgba(8,5,16,0.5) 70%, rgba(8,5,16,0) 100%)" }} />
      <SeriesTag name="What If" n={2} accent={LIME} until={T_HOOK_END} />

      {/* Opening question, on screen from frame 0 */}
      <div
        style={{
          position: "absolute",
          top: 235,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 86,
          lineHeight: 1.04,
          letterSpacing: -2,
          color: "#ffffff",
          opacity: 1 - titleOut,
          transform: `translateY(${-30 * titleOut}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)",
        }}
      >
        WHAT IF YOU FELL
        <br />
        <span style={{ color: LIME }}>THROUGH EARTH?</span>
      </div>

      {/* Clock + speed meter */}
      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          opacity: Math.min(1, clockIn) * clockOut,
          transform: `translateY(${24 * (1 - Math.min(1, clockIn))}px)`,
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 28, letterSpacing: 7, color: "rgba(255,255,255,0.78)" }}>
          {runLabel ? runLabel : "FALL TIME"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 22 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 132,
              lineHeight: 1.05,
              letterSpacing: -3,
              fontVariantNumeric: "tabular-nums",
              color: clockColor,
              transform: `scale(${t >= T_ARR ? 1 + 0.16 * (1 - Math.min(1, arrivePop)) : 1})`,
              textShadow: `0 0 36px ${airFail ? "rgba(255,80,100,0.5)" : "rgba(198,255,61,0.35)"}`,
            }}
          >
            {mmss(minutes)}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 40,
              color: "rgba(255,255,255,0.85)",
              transform: `scale(${1 + 0.25 * (1 - Math.min(1, watchPulse)) * (t > T_WATCH ? 1 : 0)})`,
            }}
          >
            {airFail ? "NEVER ARRIVES" : "/ 38:11 ARRIVE"}
          </div>
        </div>
        {/* speed bar */}
        <div style={{ margin: "8px auto 0", width: 640, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: 4, color: "rgba(255,255,255,0.75)", width: 110, textAlign: "right" }}>
            SPEED
          </div>
          <div style={{ flex: 1, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.12)", overflow: "hidden", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25)" }}>
            <div style={{ width: `${100 * speedModel}%`, height: "100%", borderRadius: 13, background: `linear-gradient(90deg, ${VIOLET}, ${LIME})` }} />
          </div>
        </div>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 50,
            letterSpacing: 6,
            color: LIME,
            opacity: Math.min(1, endA),
            transform: `translateY(${20 * (1 - Math.min(1, endA))}px)`,
          }}
        >
          THEN YOU FALL BACK
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 108,
            lineHeight: 1.04,
            letterSpacing: -2,
            color: "#ffffff",
            opacity: Math.min(1, endB),
            transform: `scale(${0.8 + 0.2 * endB})`,
            textShadow: "0 6px 30px rgba(0,0,0,0.9)",
          }}
        >
          YOU NEVER STOP
        </div>
      </div>

      {/* Simplification label */}
      <div
        style={{
          position: "absolute",
          top: 1370,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: 5,
          color: "rgba(220,210,255,0.7)",
          opacity: win(t, T_METER, T_PAY, 0.4) * (1 - arrivedTag) * (1 - win(t, T_WATCH - 0.4, T_AIR + 0.4)),
        }}
      >
        THOUGHT EXPERIMENT · NO HEAT, NO SPIN
      </div>

      <Captions lines={timeline.lines} top={1440} accent={LIME} />
      <SeriesOutro name="What If" next={3} accent={LIME} />
    </AbsoluteFill>
  );
};
