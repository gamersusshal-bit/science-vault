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
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/city-streaming/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

// ---------- Beats from the narration ----------
const T_CHEAT = line("cheat").start;
const T_LIMIT = wordStart("cheat", "limit");
const T_CULL = wordStart("cull", "anything");
const T_LOD = wordStart("lod", "far");
const T_STREAM = wordStart("stream", "only");
const T_DRIVE = wordStart("stream", "drive");
const T_FLOOR = wordStart("floor", "floor");
const T_PAY = line("payoff").start;
const T_PAY2 = wordStart("payoff", "because");

// ---------- Palette: night blueprint, lime + amber ----------
const LIME = "#c6ff3d";
const AMBER = "#ffb547";
const RED = "#ff4d5e";
const ROAD = "#141b33";
const GROUND = "#0b1124";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.7) =>
  interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });

// ---------- World: an original grid city, car drives up the avenue at x = 0 ----------
const PITCH = 220; // block + street
const BLOCK = 170;
const HALF_CONE = (34 * Math.PI) / 180;
const RING_R = 640;
const LOD_D = 400;

type Bld = { x: number; y: number; w: number; h: number; hue: number; seed: number };
const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const BUILDINGS: Bld[] = (() => {
  const out: Bld[] = [];
  for (let i = -9; i < 9; i++) {
    for (let j = -48; j < 8; j++) {
      // block spans [i*PITCH + 25, i*PITCH + 25 + BLOCK]; avenue at x = 0 lies on a street
      const bx = i * PITCH + 25;
      const by = j * PITCH + 25;
      const k = i * 1000 + j;
      const split = rnd(k) > 0.5;
      const parts = split
        ? [
            [0, 0, 78, 78],
            [92, 0, 78, 78],
            [0, 92, 78, 78],
            [92, 92, 78, 78],
          ]
        : [
            [0, 0, 170, 78],
            [0, 92, 78, 78],
            [92, 92, 78, 78],
          ];
      parts.forEach((p, n) => {
        const seed = rnd(k * 7 + n);
        out.push({
          x: bx + p[0] + p[2] / 2,
          y: by + p[1] + p[3] / 2,
          w: p[2],
          h: p[3],
          hue: seed,
          seed: rnd(k * 13 + n * 3),
        });
      });
    }
  }
  return out;
})();

// Car speed (world px per second): cruising, then "floor it".
const speedAt = (t: number) => 70 + 520 * interpolate(t, [T_FLOOR, T_FLOOR + 1.1], [0, 1], { ...clamp, easing: ease });
const carYAt = (t: number) => {
  // integrate speed in small steps (deterministic per frame)
  const dt = 1 / 30;
  let y = 120;
  for (let s = 0; s < t; s += dt) y -= speedAt(s) * Math.min(dt, t - s);
  return y;
};

const Tag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; children: React.ReactNode }> = ({
  x,
  y,
  color,
  opacity,
  size = 36,
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
      letterSpacing: 4,
      color,
      opacity,
      whiteSpace: "nowrap",
      textShadow: "0 2px 14px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1)",
    }}
  >
    {children}
  </div>
);

