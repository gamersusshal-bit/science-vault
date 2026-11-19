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
import { Captions } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { FONT, useFonts } from "../../primitives/useFonts";
import { useTimeline } from "../../primitives/timeline";
import timelineJson from "../../../videos/pinecone-weather/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Beats (all from the narration timeline) ----------
const T_CONE = wordStart("hook", "pinecone");
const HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_ONE = line("one").start;
const T_SWELL = wordStart("one", "swells");
const T_NOBEND = wordStart("one", "no");
const T_TWO = line("two").start;
const T_BOTTOM = wordStart("two", "bottom");
const T_STRETCH = wordStart("two", "stretches");
const T_TOP = wordStart("two", "top");
const T_CURL = wordStart("two", "curls");
const T_DRY = line("dry").start;
const T_OPENING = wordStart("dry", "opening");
const T_WIND = wordStart("dry", "wind");
const T_STRANGE = line("fossil").start;
const T_FOSSIL = wordStart("fossil", "fossil");
const T_ELEVEN = wordStart("fossil", "eleven");
const T_HIT = wordStart("fossil", "still");
const T_PAY = line("payoff").start;
const T_JUST = wordStart("payoff", "just");
const END = timeline.duration;

// ---------- Palette: dusk forest, warm wood, rain blue ----------
const AMBER = "#ffb347";
const RAIN = "#7cc8ff";
const MOSS = "#a8e07a";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.6) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const kf = (t: number, xs: number[], ys: number[]) => interpolate(t, xs, ys, { ...clamp, easing: ease });
const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c: number[], m = 1) => `rgb(${c.map((v) => Math.min(255, Math.round(v * m))).join(",")})`;

