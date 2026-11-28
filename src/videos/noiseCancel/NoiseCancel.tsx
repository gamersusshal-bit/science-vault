import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/noise-cancel/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const CYAN = "#4fe3ff";
const HUM = "#ff8a3d";
const WARN = "#ff4d6d";
const VOICE = "#e27bff";
const INK = "#eef0ff";
const OK = "#7dffb2";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const MIRROR = line("mirror");
const CANCEL = line("cancel");
const WRONG = line("wrong");
const VOICEL = line("voice");
const PAYOFF = line("payoff");
const T_PHONES = wordStart("hook", "headphones");
const T_ADD = wordStart("hook", "add");
const T_QUIETLINE = wordStart("meter", "quiet");
const T_MIC = wordStart("mirror", "microphone");
const T_CHIP = wordStart("mirror", "chip");
const T_PLAYS = wordStart("mirror", "plays");
const T_IMAGE = wordStart("mirror", "image");
const T_MEETS = wordStart("cancel", "meets");
const T_CANCEL = wordStart("cancel", "cancel");
const T_TIMING = wordStart("wrong", "timing");
const T_STACK = wordStart("wrong", "stack");
const T_LOUDER = wordStart("wrong", "louder");
const T_VOICE = wordStart("voice", "voice");
const T_THROUGH = wordStart("voice", "through");
const T_SUM = wordStart("payoff", "sum");

// ---------- world layout ----------
const WIN = { x: 215, y: 650 };
const HEAD = { x: 735, y: 680 };
const CUP = { x: 742, y: 712 };
const MIC = { x: 662, y: 640 };
const K = (2 * Math.PI) / 190; // hum wavelength on the scope, px
const W = 2 * Math.PI * 1.1; // drawn hum frequency (slowed for the eye)

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(5,3,20,0.95)" }}>
    {children}
  </div>
);

const wavePath = (fn: (x: number) => number, x0: number, x1: number, y0: number, amp: number) => {
  let d = "";
  for (let x = x0; x <= x1; x += 6) d += `${x === x0 ? "M" : "L"} ${x} ${(y0 - amp * fn(x)).toFixed(1)} `;
  return d;
};

