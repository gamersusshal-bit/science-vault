import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/interest-on-interest/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const GOLD = "#f5c542";
const PALE = "#ffe7a3";
const MINT = "#5ff2c0";
const CORAL = "#ff7a6b";
const INK = "#e8f4f6";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const SPEND = line("spend");
const KEEP = line("keep");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_BOTH = wordStart("meter", "both");
const T_TEN = wordStart("meter", "ten");
const T_SPENDS = wordStart("spend", "spends");
const T_STRAIGHT = wordStart("spend", "straight");
const T_KEEPS = wordStart("keep", "keeps");
const T_EARNS = wordStart("keep", "earns");
const T_BARELY = wordStart("twist", "gap");
const T_BENDS = wordStart("climax", "bends");
const T_ADDS = wordStart("climax", "adds");
const T_EXTRA = wordStart("payoff", "extra");

const P0 = 1000;
const R = 0.1;
const compound = (y: number) => P0 * Math.pow(1 + R, y);
const paidOut = (y: number) => P0 + P0 * R * y; // kept 1,000 + interest spent so far
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// chart (top) and towers (bottom)
const CH = { x0: 130, x1: 950, base: 815, h: 270 };
const TW = { base: 1290, h: 350, w: 260 };
const LEFT_X = 300;
const RIGHT_X = 720;

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(2,14,20,0.95)" }}>
    {children}
  </div>
);

// one coloured slab of a coin tower, with coin edges
const Slab: React.FC<{ x: number; yTop: number; h: number; fill: string; edge: string; hatch?: boolean }> = ({ x, yTop, h, fill, edge, hatch }) => {
  if (h <= 0.5) return null;
  const rows = Math.floor(h / 16);
  return (
    <g>
      <rect x={x - TW.w / 2} y={yTop} width={TW.w} height={h} fill={hatch ? "rgba(255,122,107,0.22)" : fill} stroke={edge} strokeWidth={hatch ? 4 : 0} strokeDasharray={hatch ? "14 10" : undefined} />
      {Array.from({ length: rows }).map((_, i) => (
        <line key={i} x1={x - TW.w / 2 + 6} x2={x + TW.w / 2 - 6} y1={yTop + h - 16 * (i + 1)} y2={yTop + h - 16 * (i + 1)} stroke={edge} strokeWidth={2} opacity={0.45} />
      ))}
    </g>
  );
};