// ---------- Weather and scale openness (1 = open, 0 = shut) ----------
const rainAt = (t: number) =>
  kf(
    t,
    [0, T_CURL + 0.4, T_DRY + 0.3, T_ELEVEN + 0.3, T_ELEVEN + 0.7, T_PAY - 0.2, T_PAY + 0.2, T_JUST + 0.1, T_JUST + 0.5, END],
    [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
  );
const openLive = (t: number) =>
  kf(
    t,
    [0, 0.35, HOOK_END, T_ONE, T_STRETCH + 0.6, T_CURL + 0.2, T_CURL + 0.9, T_DRY + 0.3, T_OPENING + 0.5, T_HIT - 0.1, T_HIT + 0.6, T_PAY + 0.2, T_JUST + 0.2, T_JUST + 0.6, END - 0.3],
    [1, 1, 0.72, 0.66, 0.6, 0.12, 0, 0, 1, 1, 0.1, 0.1, 1, 1, 0.15],
  );
const openFossil = (t: number) =>
  kf(t, [0, T_HIT - 0.1, T_HIT + 0.6, T_PAY + 0.2, T_JUST + 0.2, T_JUST + 0.6, END - 0.3], [1, 1, 0.3, 0.3, 1, 1, 0.35]);

// ---------- The cone: scales on a golden-angle spiral, each one hinged at the axis ----------
const N_SCALES = 76;
const LIVE_DRY = [176, 110, 56];
const LIVE_WET = [104, 66, 42];
const FOSSIL_DRY = [138, 128, 112];
const FOSSIL_WET = [86, 84, 80];

const Cone: React.FC<{
  cx: number;
  baseY: number;
  size: number;
  t: number;
  open: (t: number) => number;
  wet: number;
  fossil?: boolean;
}> = ({ cx, baseY, size, t, open, wet, fossil }) => {
  const color = mix(fossil ? FOSSIL_DRY : LIVE_DRY, fossil ? FOSSIL_WET : LIVE_WET, wet);
  const scales = Array.from({ length: N_SCALES }, (_, i) => {
    const u = i / (N_SCALES - 1); // 0 at the stem, 1 at the tip
    const phi = i * 2.39996 + t * 0.12; // slow turntable so the cone reads as 3D
    const yb = baseY - (70 + u * 600) * size;
    const L = size * 250 * (0.28 + 0.72 * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * u)), 0.75)) * (1 - 0.3 * u);
    const o = Math.max(0, Math.min(1, open(t - 0.35 * u)));
    const closedEl = (78 * Math.PI) / 180;
    const openEl = ((-18 + 42 * u) * Math.PI) / 180;
    const el = closedEl + (openEl - closedEl) * o;
    const rb = size * 22;
    const sx = Math.sin(phi);
    const cz = Math.cos(phi);
    const bx = cx + rb * sx;
    const tx = cx + (rb + L * Math.cos(el)) * sx;
    const ty = yb - L * Math.sin(el);
    const w = L * 0.62 * Math.max(0.3, Math.abs(cz));
    return { i, u, z: cz, bx, by: yb, tx, ty, w };
  }).sort((a, b) => a.z - b.z);

  const body = (s: (typeof scales)[number]) => {
    const dx = s.tx - s.bx;
    const dy = s.ty - s.by;
    const len = Math.hypot(dx, dy) || 1;
    // width runs across the scale on screen (perpendicular to its length)
    const px = (-dy / len) * s.w * 0.5;
    const py = (dx / len) * s.w * 0.5;
    const m = (k: number) => [s.bx + dx * k, s.by + dy * k];
    const [m1x, m1y] = m(0.62);
    const light = 0.5 + 0.6 * ((s.z + 1) / 2);
    const [ux, uy] = m(0.86);
    return (
      <g key={s.i}>
        <path
          d={`M ${s.bx + px * 0.35} ${s.by + py * 0.35} Q ${m1x + px * 1.15} ${m1y + py * 1.15} ${s.tx + px * 0.25} ${s.ty + py * 0.25} L ${s.tx - px * 0.25} ${s.ty - py * 0.25} Q ${m1x - px * 1.15} ${m1y - py * 1.15} ${s.bx - px * 0.35} ${s.by - py * 0.35} Z`}
          fill={rgb(color, light)}
          stroke={rgb(color, light * 0.45)}
          strokeWidth={2.5 * size}
        />
        {s.z > -0.2 && (
          <ellipse cx={ux} cy={uy} rx={s.w * 0.16} ry={s.w * 0.1} fill={rgb(color, light * 0.55)} />
        )}
        {s.z > 0.2 && wet > 0.05 && (
          <path
            d={`M ${s.bx + dx * 0.3 + px * 0.5} ${s.by + dy * 0.3 + py * 0.5} L ${s.bx + dx * 0.75 + px * 0.4} ${s.by + dy * 0.75 + py * 0.4}`}
            stroke={RAIN}
            strokeWidth={4 * size}
            strokeLinecap="round"
            opacity={0.55 * wet * s.z}
          />
        )}
      </g>
    );
  };

  const back = scales.filter((s) => s.z < 0);
  const front = scales.filter((s) => s.z >= 0);
  return (
    <g>
      {/* stem */}
      <rect x={cx - 12 * size} y={baseY - 70 * size} width={24 * size} height={70 * size} rx={8 * size} fill={rgb(color, 0.5)} />
      {back.map(body)}
      <ellipse cx={cx} cy={baseY - 370 * size} rx={30 * size} ry={310 * size} fill={rgb(color, 0.42)} />
      {front.map(body)}
    </g>
  );
};

// ---------- Cross-section of one scale: a strip that can bend ----------
const STRIP_X = 210;
const STRIP_Y = 1050;
const STRIP_L = 640;
const LAYER_H = 76;

