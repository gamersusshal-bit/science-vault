import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/red-fish-dark/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z]/g, "").startsWith(w))!.start;

const ACCENT = "#4fd8ff";
const RED = "#ff4a3a";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const FADE = line("fade");
const BLACK = line("black");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_FISH = wordStart("hook", "fish");
const T_BLACK = wordStart("black", "black");
const T_RED_FIRST = wordStart("fade", "red");
const T_UNTIL = wordStart("climax", "until");

// ---------- Light model (labelled simplified): how much of each colour band is left at a depth ----------
type RGB = [number, number, number];
const BANDS: { name: string; rgb: RGB; d: [number, number, number]; k: [number, number, number] }[] = [
  { name: "RED", rgb: [255, 40, 30], d: [0, 12, 100], k: [1, 0.45, 0] },
  { name: "ORANGE", rgb: [255, 140, 20], d: [0, 50, 200], k: [1, 0.8, 0] },
  { name: "YELLOW", rgb: [255, 225, 40], d: [0, 100, 320], k: [1, 0.75, 0] },
  { name: "GREEN", rgb: [60, 220, 90], d: [0, 200, 560], k: [1, 0.75, 0] },
  { name: "BLUE", rgb: [40, 120, 255], d: [0, 600, 1000], k: [1, 0.35, 0] },
];
const lightAt = (depth: number) => BANDS.map((b) => interpolate(depth, b.d, b.k, clamp));
const shade = (L: number[], refl: number[], gain = 1): RGB => {
  const c: RGB = [0, 0, 0];
  L.forEach((l, i) => {
    for (let j = 0; j < 3; j++) c[j] += l * refl[i] * BANDS[i].rgb[j] * gain;
  });
  return c.map((v) => Math.max(0, Math.min(255, v))) as RGB;
};
const css = (c: RGB, a = 1) => `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${a})`;
const RED_FISH = [0.95, 0.15, 0.03, 0.05, 0.05];
const BLUE_FISH = [0.03, 0.03, 0.03, 0.3, 0.9];
const WATER = [0.05, 0.05, 0.05, 0.18, 0.45];

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,0,0,0.95)" }}>
    {children}
  </div>
);

// A generic reef-style fish facing right, drawn around (0,0). Body about 300 px long.
const Fish: React.FC<{ x: number; y: number; rot: number; body: RGB; t: number; ghost?: number; scale?: number }> = ({
  x, y, rot, body, t, ghost = 0, scale = 1,
}) => {
  const wag = Math.sin(t * 9) * 14;
  const dark: RGB = [body[0] * 0.55, body[1] * 0.55, body[2] * 0.55];
  const light: RGB = [Math.min(255, body[0] * 1.15 + 8), Math.min(255, body[1] * 1.15 + 8), Math.min(255, body[2] * 1.15 + 8)];
  const lum = (body[0] + body[1] + body[2]) / 765;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <g transform={`rotate(${wag} -110 0)`}>
        <path d="M -110 0 L -205 -62 Q -185 0 -205 62 Z" fill={css(dark)} />
      </g>
      <path d="M -40 -58 Q 10 -118 70 -52 Z" fill={css(dark)} />
      <path d="M -20 52 Q 10 92 50 50 Z" fill={css(dark)} />
      <ellipse cx={0} cy={0} rx={150} ry={64} fill={css(body)} />
      <ellipse cx={10} cy={-18} rx={120} ry={30} fill={css(light, 0.5)} />
      <path d="M 60 -50 Q 80 0 60 50" fill="none" stroke={css(dark)} strokeWidth={6} />
      <g transform={`rotate(${Math.sin(t * 6) * 18} 30 12)`}>
        <path d="M 30 12 Q 0 30 -10 50 Q 25 40 40 22 Z" fill={css(dark)} />
      </g>
      <circle cx={102} cy={-12} r={14} fill={`rgba(235,240,255,${0.15 + 0.85 * Math.min(1, lum * 2.2)})`} />
      <circle cx={106} cy={-12} r={7} fill="#05070c" />
      {ghost > 0 && (
        <g opacity={ghost}>
          <ellipse cx={0} cy={0} rx={156} ry={70} fill="none" stroke={RED} strokeWidth={5} strokeDasharray="14 12"
            strokeDashoffset={-t * 60} />
          <path d="M -112 0 L -210 -66 Q -190 0 -210 66 Z" fill="none" stroke={RED} strokeWidth={5} strokeDasharray="14 12" />
        </g>
      )}
    </g>
  );
};