export const InterestOnInterest: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 12, stiffness = 170) => spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } });

  // ---------- the year clock (the meter) ----------
  // hook: fast-forward to year 30 (the result), then rewind to 0; then the story runs the 30 years
  const year =
    t < HOOK.end
      ? interpolate(t, [0.15, 1.5], [0, 30], { ...clamp, easing: Easing.inOut(Easing.quad) })
      : t < METER.start + 0.7
        ? interpolate(t, [HOOK.end, METER.start + 0.7], [30, 0], { ...clamp, easing: ease })
        : t < KEEP.end
          ? interpolate(t, [METER.start + 0.7, METER.end, SPEND.end, KEEP.end], [0, 1.2, 4, 8], clamp)
          : t < CLIMAX.start
            ? interpolate(t, [KEEP.end, CLIMAX.start], [8, 11], clamp)
            : interpolate(t, [CLIMAX.start, CLIMAX.end], [11, 30], { ...clamp, easing: Easing.in(Easing.quad) });

  const left = paidOut(year);
  const right = compound(year);
  const scaleMax = Math.max(2200, right);
  const pxPer = TW.h / scaleMax;
  const cpx = CH.h / scaleMax;

  // tower slabs
  const lKeptH = P0 * pxPer;
  const lSpentH = (left - P0) * pxPer;
  const rBaseH = P0 * pxPer;
  const rSimpleH = P0 * R * year * pxPer;
  const rIoiH = Math.max(0, right - P0 - P0 * R * year) * pxPer;

  // ---------- visuals ----------
  const titleOut = interpolate(t, [HOOK.end - 0.35, HOOK.end], [0, 1], clamp);
  const hudIn = sp(METER.start, 14, 170);
  const hudOut = interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start - 0.05], [1, 0], clamp);
  const hudO = Math.min(1, hudIn) * hudOut * (t > HOOK.end - 0.2 ? 1 : 0);
  const rewinding = t > HOOK.end - 0.05 && t < METER.start + 0.7;
  const rateFlash = interpolate(t, [T_TEN - 0.1, T_TEN + 0.2, T_TEN + 1.0], [0, 1, 0], clamp);
  const spendO = interpolate(t, [T_SPENDS - 0.1, T_SPENDS + 0.3, KEEP.start, KEEP.start + 0.4], [0, 1, 1, 0.35], clamp);
  const straightO = interpolate(t, [T_STRAIGHT - 0.1, T_STRAIGHT + 0.3, CLIMAX.start, CLIMAX.start + 0.4], [0, 1, 1, 0], clamp);
  const keepO = interpolate(t, [T_KEEPS - 0.1, T_KEEPS + 0.3], [0, 1], clamp);
  const earnsP = interpolate(t, [T_EARNS - 0.2, T_EARNS + 0.8], [0, 1], { ...clamp, easing: ease });
  const earnsO = interpolate(t, [T_EARNS - 0.2, T_EARNS, TWIST.start + 0.3, TWIST.start + 0.6], [0, 1, 1, 0], clamp);
  const sameO = interpolate(t, [T_BARELY - 0.1, T_BARELY + 0.25, CLIMAX.start + 0.2, CLIMAX.start + 0.5], [0, 1, 1, 0], clamp);
  const samePulse = 1 + 0.1 * Math.sin((t - T_BARELY) * 8) * sameO;
  const bendO = interpolate(t, [T_BENDS - 0.1, T_BENDS + 0.3], [0, 1], clamp);
  const addsO = interpolate(t, [T_ADDS - 0.1, T_ADDS + 0.3, PAYOFF.start, PAYOFF.start + 0.3], [0, 1, 1, 0], clamp);
  const fourO = t < HOOK.end ? interpolate(t, [1.5, 1.8, HOOK.end - 0.3, HOOK.end], [0, 1, 1, 0], clamp) : interpolate(t, [CLIMAX.end - 0.3, CLIMAX.end + 0.1], [0, 1], clamp);
  const ioiLabelO = interpolate(rIoiH, [85, 115], [0, 1], clamp) * (t > KEEP.start ? 1 : 0);
  const chartO = 1;
  const yearPulse = 1 + 0.08 * Math.abs(Math.sin(year * Math.PI)) * (t > METER.start + 0.7 ? 1 : 0);
  const shake = 7 * Math.exp(-Math.max(0, t - T_BENDS) * 5) * (t > T_BENDS ? 1 : 0) + 6 * Math.exp(-Math.max(0, t - 0.5) * 6) * (t > 0.5 ? 1 : 0);
  const zoom = interpolate(t, [0, HOOK.end, SPEND.start, TWIST.start, CLIMAX.start, CLIMAX.end, PAYOFF.end], [1.03, 1.03, 1.0, 1.03, 1.03, 1.0, 1.06], { ...clamp, easing: ease });
  const fy = 1100;
  const camera = `translate(${540 - 540 * zoom + Math.sin(frame * 2.3) * shake}px, ${1100 - fy * zoom + Math.cos(frame * 1.9) * shake}px) scale(${zoom})`;

  // history lines
  const pts = (fn: (y: number) => number) => {
    let d = "";
    const n = Math.max(1, Math.ceil(year * 4));
    for (let i = 0; i <= n; i++) {
      const yy = (year * i) / n;
      const x = CH.x0 + ((CH.x1 - CH.x0) * yy) / 30;
      const y = CH.base - fn(yy) * cpx;
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  };
  const headX = CH.x0 + ((CH.x1 - CH.x0) * year) / 30;

  // a small "+10%" coin hopping from the interest slab onto the new layer
  const hopX = RIGHT_X - 40;
  const hopY0 = TW.base - rBaseH - rSimpleH / 2;
  const hopY1 = TW.base - rBaseH - rSimpleH - rIoiH - 30;
  const hopY = hopY0 + (hopY1 - hopY0) * earnsP - Math.sin(earnsP * Math.PI) * 110;

  const namesO = interpolate(t, [timeline.duration - 2.2, timeline.duration - 1.9], [1, 0], clamp);
  // yearly coin drops: each year a coin of interest lands on both towers; the left one is spent and flies off
  const ticking = t > METER.start + 0.7 && t < CLIMAX.end && !rewinding;
  const ph = year - Math.floor(year);
  const dropP = Math.min(1, ph / 0.45);
  const leaveP = Math.max(0, (ph - 0.5) / 0.5);
  const payA = sp(PAYOFF.start, 14, 160);
  const payB = sp(T_EXTRA, 11, 170);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #0c3a4a 0%, #062430 55%, #021219 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("interest-on-interest/narration.wav")} />
      <Audio src={staticFile("interest-on-interest/bed.wav")} volume={0.6} />
      {/* faint graph paper */}
      <AbsoluteFill style={{ opacity: 0.1, backgroundImage: "repeating-linear-gradient(0deg, rgba(245,197,66,0.7) 0px, rgba(245,197,66,0.7) 2px, transparent 2px, transparent 60px), repeating-linear-gradient(90deg, rgba(245,197,66,0.7) 0px, rgba(245,197,66,0.7) 2px, transparent 2px, transparent 60px)" }} />

      <AbsoluteFill style={{ transform: camera, transformOrigin: "0px 0px" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* ---------- chart ---------- */}
          <g opacity={chartO}>
            <rect x={90} y={490} width={900} height={370} rx={28} fill="rgba(2,18,25,0.78)" stroke="rgba(232,244,246,0.22)" strokeWidth={3} />
            <line x1={CH.x0} y1={CH.base} x2={CH.x1} y2={CH.base} stroke="rgba(232,244,246,0.45)" strokeWidth={3} />
            {[0, 10, 20, 30].map((yy) => (
              <line key={yy} x1={CH.x0 + ((CH.x1 - CH.x0) * yy) / 30} x2={CH.x0 + ((CH.x1 - CH.x0) * yy) / 30} y1={CH.base} y2={CH.base + 12} stroke="rgba(232,244,246,0.45)" strokeWidth={3} />
            ))}
            <path d={pts(paidOut)} fill="none" stroke={CORAL} strokeWidth={8} strokeLinecap="round" />
            <path d={pts(compound)} fill="none" stroke={MINT} strokeWidth={8 + 3 * bendO} strokeLinecap="round" />
            <circle cx={headX} cy={CH.base - left * cpx} r={11} fill={CORAL} />
            <circle cx={headX} cy={CH.base - right * cpx} r={12 + 4 * bendO} fill={MINT} />
          </g>

          {/* ---------- towers ---------- */}
          <ellipse cx={540} cy={TW.base + 14} rx={420} ry={26} fill="rgba(0,0,0,0.35)" />
          {/* left: spends its interest */}
          <Slab x={LEFT_X} yTop={TW.base - lKeptH} h={lKeptH} fill={GOLD} edge="#9c7414" />
          <Slab x={LEFT_X} yTop={TW.base - lKeptH - lSpentH} h={lSpentH} fill={CORAL} edge={CORAL} hatch />
          <ellipse cx={LEFT_X} cy={TW.base - lKeptH} rx={TW.w / 2} ry={14} fill={PALE} stroke="#9c7414" strokeWidth={3} />
          {/* right: keeps it */}
          <Slab x={RIGHT_X} yTop={TW.base - rBaseH} h={rBaseH} fill={GOLD} edge="#9c7414" />
          <Slab x={RIGHT_X} yTop={TW.base - rBaseH - rSimpleH} h={rSimpleH} fill={PALE} edge="#b48d2a" />
          <Slab x={RIGHT_X} yTop={TW.base - rBaseH - rSimpleH - rIoiH} h={rIoiH} fill={MINT} edge="#1d8c68" />
          <ellipse cx={RIGHT_X} cy={TW.base - rBaseH - rSimpleH - rIoiH} rx={TW.w / 2} ry={14} fill={rIoiH > 2 ? "#b8ffe6" : PALE} stroke="#1d8c68" strokeWidth={3} />
          {/* spent coins flying away from the left tower */}
          {t > T_SPENDS - 0.2 && t < CLIMAX.end &&
            [0, 1, 2].map((i) => {
              const p = ((t * 0.9 + i / 3) % 1);
              return (
                <g key={i} opacity={(1 - p) * spendO}>
                  <ellipse cx={LEFT_X - 60 - 180 * p} cy={TW.base - lKeptH - 10 - 120 * p + 160 * p * p} rx={26} ry={9} fill={GOLD} stroke="#9c7414" strokeWidth={2} />
                </g>
              );
            })}
          {/* yearly interest coins */}
          {ticking && (
            <g>
              <ellipse cx={LEFT_X} cy={TW.base - lKeptH - 260 * (1 - dropP) - 8} rx={60} ry={18} fill={GOLD} stroke="#9c7414" strokeWidth={3} opacity={1 - leaveP} transform={`translate(${-260 * leaveP} ${-140 * leaveP})`} />
              <ellipse cx={RIGHT_X} cy={TW.base - rBaseH - rSimpleH - rIoiH - 260 * (1 - dropP) - 8} rx={60} ry={18} fill={t > KEEP.start ? MINT : GOLD} stroke="#1d8c68" strokeWidth={3} opacity={1 - leaveP} />
            </g>
          )}
          {/* the hop: interest earning interest */}
          <g opacity={earnsO}>
            <ellipse cx={hopX} cy={hopY} rx={30} ry={11} fill={MINT} stroke="#1d8c68" strokeWidth={3} />
          </g>
          {/* 4x bracket */}
          <g opacity={fourO}>
            <line x1={500} x2={500} y1={TW.base - rBaseH - rSimpleH - rIoiH} y2={TW.base - lKeptH - lSpentH} stroke={INK} strokeWidth={5} strokeDasharray="12 8" />
          </g>
        </svg>

        {/* tower values */}
        <Tag x={LEFT_X} y={TW.base - lKeptH - lSpentH - 40} color={CORAL} o={1} size={44}>{fmt(left)}</Tag>
        <Tag x={RIGHT_X} y={TW.base - rBaseH - rSimpleH - rIoiH - 40} color={rIoiH > 30 ? MINT : PALE} o={1} size={44}>{fmt(right)}</Tag>
        <Tag x={LEFT_X} y={TW.base + 36} color={CORAL} o={namesO} size={34}>SPENDS IT</Tag>
        <Tag x={RIGHT_X} y={TW.base + 36} color={MINT} o={namesO} size={34}>KEEPS IT</Tag>
        <Tag x={LEFT_X} y={TW.base - lKeptH / 2} color="#3a2a05" o={interpolate(lKeptH, [40, 70], [0, 1], clamp)} size={34}>START</Tag>
        <Tag x={RIGHT_X} y={TW.base - rBaseH / 2} color="#3a2a05" o={interpolate(rBaseH, [40, 70], [0, 1], clamp)} size={34}>START</Tag>
        <Tag x={LEFT_X} y={TW.base - lKeptH - lSpentH / 2} color={CORAL} o={interpolate(lSpentH, [40, 70], [0, 1], clamp) * Math.max(spendO, 0.6)} size={34}>SPENT</Tag>
        <Tag x={RIGHT_X} y={TW.base - rBaseH - rSimpleH / 2} color="#4a3a08" o={interpolate(rSimpleH, [40, 70], [0, 1], clamp)} size={34}>INTEREST</Tag>
        <div style={{ position: "absolute", left: RIGHT_X - TW.w / 2, width: TW.w, top: TW.base - rBaseH - rSimpleH - rIoiH / 2 - 38, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, lineHeight: 1.05, color: "#053a2a", opacity: ioiLabelO }}>
          INTEREST ON
          <br />
          INTEREST
        </div>
        <Tag x={hopX - 20} y={hopY - 48} color={MINT} o={earnsO} size={36}>+10%</Tag>
        <Tag x={headX + 170} y={CH.base - right * cpx + 20} color={INK} o={sameO} size={36}>
          <span style={{ display: "inline-block", transform: `scale(${samePulse})` }}>SMALL GAP</span>
        </Tag>
        <Tag x={500} y={(TW.base - rBaseH - rSimpleH - rIoiH + TW.base - lKeptH - lSpentH) / 2} color={INK} o={fourO} size={64}>×4</Tag>
        {/* chart labels */}
        <Tag x={CH.x0 + 330} y={CH.base - 60} color={CORAL} o={straightO * chartO} size={36}>STRAIGHT LINE</Tag>
        <Tag x={340} y={560} color={MINT} o={bendO * interpolate(t, [T_ADDS - 0.3, T_ADDS], [1, 0], clamp)} size={36}>CURVE BENDS UP</Tag>
        <Tag x={360} y={560} color={MINT} o={interpolate(t, [T_ADDS, T_ADDS + 0.3], [0, 1], clamp)} size={36}>EACH YEAR ADDS MORE</Tag>
        <Tag x={CH.x0 + 10} y={CH.base + 34} color="rgba(232,244,246,0.75)" o={chartO} size={34}>0</Tag>
        <Tag x={CH.x1 - 30} y={CH.base + 34} color="rgba(232,244,246,0.75)" o={chartO} size={34}>30 YRS</Tag>
        
      </AbsoluteFill>

      {/* ---------- HUD: the year clock ---------- */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 80, lineHeight: 1.08, letterSpacing: -2, color: "#fff", opacity: 1 - titleOut, transform: `translateY(${-30 * titleOut}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        SAME MONEY. SAME RATE.
        <br />
        <span style={{ color: MINT }}>WHY 4× BIGGER?</span>
      </div>

      <div style={{ position: "absolute", top: 185, left: 90, width: 900, display: "flex", gap: 24, fontFamily: FONT, opacity: hudO, transform: `translateY(${20 * (1 - Math.min(1, hudIn))}px)` }}>
        <div style={{ flex: 1.1, borderRadius: 26, padding: "14px 10px", background: "rgba(2,18,25,0.85)", border: `4px solid ${rewinding ? CORAL : GOLD}`, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 4, color: INK }}>{rewinding ? "REWIND" : "YEAR"}</div>
          <div style={{ fontWeight: 700, fontSize: 92, lineHeight: 1.0, color: GOLD, fontVariantNumeric: "tabular-nums", transform: `scale(${yearPulse})` }}>
            {Math.floor(year + 0.001)}
            <span style={{ fontSize: 50, color: "rgba(232,244,246,0.7)" }}> / 30</span>
          </div>
        </div>
        <div style={{ flex: 1, borderRadius: 26, padding: "14px 10px", background: "rgba(2,18,25,0.85)", border: `4px solid ${rateFlash > 0.2 ? MINT : "rgba(232,244,246,0.35)"}`, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 4, color: INK }}>BOTH EARN</div>
          <div style={{ fontWeight: 700, fontSize: 92, lineHeight: 1.0, color: MINT, transform: `scale(${1 + 0.15 * rateFlash})` }}>10%</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 3, color: "rgba(232,244,246,0.75)", opacity: hudO }}>
        EXAMPLE: START 1,000 ($ OR ₹) · NOT A PROMISE
      </div>

      {/* payoff */}
      <div style={{ position: "absolute", top: 205, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 66, letterSpacing: 2, color: "#ffffff", opacity: Math.min(1, payA), transform: `translateY(${24 * (1 - Math.min(1, payA))}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          SAME RATE. THE EXTRA IS
        </div>
        <div style={{ fontWeight: 700, fontSize: 80, letterSpacing: -2, lineHeight: 1.05, color: MINT, opacity: Math.min(1, payB * 1.5), transform: `scale(${0.8 + 0.2 * payB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          INTEREST ON INTEREST
        </div>
      </div>

      <SeriesTag name="Money Explained" n={2} accent={GOLD} until={HOOK.end} />
      <Captions lines={timeline.lines} top={1440} accent={GOLD} />
      <SeriesOutro name="Money Explained" next={3} accent={GOLD} />
    </AbsoluteFill>
  );
};