export const NoiseCancel: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sp = (at: number, damping = 12, stiffness = 170) => spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } });

  // ---------- the model ----------
  // hook: headphones land and switch on (a quick preview of the quiet), then the meter line resets to ANC OFF
  const hookOn = interpolate(t, [T_ADD, T_ADD + 0.5, HOOK.end, METER.start + 0.2], [0, 1, 1, 0], clamp);
  const mirrorOn = interpolate(t, [T_PLAYS, T_IMAGE + 0.3], [0, 1], clamp);
  const gateOn = interpolate(t, [T_MEETS, T_CANCEL], [0, 1], { ...clamp, easing: ease });
  const a = t < METER.start + 0.2 ? hookOn : mirrorOn; // anti-noise amplitude
  const g = t < METER.start + 0.2 ? hookOn : gateOn; // how much of it reaches the ear
  // "bump meets dip": the copy slides into place; then the timing goes wrong and comes back
  const slidePx = interpolate(t, [T_IMAGE, T_MEETS, T_CANCEL], [190, 190, 0], { ...clamp, easing: ease });
  const wrongDeg = interpolate(t, [T_TIMING, T_STACK, WRONG.end, VOICEL.start + 0.6], [0, 160, 160, 0], { ...clamp, easing: ease });
  const delta = (wrongDeg * Math.PI) / 180 + slidePx * K * (t < T_CANCEL + 0.2 ? 1 : 0);
  const v = interpolate(t, [T_VOICE - 0.2, T_VOICE + 0.3, PAYOFF.start + 0.2, PAYOFF.start + 0.8], [0, 1, 1, 0], clamp);

  const noise = (x: number) => Math.sin(K * x - W * t);
  const anti = (x: number) => -a * Math.sin(K * x - W * t - delta);
  const voiceW = (x: number) => v * 0.55 * Math.sin(K * 4.4 * x - W * 3.1 * t) * Math.pow(0.5 + 0.5 * Math.sin(K * 0.55 * x - t * 4.3), 2);
  const sum = (x: number) => noise(x) + g * anti(x) + voiceW(x);
  // hum level heard at the ear (voice not included)
  const L = Math.max(0.06, Math.sqrt(Math.max(0, 1 + (g * a) ** 2 - 2 * g * a * Math.cos(delta))));
  const loud = L > 1.15;

  // ---------- visuals ----------
  const cupIn = sp(T_PHONES, 11, 160);
  const cupY = 0;
  const cupX = 420 * (1 - Math.min(1, cupIn));
  const cupO = interpolate(t, [T_PHONES - 0.25, T_PHONES + 0.05], [0, 1], clamp);
  const titleOut = interpolate(t, [HOOK.end - 0.35, HOOK.end], [0, 1], clamp);
  const hudIn = sp(METER.start, 14, 170);
  const hudOut = interpolate(t, [PAYOFF.start - 0.4, PAYOFF.start - 0.05], [1, 0], clamp);
  const hudO = Math.min(1, hudIn) * hudOut * (t > HOOK.end - 0.2 ? 1 : 0);
  const quietLineFlash = interpolate(t, [T_QUIETLINE, T_QUIETLINE + 0.2, T_QUIETLINE + 0.9], [0, 1, 0], clamp);
  const micGlow = interpolate(t, [T_MIC - 0.1, T_MIC + 0.2, MIRROR.end, MIRROR.end + 0.4], [0, 1, 1, 0.3], clamp);
  const chipGlow = interpolate(t, [T_CHIP - 0.1, T_CHIP + 0.2], [0, 1], clamp) * (0.6 + 0.4 * Math.sin(t * 14));
  const scopeIn = interpolate(t, [METER.start + 0.1, METER.start + 0.6], [0, 1], clamp);
  const antiRowO = Math.max(interpolate(t, [T_PLAYS - 0.2, T_PLAYS + 0.3], [0, 1], clamp), hookOn);
  const zoomOut = interpolate(t, [0, HOOK.end - 0.2, METER.start + 0.3], [1.1, 1.1, 1.0], { ...clamp, easing: ease });
  const shakeAmt = (loud ? 8 * (L - 1) : 0) + 5 * (1 - (a > 0.5 ? 1 : 0)) * (t > METER.start ? 1 : 0.6);
  const zoomV = 1;
  const zoom = zoomOut * zoomV;
  const fx = 560;
  const fy = 760;
  const camera = `translate(${540 - fx * zoom + Math.sin(frame * 2.1) * shakeAmt}px, ${900 - fy * zoom + Math.cos(frame * 1.7) * shakeAmt}px) scale(${zoom})`;

  const payA = sp(PAYOFF.start, 14, 160);
  const payB = sp(T_SUM, 11, 170);
  const status =
    t < T_MIC ? { s: "HEADPHONES OFF", c: HUM }
    : t < T_CANCEL ? { s: "LISTENING…", c: INK }
    : t < T_STACK ? { s: "CANCELLING ✓", c: OK }
    : t < VOICEL.start + 0.5 ? { s: "OUT OF STEP ✗", c: WARN }
    : { s: "HUM CANCELLED ✓", c: OK };

  const meterX = 110;
  const meterW = 860;
  const levelPx = Math.min(1, L / 2) * meterW;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 55% 38%, #2a1a5e 0%, #140c38 50%, #07051a 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("noise-cancel/narration.wav")} />
      <Audio src={staticFile("noise-cancel/bed.wav")} volume={0.6} />
      {/* faint cabin panel lines */}
      <AbsoluteFill style={{ opacity: 0.1, backgroundImage: "repeating-linear-gradient(90deg, rgba(238,240,255,0.7) 0px, rgba(238,240,255,0.7) 2px, transparent 2px, transparent 120px)" }} />

      <AbsoluteFill style={{ transform: camera, transformOrigin: "0px 0px" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6f8fe0" />
              <stop offset="100%" stopColor="#d7b7e8" />
            </linearGradient>
            <clipPath id="winclip">
              <rect x={WIN.x - 110} y={WIN.y - 150} width={220} height={300} rx={100} />
            </clipPath>
          </defs>
          {/* cabin window with a jet engine outside */}
          <rect x={WIN.x - 130} y={WIN.y - 170} width={260} height={340} rx={118} fill="#3a3070" stroke="#8b83c9" strokeWidth={6} />
          <g clipPath="url(#winclip)">
            <rect x={WIN.x - 110} y={WIN.y - 150} width={220} height={300} fill="url(#sky)" />
            <rect x={WIN.x - 200} y={WIN.y - 10} width={400} height={26} fill="#c9cbe0" transform={`rotate(-6 ${WIN.x} ${WIN.y})`} />
            <ellipse cx={WIN.x + 10} cy={WIN.y + 70} rx={95} ry={58} fill="#9aa0bd" stroke="#e9ebff" strokeWidth={4} />
            <ellipse cx={WIN.x - 50} cy={WIN.y + 70} rx={30} ry={50} fill="#2b2f45" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const ang = t * 900 + i * 60;
              return <line key={i} x1={WIN.x - 50} y1={WIN.y + 70} x2={WIN.x - 50 + 26 * Math.cos((ang * Math.PI) / 180)} y2={WIN.y + 70 + 44 * Math.sin((ang * Math.PI) / 180)} stroke="#c9cbe0" strokeWidth={5} />;
            })}
          </g>
          {/* hum spreading from the engine */}
          {[0, 1, 2, 3].map((i) => {
            const r = ((t * 150 + i * 105) % 420) + 60;
            const o = (1 - r / 480) * 0.9;
            const span = 0.55;
            const cx = WIN.x + 60;
            const cy = WIN.y + 40;
            return (
              <path key={i} d={`M ${cx + r * Math.cos(-span)} ${cy + r * Math.sin(-span)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(span)} ${cy + r * Math.sin(span)}`} fill="none" stroke={HUM} strokeWidth={9} strokeLinecap="round" opacity={o} />
            );
          })}
          {/* the voice: a speech bubble from the seat next to you */}
          <g opacity={v}>
            <rect x={110} y={880} width={250} height={96} rx={30} fill="#2a1d55" stroke={VOICE} strokeWidth={5} />
            <polygon points="300,972 340,972 350,1004" fill="#2a1d55" stroke={VOICE} strokeWidth={5} />
            <path d={wavePath((x) => Math.sin(x * 0.17 - t * 16) * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.03 - t * 5))), 140, 330, 928, 26)} fill="none" stroke={VOICE} strokeWidth={6} />
            <path d={`M 370 920 Q 520 880 ${CUP.x - 90} ${CUP.y + 40}`} fill="none" stroke={VOICE} strokeWidth={6} strokeDasharray="16 12" strokeDashoffset={-t * 80} />
          </g>

          {/* the listener (generic head in profile, facing left) */}
          <ellipse cx={HEAD.x + 20} cy={HEAD.y + 330} rx={230} ry={120} fill="#3b2f7a" />
          <rect x={HEAD.x - 40} y={HEAD.y + 120} width={120} height={150} rx={40} fill="#c98f6b" />
          <circle cx={HEAD.x} cy={HEAD.y} r={170} fill="#d9a07a" />
          <path d={`M ${HEAD.x - 165} ${HEAD.y - 10} Q ${HEAD.x - 205} ${HEAD.y + 30} ${HEAD.x - 160} ${HEAD.y + 55}`} fill="#d9a07a" />
          <path d={`M ${HEAD.x - 120} ${HEAD.y - 150} Q ${HEAD.x + 40} ${HEAD.y - 230} ${HEAD.x + 170} ${HEAD.y - 40} L ${HEAD.x + 150} ${HEAD.y - 120} Q ${HEAD.x + 20} ${HEAD.y - 200} ${HEAD.x - 120} ${HEAD.y - 150}`} fill="#3a2418" />
          <circle cx={HEAD.x - 95} cy={HEAD.y - 20} r={12} fill="#2b1a12" />

          {/* sound reaching the ear: orange = hum heard, red = louder */}
          {[0, 1].map((i) => {
            const r = 120 + ((t * 70 + i * 40) % 80);
            const o = Math.min(1, L) * (1 - ((t * 70 + i * 40) % 80) / 80) * (t > 0.1 ? 1 : 0);
            return <circle key={i} cx={CUP.x} cy={CUP.y + cupY} r={r} fill="none" stroke={loud ? WARN : HUM} strokeWidth={6 + 6 * Math.min(2, L)} opacity={o} />;
          })}

          {/* headphones */}
          <g transform={`translate(${cupX} ${cupY})`} opacity={cupO}>
            <path d={`M ${CUP.x - 60} ${CUP.y - 80} Q ${HEAD.x - 30} ${HEAD.y - 260} ${HEAD.x + 140} ${HEAD.y - 150}`} fill="none" stroke="#1c1838" strokeWidth={30} strokeLinecap="round" />
            <path d={`M ${CUP.x - 60} ${CUP.y - 80} Q ${HEAD.x - 30} ${HEAD.y - 260} ${HEAD.x + 140} ${HEAD.y - 150}`} fill="none" stroke={CYAN} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
            <rect x={CUP.x - 85} y={CUP.y - 105} width={170} height={210} rx={70} fill="#1c1838" stroke={CYAN} strokeWidth={6} />
            {/* cut-away inside */}
            <rect x={CUP.x - 62} y={CUP.y - 82} width={124} height={164} rx={52} fill="#0d0a22" />
            {/* chip */}
            <rect x={CUP.x - 22} y={CUP.y - 66} width={44} height={36} rx={6} fill="#2d2a55" stroke={CYAN} strokeWidth={3} opacity={0.6 + 0.4 * chipGlow} />
            {[-14, 0, 14].map((dx) => <line key={dx} x1={CUP.x + dx} y1={CUP.y - 74} x2={CUP.x + dx} y2={CUP.y - 66} stroke={CYAN} strokeWidth={3} />)}
            <rect x={CUP.x - 22} y={CUP.y - 66} width={44} height={36} rx={6} fill={CYAN} opacity={0.5 * chipGlow} />
            {/* speaker */}
            <circle cx={CUP.x} cy={CUP.y + 28} r={40} fill="#2d2a55" stroke={CYAN} strokeWidth={4} />
            <circle cx={CUP.x} cy={CUP.y + 28} r={16 + 5 * a * Math.sin(t * 20)} fill={CYAN} opacity={0.4 + 0.6 * a} />
            {/* microphone on the outside */}
            <circle cx={MIC.x} cy={MIC.y} r={15} fill="#e9ebff" />
            <circle cx={MIC.x} cy={MIC.y} r={15 + 26 * micGlow} fill="none" stroke={HUM} strokeWidth={5} opacity={micGlow * (0.5 + 0.5 * Math.sin(t * 12))} />
            {/* wire mic -> chip -> speaker */}
            <line x1={MIC.x - 14} y1={MIC.y - 8} x2={500 - cupX} y2={595} stroke={HUM} strokeWidth={4} opacity={micGlow} />
            <path d={`M ${MIC.x + 12} ${MIC.y} L ${CUP.x - 22} ${CUP.y - 48}`} stroke={HUM} strokeWidth={4} opacity={micGlow} strokeDasharray="8 6" strokeDashoffset={-t * 60} />
            <path d={`M ${CUP.x} ${CUP.y - 30} L ${CUP.x} ${CUP.y - 12}`} stroke={CYAN} strokeWidth={5} opacity={mirrorOn + hookOn} />
            {/* anti-noise rings */}
            {[0, 1, 2].map((i) => {
              const p = (t * 1.6 + i / 3) % 1;
              return <circle key={i} cx={CUP.x} cy={CUP.y + 28} r={44 + 70 * p} fill="none" stroke={CYAN} strokeWidth={5} opacity={a * (1 - p) * 0.9} />;
            })}
          </g>

          {/* ---------- scope: hum + copy = what you hear ---------- */}
          <g opacity={scopeIn}>
            <rect x={70} y={985} width={880} height={290} rx={28} fill="rgba(7,5,26,0.85)" stroke="rgba(238,240,255,0.25)" strokeWidth={3} />
            {[1035, 1130, 1225].map((y) => <line key={y} x1={250} y1={y} x2={920} y2={y} stroke="rgba(238,240,255,0.12)" strokeWidth={2} />)}
            <path d={wavePath((x) => noise(x) + voiceW(x), 250, 920, 1035, 34)} fill="none" stroke={HUM} strokeWidth={7} />
            <path d={wavePath(anti, 250, 920, 1130, 34)} fill="none" stroke={CYAN} strokeWidth={7} opacity={antiRowO} />
            <path d={wavePath(sum, 250, 920, 1225, 28)} fill="none" stroke={loud ? WARN : "#ffffff"} strokeWidth={8} />
          </g>
        </svg>

        {/* scope labels */}
        <div style={{ position: "absolute", left: 92, top: 1012, fontFamily: FONT, fontWeight: 700, fontSize: 34, color: HUM, opacity: scopeIn, letterSpacing: 2 }}>HUM</div>
        <div style={{ position: "absolute", left: 92, top: 1107, fontFamily: FONT, fontWeight: 700, fontSize: 34, color: CYAN, opacity: scopeIn * Math.max(0.35, antiRowO), letterSpacing: 2 }}>+ COPY</div>
        <div style={{ position: "absolute", left: 92, top: 1202, fontFamily: FONT, fontWeight: 700, fontSize: 34, color: loud ? WARN : "#ffffff", opacity: scopeIn, letterSpacing: 2 }}>= EAR</div>

        <Tag x={WIN.x} y={WIN.y - 205} color={INK} o={1} size={36}>ENGINE HUM</Tag>
        <Tag x={470} y={575} color={HUM} o={micGlow} size={36}>MIC</Tag>
        <Tag x={CUP.x + 180} y={CUP.y - 50 + cupY} color={CYAN} o={interpolate(t, [T_CHIP - 0.1, T_CHIP + 0.2, MIRROR.end, MIRROR.end + 0.3], [0, 1, 1, 0], clamp)} size={36}>CHIP</Tag>
        <Tag x={CUP.x + 170} y={CUP.y + 150} color={CYAN} o={interpolate(t, [T_IMAGE - 0.1, T_IMAGE + 0.2, CANCEL.end, CANCEL.end + 0.3], [0, 1, 1, 0], clamp)} size={36}>MIRROR IMAGE</Tag>
        <Tag x={235} y={850} color={VOICE} o={v} size={36}>VOICE</Tag>
        <Tag x={470} y={800} color={VOICE} o={interpolate(t, [T_THROUGH - 0.1, T_THROUGH + 0.2], [0, 1], clamp) * v} size={36}>GETS IN</Tag>
        <Tag x={250} y={935} color={WARN} o={interpolate(t, [T_STACK - 0.1, T_STACK + 0.2, WRONG.end, WRONG.end + 0.3], [0, 1, 1, 0], clamp)} size={36}>LOUDER ✗</Tag>
        <Tag x={250} y={935} color={OK} o={interpolate(t, [T_CANCEL, T_CANCEL + 0.25, T_TIMING - 0.2, T_TIMING], [0, 1, 1, 0], clamp)} size={36}>CANCELLED ✓</Tag>
      </AbsoluteFill>

      {/* ---------- HUD: hum meter ---------- */}
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 90, lineHeight: 1.04, letterSpacing: -2, color: "#fff", opacity: 1 - titleOut, transform: `translateY(${-30 * titleOut}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        THEY ADD SOUND.
        <br />
        <span style={{ color: CYAN }}>SO WHY IS IT QUIET?</span>
      </div>

      <div style={{ position: "absolute", top: 185, left: meterX - 20, width: meterW + 40, height: 230, borderRadius: 28, background: "rgba(7,5,26,0.82)", border: `4px solid ${loud ? WARN : L < 0.15 ? OK : "rgba(238,240,255,0.35)"}`, opacity: hudO, transform: `translateY(${20 * (1 - Math.min(1, hudIn))}px)`, fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 14, left: 24, fontWeight: 700, fontSize: 36, letterSpacing: 4, color: INK }}>HUM YOU HEAR</div>
        <div style={{ position: "absolute", top: 14, right: 24, fontWeight: 700, fontSize: 36, letterSpacing: 2, color: status.c }}>{status.s}</div>
        <div style={{ position: "absolute", top: 80, left: 20, width: meterW, height: 70, borderRadius: 18, background: "#1b1440", overflow: "hidden" }}>
          <div style={{ width: levelPx, height: "100%", background: loud ? WARN : L < 0.15 ? OK : HUM, borderRadius: 18 }} />
        </div>
        {/* quiet line + hum alone mark */}
        <div style={{ position: "absolute", top: 66, left: 20 + 0.06 * meterW, width: 8, height: 98, background: OK, boxShadow: `0 0 ${10 + 30 * quietLineFlash}px ${OK}` }} />
        <div style={{ position: "absolute", top: 166, left: 20 + 0.06 * meterW - 30, fontWeight: 700, fontSize: 34, letterSpacing: 2, color: OK, transform: `scale(${1 + 0.15 * quietLineFlash})`, transformOrigin: "left center" }}>QUIET LINE</div>
        <div style={{ position: "absolute", top: 66, left: 20 + 0.5 * meterW, width: 6, height: 98, background: "rgba(238,240,255,0.6)" }} />
        <div style={{ position: "absolute", top: 166, left: 20 + 0.5 * meterW - 20, fontWeight: 700, fontSize: 34, letterSpacing: 2, color: "rgba(238,240,255,0.75)" }}>HUM ALONE</div>
      </div>

      {/* target pointer during the meter line */}
      <div style={{ position: "absolute", top: 428, left: meterX + 0.06 * meterW - 10 + 30 * Math.abs(Math.sin(t * 5)), fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 3, color: OK, opacity: interpolate(t, [T_QUIETLINE - 0.1, T_QUIETLINE + 0.2, T_MIC - 0.2, T_MIC + 0.2], [0, 1, 1, 0], clamp), whiteSpace: "nowrap" }}>
        ◀ GET THE BAR DOWN HERE
      </div>

      {/* payoff */}
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 70, letterSpacing: 2, color: "#ffffff", opacity: Math.min(1, payA), transform: `translateY(${24 * (1 - Math.min(1, payA))}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          HUM + COPY
        </div>
        <div style={{ fontWeight: 700, fontSize: 116, letterSpacing: -2, color: CYAN, opacity: Math.min(1, payB * 1.5), transform: `scale(${0.8 + 0.2 * payB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          = NEAR SILENCE
        </div>
      </div>

      <SeriesTag name="How It Works" n={8} accent={CYAN} until={HOOK.end} />
      <Captions lines={timeline.lines} top={1440} accent={CYAN} />
      <SeriesOutro name="How It Works" next={9} accent={CYAN} />
    </AbsoluteFill>
  );
};
