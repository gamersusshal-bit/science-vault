import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/coconut-water/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, s: string) => line(id).words.find((w) => w.text.toLowerCase().startsWith(s))!.start;

// ---------- Beats ----------
const T_SEALED = wordStart("hook", "sealed");
const T_HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_HALFW = wordStart("meter", "half");
const T_CRACK = wordStart("young", "crack");
const T_JELLY = wordStart("young", "thin");
const T_SEED = line("seed").start;
const T_POURED = wordStart("seed", "poured");
const T_SOUP = wordStart("seed", "soup");
const T_WALLS = wordStart("seed", "walls");
const T_RE = line("rehook").start;
const T_MADE = wordStart("rehook", "made");
const T_CL = line("climax").start;
const T_EDGE = wordStart("climax", "edge");
const T_WHITE = wordStart("climax", "white");
const T_PAY = line("payoff").start;
const T_ITIS = wordStart("payoff", "it");

// ---------- Palette: night jungle, husk green, mint water, cream meat ----------
const MINT = "#7ee0c3";
const WATER = "#9fe6ff";
const CREAM = "#fff7e6";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.4) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const win = (t: number, a: number, b: number, f = 0.3) => interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);

// ---------- Geometry ----------
const CX = 560;
const CY = 940;
const HUSK_RX = 340;
const HUSK_RY = 360;
const SHELL_R = 245;
const SHELL_W = 24;
const INNER_R = SHELL_R - SHELL_W;

// ---------- Growth model (Tetra Pak Coconut Handbook Table 3.1; Yong et al. 2009) ----------
const monthAt = (t: number) =>
  interpolate(
    t,
    [0, T_METER, T_CRACK, T_RE, T_CL, T_WHITE, 99],
    [4, 5, 5.5, 6, 9, 12, 12],
    { ...clamp, easing: Easing.inOut(Easing.quad) },
  );
const mlAt = (m: number) => interpolate(m, [3, 5, 6, 8.5, 12], [180, 684, 684, 518, 332], clamp);
const meatAt = (m: number) => interpolate(m, [3, 5.5, 6, 9, 12], [0, 8, 10, 32, 62], clamp);
const fillAt = (m: number) => interpolate(m, [4, 8, 12], [0.95, 0.97, 0.88], clamp);

const LEAVES = [
  { x: -60, y: 260, r: -28, s: 1.3 },
  { x: 1140, y: 380, r: 200, s: 1.1 },
  { x: -80, y: 1600, r: 18, s: 1.2 },
  { x: 1160, y: 1500, r: 160, s: 1.3 },
];

// Deterministic nuclei for the close-up
const NUCLEI = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 43758.5453;
  const b = Math.sin(i * 47.3) * 24634.6345;
  const u = a - Math.floor(a), v = b - Math.floor(b);
  const r = Math.sqrt(u) * (INNER_R - 30);
  return { r, th: v * Math.PI * 2, ph: i * 1.37, sp: 0.4 + (i % 5) * 0.12 };
});

const Leaf: React.FC<{ x: number; y: number; r: number; s: number; t: number }> = ({ x, y, r, s, t }) => (
  <g transform={`translate(${x} ${y}) rotate(${r + 3 * Math.sin(t * 0.9 + x)}) scale(${s})`} opacity={0.55}>
    <path d="M 0 0 Q 220 -40 420 10" stroke="#3d6b45" strokeWidth={8} fill="none" />
    {Array.from({ length: 11 }, (_, i) => {
      const px = 30 + i * 36;
      const py = -0.0002 * (px - 210) * (px - 210) + 2;
      return (
        <path key={i} d={`M ${px} ${py} q 20 ${-70 + i * 3} ${60} ${-120 + i * 6} q -10 ${50} -60 ${120 - i * 6} Z`} fill="#2c5536" />
      );
    })}
    {Array.from({ length: 11 }, (_, i) => {
      const px = 30 + i * 36;
      return <path key={`b${i}`} d={`M ${px} 0 q 20 ${70 - i * 3} ${60} ${120 - i * 6} q -10 -50 -60 ${-120 + i * 6} Z`} fill="#24482d" />;
    })}
  </g>
);