export const CityStreaming: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const carY = carYAt(t);
  const carX = 0;
  const speed = speedAt(t);

  const cullP = ramp(t, T_CULL - 0.15, 0.8);
  const lodP = ramp(t, T_LOD - 0.1, 0.8);
  const streamP = ramp(t, T_STREAM - 0.1, 0.9);

  // ---------- Camera ----------
  const scale = interpolate(
    t,
    [0, 2.2, T_CHEAT + 0.2, T_CHEAT + 1.6, T_CULL - 0.6, T_CULL + 0.4, T_STREAM - 0.3, T_STREAM + 0.9, T_FLOOR, T_FLOOR + 1.5, T_PAY, timeline.duration],
    [1.15, 1.0, 1.0, 0.52, 0.52, 0.82, 0.82, 0.58, 0.58, 0.56, 0.56, 0.34],
    { ...clamp, easing: ease },
  );
  const anchorX = 540;
  const anchorY = interpolate(t, [T_STREAM - 0.3, T_STREAM + 0.9], [1130, 990], { ...clamp, easing: ease });
  const shake =
    10 * Math.exp(-Math.max(0, t - T_FLOOR) * 5) * (t >= T_FLOOR ? 1 : 0);
  const camX = anchorX - carX * scale + Math.sin(frame * 2.1) * shake;
  const camY = anchorY - carY * scale + Math.cos(frame * 1.7) * shake;
  const toScreen = (x: number, y: number) => ({ x: camX + x * scale, y: camY + y * scale });

  // ---------- Memory meter (illustrative) ----------
  const fill = interpolate(t, [0, 1.6], [1.15, 3.4], { ...clamp, easing: Easing.out(Easing.cubic) });
  const mem =
    fill -
    (3.4 - 2.0) * cullP -
    (2.0 - 1.35) * lodP -
    (1.35 - 0.68) * streamP +
    0.08 * Math.sin(t * 9) * ramp(t, T_FLOOR, 0.4) * (1 - ramp(t, T_PAY, 0.8));
  const over = mem > 1;
  const limitPulse = interpolate(t, [T_LIMIT - 0.1, T_LIMIT + 0.2, T_LIMIT + 0.9], [0, 1, 0], clamp);
  const fitsPop = spring({ frame: frame - Math.round((T_STREAM + 0.5) * fps), fps, config: { damping: 10, stiffness: 160 } });

  // ---------- Buildings ----------
  const fwdX = 0;
  const fwdY = -1;
  const W = 1080;
  const H = 1920;
  const visible: React.ReactNode[] = [];
  const ghosts: React.ReactNode[] = [];
  for (let n = 0; n < BUILDINGS.length; n++) {
    const b = BUILDINGS[n];
    const s = toScreen(b.x, b.y);
    const hw = (b.w / 2) * scale;
    const hh = (b.h / 2) * scale;
    if (s.x + hw < -40 || s.x - hw > W + 40 || s.y + hh < -60 || s.y - hh > H + 60) continue;
    const dx = b.x - carX;
    const dy = b.y - carY;
    const d = Math.hypot(dx, dy);
    // hook: the whole city pours in around the car
    const rise = interpolate(t * 2200 + 620 - d, [0, 220], [0, 1], clamp);
    if (rise <= 0) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fwdX + dy * fwdY) / Math.max(1, d))));
    const inCone = ang < HALF_CONE || d < 90;
    const inRing = d < RING_R;
    const ringEdge = interpolate(d, [RING_R - 70, RING_R], [1, 0], clamp); // loads in at the edge
    const loaded = 1 - streamP * (1 - ringEdge);
    const drawn = (1 - cullP * (inCone ? 0 : 1)) * loaded;
    const simple = lodP * (inCone && d > LOD_D ? 1 : 0);
    const height = (10 + 34 * b.seed) * (1 - 0.6 * simple);
    const roofLight = 0.42 + 0.3 * b.hue;
    const base = `hsl(${222 + 18 * b.hue}, 34%, ${14 + 6 * b.hue}%)`;
    const roof = `hsl(${220 + 20 * b.hue}, ${30 - 18 * simple}%, ${32 + 18 * roofLight}%)`;
    const flatRoof = `hsl(222, 12%, 40%)`;
    const x0 = b.x - b.w / 2;
    const y0 = b.y - b.h / 2;

    // footprint outline: a building still in memory but not drawn
    const ghostA = rise * (1 - drawn) * (inRing || streamP < 0.5 ? 1 : 0.55 + 0.45 * (1 - streamP));
    if (ghostA > 0.02) {
      ghosts.push(
        <rect
          key={`g${n}`}
          x={x0 + 4}
          y={y0 + 4}
          width={b.w - 8}
          height={b.h - 8}
          fill="none"
          stroke={inRing || streamP < 0.5 ? "rgba(198,255,61,0.55)" : "rgba(140,160,210,0.45)"}
          strokeWidth={2.5 / Math.max(scale, 0.4)}
          strokeDasharray={`${8 / scale} ${7 / scale}`}
          opacity={ghostA}
        />,
      );
    }
    if (drawn * rise < 0.02) continue;
    const lift = height * rise;
    visible.push(
      <g key={`b${n}`} opacity={Math.min(1, drawn * 1.2) * rise}>
        {/* wall, seen from a high camera tilted south */}
        <rect x={x0} y={y0} width={b.w} height={b.h} fill={base} />
        <rect x={x0} y={y0 - lift} width={b.w} height={b.h} fill={simple > 0.5 ? flatRoof : roof} rx={2} />
        {/* windows: detail that the simple model drops */}
        {simple < 0.5 &&
          [0.25, 0.5, 0.75].map((fx) =>
            [0.3, 0.7].map((fy) => (
              <rect
                key={`${fx}${fy}`}
                x={x0 + b.w * fx - 5}
                y={y0 - lift + b.h * fy - 5}
                width={10}
                height={10}
                fill={rnd(n + fx * 10 + fy) > 0.45 ? AMBER : "rgba(255,255,255,0.12)"}
                opacity={0.85 * (1 - simple * 2)}
              />
            )),
          )}
        <rect
          x={x0}
          y={y0 + b.h - lift}
          width={b.w}
          height={lift}
          fill="rgba(0,0,0,0.35)"
        />
      </g>,
    );
  }

  // ---------- Streets ----------
  const streetLines: React.ReactNode[] = [];
  const top = carY - (camY / scale) - 400;
  const bottom = carY + (H - camY) / scale + 400;
  const left = -(camX / scale) - 400;
  const right = (W - camX) / scale + 400;
  for (let k = Math.floor(left / PITCH); k <= Math.ceil(right / PITCH); k++) {
    streetLines.push(
      <rect key={`v${k}`} x={k * PITCH - 25} y={top} width={50} height={bottom - top} fill={ROAD} />,
    );
  }
  for (let k = Math.floor(top / PITCH); k <= Math.ceil(bottom / PITCH); k++) {
    streetLines.push(
      <rect key={`h${k}`} x={left} y={k * PITCH - 25} width={right - left} height={50} fill={ROAD} />,
    );
  }
  // centre dashes on the avenue, scrolling with the car
  const dashes: React.ReactNode[] = [];
  for (let y = Math.floor(top / 60) * 60; y < bottom; y += 60) {
    dashes.push(<rect key={`d${y}`} x={-2} y={y} width={4} height={28} fill="rgba(255,255,255,0.35)" />);
  }

  // cone geometry (world)
  const coneLen = 1500;
  const coneA = cullP;
  const cone = `M ${carX} ${carY} L ${carX - Math.tan(HALF_CONE) * coneLen} ${carY - coneLen} L ${
    carX + Math.tan(HALF_CONE) * coneLen
  } ${carY - coneLen} Z`;

  // speed streaks while floored
  const floorP = ramp(t, T_FLOOR, 0.6) * (1 - ramp(t, T_PAY + 0.8, 0.8));
  const streaks: React.ReactNode[] = [];
  if (floorP > 0) {
    for (let k = 0; k < 14; k++) {
      const sx = (rnd(k) - 0.5) * 900;
      const sy = carY + ((rnd(k + 50) * 1600 + t * speed * 1.2) % 1600) - 800;
      streaks.push(
        <rect key={`s${k}`} x={sx} y={sy} width={3} height={120} fill="rgba(198,255,61,0.35)" opacity={floorP} />,
      );
    }
  }

  // ---------- HUD text timing ----------
  const titleOut = ramp(t, T_CHEAT - 0.2, 0.4);
  const head = (a: number, b: number) =>
    interpolate(t, [a - 0.1, a + 0.25, b - 0.3, b], [0, 1, 1, 0], clamp);
  const h1 = head(line("cull").start, line("lod").start);
  const h2 = head(line("lod").start, line("stream").start);
  const h3 = head(line("stream").start, T_FLOOR);
  const endA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 15, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(T_PAY2 * fps), fps, config: { damping: 11, stiffness: 170 } });

  const car = toScreen(carX, carY);
  const ringScreenR = RING_R * scale;
  const ringPulse = 1 + 0.03 * Math.sin(t * 6);

  // world tag positions (screen space, relative to the car)
  const viewTag = h1 * (1 - h2);
  const outTag = h1;
  const lodNear = h2;
  const memTag = streamP * (1 - ramp(t, T_PAY - 0.3, 0.4));
  const driveTag = interpolate(t, [T_DRIVE - 0.2, T_DRIVE + 0.3], [0, 1], clamp) * (1 - ramp(t, T_FLOOR - 0.1, 0.4));
  const loadTag = interpolate(t, [T_FLOOR + 0.6, T_FLOOR + 1.0], [0, 1], clamp) * (1 - ramp(t, T_PAY - 0.2, 0.4));

  const barX = 90;
  const barW = 900;
  const unit = 520; // px for 1.0 (= the limit)
  const barLen = Math.min(barW, mem * unit);

  return (
    <AbsoluteFill style={{ background: GROUND, overflow: "hidden" }}>
      <Audio src={staticFile("city-streaming/narration.wav")} />
      <Audio src={staticFile("city-streaming/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="ringGlow">
            <stop offset="80%" stopColor="rgba(198,255,61,0)" />
            <stop offset="100%" stopColor="rgba(198,255,61,0.18)" />
          </radialGradient>
          <linearGradient id="coneFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,236,170,0.32)" />
            <stop offset="100%" stopColor="rgba(255,236,170,0)" />
          </linearGradient>
        </defs>
        <g transform={`translate(${camX} ${camY}) scale(${scale})`}>
          {streetLines}
          {dashes}
          {ghosts}
          {visible}
          {/* view cone */}
          <path d={cone} fill="url(#coneFill)" opacity={coneA} />
          <path
            d={`M ${carX - Math.tan(HALF_CONE) * coneLen} ${carY - coneLen} L ${carX} ${carY} L ${
              carX + Math.tan(HALF_CONE) * coneLen
            } ${carY - coneLen}`}
            fill="none"
            stroke="rgba(255,236,170,0.8)"
            strokeWidth={3 / scale}
            strokeDasharray={`${14 / scale} ${10 / scale}`}
            opacity={coneA}
          />
          {/* level-of-detail boundary */}
          <path
            d={`M ${carX - Math.tan(HALF_CONE) * LOD_D} ${carY - LOD_D} A ${LOD_D} ${LOD_D} 0 0 1 ${
              carX + Math.tan(HALF_CONE) * LOD_D
            } ${carY - LOD_D}`}
            fill="none"
            stroke={AMBER}
            strokeWidth={4 / scale}
            opacity={lodP * (1 - streamP * 0.6)}
          />
          {/* memory ring */}
          <circle cx={carX} cy={carY} r={RING_R * ringPulse} fill="url(#ringGlow)" opacity={streamP} />
          <circle
            cx={carX}
            cy={carY}
            r={RING_R * ringPulse}
            fill="none"
            stroke={LIME}
            strokeWidth={5 / scale}
            strokeDasharray={`${22 / scale} ${12 / scale}`}
            strokeDashoffset={-t * 40}
            opacity={streamP}
          />
          {streaks}
          {/* the car */}
          <g transform={`translate(${carX} ${carY})`}>
            <rect x={-16} y={-30} width={32} height={60} rx={8} fill={LIME} />
            <rect x={-12} y={-18} width={24} height={16} rx={3} fill="#1b2a10" />
            <circle cx={-9} cy={-28} r={4} fill="#fff8d0" />
            <circle cx={9} cy={-28} r={4} fill="#fff8d0" />
            <rect x={-14} y={26} width={8} height={4} fill={RED} />
            <rect x={6} y={26} width={8} height={4} fill={RED} />
          </g>
        </g>
      </svg>

      {/* ================= WORLD TAGS (follow the car on screen) ================= */}
      <Tag x={car.x} y={car.y - 330 * scale - 40} color="#fff2c4" opacity={viewTag}>
        YOUR VIEW
      </Tag>
      <Tag x={230} y={car.y + 60} color="rgba(198,255,61,0.95)" opacity={outTag * (1 - streamP)}>
        NOT DRAWN
      </Tag>
      <Tag x={car.x} y={car.y - 180 * scale - 10} color={LIME} opacity={lodNear} size={34}>
        DETAILED
      </Tag>
      <Tag x={car.x} y={car.y - 600 * scale} color={AMBER} opacity={lodNear} size={34}>
        SIMPLE MODELS
      </Tag>
      <Tag x={Math.max(150, car.x - ringScreenR * 0.78)} y={car.y + ringScreenR * 0.78 + 30} color={LIME} opacity={memTag}>
        IN MEMORY
      </Tag>
      <Tag x={540} y={520} color="rgba(170,190,240,0.95)" opacity={driveTag} size={34}>
        THE REST: ON THE DRIVE
      </Tag>
      <Tag x={car.x} y={Math.max(560, car.y - ringScreenR - 44)} color={LIME} opacity={loadTag}>
        LOADING AHEAD
      </Tag>
      <Tag x={car.x} y={Math.min(1390, car.y + ringScreenR + 44)} color={RED} opacity={loadTag}>
        DROPPED BEHIND
      </Tag>

      {/* vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(3,5,12,0.7) 100%)" }}
      />

      {/* ================= HUD: memory bar ================= */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 140,
          height: 190,
          borderRadius: 26,
          background: "rgba(6,9,20,0.86)",
          border: "2px solid rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: barX,
          top: 160,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: 5,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        CONSOLE MEMORY
      </div>
      <div
        style={{
          position: "absolute",
          right: barX,
          top: 152,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 46,
          letterSpacing: 1,
          color: over ? RED : LIME,
          transform: `scale(${over ? 1 : 1 + 0.25 * (1 - Math.min(1, fitsPop))})`,
          transformOrigin: "right center",
        }}
      >
        {over ? `${mem.toFixed(1)}× TOO BIG` : "IT FITS"}
      </div>
      <div
        style={{
          position: "absolute",
          left: barX,
          top: 222,
          width: barW,
          height: 54,
          borderRadius: 12,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: barLen,
            height: "100%",
            background: over
              ? `repeating-linear-gradient(-45deg, ${RED} 0 22px, #c8283a 22px 44px)`
              : `linear-gradient(90deg, #8fd61c, ${LIME})`,
            backgroundPosition: `${t * 60}px 0`,
            boxShadow: over ? "0 0 30px rgba(255,77,94,0.6)" : "0 0 24px rgba(198,255,61,0.5)",
          }}
        />
      </div>
      {/* limit line */}
      <div
        style={{
          position: "absolute",
          left: barX + unit - 3,
          top: 208,
          width: 6,
          height: 82,
          background: "#ffffff",
          boxShadow: `0 0 ${10 + 30 * limitPulse}px rgba(255,255,255,${0.5 + 0.5 * limitPulse})`,
          transform: `scaleY(${1 + 0.3 * limitPulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: barX + unit,
          top: 286,
          transform: "translateX(-50%)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 5,
          color: "#ffffff",
        }}
      >
        LIMIT
      </div>
      <div
        style={{
          position: "absolute",
          left: barX,
          top: 290,
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: 5,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        SIMPLIFIED MODEL
      </div>

      {/* Opening title */}
      <div
        style={{
          position: "absolute",
          top: 380,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 84,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: "#ffffff",
          opacity: 1 - titleOut,
          transform: `translateY(${-30 * titleOut}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,1)",
        }}
      >
        A WHOLE CITY
        <br />
        <span style={{ color: LIME }}>IN YOUR CONSOLE?</span>
      </div>

      {/* Trick headings */}
      {[
        { n: "1", text: "SKIP WHAT YOU CAN'T SEE", o: h1 },
        { n: "2", text: "FAR AWAY = SIMPLE", o: h2 },
        { n: "3", text: "LOAD ONLY WHAT'S NEAR", o: h3 },
      ].map((h) => (
        <div
          key={h.n}
          style={{
            position: "absolute",
            top: 372,
            width: "100%",
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 54,
            letterSpacing: 1,
            color: "#ffffff",
            opacity: h.o,
            transform: `translateY(${20 * (1 - h.o)}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,1)",
          }}
        >
          <span style={{ color: LIME }}>{h.n} · </span>
          {h.text}
        </div>
      ))}

      {/* Payoff */}
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 58,
            letterSpacing: 6,
            color: LIME,
            opacity: Math.min(1, endA),
            transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,1)",
          }}
        >
          THE CITY FITS
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#ffffff",
            opacity: Math.min(1, endB),
            transform: `scale(${0.8 + 0.2 * endB})`,
            textShadow: "0 6px 30px rgba(0,0,0,1)",
          }}
        >
          MOST OF IT
          <br />
          ISN'T THERE
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={LIME} />
    </AbsoluteFill>
  );
};
