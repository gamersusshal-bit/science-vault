import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/card-tap/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const GOLD = "#f2c14e";
const MINT = "#7df0a8";
const WARN = "#ff6b5e";
const INK = "#e9f5ee";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const MESSAGE = line("message");
const HOLD = line("hold");
const TWIST = line("twist");
const SETTLE = line("settle");
const PAYOFF = line("payoff");
const T_PAID = wordStart("hook", "paid");
const T_MONEY_HOOK = wordStart("hook", "money");
const T_MSG = wordStart("message", "message");
const T_NETWORK = wordStart("message", "network");
const T_BANK = wordStart("message", "bank");
const T_CHECKS = wordStart("hold", "checks");
const T_HOLDS = wordStart("hold", "holds");
const T_YES = wordStart("twist", "yes");
const T_NOMONEY = wordStart("twist", "money");
const T_LATER = wordStart("settle", "later");
const T_BATCH = wordStart("settle", "batch");
const T_SETTLEW = wordStart("settle", "settle");
const T_MOVES = wordStart("settle", "moves");

// ---------- world ----------
const TERM = { x: 540, y: 1235 };
const NET = { x: 540, y: 985 };
const MYBANK = { x: 250, y: 700 };
const SHOPBANK = { x: 830, y: 700 };
const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, p: number) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
const path = (pts: { x: number; y: number }[], p: number) => {
  const n = pts.length - 1;
  const k = Math.min(n - 1, Math.floor(p * n));
  return lerp(pts[k], pts[k + 1], p * n - k);
};

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,20,10,0.95)" }}>
    {children}
  </div>
);

const Bank: React.FC<{ x: number; y: number; glow: number; color: string }> = ({ x, y, glow, color }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={0} cy={20} rx={150} ry={120} fill={color} opacity={0.12 * glow} />
    <polygon points="-120,-40 0,-110 120,-40" fill="#123f31" stroke={color} strokeWidth={5} />
    {[-80, -27, 27, 80].map((cx) => (
      <rect key={cx} x={cx - 13} y={-32} width={26} height={110} fill="#123f31" stroke={color} strokeWidth={4} />
    ))}
    <rect x={-130} y={78} width={260} height={22} rx={4} fill="#123f31" stroke={color} strokeWidth={5} />
  </g>
);