export const CoconutWater: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const month = monthAt(t);
  const ml = mlAt(month);
  const meat = meatAt(month);
  const cavR = INNER_R - meat;
  const fill = fillAt(month);

  // ---------- Entrance: the nut drops in and lands ----------
  const land = spring({ frame, fps, config: { damping: 9, stiffness: 120, mass: 0.8 } });
  const dropY = interpolate(land, [0, 1], [-900, 0]);
  const squash = 1 + 0.06 * Math.sin(Math.min(1, land) * Math.PI) * (land < 1 ? 1 : 0);
  const sealPulse = spring({ frame: frame - Math.round(T_SEALED * fps), fps, config: { damping: 10, stiffness: 140 } });
  const sealOn = win(t, T_SEALED - 0.1, T_METER + 0.4, 0.3);

  // ---------- Views ----------
  const xray = ramp(t, T_METER + 0.1, 0.6) * (1 - ramp(t, T_CRACK, 0.15)); // husk see-through
  const cut = ramp(t, T_CRACK + 0.05, 0.35); // 0 = whole nut, 1 = cross-section
  const crackFlash = interpolate(t, [T_CRACK - 0.02, T_CRACK + 0.06, T_CRACK + 0.5], [0, 1, 0], clamp);
  const crackDraw = interpolate(t, [T_CRACK - 0.05, T_CRACK + 0.12], [0, 1], clamp);
  const growS = interpolate(month, [3, 5.5], [0.9, 1], clamp);

  // Camera: dive into the liquid while nuclei are explained
  const zoom = ramp(t, T_SEED + 0.6, 0.9) * (1 - ramp(t, T_RE + 0.2, 0.9));
  const push = ramp(t, T_PAY - 0.2, 3.5);
  const crackPush = ramp(t, T_CRACK + 0.3, 3.8) * (1 - zoom);
  const breathe = 0.035 * Math.sin(t * 0.9);
  const camS = 1 + 1.5 * zoom + 0.14 * push + 0.12 * crackPush + breathe;
  const focusX = CX - 30 + 120 * Math.sin(Math.max(0, t - T_SEED) * 0.6) * zoom, focusY = CY + 30 + 60 * Math.sin(Math.max(0, t - T_SEED) * 0.45) * zoom;
  const rock = win(t, T_METER - 0.2, T_CRACK, 0.4);
  const sway = 6 * Math.sin(t * 0.8) + 40 * push + 30 * rock * Math.sin((t - T_METER) * 2.4);
  const anchorX = focusX + (540 - focusX) * zoom, anchorY = focusY + (900 - focusY) * zoom;
  const camera = `translate(${anchorX - focusX * camS}px, ${anchorY - focusY * camS + dropY + 18 * Math.sin(t * 0.7)}px) scale(${camS})`;

  // Nuclei: free, dividing, no walls (visible inside the liquid)
  const nucleiOn = ramp(t, T_CRACK + 0.4, 0.5) * (1 - ramp(t, T_WHITE - 0.3, 0.5));
  const wallsCross = win(t, T_WALLS - 0.2, T_RE + 0.4, 0.25);

  // Meat cells forming from the edge inward
  const cellsOn = ramp(t, T_CL - 0.3, 0.4);
  const cellFront = interpolate(t, [T_EDGE - 0.2, T_WHITE], [0, 1], clamp); // 0 = outer edge only, 1 = whole band
  const whiten = ramp(t, T_WHITE - 0.05, 0.3);
  const hitFlash = interpolate(t, [T_WHITE - 0.05, T_WHITE + 0.05, T_WHITE + 0.6], [0, 1, 0], clamp);
  const madeArrows = win(t, T_MADE - 0.2, T_CL + 0.5, 0.3);

  // Water surface (cross-section): full until month 8, then an air gap opens on top
  const crackPushW = interpolate(t, [T_CRACK, T_CRACK + 0.3, T_CRACK + 2.5], [0, 1, 0.2], clamp);
  const waterTop = CY - cavR + 2 * cavR * (1 - fill);
  const wave = (x: number) => (8 + 6 * crackPushW + 9 * push + 14 * rock) * Math.sin(x / 38 + t * (3.2 + 1.5 * push));

  // HUD
  const meterIn = ramp(t, T_METER - 0.1, 0.45);
  const previewOn = win(t, T_HALFW - 0.6, T_CRACK - 0.1, 0.25);
  const previewFrac = interpolate((t - T_HALFW + 0.6) % 1.6, [0, 1.1, 1.6], [1, 0.5, 0.5], { ...clamp, easing: ease });
  const halfReached = month > 9 && ml <= 342;
  const halfStamp = spring({ frame: frame - Math.round(T_WHITE * fps), fps, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const titleOut = ramp(t, T_HOOK_END - 0.25, 0.35);
    const barFill = ml / 684;

  // Layer helper for the cross-section ring of cells
  const rows = 4;
  const cells: React.ReactNode[] = [];
  if (cellsOn > 0 && meat > 6) {
    for (let r = 0; r < rows; r++) {
      const frac = (r + 0.5) / rows;
      const vis = interpolate(cellFront, [r / rows, (r + 1) / rows], [0, 1], clamp);
      if (vis <= 0) continue;
      const rr = INNER_R - meat * frac;
      const size = meat / rows;
      const n = Math.max(12, Math.floor((2 * Math.PI * rr) / Math.max(10, size * 1.1)));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r * 0.3;
        cells.push(
          <circle key={`${r}-${k}`} cx={CX + rr * Math.cos(a)} cy={CY + rr * Math.sin(a)} r={(size * 0.48) * vis}
            fill="none" stroke={whiten > 0.5 ? "#e7d9bd" : "#bfeee0"} strokeWidth={1.6} opacity={0.9 * cellsOn} />,
        );
      }
    }
  }

  const jellyAlpha = 0.35 + 0.65 * whiten;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #2a4f37 0%, #12271b 55%, #08130d 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("coconut-water/narration.wav")} />
      <Audio src={staticFile("coconut-water/bed.wav")} volume={0.6} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {LEAVES.map((l, i) => <Leaf key={i} {...l} t={t} />)}
      </svg>

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <radialGradient id="huskG" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#b6dd6a" />
              <stop offset="45%" stopColor="#6fa83a" />
              <stop offset="100%" stopColor="#2f5a1c" />
            </radialGradient>
            <radialGradient id="fibreG" cx="50%" cy="50%" r="55%">
              <stop offset="55%" stopColor="#e9d5a8" />
              <stop offset="100%" stopColor="#c7a46b" />
            </radialGradient>
            <radialGradient id="waterG" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#e8fbff" stopOpacity={0.95} />
              <stop offset="60%" stopColor={WATER} stopOpacity={0.75} />
              <stop offset="100%" stopColor="#4fb4d8" stopOpacity={0.85} />
            </radialGradient>
            <clipPath id="cavClip"><circle cx={CX} cy={CY} r={cavR} /></clipPath>
          </defs>

          {/* Shadow */}
          <ellipse cx={CX} cy={CY + HUSK_RY + 40} rx={HUSK_RX * 0.8} ry={34} fill="rgba(0,0,0,0.35)" />

          <g transform={`rotate(${sway * 0.25} ${CX} ${CY}) translate(${CX} ${CY}) scale(${growS / squash} ${growS * squash}) translate(${-CX} ${-CY})`}>
            {/* Husk: green skin outside, fibre inside once cut */}
            <ellipse cx={CX} cy={CY} rx={HUSK_RX} ry={HUSK_RY} fill="url(#huskG)" opacity={1 - 0.55 * xray} />
            <ellipse cx={CX} cy={CY} rx={HUSK_RX - 16} ry={HUSK_RY - 16} fill="url(#fibreG)" opacity={cut} />
            {cut > 0 && Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * Math.PI * 2;
              return (
                <line key={i} x1={CX + (SHELL_R + 10) * Math.cos(a)} y1={CY + (SHELL_R + 10) * Math.sin(a)}
                  x2={CX + (HUSK_RX - 24) * Math.cos(a)} y2={CY + (HUSK_RY - 24) * Math.sin(a)} stroke="#b08a52" strokeWidth={2} opacity={0.5 * cut} />
              );
            })}
            <ellipse cx={CX} cy={CY} rx={HUSK_RX} ry={HUSK_RY} fill="none" stroke="#9cc95a" strokeWidth={16} opacity={cut} />
            {/* stalk end */}
            <path d={`M ${CX - 40} ${CY - HUSK_RY + 6} Q ${CX} ${CY - HUSK_RY - 60} ${CX + 40} ${CY - HUSK_RY + 6} Z`} fill="#4c7a2a" />

            {/* Shell */}
            <circle cx={CX} cy={CY} r={SHELL_R} fill="#5a3518" opacity={Math.max(cut, 0.0)} />
            {/* Meat (jelly then hard white) */}
            <circle cx={CX} cy={CY} r={INNER_R} fill={`rgba(255,247,230,${jellyAlpha})`} opacity={cut} />
            {/* Cavity */}
            <circle cx={CX} cy={CY} r={cavR} fill="#173a46" opacity={cut} />
            <g clipPath="url(#cavClip)" opacity={Math.max(cut, xray * 0.9)}>
              <path
                d={`M ${CX - cavR - 20} ${waterTop + wave(0)} ${Array.from({ length: 21 }, (_, i) => {
                  const x = CX - cavR - 20 + (i * (2 * cavR + 40)) / 20;
                  return `L ${x} ${waterTop + wave(x)}`;
                }).join(" ")} L ${CX + cavR + 20} ${CY + cavR + 20} L ${CX - cavR - 20} ${CY + cavR + 20} Z`}
                fill="url(#waterG)"
              />
              {/* free nuclei drifting and dividing */}
              {nucleiOn > 0 && NUCLEI.map((n, i) => {
                const th = n.th + 0.15 * Math.sin(t * n.sp + n.ph);
                const rr = Math.min(cavR - 14, n.r);
                const x = CX + rr * Math.cos(th) + 18 * Math.sin(t * 1.3 + n.ph);
                const y = CY + rr * Math.sin(th) + 18 * Math.cos(t * 1.1 + n.ph);
                const split = Math.max(0, Math.sin(t * 1.6 + n.ph)) * 7;
                return (
                  <g key={i} opacity={nucleiOn}>
                    <circle cx={x - split} cy={y} r={6.5} fill="#b07cff" stroke="#ecdcff" strokeWidth={1.4} />
                    <circle cx={x + split} cy={y} r={6.5} fill="#b07cff" stroke="#ecdcff" strokeWidth={1.4} />
                  </g>
                );
              })}
            </g>
            {/* Cells laid down from the edge inward */}
            <g opacity={cut}>{cells}</g>
            {/* x-ray glow of the water inside the whole nut */}
            {xray > 0 && (
              <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke={WATER} strokeWidth={4} strokeDasharray="10 10" opacity={xray} transform={`rotate(${t * 10} ${CX} ${CY})`} />
            )}

            {/* Water -> meat arrows (rehook) */}
            {madeArrows > 0 && Array.from({ length: 12 }, (_, k) => k).map((k) => {
              const a = (k / 12) * Math.PI * 2 + 0.4;
              const p = (t * 0.9 + k * 0.17) % 1;
              const r0 = cavR * 0.45, r1 = INNER_R - meat * 0.4;
              const rr = r0 + (r1 - r0) * p;
              return (
                <g key={k} opacity={madeArrows * Math.sin(p * Math.PI)}>
                  <circle cx={CX + rr * Math.cos(a)} cy={CY + rr * Math.sin(a)} r={13} fill={WATER} stroke="#fff" strokeWidth={3} />
                </g>
              );
            })}
          </g>

          {/* Seal ring (hook) */}
          {sealOn > 0 && (
            <ellipse cx={CX} cy={CY} rx={(HUSK_RX + 40) * (0.9 + 0.1 * Math.min(1, sealPulse))} ry={(HUSK_RY + 40) * (0.9 + 0.1 * Math.min(1, sealPulse))}
              fill="none" stroke={MINT} strokeWidth={6} strokeDasharray="22 14" opacity={sealOn} transform={`rotate(${t * 12} ${CX} ${CY})`} />
          )}
          {/* Crack */}
          {crackDraw > 0 && cut < 1 && (
            <path d={`M ${CX - 360} ${CY + 10} L ${CX - 250} ${CY - 20} L ${CX - 150} ${CY + 25} L ${CX - 40} ${CY - 15} L ${CX + 60} ${CY + 30} L ${CX + 170} ${CY - 10} L ${CX + 270} ${CY + 20} L ${CX + 360} ${CY}`}
              fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={1600} strokeDashoffset={1600 * (1 - crackDraw)} />
          )}
          {crackFlash > 0 && <circle cx={CX} cy={CY} r={200 + 400 * crackFlash} fill="none" stroke="#fff" strokeWidth={12 * crackFlash} opacity={crackFlash} />}
          {hitFlash > 0 && <circle cx={CX} cy={CY} r={INNER_R + 30 * hitFlash} fill="none" stroke={CREAM} strokeWidth={22 * hitFlash} opacity={hitFlash} />}
        </svg>

        {/* In-world labels (scale with camera) */}
        <Tag x={CX + 140} y={CY - 290} opacity={cut * win(t, T_CRACK + 0.3, T_SEED + 0.7, 0.3)} color="#f0dcae">HUSK</Tag>
        <Tag x={CX + 250} y={CY + 250} opacity={cut * win(t, T_CRACK + 0.4, T_SEED + 0.7, 0.3)} color="#e2b98a">SHELL</Tag>
        <Tag x={CX} y={CY + 40} opacity={cut * win(t, T_CRACK + 0.5, T_SEED + 0.7, 0.3)} color="#06303c" size={48}>WATER</Tag>
        <Tag x={CX} y={CY - INNER_R + 40} opacity={win(t, T_JELLY - 0.2, T_SEED + 0.7, 0.3)} color={CREAM} size={34}>THIN JELLY</Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />

      {/* Title on frame 0 */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 88, lineHeight: 1.05,
        color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.7)", opacity: 1 - titleOut }}>
        NO HOLE. NO CRACK.
        <br />
        <span style={{ color: MINT }}>SO HOW DID</span>
        <br />
        <span style={{ color: MINT }}>WATER GET IN?</span>
      </div>
      <Stamp top={1325} color={MINT} opacity={sealOn}>SEALED SHUT</Stamp>

      {/* Month clock */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, opacity: ramp(t, T_HOOK_END - 0.15, 0.35) }}>
        <div style={{ fontWeight: 700, fontSize: 96, color: "#fff", letterSpacing: 3, textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
          MONTH {Math.floor(month)}
        </div>
        <div style={{ fontWeight: 700, fontSize: 40, color: MINT, letterSpacing: 4, marginTop: -4 }}>
          {month >= 11.9 ? "RIPE" : "RIPE AT MONTH 12"}
        </div>
      </div>

      {/* Water meter: horizontal, with the HALF target marked */}
      <div style={{ position: "absolute", left: 120, top: 400, width: 840, opacity: meterIn, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 3, color: WATER, width: 150 }}>WATER</div>
          <div style={{ position: "relative", flex: 1, height: 34, borderRadius: 17, border: "4px solid rgba(255,255,255,0.85)", background: "rgba(5,20,25,0.6)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${barFill * 100}%`, background: `linear-gradient(90deg, #3aa6cf, ${WATER} 70%, #e8fbff)` }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 34, color: "#fff", width: 150, textAlign: "right" }}>{Math.round(ml)} ML</div>
        </div>
        {previewOn > 0 && (
          <div style={{ position: "absolute", left: 168, top: 4, height: 34, width: 522 * previewFrac, borderRadius: 17, background: "rgba(255,255,255,0.0)", boxShadow: `inset 0 0 0 4px #ffffff, 0 0 18px rgba(255,255,255,0.6)`, opacity: previewOn }} />
        )}
        <div style={{ position: "absolute", left: 168 + (522 * 342) / 684 - 2, top: -10, height: 62, borderLeft: "4px dashed #fff" }} />
        <div style={{ position: "absolute", left: 168 + (522 * 342) / 684, top: 58, transform: `translateX(-50%) scale(${halfReached ? 1 + 0.3 * (1 - Math.min(1, halfStamp)) : 1})`,
          fontWeight: 700, fontSize: 32, letterSpacing: 2, color: halfReached ? CREAM : "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>
          {halfReached ? "HALF GONE" : "HALF"}
        </div>
      </div>

      {/* Screen stamps for each beat */}
      <Stamp top={1325} color="#fff" opacity={win(t, T_POURED - 0.1, T_SOUP, 0.25)}>NOTHING POURED IN</Stamp>
      <Stamp top={1325} color="#c9a8ff" opacity={win(t, T_SOUP - 0.1, T_RE + 0.2, 0.25)}>
        {wallsCross > 0.5 ? "FREE NUCLEI · NO CELL WALLS" : "FREE NUCLEI"}
      </Stamp>
      <Stamp top={1325} color={WATER} opacity={win(t, T_MADE - 0.15, T_CL + 0.3, 0.25)}>WATER → MEAT</Stamp>
      <Stamp top={1325} color="#bfeee0" opacity={win(t, T_EDGE - 0.2, T_WHITE, 0.2)}>CELLS FROM THE EDGE IN</Stamp>
      <Stamp top={1325} color={CREAM} opacity={win(t, T_WHITE, T_PAY + 0.2, 0.2)} scale={0.85 + 0.15 * Math.min(1, halfStamp)}>HARD WHITE MEAT</Stamp>
      <Stamp top={1325} color={MINT} opacity={ramp(t, T_ITIS - 0.1, 0.35) * (1 - ramp(t, timeline.duration - 2.0, 0.3))}>THE WATER IS THE SEED</Stamp>

      <div style={{ position: "absolute", top: 522, left: 60, textAlign: "left", fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 5,
        color: "rgba(230,255,240,0.7)", opacity: win(t, T_CRACK + 0.5, T_PAY, 0.4) }}>
        SIMPLIFIED · NOT TO SCALE
      </div>

      <SeriesTag name="Why It Happens" n={7} accent={MINT} until={T_HOOK_END} />
      <Captions lines={timeline.lines} top={1440} accent={MINT} />
      <SeriesOutro name="Why It Happens" next={8} accent={MINT} />
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ x: number; y: number; color: string; opacity: number; size?: number; children: React.ReactNode }> = ({ x, y, color, opacity, size = 36, children }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: 4,
    color, opacity, whiteSpace: "nowrap", textShadow: color === "#06303c" ? "0 0 12px rgba(255,255,255,0.6)" : "0 2px 12px rgba(0,0,0,0.9)" }}>
    {children}
  </div>
);

const Stamp: React.FC<{ top: number; color: string; opacity: number; scale?: number; children: React.ReactNode }> = ({ top, color, opacity, scale = 1, children }) =>
  opacity <= 0 ? null : (
    <div style={{ position: "absolute", top, width: "100%", display: "flex", justifyContent: "center", opacity }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, letterSpacing: 3, color: "#0a0a12", background: color, padding: "12px 28px", borderRadius: 14,
        transform: `scale(${scale})`, boxShadow: "0 8px 28px rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>
        {children}
      </div>
    </div>
  );
