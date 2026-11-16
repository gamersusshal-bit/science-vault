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
import { useTimeline } from "../../primitives/timeline";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/sunflower-spirals/timeline.json";

const { timeline, line, wordStart } = useTimeline(timelineJson);

// ---------- Story beats ----------
const T_COUNT = wordStart("hook", "count");
const T_FIB = wordStart("hook", "Fibonacci");
const SPIRALS = line("spirals");
const T_OFTEN = wordStart("spirals", "often");
const T_AND = wordStart("spirals", "and");
const FIB = line("fib");
const T_EACH_ONE = wordStart("fib", "each");
const T_SUM = wordStart("fib", "sum");
const RULE = line("rule");
const T_EACH = wordStart("rule", "each");
const T_FROM = wordStart("rule", "from");
const NUDGE = line("nudge");
const T_GAPS = wordStart("nudge", "gaps");
const GOLDEN = line("golden");
const T_PACK = wordStart("golden", "pack");
const T_APPEAR = wordStart("golden", "spirals");
const PAYOFF = line("payoff");
const T_JUST = wordStart("payoff", "just");

// ---------- World (1080 x 1920) ----------
const CX = 540;
const CY = 900;
const N = 610;
const HEAD_R = 420;
const C = HEAD_R / Math.sqrt(N); // Vogel's model: radius = C * sqrt(n)
const SEED_R = 10.2;
const GOLDEN_ANGLE = 137.508;
const OFF_ANGLE = 137.3;
const SLOW_SEEDS = 9;

const CORAL = "#ff8a5c";
const TEAL = "#3fe0c5";
const PETAL = "#ffd23f";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const seedPos = (n: number, alpha: number) => {
  const a = (n * alpha * Math.PI) / 180;
  const r = C * Math.sqrt(n);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), r };
};

/** The m spirals you get by joining every m-th seed (m = 34 or 55). */
const family = (m: number, from: number) =>
  new Array(m).fill(0).map((_, j) => {
    const pts: string[] = [];
    for (let n = from + j; n <= N; n += m) {
      const p = seedPos(n, GOLDEN_ANGLE);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(" ");
  });
const FAMILY_34 = family(34, 50);
const FAMILY_55 = family(55, 110);
const FIB_ROW = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

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
        textShadow: "0 4px 24px rgba(0,0,0,0.9)",
      }}
    >
      {children}
    </div>
  );

