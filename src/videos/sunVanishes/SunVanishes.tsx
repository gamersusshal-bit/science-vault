import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { Starfield } from "../../primitives/Starfield";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "./timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };

// ---------- Story beats, read from the narration timeline ----------
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

const T_VANISH = wordStart("hook", "vanish"); // the Sun disappears
const T_HIT = wordStart("impact", "black"); // 8 min 20 s later: darkness reaches Earth
const TRAVEL_SECONDS = 500; // 8:20 of real time, compressed into the gap above

// ---------- World geometry (pixels, 1080 x 1920 canvas) ----------
const CX = 540;
const CY = 930;
const ORBIT_R = 390;
const SUN_R = 74;
const EARTH_R = 44;
const OMEGA = 0.12; // rad per second of video; orbital motion is exaggerated
const HIT_ANGLE = (20 * Math.PI) / 180;

const GOLD = "#ffd166";
const CYAN = "#5ee6ff";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const earthAt = (t: number) => {
  const a = HIT_ANGLE + OMEGA * (T_HIT - Math.min(t, T_HIT));
  const x = CX + ORBIT_R * Math.cos(a);
  const y = CY + ORBIT_R * Math.sin(a);
  if (t <= T_HIT) return { x, y };
  // No gravity any more: continue along the tangent at constant speed.
  const v = OMEGA * ORBIT_R;
  const dt = t - T_HIT;
  return { x: x + v * Math.sin(a) * dt, y: y - v * Math.cos(a) * dt };
};

const mmss = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const Tag: React.FC<{
  x: number;
  y: number;
  color: string;
  opacity: number;
  size?: number;
  children: React.ReactNode;
}> = ({ x, y, color, opacity, size = 34, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 4,
      color,
      opacity,
      whiteSpace: "nowrap",
      textShadow: "0 2px 12px rgba(0,0,0,0.95)",
    }}
  >
    {children}
  </div>
);