/** Polygon of the band between offsets d0 and d1 from a centreline that bends upward with curvature k. */
const band = (L: number, k: number, d0: number, d1: number, n = 48) => {
  const pt = (s: number, d: number) => {
    const a = k * s;
    const x = Math.abs(k) < 1e-6 ? STRIP_X + s : STRIP_X + Math.sin(a) / k;
    const y = Math.abs(k) < 1e-6 ? STRIP_Y : STRIP_Y - (1 - Math.cos(a)) / k;
    return [x - Math.sin(a) * d, y - Math.cos(a) * d];
  };
  const a = Array.from({ length: n + 1 }, (_, i) => pt((L * i) / n, d1));
  const b = Array.from({ length: n + 1 }, (_, i) => pt((L * (n - i)) / n, d0));
  return { d: "M " + [...a, ...b].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z", pt };
};

const Label: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; children: React.ReactNode }> = ({
  x,
  y,
  color,
  opacity,
  size = 40,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * opacity})`,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 3,
      color,
      opacity,
      whiteSpace: "nowrap",
      textShadow: "0 3px 14px rgba(0,0,0,0.95)",
    }}
  >
    {children}
  </div>
);

export const PineconeWeather: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rain = rainAt(t);
  const sun = 1 - rain;
  const oLive = openLive(t);
  const oFos = openFossil(t);

  // ---------- Camera: push into one scale, then back out; then make room for the fossil ----------
  const zoom = ramp(t, T_ONE - 0.45, 0.8) * (1 - ramp(t, T_CURL + 0.2, 0.6));
  const panel = ramp(t, T_ONE - 0.1, 0.45) * (1 - ramp(t, T_CURL + 0.3, 0.55));
  const FX = 700;
  const FY = 860;
  const coneCam = `translate(${(540 - FX) * zoom}px, ${(900 - FY) * zoom}px) scale(${1 + 1.7 * zoom})`;
  const slide = ramp(t, T_STRANGE, 1.1);
  const liveCx = 540 - 255 * slide;
  const liveSize = 1.18 - 0.48 * slide;
  const fosCx = 1400 - 640 * slide;
  const BASE = 1290;
  const push = 1 + 0.035 * Math.sin(t * 0.4);

  // first-second event: a fat drop lands on the cone
  const splash = interpolate(t, [T_CONE - 0.15, T_CONE + 0.6], [0, 1], clamp);
  const shake = 10 * Math.exp(-Math.max(0, t - T_CONE) * 6) * (t > T_CONE ? 1 : 0) * Math.sin(frame * 2.1);
  const hitShake = 12 * Math.exp(-Math.max(0, t - T_HIT) * 5) * (t > T_HIT ? 1 : 0) * Math.sin(frame * 2.4);

  // ---------- Strip (scale cross-section) states ----------
  const swell = ramp(t, T_SWELL - 0.25, 1.5);
  const single = 1 - ramp(t, T_TWO - 0.05, 0.4);
  const split = ramp(t, T_TWO + 0.1, 0.6);
  const bottomWet = ramp(t, T_STRETCH - 0.1, 0.7);
  const bend = interpolate(t, [T_STRETCH + 0.25, T_CURL + 0.15], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const kMax = 1.3 / STRIP_L;
  const k = kMax * bend;
  const curlSpring = spring({ frame: frame - Math.round(T_CURL * fps), fps, config: { damping: 10, stiffness: 160 } });

  // ---------- HUD ----------
  const titleOut = ramp(t, HOOK_END - 0.15, 0.35);
  const meterIn = ramp(t, T_METER - 0.15, 0.4) * (1 - ramp(t, T_PAY - 0.35, 0.3));
  const fossilMeter = t > T_FOSSIL;
  const meterVal = fossilMeter ? oFos : oLive;
  const shutHit = spring({
    frame: frame - Math.round((t < T_STRANGE ? T_CURL + 0.35 : T_HIT + 0.3) * fps),
    fps,
    config: { damping: 8, stiffness: 180 },
  });
  const isShut = meterVal < 0.32 && ((t > T_CURL + 0.35 && t < T_DRY + 0.8) || (t > T_HIT + 0.3 && t < T_PAY));
  const payA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 14, stiffness: 160 } });
  const payB = spring({ frame: frame - Math.round(T_JUST * fps), fps, config: { damping: 12, stiffness: 150 } });
  const hitFlash = interpolate(t, [T_HIT - 0.05, T_HIT + 0.1, T_HIT + 0.8], [0, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #0c2318 0%, #12301f 52%, #1c2a17 70%, #1a120b 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("pinecone-weather/narration.wav")} />
      <Audio src={staticFile("pinecone-weather/bed.wav")} volume={0.6} />

      {/* ---------- Forest backdrop ---------- */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 82% 18%, rgba(255,190,90,${0.42 * sun}) 0%, rgba(255,160,60,${0.16 * sun}) 30%, rgba(0,0,0,0) 62%)` }} />
      <AbsoluteFill style={{ background: `rgba(60,110,170,${0.16 * rain})` }} />
      {[70, 210, 905, 1010].map((x, i) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x - 30 - 20 * (i % 2),
            top: 0,
            width: 60 + 40 * (i % 2),
            height: 1330,
            background: "linear-gradient(90deg, rgba(8,18,12,0.9), rgba(20,36,24,0.75), rgba(8,18,12,0.9))",
            opacity: 0.55 - 0.15 * (i % 2),
          }}
        />
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        const x = (rnd(i) * 1080 + t * (8 + 10 * rnd(i + 9))) % 1180 - 50;
        const y = 120 + rnd(i + 3) * 1100 + 30 * Math.sin(t * 0.5 + i);
        const r = 30 + rnd(i + 7) * 70;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${sun > 0.5 ? "255,210,140" : "180,230,190"},0.16) 0%, rgba(0,0,0,0) 70%)`,
            }}
          />
        );
      })}
      {/* forest floor */}
      <div style={{ position: "absolute", left: 0, top: 1300, width: 1080, height: 620, background: "linear-gradient(180deg, #2a1c10 0%, #160e07 60%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {Array.from({ length: 70 }, (_, i) => {
          const x = rnd(i + 100) * 1080;
          const y = 1305 + rnd(i + 200) * 110;
          const a = (rnd(i + 300) - 0.5) * 2.6;
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + 70 * Math.cos(a)}
              y2={y + 18 * Math.sin(a)}
              stroke={i % 3 ? "#5a3d22" : "#7a5530"}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.8}
            />
          );
        })}
      </svg>

      {/* ---------- WORLD: the cones ---------- */}
      <AbsoluteFill
        style={{
          transform: `${coneCam} translate(${shake + hitShake}px, 0px) scale(${push})`,
          transformOrigin: `${FX}px ${FY}px`,
          opacity: 1 - 0.8 * panel,
        }}
      >
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* stone slab under the fossil */}
          {slide > 0 && (
            <g opacity={slide}>
              <rect x={fosCx - 180} y={BASE - 14} width={360} height={84} rx={14} fill="#4a4740" stroke="#2e2c27" strokeWidth={4} />
              {[0, 1, 2].map((j) => (
                <line key={j} x1={fosCx - 170} y1={BASE + 8 + j * 20} x2={fosCx + 170} y2={BASE + 4 + j * 22} stroke="#5e5a50" strokeWidth={5} />
              ))}
            </g>
          )}
          <ellipse cx={liveCx} cy={BASE + 4} rx={170 * liveSize} ry={22 * liveSize} fill="rgba(0,0,0,0.45)" />
          <Cone cx={liveCx} baseY={BASE} size={liveSize} t={t} open={openLive} wet={rain} />
          {slide > 0 && <Cone cx={fosCx} baseY={BASE - 14} size={0.68} t={t} open={openFossil} wet={rain} fossil />}
          {/* first drop: splash rings on the cone */}
          {splash > 0 && splash < 1 && (
            <g>
              <circle cx={540} cy={640} r={20 + 160 * splash} fill="none" stroke={RAIN} strokeWidth={6 * (1 - splash)} opacity={1 - splash} />
              <circle cx={540} cy={640} r={10 + 90 * splash} fill="none" stroke="#ffffff" strokeWidth={4 * (1 - splash)} opacity={1 - splash} />
            </g>
          )}
          {splash <= 0 && <ellipse cx={540} cy={180 + 470 * Math.min(1, t / Math.max(0.01, T_CONE - 0.15))} rx={14} ry={24} fill={RAIN} opacity={0.95} />}
          {/* the fossil still moves */}
          {hitFlash > 0 && (
            <circle cx={fosCx} cy={BASE - 260} r={120 + 220 * (1 - hitFlash)} fill="none" stroke={AMBER} strokeWidth={10 * hitFlash} opacity={hitFlash} />
          )}
        </svg>
        <Label x={liveCx} y={BASE + 80} color={MOSS} opacity={ramp(t, T_FOSSIL, 0.4)} size={36}>
          TODAY
        </Label>
        <Label x={fosCx} y={BASE + 110} color={AMBER} opacity={ramp(t, T_FOSSIL, 0.4)} size={36}>
          FOSSIL
        </Label>
        <Label x={fosCx} y={BASE - 560} color="#ffffff" opacity={ramp(t, T_HIT + 0.05, 0.3) * (1 - ramp(t, T_PAY - 0.3, 0.3))} size={46}>
          STILL MOVES
        </Label>
        <Label x={720} y={455} color={AMBER} opacity={ramp(t, T_DRY + 0.15, 0.4) * (1 - ramp(t, T_STRANGE - 0.2, 0.4))} size={44}>
          DRY AIR: OPEN
        </Label>
        <Label x={300} y={1180} color={MOSS} opacity={ramp(t, T_WIND - 0.1, 0.4) * (1 - ramp(t, T_STRANGE, 0.4))} size={40}>
          SEEDS FLY
        </Label>
      </AbsoluteFill>

      {/* ---------- Seeds on the wind ---------- */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {Array.from({ length: 10 }, (_, i) => {
          const t0 = T_OPENING + 0.2 + i * 0.11;
          const tt = t - t0;
          if (tt < 0) return null;
          const x0 = 540 + (rnd(i + 40) - 0.5) * 220;
          const y0 = 760 + rnd(i + 41) * 360;
          const x = x0 + 300 * tt + 90 * tt * tt;
          const y = y0 - 150 * tt + 30 * Math.sin(tt * 5 + i);
          const op = interpolate(x, [940, 1080], [1, 0], clamp) * (1 - ramp(t, T_STRANGE + 0.2, 0.4));
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${tt * 280 + i * 40})`} opacity={op}>
              <ellipse cx={26} cy={0} rx={34} ry={13} fill="rgba(235,200,150,0.75)" stroke="#8a6a42" strokeWidth={2} />
              <ellipse cx={-8} cy={0} rx={12} ry={9} fill="#3b2614" />
            </g>
          );
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const a = ramp(t, T_WIND - 0.3 + i * 0.1, 0.5) * (1 - ramp(t, T_STRANGE + 0.1, 0.5));
          const y = 620 + i * 90;
          const off = ((t * 700 + i * 260) % 1400) - 300;
          return (
            <path
              key={`w${i}`}
              d={`M ${off} ${y} q 120 -30 240 0 t 240 0`}
              fill="none"
              stroke="rgba(255,240,210,0.55)"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={a}
            />
          );
        })}
      </svg>

      {/* ---------- Rain ---------- */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {Array.from({ length: 80 }, (_, i) => {
          const y = ((t * 1500 + rnd(i + 50) * 1700) % 1700) - 100;
          const x = rnd(i) * 1120 - 20 - y * 0.08;
          return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 46} stroke="rgba(170,215,255,0.65)" strokeWidth={3} opacity={rain} />;
        })}
      </svg>

      {/* ---------- CROSS-SECTION PANEL ---------- */}
      {panel > 0 && (
        <AbsoluteFill style={{ opacity: panel }}>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(10,22,16,0.9) 0%, rgba(6,14,10,0.94) 70%)" }} />
          <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
            {/* cone axis the scale hangs from */}
            <rect x={STRIP_X - 46} y={STRIP_Y - 330} width={46} height={560} rx={18} fill="#5c3b20" stroke="#2c1b0e" strokeWidth={4} />
            {/* one layer: swells, stays straight */}
            {single > 0 && (
              <g opacity={single}>
                {(() => {
                  const h = LAYER_H * (1 + 0.25 * swell);
                  const b = band(STRIP_L * (1 + 0.16 * swell), 0, -h, h);
                  const c = mix([190, 120, 62], [96, 140, 190], swell);
                  return <path d={b.d} fill={rgb(c)} stroke="#2a1a0c" strokeWidth={5} />;
                })()}
                <line
                  x1={STRIP_X}
                  y1={STRIP_Y}
                  x2={STRIP_X + 820 * ramp(t, T_NOBEND - 0.1, 0.7)}
                  y2={STRIP_Y}
                  stroke="#ffffff"
                  strokeWidth={4}
                  strokeDasharray="14 12"
                  opacity={ramp(t, T_NOBEND - 0.1, 0.3)}
                />
              </g>
            )}
            {/* two layers: the bottom stretches, the top doesn't, so it curls */}
            {split > 0 && (
              <g opacity={split}>
                {(() => {
                  const g = 16 * (1 - split);
                  const top = band(STRIP_L, k, 0 + g, LAYER_H + g);
                  const bot = band(STRIP_L, k, -LAYER_H - g, 0 - g);
                  const botC = mix([150, 96, 52], [70, 140, 210], bottomWet);
                  const cells = Array.from({ length: 11 }, (_, j) => {
                    const s = (STRIP_L * (j + 0.5)) / 11;
                    const [x0, y0] = bot.pt(s, -LAYER_H + 6);
                    const [x1, y1] = bot.pt(s, -6);
                    return <line key={j} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(20,30,50,0.6)" strokeWidth={4} />;
                  });
                  const fibres = [0.33, 0.66].map((f, j) => {
                    const pts = Array.from({ length: 33 }, (_, q) => top.pt((STRIP_L * q) / 32, LAYER_H * f));
                    return (
                      <path
                        key={j}
                        d={"M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}
                        fill="none"
                        stroke="rgba(255,220,170,0.45)"
                        strokeWidth={3}
                      />
                    );
                  });
                  return (
                    <g>
                      <path d={bot.d} fill={rgb(botC)} stroke="#1c140c" strokeWidth={5} />
                      {cells}
                      <path d={top.d} fill="#c98a45" stroke="#1c140c" strokeWidth={5} />
                      {fibres}
                    </g>
                  );
                })()}
              </g>
            )}
            {/* drops landing on the strip */}
            {Array.from({ length: 10 }, (_, i) => {
              const period = 0.9;
              const t0 = T_ONE + 0.5 + i * 0.23;
              const p = ((t - t0) % period) / period;
              if (t < t0 || t > T_CURL) return null;
              const x = STRIP_X + 80 + rnd(i + 70) * 460;
              return <ellipse key={i} cx={x} cy={600 + p * 400} rx={15} ry={24} fill={RAIN} opacity={p < 0.95 ? 0.9 : 0} />;
            })}
          </svg>
          <Label x={540} y={430} color="rgba(220,235,220,0.8)" opacity={1} size={34}>
            ONE SCALE, SIDE VIEW · SIMPLIFIED MODEL
          </Label>
          <Label x={560} y={880} color={AMBER} opacity={ramp(t, T_ONE + 0.5, 0.4) * single} size={44}>
            ONE LAYER
          </Label>
          <Label x={560} y={1240} color="#ffffff" opacity={ramp(t, T_NOBEND - 0.1, 0.3) * single} size={64}>
            NO BEND
          </Label>
          <Label x={600} y={1225} color={RAIN} opacity={ramp(t, T_BOTTOM - 0.1, 0.4)} size={40}>
            BOTTOM: STRETCHES WHEN WET
          </Label>
          <Label x={600} y={600} color={AMBER} opacity={ramp(t, T_TOP - 0.1, 0.4)} size={40}>
            TOP: BARELY SWELLS
          </Label>
          <Label x={850} y={760} color="#ffffff" opacity={ramp(t, T_CURL - 0.05, 0.25)} size={56 + 10 * (1 - Math.min(1, curlSpring))}>
            CURLS!
          </Label>
        </AbsoluteFill>
      )}

      {/* ---------- HUD ---------- */}
      <SeriesTag name="Why It Happens" n={5} accent={AMBER} until={HOOK_END} />
      <div
        style={{
          position: "absolute",
          top: 240,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          opacity: 1 - titleOut,
          transform: `translateY(${-30 * titleOut}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)",
        }}
      >
        <div style={{ fontSize: 96, letterSpacing: -2, color: "#ffffff", lineHeight: 1.05 }}>THIS CONE IS DEAD.</div>
        <div style={{ fontSize: 66, letterSpacing: 0, color: AMBER, marginTop: 10 }}>SO WHY IS IT MOVING?</div>
      </div>

      {/* Meter: how open the scales are; target is SHUT */}
      <div style={{ position: "absolute", top: 196, left: 150, width: 780, fontFamily: FONT, opacity: meterIn }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 34, letterSpacing: 4 }}>
          <span style={{ color: RAIN }}>◀ TARGET: SHUT</span>
          <span style={{ color: "rgba(255,255,255,0.75)" }}>{fossilMeter ? "FOSSIL SCALES" : "SCALES"} OPEN</span>
        </div>
        <div style={{ position: "relative", marginTop: 12, height: 50, borderRadius: 25, background: "rgba(0,0,0,0.55)", border: "3px solid rgba(255,255,255,0.35)" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.max(6, meterVal * 100)}%`,
              borderRadius: 25,
              background: `linear-gradient(90deg, ${RAIN}, ${AMBER})`,
            }}
          />
          <div style={{ position: "absolute", left: -6, top: -14, width: 8, height: 78, borderRadius: 4, background: RAIN, boxShadow: `0 0 18px ${RAIN}` }} />
        </div>
        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 52,
            letterSpacing: 6,
            color: RAIN,
            opacity: isShut ? 1 : 0,
            transform: `scale(${1 + 0.25 * (1 - Math.min(1, shutHit))})`,
            textShadow: "0 0 24px rgba(124,200,255,0.6)",
          }}
        >
          SHUT ✓
        </div>
      </div>
      <Label x={540} y={420} color={AMBER} opacity={ramp(t, T_ELEVEN - 0.1, 0.4) * (1 - ramp(t, T_PAY - 0.35, 0.3)) * (isShut ? 0 : 1)} size={52}>
        OVER 11 MILLION YEARS OLD
      </Label>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        <div style={{ fontSize: 64, letterSpacing: 6, color: MOSS, opacity: Math.min(1, payA), transform: `translateY(${20 * (1 - Math.min(1, payA))}px)` }}>
          NOTHING ALIVE.
        </div>
        <div style={{ fontSize: 92, lineHeight: 1.04, letterSpacing: -2, color: "#ffffff", marginTop: 16, opacity: Math.min(1, payB), transform: `scale(${0.85 + 0.15 * payB})` }}>
          JUST WOOD,
          <br />
          <span style={{ color: AMBER }}>READING THE</span>
          <br />
          <span style={{ color: AMBER }}>WEATHER.</span>
        </div>
      </div>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
      <Captions lines={timeline.lines} top={1440} accent={AMBER} />
    </AbsoluteFill>
  );
};