export const SunflowerSpirals: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 14, stiffness = 170) =>
    Math.min(1.15, spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } }));
  const win = (a: number, b: number, fade = 0.25) => interpolate(t, [a, a + fade, b - fade, b], [0, 1, 1, 0], clamp);

  // ---------- The one parameter: the angle between successive seeds ----------
  const alpha =
    t < T_PACK - 0.2
      ? interpolate(t, [NUDGE.start + 0.15, T_GAPS + 0.2], [GOLDEN_ANGLE, OFF_ANGLE], { ...clamp, easing: ease })
      : interpolate(t, [T_PACK - 0.2, T_PACK + 0.45], [OFF_ANGLE, GOLDEN_ANGLE], { ...clamp, easing: Easing.out(Easing.cubic) });
  const offness = Math.abs(alpha - GOLDEN_ANGLE) / (GOLDEN_ANGLE - OFF_ANGLE);

  // ---------- How many seeds exist ----------
  const step = (T_FROM - T_EACH) / SLOW_SEEDS;
  let count = N;
  if (t >= T_EACH - 0.05 && t < T_FROM) count = Math.min(SLOW_SEEDS, 1 + Math.floor((t - T_EACH) / step));
  else if (t >= T_FROM && t < NUDGE.start) {
    const p = interpolate(t, [T_FROM, NUDGE.start - 0.15], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    count = Math.round(SLOW_SEEDS * Math.pow(N / SLOW_SEEDS, p));
  }
  const clearing = interpolate(t, [RULE.start, RULE.start + 0.6], [1, 0], clamp); // old head empties
  const seedScale = t < T_EACH - 0.05 ? clearing : 1;
  const slow = t >= T_EACH - 0.05 && t < T_FROM + 0.35;

  // ---------- Camera ----------
  const zR = interpolate(t, [RULE.start + 0.1, RULE.start + 0.9, T_FROM, NUDGE.start - 0.1], [0, 1, 1, 0], { ...clamp, easing: ease });
  const scale = 1 + 3.2 * zR + 0.012 * Math.sin(t * 0.6);
  const shakeAmp = (t >= T_PACK ? 14 * Math.exp(-(t - T_PACK) * 6) : 0) + (t >= T_COUNT ? 8 * Math.exp(-(t - T_COUNT) * 7) : 0);
  const camera = `translate(${CX - CX * scale + Math.sin(frame * 2.3) * shakeAmp}px, ${CY - CY * scale + Math.cos(frame * 1.9) * shakeAmp}px) scale(${scale})`;
  const spin = t * 1.5; // slow turn of the whole head, degrees

  // ---------- Spirals ----------
  const show34 = interpolate(t, [T_OFTEN, T_AND - 0.1], [0, 34], clamp);
  const show55 = interpolate(t, [T_AND, SPIRALS.end + 0.15], [0, 55], clamp);
  const firstPass = interpolate(t, [FIB.start, FIB.start + 0.5, RULE.start - 0.1, RULE.start + 0.3], [1, 0.45, 0.45, 0], clamp);
  const secondPass = interpolate(t, [T_APPEAR - 0.1, T_APPEAR + 0.9], [0, 1], clamp);
  const hint = interpolate(t, [T_FIB, T_FIB + 0.3, SPIRALS.start - 0.2, SPIRALS.start], [0, 0.55, 0.55, 0], clamp);
  const ripple = (r: number, at: number) => (t < at ? 0 : Math.exp(-Math.pow((r - (t - at) * 640) / 55, 2)));
  const packFlash = t >= T_PACK ? Math.exp(-(t - T_PACK) * 3.2) : 0;

  // ---------- HUD ----------
  const titleOut = interpolate(t, [SPIRALS.start - 0.3, SPIRALS.start], [0, 1], clamp);
  const countHud = win(SPIRALS.start, FIB.start + 0.1);
  const fibHud = win(FIB.start + 0.1, RULE.start + 0.1);
  const ruleHud = win(RULE.start + 0.1, T_EACH + 0.1);
  const angleHud = win(T_EACH, PAYOFF.start - 0.1);
  const endA = sp(PAYOFF.start);
  const endB = sp(T_JUST, 11);
  const angleColor = offness > 0.15 ? "#ff6b6b" : t >= T_PACK ? TEAL : PETAL;
  const angleLabel = t < NUDGE.start ? "EACH NEW SEED TURNS" : t < T_GAPS ? "NUDGE THE ANGLE" : t < T_PACK - 0.2 ? "GAPS OPEN UP" : "THE GOLDEN ANGLE";

  const seeds: React.ReactNode[] = [];
  for (let n = 1; n <= count; n++) {
    const p = seedPos(n, alpha);
    const born = slow ? Math.min(1.25, spring({ frame: frame - Math.round((T_EACH + (n - 1) * step) * fps), fps, config: { damping: 9, stiffness: 220 } })) : 1;
    const newest = slow && n === count;
    const k = seedScale * born * (1 + 0.7 * Math.max(ripple(p.r, T_COUNT), ripple(p.r, T_FIB)) + 0.35 * packFlash);
    if (k <= 0.02) continue;
    seeds.push(
      <circle
        key={n}
        cx={p.x}
        cy={p.y}
        r={SEED_R * k}
        fill={newest ? CORAL : offness > 0.15 ? "#d9a05a" : "#f0c36d"}
        stroke={newest ? "#ffffff" : "#6b3d14"}
        strokeWidth={newest ? 1.5 : 2}
      />,
    );
  }
  const prev = seedPos(Math.max(1, count - 1), alpha);
  const last = seedPos(count, alpha);
  const wedge = slow && count >= 2 ? interpolate(t, [T_FROM, T_FROM + 0.35], [1, 0], clamp) : 0;
  const arcPoint = (n: number, r: number) => {
    const a = (n * alpha * Math.PI) / 180;
    return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
  };

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, #46223a 0%, #24101f 55%, #120812 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("sunflower-spirals/narration.wav")} />
      <Audio src={staticFile("sunflower-spirals/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <radialGradient id="head" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5a3416" />
              <stop offset="70%" stopColor="#3a200c" />
              <stop offset="100%" stopColor="#241206" />
            </radialGradient>
          </defs>
          <g transform={`rotate(${spin} ${CX} ${CY})`}>
            {/* Petals */}
            {new Array(42).fill(0).map((_, i) => {
              const back = i % 2 === 1;
              const wob = 1 + 0.035 * Math.sin(t * 1.7 + i);
              return (
                <ellipse
                  key={i}
                  cx={CX}
                  cy={CY - HEAD_R - (back ? 24 : 30) * wob}
                  rx={back ? 30 : 27}
                  ry={(back ? 44 : 50) * wob}
                  fill={back ? "#f0a202" : PETAL}
                  stroke="rgba(120,70,0,0.35)"
                  strokeWidth={2}
                  transform={`rotate(${(i * 360) / 42} ${CX} ${CY})`}
                />
              );
            })}
            <circle cx={CX} cy={CY} r={HEAD_R + 14} fill="url(#head)" stroke="#8a5a1c" strokeWidth={4} />
            {packFlash > 0.01 && (
              <circle cx={CX} cy={CY} r={HEAD_R * (1.02 - 0.5 * packFlash)} fill="none" stroke={TEAL} strokeWidth={10 * packFlash} opacity={packFlash} />
            )}

            {/* Angle between the two newest seeds */}
            {wedge > 0.01 && (
              <g opacity={wedge}>
                <line x1={CX} y1={CY} x2={prev.x} y2={prev.y} stroke="rgba(255,255,255,0.75)" strokeWidth={1.4} />
                <line x1={CX} y1={CY} x2={last.x} y2={last.y} stroke={CORAL} strokeWidth={1.8} />
                <path
                  d={`M ${arcPoint(count - 1, 15)} A 15 15 0 0 1 ${arcPoint(count, 15)}`}
                  fill="none"
                  stroke={PETAL}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
                <circle cx={CX} cy={CY} r={2.4} fill="#ffffff" />
              </g>
            )}

            {/* The growing point at the centre */}
            {zR > 0.01 && (
              <circle cx={CX} cy={CY} r={5 + 14 * ((t * 1.1) % 1)} fill="none" stroke={PETAL} strokeWidth={1.2} opacity={zR * (1 - ((t * 1.1) % 1))} />
            )}
            {seeds}

            {/* The two spiral families */}
            {FAMILY_34.map((pts, j) => {
              const o = Math.max(hint * (j % 3 === 0 ? 1 : 0), firstPass * interpolate(show34, [j, j + 1], [0, 1], clamp), secondPass);
              return o <= 0.01 ? null : <polyline key={`a${j}`} points={pts} fill="none" stroke={CORAL} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9 * o} />;
            })}
            {FAMILY_55.map((pts, j) => {
              const o = Math.max(firstPass * interpolate(show55, [j, j + 1], [0, 1], clamp), secondPass * 0.85);
              return o <= 0.01 ? null : <polyline key={`b${j}`} points={pts} fill="none" stroke={TEAL} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.85 * o} />;
            })}
          </g>
        </svg>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 47%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(14,6,14,0.72) 0px, rgba(14,6,14,0.72) 330px, rgba(14,6,14,0) 470px, rgba(14,6,14,0) 1340px, rgba(14,6,14,0.8) 1440px, rgba(14,6,14,0.8) 1640px, rgba(14,6,14,0) 1760px)" }} />

      {/* Opening title: on screen from frame 0 */}
      <Hud top={150} opacity={1 - titleOut} y={-40 * titleOut}>
        <div style={{ fontSize: 86, lineHeight: 1.06, letterSpacing: -2, color: "#ffffff" }}>
          CAN A FLOWER
          <br />
          <span style={{ color: PETAL }}>COUNT?</span>
        </div>
      </Hud>

      {/* Counting the spirals */}
      <Hud top={150} opacity={countHud}>
        <div style={{ display: "flex", justifyContent: "center", gap: 110, fontVariantNumeric: "tabular-nums" }}>
          <div style={{ width: 300 }}>
            <div style={{ fontSize: 150, lineHeight: 1, letterSpacing: -3, color: CORAL }}>{Math.floor(show34)}</div>
            <div style={{ fontSize: 34, letterSpacing: 6, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>ONE WAY</div>
          </div>
          <div style={{ width: 300, opacity: interpolate(t, [T_AND - 0.1, T_AND + 0.2], [0.15, 1], clamp) }}>
            <div style={{ fontSize: 150, lineHeight: 1, letterSpacing: -3, color: TEAL }}>{Math.floor(show55)}</div>
            <div style={{ fontSize: 34, letterSpacing: 6, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>THE OTHER</div>
          </div>
        </div>
      </Hud>

      {/* Fibonacci numbers */}
      <Hud top={150} opacity={fibHud}>
        <div style={{ display: "flex", justifyContent: "center", gap: 26, fontSize: 54, fontVariantNumeric: "tabular-nums" }}>
          {FIB_ROW.map((v, i) => {
            const k = Math.min(1, sp(FIB.start + 0.15 + i * 0.1, 12, 220));
            return (
              <span key={i} style={{ color: v === 34 ? CORAL : v === 55 ? TEAL : "#ffffff", opacity: k, transform: `translateY(${16 * (1 - k)}px)`, display: "inline-block" }}>
                {v}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: 104, lineHeight: 1.15, letterSpacing: -1, marginTop: 14, color: "#ffffff", opacity: Math.min(1, sp(T_EACH_ONE)), fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: PETAL }}>21</span> + <span style={{ color: CORAL }}>34</span>
          <span style={{ opacity: Math.min(1, sp(T_SUM)) }}>
            {" "}
            = <span style={{ color: TEAL }}>55</span>
          </span>
        </div>
      </Hud>

      {/* One rule */}
      <Hud top={190} opacity={ruleHud}>
        <div style={{ fontSize: 120, letterSpacing: -2, color: "#ffffff", transform: `scale(${0.85 + 0.15 * sp(RULE.start + 0.1)})` }}>
          ONE <span style={{ color: PETAL }}>RULE</span>
        </div>
      </Hud>

      {/* The angle */}
      <Hud top={150} opacity={angleHud}>
        <div style={{ fontWeight: 500, fontSize: 36, letterSpacing: 7, color: "rgba(255,255,255,0.88)" }}>{angleLabel}</div>
        <div
          style={{
            fontSize: 160,
            lineHeight: 1.08,
            letterSpacing: -4,
            color: angleColor,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${1 + 0.12 * packFlash})`,
          }}
        >
          {alpha.toFixed(1)}°
        </div>
      </Hud>

      {/* Payoff */}
      <Hud top={160} opacity={1}>
        <div style={{ fontSize: 50, letterSpacing: 7, color: TEAL, opacity: Math.min(1, endA), transform: `translateY(${22 * (1 - Math.min(1, endA))}px)` }}>NO COUNTING</div>
        <div style={{ fontSize: 100, lineHeight: 1.1, letterSpacing: -2, color: "#ffffff", opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})` }}>
          JUST ONE <span style={{ color: PETAL }}>ANGLE</span>
        </div>
      </Hud>

      <Captions lines={timeline.lines} top={1440} accent={CORAL} />
    </AbsoluteFill>
  );
};