export const SunVanishes: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const light = line("light");
  const bright = line("bright");
  const gravity = line("gravity");
  const payoff = line("payoff");

  // ---------- Core state ----------
  const progress = (t - T_VANISH) / (T_HIT - T_VANISH); // 0 at vanish, 1 at hit
  const vanished = t >= T_VANISH;
  const hit = t >= T_HIT;
  const edgeR = vanished ? ORBIT_R * progress : 0; // trailing edge of the last sunlight
  const earth = earthAt(t);
  const earthAtHit = earthAt(T_HIT);
  const lit = interpolate(t, [T_HIT, T_HIT + 0.3], [1, 0], clamp);

  // ---------- Camera ----------
  const zoom = interpolate(
    t,
    [bright.start - 0.5, bright.start + 0.7, gravity.start - 0.4, gravity.start + 0.9],
    [0, 1, 1, 0],
    { ...clamp, easing: ease },
  );
  const pullBack = interpolate(t, [T_HIT, T_HIT + 3], [0, 1], { ...clamp, easing: ease });
  const scale = 1 + 0.35 * zoom - 0.08 * pullBack;
  const focusX = CX + (earth.x - CX) * zoom + 60 * pullBack;
  const focusY = CY + (earth.y - CY) * zoom - 40 * pullBack;
  const anchorX = 540;
  const anchorY = 930 + 330 * zoom;
  const shakeAmp =
    16 * Math.exp(-Math.max(0, t - T_VANISH) * 7) * (vanished ? 1 : 0) +
    22 * Math.exp(-Math.max(0, t - T_HIT) * 6) * (hit ? 1 : 0);
  const shakeX = Math.sin(frame * 2.3) * shakeAmp;
  const shakeY = Math.cos(frame * 1.9) * shakeAmp;
  const camera = `translate(${anchorX - focusX * scale + shakeX}px, ${
    anchorY - focusY * scale + shakeY
  }px) scale(${scale})`;

  // ---------- Sun ----------
  const sunScale = vanished
    ? interpolate(t, [T_VANISH, T_VANISH + 0.16], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) })
    : 1 + 0.015 * Math.sin(t * 5);
  const flash = interpolate(t, [T_VANISH, T_VANISH + 0.45], [0, 1], clamp);
  const ghost = interpolate(t, [T_VANISH + 0.15, T_VANISH + 0.7], [0, 1], clamp);

  // ---------- Labels ----------
  const distance = interpolate(
    t,
    [light.start + 0.7, light.start + 1.3, light.end - 0.5, light.end],
    [0, 1, 1, 0],
    clamp,
  );
  const distanceDraw = interpolate(t, [light.start + 0.7, light.start + 1.6], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const lastLightTag =
    interpolate(edgeR, [105, 135], [0, 1], clamp) *
    interpolate(t, [T_HIT - 0.3, T_HIT], [1, 0], clamp);
  const gravityOn = interpolate(
    t,
    [wordStart("gravity", "gravity") - 0.1, wordStart("gravity", "gravity") + 0.5],
    [0, 1],
    clamp,
  );
  const gravityPulse = spring({
    frame: frame - Math.round(wordStart("gravity", "gravity") * fps),
    fps,
    config: { damping: 9, stiffness: 120 },
  });
  const daylightTag = interpolate(
    t,
    [bright.start + 0.3, bright.start + 0.7, bright.end - 0.2, bright.end + 0.2],
    [0, 1, 1, 0],
    clamp,
  );
  const hitFlare = interpolate(t, [T_HIT - 0.05, T_HIT, T_HIT + 0.5], [0, 1, 0], clamp);

  // ---------- HUD ----------
  const titleOut = interpolate(t, [T_VANISH + 0.25, T_VANISH + 0.6], [0, 1], clamp);
  const timerIn = spring({
    frame: frame - Math.round((T_VANISH + 0.45) * fps),
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const timerOut = interpolate(t, [payoff.start - 0.45, payoff.start - 0.1], [1, 0], clamp);
  const timerHit = spring({
    frame: frame - Math.round(T_HIT * fps),
    fps,
    config: { damping: 7, stiffness: 200, mass: 0.6 },
  });
  const seconds = Math.max(0, Math.min(TRAVEL_SECONDS, progress * TRAVEL_SECONDS));
  const endA = spring({
    frame: frame - Math.round(payoff.start * fps),
    fps,
    config: { damping: 15, stiffness: 160 },
  });
  const endB = spring({
    frame: frame - Math.round(wordStart("payoff", "orbiting") * fps),
    fps,
    config: { damping: 11, stiffness: 170 },
  });

  const toSun = { x: CX - earth.x, y: CY - earth.y };
  const toSunLen = Math.hypot(toSun.x, toSun.y);
  const ux = toSun.x / toSunLen;
  const uy = toSun.y / toSunLen;
  const perpSign = -ux < 0 ? 1 : -1; // pick the perpendicular that points up the screen
  const perpX = uy * perpSign;
  const perpY = -ux * perpSign;
  const tether = gravityOn * interpolate(t, [T_HIT - 0.05, T_HIT], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, #0b1430 0%, #05070f 60%, #020308 100%)",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("sun-vanishes/narration.wav")} />
      <Audio src={staticFile("sun-vanishes/bed.wav")} volume={0.6} />

      <AbsoluteFill style={{ transform: `scale(${1 + 0.08 * zoom})` }}>
        <Starfield />
      </AbsoluteFill>

      {/* ================= WORLD (moves with the camera) ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        {/* Sunlight still in transit. The dark disc that grows from the centre is
            space the last light has already left. */}
        <div
          style={{
            position: "absolute",
            left: CX - 2200,
            top: CY - 2200,
            width: 4400,
            height: 4400,
            background: `radial-gradient(circle, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${Math.max(
              edgeR - 2,
              0,
            )}px, rgba(255,206,120,${vanished ? 0.5 : 0.2}) ${edgeR}px, rgba(255,196,96,0.15) ${
              edgeR + 30
            }px, rgba(255,186,80,0.06) ${edgeR + 300}px, rgba(255,186,80,0) ${edgeR + 1200}px)`,
          }}
        />

        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* Orbit */}
          <circle
            cx={CX}
            cy={CY}
            r={ORBIT_R}
            fill="none"
            stroke="rgba(190,210,255,0.22)"
            strokeWidth={2}
            strokeDasharray="3 11"
          />
          {/* Where the Sun was */}
          <circle
            cx={CX}
            cy={CY}
            r={SUN_R}
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth={2.5}
            strokeDasharray="8 10"
            opacity={ghost}
            transform={`rotate(${t * 8} ${CX} ${CY})`}
          />
          {/* Sun to Earth distance */}
          <line
            x1={CX}
            y1={CY}
            x2={CX + (earth.x - CX) * distanceDraw}
            y2={CY + (earth.y - CY) * distanceDraw}
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={2}
            strokeDasharray="2 8"
            opacity={distance}
          />
          {/* Gravity is still pulling Earth toward the empty spot */}
          <line
            x1={CX}
            y1={CY}
            x2={earth.x}
            y2={earth.y}
            stroke={CYAN}
            strokeWidth={3}
            strokeDasharray="14 12"
            strokeDashoffset={t * 60}
            opacity={0.75 * tether}
          />
          {/* Straight-line escape path */}
          {hit && (
            <line
              x1={earthAtHit.x}
              y1={earthAtHit.y}
              x2={earth.x}
              y2={earth.y}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={4}
              strokeDasharray="2 12"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Trailing edge of the last light */}
        {vanished && (
          <div
            style={{
              position: "absolute",
              left: CX - edgeR,
              top: CY - edgeR,
              width: edgeR * 2,
              height: edgeR * 2,
              borderRadius: "50%",
              border: `4px solid ${GOLD}`,
              boxSizing: "border-box",
              boxShadow: `0 0 28px 4px rgba(255,200,100,0.55), inset 0 0 28px 4px rgba(255,200,100,0.25)`,
              opacity: interpolate(edgeR, [0, 30], [0, 1], clamp),
            }}
          />
        )}
        {/* Gravity's "the Sun is gone" signal, travelling with it */}
        {vanished && (
          <div
            style={{
              position: "absolute",
              left: CX - (edgeR - 18),
              top: CY - (edgeR - 18),
              width: Math.max(0, (edgeR - 18) * 2),
              height: Math.max(0, (edgeR - 18) * 2),
              borderRadius: "50%",
              border: `${4 + 5 * (1 - Math.min(1, gravityPulse))}px dashed ${CYAN}`,
              boxSizing: "border-box",
              boxShadow: `0 0 24px 2px rgba(94,230,255,0.45)`,
              opacity: gravityOn,
              transform: `rotate(${t * 6}deg)`,
            }}
          />
        )}

        {/* Sun */}
        <div
          style={{
            position: "absolute",
            left: CX - SUN_R,
            top: CY - SUN_R,
            width: SUN_R * 2,
            height: SUN_R * 2,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 42% 40%, #fffbe6 0%, #ffe08a 28%, #ffb23d 62%, #ff8a1f 100%)",
            boxShadow:
              "0 0 50px 16px rgba(255,190,80,0.6), 0 0 150px 60px rgba(255,140,40,0.3), 0 0 320px 140px rgba(255,120,30,0.12)",
            transform: `scale(${sunScale})`,
            opacity: sunScale <= 0.01 ? 0 : 1,
          }}
        />
        {/* Vanish flash */}
        {vanished && flash < 1 && (
          <div
            style={{
              position: "absolute",
              left: CX - SUN_R - 220 * flash,
              top: CY - SUN_R - 220 * flash,
              width: (SUN_R + 220 * flash) * 2,
              height: (SUN_R + 220 * flash) * 2,
              borderRadius: "50%",
              border: "6px solid rgba(255,255,255,0.95)",
              boxSizing: "border-box",
              background: `rgba(255,255,255,${0.35 * (1 - flash)})`,
              opacity: 1 - flash,
            }}
          />
        )}

        {/* Earth */}
        <div
          style={{
            position: "absolute",
            left: earth.x - EARTH_R,
            top: earth.y - EARTH_R,
            width: EARTH_R * 2,
            height: EARTH_R * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, #16305a 0%, #0c1d3a 70%, #08142a 100%)",
            boxShadow: `0 0 0 2.5px rgba(150,190,255,0.7), 0 0 ${46 * lit}px ${10 * lit}px rgba(90,170,255,${
              0.5 * lit
            })`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              opacity: lit,
              background: `radial-gradient(circle at ${50 + ux * 40}% ${
                50 + uy * 40
              }%, #c9f0ff 0%, #5db8ff 22%, #2a7fd6 46%, #0f3a6e 68%, rgba(8,20,40,0) 86%)`,
            }}
          />
        </div>
        {/* Darkness arrives */}
        <div
          style={{
            position: "absolute",
            left: earthAtHit.x - 150,
            top: earthAtHit.y - 150,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,214,130,0.45) 30%, rgba(255,214,130,0) 70%)",
            opacity: hitFlare,
            transform: `scale(${0.5 + hitFlare})`,
          }}
        />

        {/* World labels */}
        <Tag
          x={(CX + earth.x) / 2 + perpX * 120}
          y={(CY + earth.y) / 2 + perpY * 120}
          color="#ffffff"
          opacity={distance}
          size={34}
        >
          150,000,000 KM
        </Tag>
        <Tag
          x={CX + (edgeR + 44) * Math.cos(-0.62)}
          y={CY + (edgeR + 44) * Math.sin(-0.62)}
          color={GOLD}
          opacity={lastLightTag}
        >
          LAST LIGHT
        </Tag>
        <Tag
          x={CX + (edgeR - 70) * Math.cos(-2.45)}
          y={CY + (edgeR - 70) * Math.sin(-2.45)}
          color={CYAN}
          opacity={gravityOn * interpolate(t, [T_HIT - 0.3, T_HIT], [1, 0], clamp)}
        >
          GRAVITY
        </Tag>
        <Tag x={earth.x} y={earth.y + 92} color="#bfe6ff" opacity={daylightTag} size={26}>
          STILL DAYLIGHT
        </Tag>
      </AbsoluteFill>

      {/* ================= SCREEN (fixed) ================= */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 24,
          letterSpacing: 8,
          color: "rgba(200,215,255,0.6)",
        }}
      >
        THOUGHT EXPERIMENT
      </div>

      {/* Opening title: on screen from the very first frame */}
      <div
        style={{
          position: "absolute",
          top: 215,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: "#ffffff",
          opacity: 1 - titleOut,
          transform: `translateY(${-40 * titleOut}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)",
        }}
      >
        WHAT IF THE SUN
        <br />
        <span style={{ color: GOLD }}>VANISHED?</span>
      </div>

      {/* Timer */}
      <div
        style={{
          position: "absolute",
          top: 200,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          opacity: Math.min(1, timerIn) * timerOut,
          transform: `translateY(${30 * (1 - Math.min(1, timerIn))}px)`,
        }}
      >
        <div
          style={{
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: 7,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          SINCE THE SUN VANISHED
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 190,
            lineHeight: 1.05,
            letterSpacing: -4,
            fontVariantNumeric: "tabular-nums",
            color: hit ? "#ff5d4d" : GOLD,
            transform: `scale(${hit ? 1 + 0.18 * (1 - Math.min(1, timerHit)) + 0.04 : 1})`,
            textShadow: hit
              ? "0 0 50px rgba(255,80,60,0.55)"
              : "0 0 40px rgba(255,200,100,0.35)",
          }}
        >
          {mmss(seconds)}
        </div>
      </div>

      {/* Payoff title */}
      <div
        style={{
          position: "absolute",
          top: 205,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 54,
            letterSpacing: 6,
            color: GOLD,
            opacity: Math.min(1, endA),
            transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          }}
        >
          FOR 8 MINUTES
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#ffffff",
            opacity: Math.min(1, endB),
            transform: `scale(${0.8 + 0.2 * endB})`,
            textShadow: "0 6px 30px rgba(0,0,0,0.9)",
          }}
        >
          ORBITING
          <br />A GHOST
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={GOLD} />
    </AbsoluteFill>
  );
};
