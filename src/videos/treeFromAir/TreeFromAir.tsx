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
import { Captions } from "../../primitives/Captions";
import { useTimeline } from "../../primitives/timeline";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/tree-from-air/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Story beats ----------
const T_AIR = wordStart("hook", "thin");
const T_NOT = wordStart("hook", "not");
const POT = line("pot");
const T_GREW = wordStart("pot", "grew");
const WEIGH = line("weigh");
const T_GAIN = wordStart("weigh", "gained");
const T_SOIL = wordStart("weigh", "soil");
const QUESTION = line("question");
const LEAVES = line("leaves");
const T_SUN = wordStart("leaves", "sunlight");
const T_SUGAR = wordStart("leaves", "sugar");
const T_WOOD = wordStart("leaves", "wood");
const CARBON = line("carbon");
const T_HALF = wordStart("carbon", "half");
const T_SKY = wordStart("carbon", "sky");
const PAYOFF = line("payoff");
const T_SOLID = wordStart("payoff", "turned");

// ---------- World (1080 x 1920) ----------
const BASE = { x: 540, y: 1140 }; // where the trunk meets the soil in the pot
const GROUND_Y = 1356;
const CANOPY = { x: 540, y: BASE.y - 480 };
const LIME = "#b8f25c";
const SKYBLUE = "#6fd3ff";
const PAPER = "#f3fff0";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

// Canopy blobs in tree-local coordinates (origin = trunk base, y up is negative)
const BLOBS = new Array(16).fill(0).map((_, i) => {
  const a = i * 2.399963;
  const r = 165 * Math.sqrt((i + 0.5) / 16);
  return {
    x: r * Math.cos(a),
    y: -480 + r * Math.sin(a) * 0.9,
    r: 84 - i * 1.4,
    fill: ["#2f8f4e", "#3fa65a", "#57c06a", "#2a7d45"][i % 4],
  };
});