const Coin: React.FC<{ x: number; y: number; o?: number; s?: number }> = ({ x, y, o = 1, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <ellipse cx={0} cy={6} rx={40} ry={13} fill="#a8761c" />
    <ellipse cx={0} cy={0} rx={40} ry={13} fill={GOLD} stroke="#fff1c2" strokeWidth={2} />
  </g>
);

export const CardTap: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 12, stiffness = 170) => spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } });

  // ---------- hook: the tap ----------
  const cardIn = interpolate(t, [0, T_PAID], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cardBack = interpolate(t, [T_PAID + 0.25, T_PAID + 0.9], [0, 1], { ...clamp, easing: ease });
  const cardX = TERM.x + 330 - 300 * cardIn + 200 * cardBack;
  const cardY = TERM.y - 40 + 120 * (1 - cardIn) - 30 * cardBack;
  const cardO = 1 - interpolate(t, [T_PAID + 0.5, T_PAID + 0.9], [0, 1], clamp);
  const tapRipple = interpolate(t, [T_PAID, T_PAID + 0.7], [0, 1], clamp);
  const approved = t >= T_PAID + 0.08;
  const titleOut = interpolate(t, [HOOK.end - 0.35, HOOK.end], [0, 1], clamp);
  const stillHere = interpolate(t, [T_MONEY_HOOK - 0.1, T_MONEY_HOOK + 0.3, METER.end - 0.3, METER.end], [0, 1, 1, 0], clamp);

  // ---------- message: terminal -> network -> your bank -> back ----------
  const goP = interpolate(t, [T_MSG - 0.1, T_BANK + 0.25], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const backP = interpolate(t, [T_HOLDS + 0.35, HOLD.end + 0.3], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const msgPos = t < T_HOLDS + 0.35 ? path([TERM, NET, MYBANK], goP) : path([MYBANK, NET, TERM], backP);
  const msgO = interpolate(t, [T_MSG - 0.2, T_MSG, HOLD.end + 0.3, HOLD.end + 0.5], [0, 1, 1, 0], clamp);
  const msgIsYes = t >= T_HOLDS + 0.35;
  const notMoney = interpolate(t, [T_MSG + 0.2, T_MSG + 0.5, T_BANK + 0.2, T_BANK + 0.5], [0, 1, 1, 0], clamp);
  const linkGlow = (from: number, to: number) => interpolate(t, [from, from + 0.2, to, to + 0.4], [0, 1, 1, 0], clamp);
  const canPay = interpolate(t, [T_CHECKS, T_CHECKS + 0.3, TWIST.start + 0.3, TWIST.start + 0.7], [0, 1, 1, 0], clamp);
  const lockIn = sp(T_HOLDS, 10, 180);
  const lockOut = interpolate(t, [T_MOVES - 0.3, T_MOVES], [1, 0], clamp);
  const held = t >= T_HOLDS ? Math.min(1, lockIn) * lockOut : 0;

  // ---------- twist ----------
  const shopYes = interpolate(t, [T_YES - 0.1, T_YES + 0.2, SETTLE.start + 0.2, SETTLE.start + 0.5], [0, 1, 1, 0], clamp);
  const zero = interpolate(t, [T_NOMONEY - 0.1, T_NOMONEY + 0.2, T_MOVES - 0.2, T_MOVES], [0, 1, 1, 0], clamp);
  const zeroPulse = 1 + 0.12 * Math.max(0, Math.sin((t - T_NOMONEY) * 9)) * (t > T_NOMONEY && t < T_NOMONEY + 1 ? 1 : 0);

  // ---------- settle ----------
  const night = interpolate(t, [T_LATER - 0.1, T_LATER + 0.6, PAYOFF.start, PAYOFF.start + 0.8], [0, 1, 1, 0.4], clamp);
  const batchP = interpolate(t, [T_BATCH - 0.6, T_BATCH + 0.6], [0, 1], { ...clamp, easing: ease });
  const batchO = interpolate(t, [T_LATER + 0.2, T_LATER + 0.5, T_SETTLEW, T_SETTLEW + 0.3], [0, 1, 1, 0], clamp);
  const batchPos = lerp({ x: TERM.x, y: TERM.y - 120 }, NET, batchP);
  const settleGlow = linkGlow(T_SETTLEW - 0.1, T_MOVES + 0.6);
  const flyP = (i: number) => interpolate(t, [T_MOVES - 0.25 + i * 0.12, T_MOVES + 0.55 + i * 0.12], [0, 1], { ...clamp, easing: ease });
  const movedFlash = interpolate(t, [T_MOVES + 0.5, T_MOVES + 0.65, T_MOVES + 1.4], [0, 1, 0], clamp);

  // ---------- HUD meters ----------
  const hudIn = sp(METER.start, 14, 170);
  const hudOut = interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start - 0.05], [1, 0], clamp);
  const hudO = Math.min(1, hudIn) * hudOut * (t > HOOK.end - 0.2 ? 1 : 0);
  // approval timer: real authorization takes a fraction of a second (shown frozen at the measured ~0.13 s average)
  const yesDone = t >= wordStart("meter", "yes");
  // money clock: compressed hours from the tap until settlement (~a day)
  const hours = t < T_MOVES ? interpolate(t, [METER.start, T_MOVES], [0, 24], clamp) : 24;
  const moved = t >= T_MOVES + 0.1;
  const moneyClockPulse = 1 + 0.15 * sp(T_MOVES, 7, 200) * (moved ? 1 - interpolate(t, [T_MOVES, T_MOVES + 0.6], [0, 1], clamp) : 0);

  const payA = sp(PAYOFF.start, 14, 160);
  const payB = sp(wordStart("payoff", "promise"), 11, 170);

  // camera follows the story: whole system -> your bank -> the shop's bank -> whole system
  const keys = [0, HOOK.end, T_NETWORK, T_BANK + 0.2, HOLD.end, TWIST.start + 0.3, TWIST.end, T_LATER + 0.4, T_MOVES + 0.6, PAYOFF.end];
  const fxs = [540, 540, 540, 470, 470, 620, 620, 540, 590, 540];
  const fys = [960, 960, 960, 960, 960, 960, 960, 960, 960, 960];
  const zs = [1.05, 1.0, 1.04, 1.06, 1.06, 1.06, 1.06, 1.0, 1.05, 1.02];
  const fx = interpolate(t, keys, fxs, { ...clamp, easing: ease });
  const fy = interpolate(t, keys, fys, { ...clamp, easing: ease });
  const zoom = interpolate(t, keys, zs, { ...clamp, easing: ease });
  const shake = 9 * Math.exp(-Math.max(0, t - T_MOVES - 0.5) * 7) * (t > T_MOVES + 0.5 ? 1 : 0) + 7 * Math.exp(-Math.max(0, t - T_PAID) * 8) * (t > T_PAID ? 1 : 0);
  const camera = `translate(${540 - fx * zoom + Math.sin(frame * 2.3) * shake}px, ${960 - fy * zoom + Math.cos(frame * 1.9) * shake}px) scale(${zoom})`;

  const myCoins = 8;
  const heldCoins = 3;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #0d4434 0%, #072a20 55%, #031611 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("card-tap/narration.wav")} />
      <Audio src={staticFile("card-tap/bed.wav")} volume={0.6} />
      {/* ledger lines in the background */}
      <AbsoluteFill style={{ opacity: 0.12, backgroundImage: "repeating-linear-gradient(0deg, rgba(242,193,78,0.6) 0px, rgba(242,193,78,0.6) 2px, transparent 2px, transparent 64px)", backgroundPosition: `0px ${(t * 10) % 64}px` }} />
      {/* night falls for the batch */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #050a24 0%, #071433 60%, rgba(5,10,36,0) 100%)", opacity: 0.75 * night }} />
      {night > 0.05 && <div style={{ position: "absolute", left: 960, top: 470 - 40 * night, width: 80, height: 80, borderRadius: "50%", boxShadow: "-22px 10px 0 0 #f6efd2", opacity: night }} />}

      <AbsoluteFill style={{ transform: camera, transformOrigin: "0px 0px" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* wires */}
          {[
            [TERM, NET, linkGlow(T_MSG - 0.1, T_NETWORK + 0.2) + linkGlow(HOLD.end - 0.2, HOLD.end + 0.3) + batchO],
            [NET, MYBANK, linkGlow(T_NETWORK, T_BANK + 0.3) + linkGlow(T_HOLDS + 0.35, HOLD.end) + settleGlow],
            [NET, SHOPBANK, settleGlow],
          ].map(([a, b, g], i) => {
            const A = a as { x: number; y: number };
            const B = b as { x: number; y: number };
            const G = Math.min(1, g as number);
            return (
              <g key={i}>
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="rgba(233,245,238,0.25)" strokeWidth={6} />
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={GOLD} strokeWidth={8} strokeDasharray="18 14" strokeDashoffset={-t * 70} opacity={G} />
              </g>
            );
          })}
          <Bank x={MYBANK.x} y={MYBANK.y} glow={0.4 + canPay + held * 0.5} color={INK} />
          <Bank x={SHOPBANK.x} y={SHOPBANK.y} glow={0.4 + movedFlash + zero * 0.5} color={INK} />
          {/* network hub */}
          <g transform={`translate(${NET.x} ${NET.y}) rotate(${t * 20})`}>
            <polygon points="0,-70 61,-35 61,35 0,70 -61,35 -61,-35" fill="#0f3a2d" stroke={GOLD} strokeWidth={5} />
            <circle cx={0} cy={0} r={22} fill={GOLD} opacity={0.6 + 0.4 * Math.sin(t * 5)} />
          </g>
          {/* your money: a coin stack in your bank */}
          {Array.from({ length: myCoins }).map((_, i) => {
            const isHeld = i >= myCoins - heldCoins;
            const k = i - (myCoins - heldCoins);
            const base = { x: MYBANK.x + 0, y: MYBANK.y + 175 - i * 15 };
            if (isHeld && t > T_MOVES - 0.3) {
              const p = flyP(k);
              const end = { x: SHOPBANK.x, y: SHOPBANK.y + 175 - k * 15 };
              const x = base.x + (end.x - base.x) * p;
              const y = base.y + (end.y - base.y) * p - Math.sin(p * Math.PI) * 300;
              return <Coin key={i} x={x} y={y} s={1 + 0.25 * Math.sin(p * Math.PI)} />;
            }
            return <Coin key={i} x={base.x} y={base.y} />;
          })}
          {/* lock on the held amount */}
          {held > 0 && (
            <g transform={`translate(${MYBANK.x + 72} ${MYBANK.y + 125}) scale(${held})`}>
              <path d="M -18 -8 L -18 -26 A 18 18 0 0 1 18 -26 L 18 -8" fill="none" stroke={GOLD} strokeWidth={7} />
              <rect x={-28} y={-10} width={56} height={44} rx={8} fill={GOLD} />
            </g>
          )}
          {/* shop terminal */}
          <g transform={`translate(${TERM.x} ${TERM.y})`}>
            <rect x={-110} y={-110} width={220} height={190} rx={26} fill="#16241e" stroke={INK} strokeWidth={5} />
            <rect x={-82} y={-86} width={164} height={74} rx={10} fill={approved ? "#1d6b45" : "#0b1612"} />
            {[-50, 0, 50].map((kx) => [8, 44].map((ky) => <rect key={`${kx}-${ky}`} x={kx - 18} y={ky - 12} width={36} height={22} rx={5} fill="#2c3d35" />))}
          </g>
          <circle cx={TERM.x} cy={TERM.y - 50} r={30 + 200 * tapRipple} fill="none" stroke={MINT} strokeWidth={6} opacity={(1 - tapRipple) * (t > T_PAID ? 1 : 0)} />
          {/* the card */}
          <g transform={`translate(${cardX} ${cardY}) rotate(${-14 + 10 * cardIn})`} opacity={cardO}>
            <rect x={-120} y={-75} width={240} height={150} rx={18} fill="url(#cardg)" stroke="#fff3cf" strokeWidth={3} />
            <rect x={-90} y={-30} width={46} height={36} rx={6} fill="#e7c76a" />
            <rect x={-90} y={30} width={150} height={10} rx={5} fill="rgba(255,255,255,0.5)" />
          </g>
          <defs>
            <linearGradient id="cardg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2a8f66" />
              <stop offset="100%" stopColor="#0e4a35" />
            </linearGradient>
          </defs>
          {/* moved flash at the shop's bank */}
          <circle cx={SHOPBANK.x} cy={SHOPBANK.y + 120} r={60 + 200 * movedFlash} fill="none" stroke={GOLD} strokeWidth={6} opacity={movedFlash} />
        </svg>

        {/* terminal screen text */}
        <Tag x={TERM.x} y={TERM.y - 49} color={approved ? "#ffffff" : "#4f6b5e"} o={1} size={34}>{approved ? "APPROVED" : "TAP"}</Tag>

        {/* message envelope */}
        <div style={{ position: "absolute", left: msgPos.x - 120, top: msgPos.y - 56, width: 240, height: 112, whiteSpace: "nowrap", borderRadius: 14, background: msgIsYes ? MINT : "#f4f1e6", opacity: msgO, boxShadow: "0 10px 30px rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 700, fontSize: msgIsYes ? 52 : 34, color: "#0a2a1e" }}>
          {msgIsYes ? "YES" : "PAY 45.00?"}
        </div>

        <Tag x={MYBANK.x} y={MYBANK.y - 155} color={INK} o={1} size={36}>YOUR BANK</Tag>
        <Tag x={SHOPBANK.x} y={SHOPBANK.y - 155} color={INK} o={1} size={36}>SHOP&apos;S BANK</Tag>
        <Tag x={NET.x} y={NET.y + 112} color={GOLD} o={1} size={34}>CARD NETWORK</Tag>
        <Tag x={TERM.x} y={TERM.y + 125} color={INK} o={(1 - night * 0.3) * hudOut} size={34}>SHOP</Tag>
        <Tag x={MYBANK.x} y={MYBANK.y + 245} color={GOLD} o={stillHere} size={36}>STILL HERE</Tag>
        <Tag x={760} y={NET.y - 10} color={WARN} o={notMoney} size={38}>NOT MONEY</Tag>
        <Tag x={MYBANK.x} y={MYBANK.y + 245} color={MINT} o={canPay * (t < T_HOLDS + 0.2 ? 1 : 0)} size={36}>CAN PAY ✓</Tag>
        <Tag x={MYBANK.x + 20} y={MYBANK.y + 245} color={GOLD} o={held * (t > T_HOLDS + 0.2 ? 1 : 0)} size={36}>HOLD 45.00</Tag>
        <Tag x={TERM.x + 250} y={TERM.y - 20} color={MINT} o={shopYes} size={40}>GOT A YES ✓</Tag>
        <div style={{ position: "absolute", left: SHOPBANK.x, top: SHOPBANK.y + 245, transform: `translate(-50%,-50%) scale(${zeroPulse})`, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: WARN, opacity: zero, textShadow: "0 2px 14px rgba(0,0,0,0.9)", whiteSpace: "nowrap" }}>
          MONEY IN: 0.00
        </div>
        <Tag x={SHOPBANK.x} y={SHOPBANK.y + 245} color={GOLD} o={interpolate(t, [T_MOVES + 0.5, T_MOVES + 0.8], [0, 1], clamp) * hudOut} size={44}>+45.00</Tag>
        {/* the day's batch */}
        <div style={{ position: "absolute", left: batchPos.x - 95, top: batchPos.y - 70, width: 190, height: 140, opacity: batchO }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ position: "absolute", left: 10 + i * 8, top: 30 - i * 10, width: 150, height: 90, borderRadius: 10, background: "#f4f1e6", border: "2px solid #c9c2a8", transform: `rotate(${-6 + i * 3}deg)` }} />
          ))}
          <Tag x={95} y={-50} color={INK} o={1} size={34}>TODAY&apos;S TAPS</Tag>
        </div>
        <Tag x={NET.x} y={NET.y - 125} color={GOLD} o={interpolate(t, [T_SETTLEW - 0.1, T_SETTLEW + 0.2, T_MOVES + 0.8, T_MOVES + 1.2], [0, 1, 1, 0], clamp)} size={40}>SETTLE UP</Tag>
      </AbsoluteFill>

      {/* ---------- HUD ---------- */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 92, lineHeight: 1.04, letterSpacing: -2, color: "#fff", opacity: 1 - titleOut, transform: `translateY(${-30 * titleOut}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        YOU JUST PAID.
        <br />
        <span style={{ color: GOLD }}>WHERE&apos;S THE MONEY?</span>
      </div>

      <div style={{ position: "absolute", top: 180, left: 70, width: 940, display: "flex", gap: 30, fontFamily: FONT, opacity: hudO, transform: `translateY(${20 * (1 - Math.min(1, hudIn))}px)` }}>
        <div style={{ flex: 1, borderRadius: 26, padding: "18px 10px", background: "rgba(3,22,17,0.8)", border: `4px solid ${yesDone ? MINT : INK}`, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 4, color: INK }}>THE YES</div>
          <div style={{ fontWeight: 700, fontSize: 84, color: yesDone ? MINT : INK, fontVariantNumeric: "tabular-nums" }}>{yesDone ? "SECONDS" : "…"}</div>
        </div>
        <div style={{ flex: 1, borderRadius: 26, padding: "18px 10px", background: "rgba(3,22,17,0.8)", border: `4px solid ${moved ? GOLD : WARN}`, textAlign: "center", transform: `scale(${moneyClockPulse})` }}>
          <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: 4, color: INK }}>THE MONEY</div>
          <div style={{ fontWeight: 700, fontSize: 84, color: moved ? GOLD : WARN, fontVariantNumeric: "tabular-nums" }}>{moved ? "MOVED" : `+${Math.floor(hours)} H`}</div>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: 2, color: "rgba(233,245,238,0.75)" }}>USUALLY 1+ DAY</div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 448, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 4, color: "rgba(233,245,238,0.7)", opacity: interpolate(t, [T_MSG, T_MSG + 0.4], [0, 1], clamp) * hudOut }}>
        AMOUNT IS AN EXAMPLE
      </div>

      {/* payoff */}
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 64, letterSpacing: 2, color: "#ffffff", opacity: Math.min(1, payA), transform: `translateY(${24 * (1 - Math.min(1, payA))}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          YOUR TAP WAS A
        </div>
        <div style={{ fontWeight: 700, fontSize: 124, letterSpacing: -2, color: GOLD, opacity: Math.min(1, payB * 1.5), transform: `scale(${0.8 + 0.2 * payB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          PROMISE
        </div>
      </div>

      <SeriesTag name="Money Explained" n={1} accent={GOLD} until={HOOK.end} />
      <Captions lines={timeline.lines} top={1440} accent={GOLD} />
      <SeriesOutro name="Money Explained" next={2} accent={GOLD} />
    </AbsoluteFill>
  );
};
