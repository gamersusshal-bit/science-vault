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
import timelineJson from "../../../videos/power-line-tube/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

// ---------- Beats ----------
const T_GLOW = wordStart("hook", "wires");
const T_METER = line("meter").start;
const T_FOUR = wordStart("meter", "four");
const T_FLAT = wordStart("flat", "flat");
const T_DARK = wordStart("flat", "dark");
const T_STAND = wordStart("flat", "stand");
const T_PUSH = line("push").start;
const T_FLIPS = wordStart("push", "flips");
const T_SHAKE = wordStart("push", "shaking");
const T_MERC = line("mercury").start;
const T_UV = wordStart("mercury", "ultraviolet");
const T_COAT = wordStart("mercury", "coating");
const T_ART = line("field").start;
const T_HIT = wordStart("field", "field");
const T_PAY = line("payoff").start;
const T_PAY2 = wordStart("payoff", "power");

// ---------- Palette: violet dusk, aqua glow, warm field ----------
const AQUA = "#7fffd4";
const FIELD = "#ffd95e";
const UV = "#b56bff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.6) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- World (side view; the line runs into the screen, so its wires are dots) ----------
const GROUND = 1500;
const TUBE_H = 320;
const TUBE_W = 44;
const CONDUCTORS = [
  { x: -190, y: 560 },
  { x: 190, y: 560 },
  { x: 0, y: 430 },
];
const FIELD_W = 420; // falloff width: 4,000 V/m under the line, ~100 V/m at the "50 m" mark
const fieldAt = (x: number) => 4000 / Math.pow(1 + (x / FIELD_W) ** 2, 1.5);
const M50 = 1400; // world px standing for 50 m (not to scale)

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

const Tube: React.FC<{ x: number; base: number; glow: number; angle?: number; s?: number; id: string }> = ({
  x,
  base,
  glow,
  angle = 0,
  s = 1,
  id,
}) => {
  const h = TUBE_H * s;
  const w = TUBE_W * s;
  const cy = base - h / 2 - 20 * s;
  return (
    <g transform={`rotate(${angle} ${x} ${cy})`}>
      {glow > 0.02 && (
        <rect
          x={x - w * 2.2}
          y={cy - h / 2 - w * 1.2}
          width={w * 4.4}
          height={h + w * 2.4}
          rx={w * 2}
          fill={AQUA}
          opacity={0.35 * glow}
          filter={`url(#blur-${id})`}
        />
      )}
      <rect x={x - w / 2} y={cy - h / 2} width={w} height={h} rx={w / 2} fill="rgba(190,205,230,0.18)" stroke="rgba(220,230,255,0.55)" strokeWidth={2 * s} />
      <rect x={x - w / 2} y={cy - h / 2} width={w} height={h} rx={w / 2} fill="#eafffa" opacity={glow} />
      <rect x={x - w / 2 - 2 * s} y={cy - h / 2 - 4 * s} width={w + 4 * s} height={18 * s} rx={4 * s} fill="#8c93a8" />
      <rect x={x - w / 2 - 2 * s} y={cy + h / 2 - 14 * s} width={w + 4 * s} height={18 * s} rx={4 * s} fill="#8c93a8" />
    </g>
  );
};