const Tree: React.FC<{ x: number; y: number; g: number; sway: number; dim?: number }> = ({ x, y, g, sway, dim = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${g})`} opacity={1 - dim * 0.45}>
    <path
      d="M -40 0 C -30 -120 -24 -260 -20 -390 L 20 -390 C 24 -260 30 -120 40 0 Z"
      fill="#8a5a33"
      stroke="#b98656"
      strokeWidth={3}
    />
    {[
      [-125, -470],
      [115, -480],
      [-50, -545],
      [60, -560],
    ].map(([bx, by], i) => (
      <line key={i} x1={0} y1={-375} x2={bx} y2={by} stroke="#8a5a33" strokeWidth={15} strokeLinecap="round" />
    ))}
    <g transform={`rotate(${sway} 0 -380)`}>
      {BLOBS.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.fill} />
      ))}
      {BLOBS.slice(0, 9).map((b, i) => (
        <circle key={`h${i}`} cx={b.x - b.r * 0.25} cy={b.y - b.r * 0.3} r={b.r * 0.45} fill="rgba(190,255,170,0.16)" />
      ))}
    </g>
  </g>
);

/** One carbon dioxide molecule: O = C = O */
const Molecule: React.FC<{ x: number; y: number; rot: number; opacity: number; oxygen?: number; s?: number; glow?: number }> = ({
  x,
  y,
  rot,
  opacity,
  oxygen = 1,
  s = 1,
  glow = 0,
}) =>
  opacity <= 0.01 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
      {glow > 0.01 && <circle r={34} fill={`rgba(184,242,92,${0.28 * glow})`} />}
      <line x1={-22} y1={0} x2={22} y2={0} stroke="rgba(255,255,255,0.7)" strokeWidth={4} opacity={oxygen} />
      <circle cx={-23} r={10} fill={SKYBLUE} opacity={oxygen} />
      <circle cx={23} r={10} fill={SKYBLUE} opacity={oxygen} />
      <circle r={11.5} fill={PAPER} stroke={LIME} strokeWidth={glow > 0.01 ? 3 : 0} />
    </g>
  );

const AMBIENT = new Array(24).fill(0).map((_, i) => ({
  x: -120 + random(`ax-${i}`) * 1320,
  y: 430 + random(`ay-${i}`) * 720,
  ph: random(`ap-${i}`) * 6.28,
  dir: random(`ad-${i}`) > 0.5 ? 1 : -1,
}));

// Molecules that fly into the canopy during the "leaves" line, then send their carbon down the trunk.
const N_IN = 18;
const IN_T0 = LEAVES.start + 0.15;
const IN_T1 = T_SUGAR - 0.2;
const INCOMING = new Array(N_IN).fill(0).map((_, i) => {
  const a = (-205 + (230 * ((i * 7) % N_IN)) / (N_IN - 1)) * (Math.PI / 180);
  const b = BLOBS[(i * 5) % BLOBS.length];
  return {
    t0: IN_T0 + (i * (IN_T1 - IN_T0)) / N_IN,
    from: { x: CANOPY.x + 620 * Math.cos(a), y: CANOPY.y + 560 * Math.sin(a) },
    leaf: { x: BASE.x + b.x * 0.8, y: BASE.y + b.y + 10 },
    slot: { x: BASE.x + (i % 2 === 0 ? -11 : 11), y: BASE.y - 40 - Math.floor(i / 2) * 30 },
  };
});
// Extra carbon revealed on the "half of dry wood is carbon" line.
const EXTRA = [
  ...new Array(6).fill(0).map((_, i) => ({ x: BASE.x + (i % 2 === 0 ? -11 : 11), y: BASE.y - 310 - Math.floor(i / 2) * 30 })),
  ...BLOBS.slice(0, 14).map((b) => ({ x: BASE.x + b.x * 0.85, y: BASE.y + b.y })),
];

const FOREST = [
  { x: 40, g: 0.5, d: 0.0 },
  { x: 245, g: 0.66, d: 0.12 },
  { x: 845, g: 0.62, d: 0.06 },
  { x: 1050, g: 0.48, d: 0.18 },
  { x: -150, g: 0.6, d: 0.24 },
  { x: 1230, g: 0.58, d: 0.3 },
];

const Hud: React.FC<{ top: number; opacity: number; y?: number; children: React.ReactNode }> = ({ top, opacity, y = 0, children }) =>
  opacity <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        top,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        opacity,
        transform: `translateY(${y}px)`,
        textShadow: "0 4px 24px rgba(0,0,0,0.85)",
      }}
    >
      {children}
    </div>
  );

export const TreeFromAir: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 14, stiffness = 170) =>
    Math.min(1.15, spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } }));
  const win = (a: number, b: number, fade = 0.3) => interpolate(t, [a, a + fade, b - fade, b], [0, 1, 1, 0], clamp);

  // ---------- Tree growth: full grown in the hook, rewinds to a shoot, grows for five years ----------
  const growT0 = T_GREW;
  const growT1 = WEIGH.start + 0.2;
  const g =
    t < POT.start
      ? 1
      : t < growT0
        ? interpolate(t, [POT.start, growT0 - 0.05], [1, 0.2], { ...clamp, easing: ease })
        : interpolate(t, [growT0, growT1], [0.2, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const year = Math.max(1, Math.min(5, Math.ceil(((g - 0.2) / 0.8) * 5)));
  const gained = Math.round(74 * interpolate(t, [T_GAIN, T_GAIN + 1.1], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const sway = Math.sin(t * 1.3) * 1.2;

  // ---------- Camera ----------
  const zQ = interpolate(t, [QUESTION.start - 0.3, QUESTION.start + 0.6, LEAVES.start - 0.3, LEAVES.start + 0.5], [0, 1, 1, 0], {
    ...clamp,
    easing: ease,
  });
  const zL = interpolate(t, [LEAVES.start - 0.2, LEAVES.start + 0.8, CARBON.start - 0.2, CARBON.start + 0.8], [0, 1, 1, 0], {
    ...clamp,
    easing: ease,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const zS = interpolate(t, [T_SOIL - 0.3, T_SOIL + 0.5, QUESTION.start - 0.3, QUESTION.start + 0.3], [0, 1, 1, 0], { ...clamp, easing: ease });
  const zP = interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start + 1.6], [0, 1], { ...clamp, easing: ease });
  const scale = 1 + 0.45 * zQ + 0.3 * zL - 0.2 * zP + 0.015 * Math.sin(t * 0.5);
  const focusX = 540;
  const focusY = 820 + 130 * zQ - 120 * zL;
  const anchorY = 860 + 40 * zQ - 20 * zL + 30 * zP;
  const hitShake = t >= T_SKY ? 16 * Math.exp(-(t - T_SKY) * 6) : 0;
  const camera = `translate(${540 - focusX * scale + Math.sin(frame * 2.3) * hitShake}px, ${
    anchorY - focusY * scale + Math.cos(frame * 1.9) * hitShake
  }px) scale(${scale})`;

  // ---------- Air ----------
  const airGlow = interpolate(t, [T_AIR - 0.05, T_AIR + 0.25, T_NOT + 0.4, T_NOT + 1.2], [0, 1, 1, 0], clamp);
  const skyFlare = t >= T_SKY ? Math.exp(-(t - T_SKY) * 1.6) : 0;
  const ambientOpacity = 0.3 + 0.6 * Math.max(airGlow, skyFlare) + 0.25 * zL;

  // ---------- Labels / HUD ----------
  const titleOut = interpolate(t, [POT.start - 0.35, POT.start], [0, 1], clamp);
  const notSoil = win(T_NOT, POT.start, 0.2);
  const soilTag = sp(T_SOIL) * interpolate(t, [QUESTION.start - 0.2, QUESTION.start + 0.2], [1, 0], clamp);
  const yearHud = win(POT.start + 0.1, T_GAIN - 0.05, 0.2);
  const gainHud = win(T_GAIN - 0.05, QUESTION.start + 0.1, 0.2);
  const qMark = sp(QUESTION.start + 0.5, 9, 160) * interpolate(t, [LEAVES.start - 0.3, LEAVES.start], [1, 0], clamp);
  const eqHud = interpolate(t, [LEAVES.start, LEAVES.start + 0.3, CARBON.start - 0.3, CARBON.start], [0, 1, 1, 0], clamp);
  const sun = interpolate(t, [T_SUN - 0.2, T_SUN + 0.4, CARBON.start - 0.2, CARBON.start + 0.4], [0, 1, 1, 0], clamp);
  const barHud = interpolate(t, [CARBON.start, CARBON.start + 0.3, PAYOFF.start - 0.4, PAYOFF.start - 0.1], [0, 1, 1, 0], clamp);
  const barFill = interpolate(t, [T_HALF, T_HALF + 0.9], [0, 0.5], { ...clamp, easing: ease });
  const endA = sp(PAYOFF.start);
  const endB = sp(T_SOLID, 11);
  const woodGlow = Math.max(zQ, interpolate(t, [T_WOOD, T_WOOD + 0.3, T_WOOD + 1.2], [0, 1, 0], clamp));

  const term = (at: number) => ({ opacity: Math.min(1, sp(at)), display: "inline-block", transform: `translateY(${18 * (1 - Math.min(1, sp(at)))}px)` });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #0a2b38 0%, #0f4446 48%, #17583f 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("tree-from-air/narration.wav")} />
      <Audio src={staticFile("tree-from-air/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        {/* Sunlight */}
        <div
          style={{
            position: "absolute",
            left: 300 - 700,
            top: 400 - 700,
            width: 1400,
            height: 1400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,250,210,0.95) 0px, rgba(255,240,170,0.9) 52px, rgba(255,236,150,0.32) 64px, rgba(255,236,150,0.12) 300px, rgba(255,236,150,0) 700px)",
            opacity: sun,
          }}
        />
        {/* Glow of the sky at the climax */}
        <div
          style={{
            position: "absolute",
            left: CANOPY.x - 900,
            top: CANOPY.y - 900,
            width: 1800,
            height: 1800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(184,242,92,0.5) 0%, rgba(184,242,92,0.14) 40%, rgba(184,242,92,0) 70%)",
            opacity: skyFlare,
          }}
        />
        {/* Ground */}
        <div style={{ position: "absolute", left: -3000, top: GROUND_Y, width: 7080, height: 3000, background: "linear-gradient(180deg, #0b241b 0%, #061510 300px)" }} />
        <div style={{ position: "absolute", left: -3000, top: GROUND_Y, width: 7080, height: 5, background: "rgba(184,242,92,0.35)" }} />

        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* Sunlight falling on the leaves */}
          {sun > 0.01 && (
            <polygon
              points={`300,400 ${CANOPY.x - 250},${CANOPY.y + 170} ${CANOPY.x + 150},${CANOPY.y - 240}`}
              fill="rgba(255,240,170,0.2)"
              opacity={sun * (0.8 + 0.2 * Math.sin(t * 5))}
            />
          )}

          {/* Air: carbon dioxide drifting everywhere */}
          {AMBIENT.map((m, i) => (
            <Molecule
              key={i}
              x={m.x + Math.sin(t * 0.35 + m.ph) * 46}
              y={m.y + Math.cos(t * 0.28 + m.ph) * 30}
              rot={m.ph * 57 + t * 22 * m.dir}
              opacity={Math.min(1, ambientOpacity)}
              glow={Math.max(airGlow, skyFlare)}
              s={0.85}
            />
          ))}

          {/* Forest (payoff) */}
          {FOREST.map((f, i) => {
            const k = spring({ frame: frame - Math.round((PAYOFF.start + f.d) * fps), fps, config: { damping: 13, stiffness: 90 } });
            return k <= 0.01 ? null : <Tree key={i} x={f.x} y={GROUND_Y} g={f.g * k} sway={-sway * (i % 2 ? 1 : -1)} dim={1} />;
          })}

          {/* Scale + pot */}
          <rect x={372} y={1318} width={336} height={38} rx={8} fill="#4d5c63" />
          <rect x={330} y={1290} width={420} height={28} rx={10} fill="#cfd8dc" />
          <polygon points="398,1130 682,1130 646,1290 434,1290" fill="#b5653a" />
          <rect x={380} y={1106} width={320} height={32} rx={8} fill="#cc7a4b" />
          <ellipse cx={540} cy={1112} rx={140} ry={11} fill="#3b2416" stroke={notSoil > 0.01 || soilTag > 0.01 ? LIME : "none"} strokeWidth={4} />

          {/* The tree */}
          <Tree x={BASE.x} y={BASE.y - 22} g={g} sway={sway} />
          {/* Wood highlight */}
          <path
            d="M -40 0 C -30 -120 -24 -260 -20 -390 L 20 -390 C 24 -260 30 -120 40 0 Z"
            transform={`translate(${BASE.x} ${BASE.y - 22}) scale(${g})`}
            fill="none"
            stroke={LIME}
            strokeWidth={7}
            opacity={woodGlow * (0.6 + 0.4 * Math.sin(t * 9))}
          />

          {/* Carbon dioxide flying into the leaves; the carbon stays and moves into the trunk */}
          {INCOMING.map((m, i) => {
            if (t < m.t0) return null;
            const fly = interpolate(t, [m.t0, m.t0 + 0.9], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
            const sink = interpolate(t, [m.t0 + 1.0, m.t0 + 2.1], [0, 1], { ...clamp, easing: ease });
            const viaX = BASE.x;
            const viaY = BASE.y - 400;
            let x = m.from.x + (m.leaf.x - m.from.x) * fly;
            let y = m.from.y + (m.leaf.y - m.from.y) * fly;
            if (sink > 0) {
              const a = Math.min(1, sink * 2);
              const b = Math.max(0, sink * 2 - 1);
              x = m.leaf.x + (viaX - m.leaf.x) * a + (m.slot.x - viaX) * b;
              y = m.leaf.y + (viaY - m.leaf.y) * a + (m.slot.y - 22 - viaY) * b;
            }
            const pulse = 1 + 0.5 * skyFlare;
            return (
              <Molecule
                key={i}
                x={x}
                y={y}
                rot={(1 - fly) * 200 + i * 40}
                opacity={1}
                oxygen={interpolate(fly, [0.85, 1], [1, 0], clamp)}
                glow={fly >= 1 ? 1 : 0.5}
                s={(fly >= 1 ? 0.8 : 1) * pulse}
              />
            );
          })}
          {EXTRA.map((p, i) => {
            const k = Math.min(1, sp(CARBON.start + 0.1 + i * 0.05, 12, 200));
            return k <= 0.01 ? null : <Molecule key={i} x={p.x} y={p.y - 22} rot={0} opacity={k} oxygen={0} glow={1} s={0.8 * k * (1 + 0.5 * skyFlare)} />;
          })}
        </svg>

        {/* World labels */}
        <div style={{ position: "absolute", left: 60, top: 1150, width: 300, textAlign: "center", fontFamily: FONT, fontWeight: 700, color: "#ffffff", textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
          <div style={{ fontSize: 40, letterSpacing: 5, color: "#ff8f7a", opacity: notSoil }}>NOT SOIL</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 50,
            top: 1120,
            width: 320,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            opacity: Math.min(1, soilTag),
            transform: `scale(${0.8 + 0.2 * soilTag + 0.06 * zS * Math.sin(t * 8)})`,
            textShadow: "0 2px 14px rgba(0,0,0,0.9)",
          }}
        >
          <div style={{ fontSize: 36, letterSpacing: 5, color: "rgba(255,255,255,0.85)" }}>SOIL LOST</div>
          <div style={{ fontSize: 84, lineHeight: 1.05, color: "#ff8f7a" }}>60 G</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 640,
            top: 800,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 1,
            color: LIME,
            opacity: Math.min(1, qMark),
            transform: `scale(${0.6 + 0.4 * qMark}) rotate(${8 * Math.sin(t * 3)}deg)`,
            textShadow: "0 6px 30px rgba(0,0,0,0.8)",
          }}
        >
          ?
        </div>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,16,14,0) 1330px, rgba(4,16,14,0.78) 1450px, rgba(4,16,14,0.78) 1640px, rgba(4,16,14,0) 1760px)" }} />

      {/* Opening title: on screen from frame 0 */}
      <Hud top={185} opacity={1 - titleOut} y={-40 * titleOut}>
        <div style={{ fontSize: 84, lineHeight: 1.06, letterSpacing: -2, color: "#ffffff" }}>
          WHAT IS A TREE
          <br />
          <span style={{ color: LIME }}>MADE OF?</span>
        </div>
      </Hud>

      {/* Five years in a pot */}
      <Hud top={170} opacity={yearHud}>
        <div style={{ fontWeight: 500, fontSize: 34, letterSpacing: 7, color: "rgba(255,255,255,0.8)" }}>1600s · A WILLOW IN A POT</div>
        <div style={{ fontSize: 150, lineHeight: 1.1, letterSpacing: -3, color: LIME, fontVariantNumeric: "tabular-nums" }}>YEAR {year}</div>
      </Hud>
      <Hud top={170} opacity={gainHud}>
        <div style={{ fontWeight: 500, fontSize: 34, letterSpacing: 7, color: "rgba(255,255,255,0.8)" }}>THE TREE GAINED</div>
        <div style={{ fontSize: 170, lineHeight: 1.08, letterSpacing: -4, color: LIME, fontVariantNumeric: "tabular-nums" }}>+{gained} KG</div>
      </Hud>

      {/* The recipe */}
      <Hud top={165} opacity={eqHud}>
        <div style={{ fontSize: 50, letterSpacing: 1, color: "#ffffff", whiteSpace: "nowrap" }}>
          <span style={{ color: SKYBLUE }}>CO₂</span>
          <span style={term(T_SUN)}>&nbsp;+ <span style={{ color: "#ffe680" }}>SUNLIGHT</span></span>
        </div>
        <div style={{ fontSize: 64, letterSpacing: 1, color: "#ffffff", whiteSpace: "nowrap", marginTop: 4 }}>
          <span style={term(T_SUGAR)}>→ SUGAR&nbsp;</span>
          <span style={term(T_WOOD)}>
            → <span style={{ color: LIME }}>WOOD</span>
          </span>
        </div>
      </Hud>

      {/* Half of dry wood is carbon */}
      <Hud top={175} opacity={barHud}>
        <div style={{ fontWeight: 500, fontSize: 36, letterSpacing: 8, color: "rgba(255,255,255,0.85)" }}>DRY WOOD</div>
        <div style={{ position: "relative", margin: "18px auto 0", width: 800, height: 96, borderRadius: 20, background: "rgba(138,90,51,0.9)", border: "4px solid rgba(255,255,255,0.75)", overflow: "hidden", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barFill * 100}%`, background: LIME }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 400, lineHeight: "88px", fontSize: 46, letterSpacing: 2, color: "#0b241b", opacity: interpolate(barFill, [0.35, 0.5], [0, 1], clamp), textShadow: "none" }}>
            50% CARBON
          </div>
        </div>
        <div style={{ fontSize: 46, letterSpacing: 6, marginTop: 20, color: LIME, opacity: Math.min(1, sp(T_SKY - 0.5)) }}>FROM THE AIR ↑</div>
      </Hud>

      {/* Payoff */}
      <Hud top={180} opacity={1}>
        <div style={{ fontSize: 50, letterSpacing: 7, color: LIME, opacity: Math.min(1, endA), transform: `translateY(${22 * (1 - Math.min(1, endA))}px)` }}>A FOREST IS</div>
        <div style={{ fontSize: 108, lineHeight: 1.04, letterSpacing: -2, color: "#ffffff", opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})` }}>
          AIR, TURNED
          <br />
          SOLID
        </div>
      </Hud>

      <Captions lines={timeline.lines} top={1440} accent={LIME} />
    </AbsoluteFill>
  );
};