export const RedFishDark: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Depth (metres) over the story ----------
  const depth = interpolate(
    t,
    [METER.start, FADE.start, T_RED_FIRST, T_BLACK, TWIST.start, TWIST.end, CLIMAX.start, T_UNTIL, CLIMAX.end],
    [0, 8, 30, 100, 140, 420, 560, 860, 1000],
    clamp,
  );
  const L = lightAt(depth);
  const sunlight = L.reduce((a, b) => a + b, 0) / 5;

  // ---------- Water colour and descent scroll ----------
  const water = shade(L, WATER);
  const waterDeep = shade(L, WATER, 0.45);
  const scroll = depth * 9 + t * 22;

  // ---------- Red fish: dives in through the surface, then sinks with the camera ----------
  const enter = interpolate(t, [0, 1.1], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const surfaceY = 610 - (depth * 90 + interpolate(t, [1.0, METER.start], [0, 120], clamp));
  const toSide = interpolate(t, [TWIST.start - 0.2, TWIST.start + 0.8], [0, 1], { ...clamp, easing: ease });
  const fishX = interpolate(enter, [0, 1], [170, 540]) + 150 * toSide + Math.sin(t * 1.4) * 14;
  const fishY = interpolate(enter, [0, 1], [560, 930]) + Math.sin(t * 2.1) * 10 - 40 * toSide;
  const fishRot = interpolate(enter, [0, 1], [48, 0]) + Math.sin(t * 1.7) * 3;
  const redBody = shade(L, RED_FISH, 1.0);

  // Blue fish arrives for the twist, then fades with the last blue light.
  const blueIn = interpolate(t, [TWIST.start + 0.1, TWIST.start + 1.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const blueX = interpolate(blueIn, [0, 1], [-260, 320]) + Math.sin(t * 1.2 + 1) * 12;
  const blueY = 1010 + Math.sin(t * 2.3 + 2) * 10;
  const blueBody = shade(L, BLUE_FISH, 1.0);

  // ---------- Splash ----------
  const splashT = Math.max(0, t - 0.3);
  const splashO = interpolate(t, [0.3, 0.35, 1.3], [0, 1, 0], clamp);

  // ---------- Camera ----------
  const shake = 12 * Math.exp(-Math.max(0, t - 0.32) * 6) * (t > 0.32 ? 1 : 0) + 10 * (t > T_BLACK ? Math.exp(-(t - T_BLACK) * 6) : 0);
  const zoom = 1 + 0.05 * interpolate(t, [METER.start, CLIMAX.end], [0, 1], clamp) + 0.06 * interpolate(t, [BLACK.start, T_BLACK, TWIST.start, TWIST.start + 0.8], [0, 1, 1, 0], { ...clamp, easing: ease });
  const camera = `translate(${Math.sin(frame * 2.1) * shake}px, ${Math.cos(frame * 1.7) * shake}px) scale(${zoom})`;

  // ---------- Labels ----------
  const fadeIO = (a: number, b: number, c: number, d: number) => interpolate(t, [a, b, c, d], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [HOOK.end - 0.15, HOOK.end + 0.25], [1, 0], clamp);
  const hudO = interpolate(t, [METER.start - 0.1, METER.start + 0.3], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start], [1, 0], clamp);
  const hudPop = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 12, stiffness: 160 } });
  const targetO = fadeIO(wordStart("meter", "thousand") - 0.1, wordStart("meter", "thousand") + 0.3, CLIMAX.end + 0.6, CLIMAX.end + 1.0);
  const redFirstO = fadeIO(T_RED_FIRST - 0.1, T_RED_FIRST + 0.3, BLACK.start + 0.8, BLACK.start + 1.2);
  const looksBlackO = fadeIO(T_BLACK, T_BLACK + 0.3, TWIST.start + 0.2, TWIST.start + 0.6);
  const blackPop = spring({ frame: frame - Math.round(T_BLACK * fps), fps, config: { damping: 9, stiffness: 180 } });
  const seenO = fadeIO(wordStart("twist", "blue") + 0.6, wordStart("twist", "blue") + 1.0, CLIMAX.start + 0.8, CLIMAX.start + 1.2);
  const sameO = fadeIO(CLIMAX.start + 0.6, CLIMAX.start + 1.0, T_UNTIL + 0.4, T_UNTIL + 0.8);
  const goneFlash = interpolate(t, [CLIMAX.end - 0.05, CLIMAX.end + 0.05, CLIMAX.end + 0.9], [0, 1, 0], clamp);
  const ghostO = interpolate(t, [PAYOFF.start + 0.1, PAYOFF.start + 0.7], [0, 1], clamp) * (0.65 + 0.35 * Math.sin(t * 5));
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "color") * fps), fps, config: { damping: 11, stiffness: 170 } });
  const noteO = interpolate(t, [BLACK.start, BLACK.start + 0.4], [1, 0], clamp) * interpolate(t, [METER.start, METER.start + 0.4], [0, 1], clamp);

  // Depth ruler on the left: 0 m at y=560, 1,000 m at y=1260.
  const RY0 = 560;
  const RY1 = 1260;
  const ry = (d: number) => RY0 + ((RY1 - RY0) * d) / 1000;

  // Marine snow drifting past (fixed pseudo-random field, scrolled by the descent).
  const snow = Array.from({ length: 70 }, (_, i) => {
    const sx = (i * 337.7) % 1080;
    const base = (i * 911.3) % 2200;
    const y = ((((base - scroll * (0.6 + (i % 5) * 0.15)) % 2200) + 2200) % 2200) - 140;
    const r = 2 + (i % 4);
    return { x: sx + Math.sin(t * 0.8 + i) * 10, y, r, a: 0.15 + (i % 3) * 0.1 };
  });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Audio src={staticFile("red-fish-dark/narration.wav")} />
      <Audio src={staticFile("red-fish-dark/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "540px 930px" }}>
        {/* Water: colour comes from the light model */}
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${css(water)} 0%, ${css(waterDeep)} 100%)` }} />

        {/* Sky and surface while still near the top */}
        {surfaceY > -40 && (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: Math.max(0, surfaceY),
              background: "linear-gradient(180deg, #1d3557 0%, #3d6a96 55%, #8cc4e2 100%)" }} />
            <svg width={1080} height={1920} style={{ position: "absolute" }}>
              <path
                d={`M 0 ${surfaceY} ${Array.from({ length: 28 }, (_, i) => `L ${i * 40 + 40} ${surfaceY + Math.sin(i * 0.9 + t * 4) * 7}`).join(" ")} L 1080 ${surfaceY + 40} L 0 ${surfaceY + 40} Z`}
                fill="rgba(255,255,255,0.35)"
              />
            </svg>
          </>
        )}

        {/* Sunlight beams: one per colour, fading as each colour is absorbed */}
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            {BANDS.map((b, i) => (
              <linearGradient key={b.name} id={`beam${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={css(b.rgb)} stopOpacity={0.55} />
                <stop offset="100%" stopColor={css(b.rgb)} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          {BANDS.map((b, i) => {
            const x = 300 + i * 120 + Math.sin(t * 0.9 + i) * 12;
            const top = Math.max(0, surfaceY);
            return (
              <polygon key={b.name}
                points={`${x - 26},${top} ${x + 26},${top} ${x + 70},${1400} ${x - 70},${1400}`}
                fill={`url(#beam${i})`} opacity={L[i] * (t < METER.start ? 0.7 : 1)} />
            );
          })}
          {/* Marine snow */}
          {snow.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`rgba(220,235,255,${s.a * (0.25 + 0.75 * Math.max(sunlight, 0.15))})`} />
          ))}
          {/* Splash rings and drops */}
          {splashO > 0 && (
            <g opacity={splashO}>
              <ellipse cx={420} cy={surfaceY + 10} rx={40 + splashT * 260} ry={10 + splashT * 40} fill="none" stroke="#ffffff" strokeWidth={6} />
              <ellipse cx={420} cy={surfaceY + 10} rx={20 + splashT * 150} ry={6 + splashT * 22} fill="none" stroke="#ffffff" strokeWidth={4} />
              {Array.from({ length: 10 }, (_, i) => {
                const a = -Math.PI * (0.15 + 0.7 * (i / 9));
                const v = 380 + (i % 3) * 120;
                return <circle key={i} cx={420 + Math.cos(a) * v * splashT} cy={surfaceY + Math.sin(a) * v * splashT + 600 * splashT * splashT} r={9} fill="#ffffff" />;
              })}
            </g>
          )}
          {/* Bubbles trailing the dive */}
          {Array.from({ length: 12 }, (_, i) => {
            const bt = t - 0.35 - i * 0.07;
            if (bt < 0 || bt > 2.5) return null;
            return <circle key={`b${i}`} cx={420 + (i % 3 - 1) * 30 + bt * 40} cy={surfaceY + 60 + i * 30 - bt * 120} r={6 + (i % 3) * 4}
              fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} opacity={1 - bt / 2.5} />;
          })}

          {/* Blue fish (twist) */}
          {blueIn > 0 && <Fish x={blueX} y={blueY} rot={Math.sin(t * 1.5) * 3} body={blueBody} t={t + 1.3} scale={1.0} />}
          {/* Red fish */}
          <Fish x={fishX} y={fishY} rot={fishRot} body={redBody} t={t} ghost={ghostO} scale={1.2} />
        </svg>

        {/* World labels */}
        <Tag x={300} y={1340} color="#ff8a7a" o={redFirstO * (0.6 + 0.4 * L[0])} size={36}>RED GOES FIRST</Tag>
        <Tag x={fishX} y={fishY + 135} color="#ffffff" o={looksBlackO} size={40 + 6 * (1 - Math.min(1, blackPop))}>LOOKS BLACK</Tag>
        <Tag x={blueX} y={blueY + 105} color="#8fd0ff" o={seenO} size={38}>BLUE: SEEN</Tag>
        <Tag x={fishX} y={fishY - 130} color="#ff9a8a" o={seenO} size={38}>RED: HIDDEN</Tag>
        <Tag x={540} y={1180} color="#bcd4ff" o={sameO} size={36}>RED LOOKS BLACK</Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ background: `rgba(150,200,255,${0.35 * goneFlash})` }} />

      {/* Depth ruler */}
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: hudO }}>
        <line x1={70} y1={RY0} x2={70} y2={RY1} stroke="rgba(220,235,255,0.5)" strokeWidth={4} />
        <line x1={70} y1={RY0} x2={70} y2={ry(depth)} stroke={ACCENT} strokeWidth={8} strokeLinecap="round" />
        {[0, 100, 1000].map((d) => (
          <line key={d} x1={56} y1={ry(d)} x2={84} y2={ry(d)} stroke="rgba(220,235,255,0.8)" strokeWidth={4} />
        ))}
        <circle cx={70} cy={ry(depth)} r={14} fill={ACCENT} />
      </svg>
      <div style={{ position: "absolute", left: 100, top: ry(100) + 6, fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 2,
        color: depth >= 100 ? "#ff8a7a" : "rgba(230,240,255,0.85)", opacity: hudO, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
        100 M{depth >= 100 ? " · NO RED" : ""}
      </div>
      <div style={{ position: "absolute", left: 100, top: ry(1000) - 22, fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 2,
        color: ACCENT, opacity: hudO * targetO, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
        1,000 M · NO SUNLIGHT
      </div>

      {/* HUD: depth readout + light left per colour */}
      <div style={{ position: "absolute", top: 170, width: "100%", textAlign: "center", fontFamily: FONT, opacity: hudO,
        transform: `scale(${0.85 + 0.15 * Math.min(1, hudPop)})` }}>
        <div style={{ fontWeight: 500, fontSize: 30, letterSpacing: 7, color: "rgba(225,240,255,0.85)" }}>DEPTH</div>
        <div style={{ fontWeight: 700, fontSize: 140, lineHeight: 1.0, letterSpacing: -3, fontVariantNumeric: "tabular-nums",
          color: depth >= 999 ? "#ffffff" : ACCENT, textShadow: "0 0 40px rgba(79,216,255,0.45)" }}>
          {Math.round(depth).toLocaleString("en-US")} M
        </div>
        <div style={{ marginTop: 6, fontWeight: 500, fontSize: 28, letterSpacing: 6, color: "rgba(225,240,255,0.8)" }}>
          {depth >= 999 ? "SUNLIGHT: GONE" : "SUNLIGHT LEFT"}
        </div>
        <div style={{ margin: "10px auto 0", width: 700, height: 80, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {BANDS.map((b, i) => (
            <div key={b.name} style={{ width: 124, height: 80, borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "flex-end", overflow: "hidden", background: "rgba(0,0,0,0.35)" }}>
              <div style={{ width: "100%", height: `${L[i] * 100}%`, background: css(b.rgb),
                boxShadow: `0 0 18px ${css(b.rgb, 0.7)}` }} />
            </div>
          ))}
        </div>
      </div>

      <SeriesTag name="Why It Happens" n={8} accent={ACCENT} until={HOOK.end} />

      {/* Opening title */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700,
        fontSize: 84, lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: titleO, textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>
        HOW DOES RED
        <br />
        <span style={{ color: RED }}>HELP IT HIDE?</span>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 70, color: "#ffffff", opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          DOWN HERE, RED IS
        </div>
        <div style={{ fontWeight: 700, fontSize: 104, lineHeight: 1.05, color: RED, opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: `0 0 40px rgba(255,74,58,0.5)` }}>
          THE COLOR
          <br />
          OF NOTHING
        </div>
      </div>

      <div style={{ position: "absolute", top: 1395, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500,
        fontSize: 24, letterSpacing: 5, color: "rgba(220,235,255,0.65)", opacity: noteO }}>
        SIMPLIFIED MODEL · REAL FADES ARE GRADUAL
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="Why It Happens" next={9} accent={ACCENT} />
    </AbsoluteFill>
  );
};