export const PowerLineTube: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- The tube's position and attitude ----------
  const walkOut = ramp(t, T_METER - 0.1, 0.35); // jump out to 100 m
  const walkIn = interpolate(t, [T_METER + 0.5, T_FOUR + 0.9], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const tubeX = 2 * M50 * walkOut * (1 - walkIn);
  const flatP = ramp(t, T_FLAT - 0.15, 0.45) * (1 - ramp(t, T_STAND - 0.1, 0.45));
  const angle = 90 * flatP;
  const field = fieldAt(tubeX);
  const orient = Math.abs(Math.cos((angle * Math.PI) / 180));
  const flicker = t < T_GLOW + 0.2 ? (Math.sin(frame * 3.1) > -0.3 ? 1 : 0.45) : 1;
  const startUp = interpolate(t, [0, T_GLOW + 0.2], [0.7, 1], clamp);
  const tubeGlow = Math.max(0, Math.min(1, (field * orient - 900) / 2200)) * flicker * startUp;

  // ---------- Camera ----------
  const camKeys = [0, T_METER - 0.1, T_METER + 0.5, T_FOUR + 1.0, T_FLAT - 0.4, T_PUSH - 0.2, T_PUSH + 0.8, T_MERC, T_MERC + 0.6, T_ART - 0.2, T_ART + 1.4, T_PAY, timeline.duration];
  const walkCam = Math.max(260, tubeX - 480);
  const inWalk = interpolate(t, [T_METER - 0.1, T_METER + 0.4, T_FOUR + 1.0, T_FLAT - 0.4], [0, 1, 1, 0], { ...clamp, easing: ease });
  const cx = walkCam * inWalk;
  const cy = interpolate(t, camKeys, [1000, 1050, 590, 590, 1000, 1100, 1250, 1300, 1330, 1420, 600, 600, 680], { ...clamp, easing: ease });
  const scale = interpolate(t, camKeys, [0.92, 1.12, 0.55, 0.55, 1.0, 1.25, 3.0, 3.2, 3.4, 3.7, 0.5, 0.5, 0.58], { ...clamp, easing: ease });
  const shake = 14 * Math.exp(-Math.max(0, t - T_HIT) * 5) * (t >= T_HIT ? 1 : 0);
  const SX = 540 + Math.sin(frame * 2.3) * shake;
  const SY = 900 + Math.cos(frame * 1.9) * shake;
  const toScreen = (x: number, y: number) => ({ x: SX + (x - cx) * scale, y: SY + (y - cy) * scale });

  // ---------- Field lines: from each wire, fanning out, arriving vertical at the ground ----------
  const flipsOn = ramp(t, T_FLIPS - 0.1, 0.3);
  // AC: slowed right down so the eye can follow it (labelled on screen)
  const polarity = Math.sin(t * Math.PI * 2 * 0.9) >= 0 ? 1 : -1;
  const fieldLines: React.ReactNode[] = [];
  CONDUCTORS.forEach((c, ci) => {
    for (let k = -6; k <= 6; k++) {
      const g = c.x + k * 150 + (ci === 2 ? 75 : 0);
      const path = `M ${c.x} ${c.y} C ${c.x + (g - c.x) * 0.5} ${c.y + 120}, ${g} ${GROUND - 520}, ${g} ${GROUND}`;
      fieldLines.push(
        <path
          key={`${ci}${k}`}
          d={path}
          fill="none"
          stroke={FIELD}
          strokeWidth={3 / Math.max(0.5, scale)}
          strokeDasharray={`${18 / Math.max(0.5, scale)} ${16 / Math.max(0.5, scale)}`}
          strokeDashoffset={-t * 60 * (flipsOn > 0.5 ? polarity : 1)}
          opacity={0.42 * Math.min(1, 900 / (Math.abs(g) + 300))}
        />,
      );
    }
  });

  // ---------- Equal-voltage lines (only while the tube is laid flat / stood up) ----------
  const equiOn = interpolate(t, [T_FLAT - 0.3, T_FLAT + 0.2, T_PUSH - 0.4, T_PUSH], [0, 1, 1, 0], clamp);
  const tubeCY = GROUND - TUBE_H / 2 - 20;
  const equi: React.ReactNode[] = [];
  for (let k = -3; k <= 3; k++) {
    const y = tubeCY + k * 80;
    equi.push(
      <line key={k} x1={-700} x2={700} y1={y} y2={y} stroke="rgba(255,255,255,0.55)" strokeWidth={2.5} strokeDasharray="6 12" opacity={equiOn} />,
    );
  }

  // ---------- Inside the tube (zoomed) ----------
  const inside = ramp(t, T_PUSH + 0.2, 0.6) * (1 - ramp(t, T_ART - 0.3, 0.5));
  const electronsP = ramp(t, T_SHAKE - 0.2, 0.4);
  const mercP = ramp(t, T_MERC, 0.5);
  const uvP = ramp(t, T_UV - 0.1, 0.4);
  const coatP = ramp(t, T_COAT - 0.1, 0.5);
  const tubeTop = tubeCY - TUBE_H / 2;
  const swing = Math.sin(t * Math.PI * 2 * 0.9); // same slowed AC as the field lines
  const electrons: React.ReactNode[] = [];
  for (let k = 0; k < 18; k++) {
    const ex = -14 + rnd(k) * 28;
    const ey0 = tubeTop + 40 + rnd(k + 20) * (TUBE_H - 80);
    const ey = ey0 + swing * 46 * electronsP;
    electrons.push(<circle key={k} cx={ex} cy={ey} r={2.6} fill={FIELD} opacity={inside} />);
  }
  const atoms: React.ReactNode[] = [];
  const uvs: React.ReactNode[] = [];
  const coat: React.ReactNode[] = [];
  for (let k = 0; k < 7; k++) {
    const ax = (k % 2 === 0 ? -7 : 7) + (rnd(k + 5) - 0.5) * 6;
    const ay = tubeTop + 60 + k * 33;
    const period = 0.9;
    const ph = (t + rnd(k + 9) * period) % period;
    const flash = interpolate(ph, [0, 0.08, 0.4], [0, 1, 0], clamp) * uvP;
    atoms.push(
      <g key={k} opacity={mercP * inside}>
        <circle cx={ax} cy={ay} r={6.5} fill={`rgb(${150 + 80 * flash},${150 + 20 * flash},${170 + 85 * flash})`} />
        <circle cx={ax} cy={ay} r={6.5 + 6 * flash} fill="none" stroke={UV} strokeWidth={1.4} opacity={flash} />
      </g>,
    );
    const side = k % 2 === 0 ? -1 : 1;
    const travel = interpolate(ph, [0.05, 0.35], [0, 1], clamp);
    const sx = ax + side * 6 + side * 12 * travel;
    const squig = `M ${ax + side * 6} ${ay} Q ${ax + side * 9} ${ay - 4} ${ax + side * 12} ${ay} T ${sx} ${ay}`;
    uvs.push(<path key={k} d={squig} stroke={UV} strokeWidth={2} fill="none" opacity={uvP * inside * (travel > 0 && travel < 1 ? 1 : 0)} />);
    const hitGlow = interpolate(ph, [0.3, 0.38, 0.75], [0, 1, 0], clamp) * coatP;
    coat.push(
      <g key={k} opacity={inside}>
        <rect x={side < 0 ? -TUBE_W / 2 : TUBE_W / 2 - 4} y={ay - 9} width={4} height={18} fill="#ffffff" opacity={0.3 + 0.7 * hitGlow} />
        <line
          x1={side * (TUBE_W / 2 + 2)}
          y1={ay}
          x2={side * (TUBE_W / 2 + 26)}
          y2={ay}
          stroke="#ffffff"
          strokeWidth={2.5}
          opacity={hitGlow}
        />
      </g>,
    );
  }

  // ---------- The art field: many tubes planted under the line ----------
  const artP = ramp(t, T_ART - 0.2, 0.6);
  const waveR = interpolate(t, [T_ART + 0.6, T_HIT], [0, 1700], { ...clamp, easing: Easing.in(Easing.quad) });
  const art: React.ReactNode[] = [];
  if (artP > 0) {
    [2, 1, 0].forEach((r) => {
      const s = 1 - 0.22 * r;
      const base = GROUND - r * 70;
      const step = 120 * s;
      for (let x = -2000; x <= 2000; x += step) {
        const xx = x + (r % 2) * step * 0.5;
        if (Math.abs(xx) < 60 && r === 0) continue; // the original tube stands here
        const g = Math.max(0, Math.min(1, (fieldAt(xx * 0.55) - 500) / 2000)) * (Math.abs(xx) < waveR ? 1 : 0);
        art.push(
          <g key={`${r}_${xx}`} opacity={artP}>
            <Tube id="a" x={xx} base={base} glow={g * (0.85 + 0.15 * Math.sin(t * 7 + xx))} s={s} />
          </g>,
        );
      }
    });
  }
  const hitFlash = interpolate(t, [T_HIT - 0.05, T_HIT, T_HIT + 0.7], [0, 0.5, 0], clamp);

  // ---------- HUD ----------
  const shownField = Math.round(field / 100) * 100;
  const meterFill = Math.min(1, field / 4000);
  const titleOut = ramp(t, T_METER - 0.3, 0.4);
  const head = (a: number, b: number) => interpolate(t, [a - 0.1, a + 0.25, b - 0.3, b], [0, 1, 1, 0], clamp);
  const endA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 15, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(T_PAY2 * fps), fps, config: { damping: 11, stiffness: 170 } });
  const gaugeOut = ramp(t, T_PAY - 0.4, 0.4);
  const tubeScreen = toScreen(tubeX, tubeCY);
  const ground = toScreen(0, GROUND);
  const markers = [
    { x: 2 * M50, label: "100 M" },
    { x: M50, label: "50 M" },
    { x: 0, label: "UNDER LINE" },
  ];
  const markerOn = interpolate(t, [T_METER + 0.2, T_METER + 0.6, T_FLAT - 0.5, T_FLAT - 0.1], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #120a2c 0%, #2a1650 45%, #4a2a5c 70%, #1a1430 100%)",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("power-line-tube/narration.wav")} />
      <Audio src={staticFile("power-line-tube/bed.wav")} volume={0.6} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <filter id="blur-m" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={18} />
          </filter>
          <filter id="blur-a" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={14} />
          </filter>
        </defs>
        <g transform={`translate(${SX} ${SY}) scale(${scale}) translate(${-cx} ${-cy})`}>
          {/* stars */}
          {Array.from({ length: 60 }).map((_, k) => (
            <circle
              key={k}
              cx={(rnd(k) - 0.5) * 6000}
              cy={-1400 + rnd(k + 99) * 1700}
              r={2.2 / Math.max(scale, 0.5)}
              fill="#ffffff"
              opacity={0.3 + 0.4 * rnd(k + 3)}
            />
          ))}
          {/* pylon */}
          <g stroke="#0a0716" strokeWidth={9} fill="none" strokeLinejoin="round">
            <path d={`M -150 ${GROUND} L -40 330 L 40 330 L 150 ${GROUND}`} />
            <path d="M -240 560 L 240 560 M -150 450 L 150 450 M -40 330 L 0 250 L 40 330" />
            {[0, 1, 2, 3, 4, 5].map((k) => {
              const y1 = GROUND - k * 190;
              const y2 = y1 - 190;
              const w = (y: number) => 40 + (110 * (y - 330)) / (GROUND - 330);
              return <path key={k} d={`M ${-w(y1)} ${y1} L ${w(y2)} ${y2} M ${w(y1)} ${y1} L ${-w(y2)} ${y2}`} strokeWidth={5} />;
            })}
          </g>
          {/* ground */}
          <rect x={-8000} y={GROUND} width={16000} height={3000} fill="#0d1a17" />
          <rect x={-8000} y={GROUND} width={16000} height={6} fill="#24413a" />
          {fieldLines}
          {/* conductors (seen end-on) */}
          {CONDUCTORS.map((c, k) => (
            <g key={k}>
              <line x1={c.x} y1={c.y - 40} x2={c.x} y2={c.y} stroke="#c9c2e0" strokeWidth={4} />
              <circle cx={c.x} cy={c.y} r={14} fill="#e8e2ff" stroke={FIELD} strokeWidth={4} />
            </g>
          ))}
          {/* distance markers */}
          {markers.map((m) => (
            <g key={m.label} opacity={markerOn}>
              <line x1={m.x} y1={GROUND} x2={m.x} y2={GROUND + 60} stroke="#ffffff" strokeWidth={6} />
            </g>
          ))}
          {equi}
          {art}
          <Tube id="m" x={tubeX} base={GROUND} glow={tubeGlow * (1 - 0.6 * inside)} angle={angle} />
          {/* inside view */}
          <g opacity={inside}>
            <rect x={-TUBE_W / 2 + 3} y={tubeTop + 16} width={TUBE_W - 6} height={TUBE_H - 32} rx={18} fill="rgba(10,12,30,0.72)" />
          </g>
          {coat}
          {electrons}
          {atoms}
          {uvs}
        </g>
      </svg>

      {/* hit flash */}
      <AbsoluteFill style={{ background: AQUA, opacity: hitFlash * 0.3, mixBlendMode: "screen" }} />

      {/* ================= TAGS ================= */}
      {markers.map((m) => {
        const p = toScreen(m.x, GROUND + 110);
        return (
          <Tag key={m.label} x={Math.min(900, Math.max(180, p.x))} y={Math.min(1380, p.y)} color="#ffffff" opacity={markerOn * (p.x > -100 && p.x < 1180 ? 1 : 0)} size={34}>
            {m.label}
          </Tag>
        );
      })}
      <Tag x={Math.min(820, Math.max(260, toScreen(560, 900).x))} y={toScreen(560, 900).y} color={FIELD} opacity={interpolate(t, [T_METER + 0.3, T_METER + 0.7, T_FLAT - 0.6, T_FLAT - 0.2], [0, 1, 1, 0], clamp)}>
        ELECTRIC FIELD
      </Tag>
      <Tag x={540} y={560} color="#ffffff" opacity={interpolate(t, [T_FLAT, T_FLAT + 0.3, T_STAND - 0.3, T_STAND], [0, 1, 1, 0], clamp)}>
        BOTH ENDS: SAME VOLTAGE
      </Tag>
      <Tag x={540} y={560} color={AQUA} opacity={interpolate(t, [T_STAND + 0.2, T_STAND + 0.5, T_PUSH - 0.4, T_PUSH], [0, 1, 1, 0], clamp)}>
        ENDS AT DIFFERENT VOLTAGES
      </Tag>
      <Tag x={250} y={900} color={FIELD} opacity={inside * electronsP * (1 - mercP)}>
        ELECTRONS
      </Tag>
      <Tag x={250} y={960} color="rgba(255,255,255,0.7)" opacity={inside * electronsP * (1 - mercP)} size={28}>
        (SLOWED DOWN)
      </Tag>
      <Tag x={225} y={760} color="#d8d6e8" opacity={inside * mercP}>
        MERCURY
      </Tag>
      <Tag x={225} y={1000} color={UV} opacity={inside * uvP}>
        ULTRAVIOLET
      </Tag>
      <Tag x={855} y={880} color="#ffffff" opacity={inside * coatP}>
        COATING
      </Tag>
      <Tag x={855} y={935} color="#ffffff" opacity={inside * coatP} size={30}>
        → WHITE LIGHT
      </Tag>
      <Tag x={540} y={560} color={AQUA} opacity={interpolate(t, [T_ART + 0.4, T_ART + 0.8, T_PAY - 0.4, T_PAY], [0, 1, 1, 0], clamp)} size={38}>
        "FIELD" · ART INSTALLATION · 2004
      </Tag>

      {/* ================= HUD: field gauge ================= */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 140, height: 200, borderRadius: 26, background: "rgba(10,6,24,0.82)", border: "2px solid rgba(255,255,255,0.08)", opacity: 1 - gaugeOut }}>
        <div style={{ position: "absolute", left: 30, top: 18, fontFamily: FONT, fontWeight: 700, fontSize: 32, letterSpacing: 5, color: "rgba(255,255,255,0.8)" }}>
          ELECTRIC FIELD AT TUBE
        </div>
        <div style={{ position: "absolute", right: 30, top: 6, fontFamily: FONT, fontWeight: 700, fontSize: 56, color: FIELD, fontVariantNumeric: "tabular-nums" }}>
          {shownField.toLocaleString("en-US")}
          <span style={{ fontSize: 30, marginLeft: 8 }}>V/M</span>
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, top: 92, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${meterFill * 100}%`, height: "100%", background: `linear-gradient(90deg, #c79a1e, ${FIELD})`, boxShadow: "0 0 24px rgba(255,217,94,0.5)" }} />
        </div>
        <div style={{ position: "absolute", left: 30, top: 148, fontFamily: FONT, fontWeight: 500, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.5)" }}>
          SIMPLIFIED MODEL · NOT TO SCALE
        </div>
        <div style={{ position: "absolute", right: 30, top: 146, fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: flipsOn > 0.5 && inside > 0.1 ? (polarity > 0 ? FIELD : UV) : "rgba(255,255,255,0.5)" }}>
          {flipsOn > 0.5 ? (polarity > 0 ? "▼ FLIPS 50×/S" : "▲ FLIPS 50×/S") : "UNDER LINE ≈ 4,000"}
        </div>
      </div>

      {/* Opening title */}
      <div
        style={{
          position: "absolute",
          top: 590,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 80,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: "#ffffff",
          opacity: 1 - titleOut,
          textShadow: "0 6px 30px rgba(0,0,0,1)",
        }}
      >
        NO WIRES. NO BATTERY.
        <br />
        <span style={{ color: AQUA }}>WHY IS IT GLOWING?</span>
      </div>

      {/* Safety note during the walk */}
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.75)", opacity: head(T_METER + 0.2, T_FLAT) }}>
        DON'T TRY THIS NEAR REAL POWER LINES
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 64, letterSpacing: 6, color: AQUA, opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`, textShadow: "0 4px 24px rgba(0,0,0,1)" }}>
          NO WIRES
        </div>
        <div style={{ fontWeight: 700, fontSize: 86, lineHeight: 1.05, letterSpacing: -2, color: "#ffffff", opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,1)" }}>
          THE POWER LINE
          <br />
          REACHES THROUGH AIR
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={AQUA} />
    </AbsoluteFill>
  );
};
