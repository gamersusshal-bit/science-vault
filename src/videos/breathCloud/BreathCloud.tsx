import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/breath-cloud/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#7fd8ff";
const VAPOR = "#4fb3ff";
const WARN = "#ff6b6b";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const SUMMER = line("summer");
const COOL = line("cool");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_BELOW = wordStart("meter", "below");
const T_SEVENTH = wordStart("cool", "seventh");
const T_SQUEEZE = wordStart("twist", "squeezes");
const T_DROPLETS = wordStart("twist", "droplets");
const T_LIGHT = wordStart("climax", "light");
const T_CLOUD = wordStart("climax", "cloud");
const T_SKY = wordStart("climax", "sky");
const T_TINY = wordStart("payoff", "tiny");

// ---- simplified physics (Stull Table 4-1 values; Magnus fit between them) ----
const es = (T: number) => 0.6112 * Math.exp((17.62 * T) / (243.12 + T)); // kPa
const BREATH_T = 34; // warm breath, saturated (Cain et al. 1989)
// Breath mixed 1:1 with air at 50% humidity: room for water vs water carried
const cap = (Ta: number) => es((BREATH_T + Ta) / 2);
const carry = (Ta: number) => (es(BREATH_T) + 0.5 * es(Ta)) / 2;
const visible = (Ta: number) => interpolate(carry(Ta) - cap(Ta), [-0.05, 0.5], [0, 1], clamp);

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,10,30,0.85)" }}>
    {children}
  </div>
);

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PUFF_EVERY = 2.2;
const PUFF_LIFE = 3.4;

// One pane of the world: sky, ground, tree, a person in profile breathing out.
const Pane: React.FC<{ t: number; Ta: number; y0: number; y1: number; headX: number; headY: number; s: number; dotsO: number; spread: number; id: string; label?: string; boost: number }> = ({
  t, Ta, y0, y1, headX, headY, s, dotsO, spread, id, label, boost,
}) => {
  const w = interpolate(Ta, [0, 25], [1, 0], clamp); // winter fraction
  const groundY = headY + 260 * s;
  const mx = headX + 98 * s;
  const my = headY + 52 * s;
  const vis = Math.min(1, visible(Ta) + boost);
  const puffs: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  const firstP = Math.max(0, Math.floor((t - 0.2 - PUFF_LIFE) / PUFF_EVERY));
  for (let p = firstP; p <= Math.floor((t - 0.2) / PUFF_EVERY); p++) {
    const age = t - (0.2 + p * PUFF_EVERY);
    if (age < 0 || age > PUFF_LIFE) continue;
    const fade = interpolate(age, [0, 0.15, PUFF_LIFE * 0.55, PUFF_LIFE], [0, 1, 0.8, 0], clamp);
    const reach = 1 - Math.exp(-age * 1.6);
    for (let b = 0; b < 9; b++) {
      const d = (60 + b * 55) * reach * s;
      const r = (40 + b * 14 + age * 40) * s;
      const yy = my + Math.sin(b * 1.7 + p) * 18 * s * reach - age * 20 * s;
      puffs.push(<circle key={`p${p}-${b}`} cx={mx + d} cy={yy} r={r} fill={`url(#puff-${id})`} opacity={fade * vis} />);
    }
    if (dotsO > 0) {
      for (let i = 0; i < 26; i++) {
        const a = (rnd(p * 100 + i) - 0.5) * (0.9 + spread * 2.4);
        const sp = 0.55 + rnd(p * 100 + i + 50) * 0.8;
        const d = (380 + spread * 260) * sp * reach * s;
        dots.push(<circle key={`d${p}-${i}`} cx={mx + d * Math.cos(a)} cy={my + d * Math.sin(a) - age * 18 * s} r={(9 + 5 * spread) * s} fill={VAPOR} stroke="#ffffff" strokeWidth={2} opacity={dotsO * fade} />);
      }
    }
  }
  return (
    <g clipPath={`url(#clip-${id})`}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect x={0} y={y0} width={1080} height={Math.max(0, y1 - y0)} />
        </clipPath>
        <radialGradient id={`puff-${id}`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.85} />
          <stop offset="60%" stopColor="#f4fbff" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={w > 0.5 ? "#1d3d6e" : "#2d7fd0"} />
          <stop offset="100%" stopColor={w > 0.5 ? "#7fa9cf" : "#ffd98a"} />
        </linearGradient>
      </defs>
      <rect x={0} y={y0} width={1080} height={y1 - y0} fill={`url(#sky-${id})`} />
      <rect x={0} y={y0} width={1080} height={y1 - y0} fill="#1d3d6e" opacity={w > 0.5 ? 0 : w * 0.8} />
      {/* sun */}
      <circle cx={820} cy={y0 + 120 * s + 80} r={70 * s} fill={w > 0.5 ? "#e8f3ff" : "#ffe27a"} opacity={0.9} />
      {/* ground */}
      <rect x={0} y={groundY} width={1080} height={y1 - groundY + 10} fill={w > 0.5 ? "#e9f2fb" : "#5fae4e"} />
      <rect x={0} y={groundY} width={1080} height={y1 - groundY + 10} fill="#e9f2fb" opacity={w > 0.5 ? 0 : w} />
      {/* tree */}
      <g transform={`translate(${880} ${groundY}) scale(${s})`}>
        <rect x={-14} y={-260} width={28} height={260} fill="#5a3b26" />
        <path d="M 0 -200 L -80 -300 M 0 -170 L 90 -280 M 0 -240 L -30 -350 M 0 -250 L 50 -360" stroke="#5a3b26" strokeWidth={12} strokeLinecap="round" />
        <circle cx={0} cy={-320} r={130} fill="#3f8f3a" opacity={1 - w} />
        <circle cx={-80} cy={-280} r={80} fill="#4fa047" opacity={1 - w} />
        <ellipse cx={0} cy={-380} rx={100} ry={22} fill="#ffffff" opacity={w} />
      </g>
      {/* snow */}
      {w > 0.05 &&
        Array.from({ length: 60 }, (_, i) => {
          const x = (rnd(i) * 1100 + Math.sin(t + i) * 20) % 1080;
          const y = y0 + ((rnd(i + 7) * 2000 + t * (60 + rnd(i + 3) * 60)) % Math.max(1, y1 - y0));
          return <circle key={`s${i}`} cx={x} cy={y} r={3 + rnd(i + 9) * 4} fill="#ffffff" opacity={0.8 * w} />;
        })}
      {/* person in profile, facing right */}
      <g transform={`translate(${headX} ${headY}) scale(${s})`}>
        <path d="M -150 330 Q -150 150 -20 140 Q 120 150 120 330 Z" fill={w > 0.5 ? "#c0392b" : "#f39c33"} />
        <path d="M -150 330 Q -150 150 -20 140 Q 120 150 120 330 Z" fill="#2a5aa8" opacity={0} />
        <rect x={-45} y={95} width={80} height={60} fill="#e0a57a" />
        <rect x={-70} y={120} width={130} height={46} rx={20} fill="#2a5aa8" opacity={w} />
        <circle cx={0} cy={0} r={110} fill="#f0b98d" />
        <path d="M 100 -20 Q 135 15 104 32 Z" fill="#e8a97c" />
        <path d="M 82 52 Q 96 50 104 56" stroke="#7a3b2a" strokeWidth={6} fill="none" strokeLinecap="round" />
        <circle cx={58} cy={-18} r={9} fill="#2a1a12" />
        <path d="M -110 -10 Q -100 -120 10 -112 Q 80 -105 100 -50 Q 40 -70 -20 -60 Q -70 -40 -110 -10 Z" fill="#3b2418" />
        <path d="M -116 -30 Q -100 -150 20 -128 Q 100 -110 108 -40 L -116 -20 Z" fill="#2a5aa8" opacity={w} />
        <circle cx={-10} cy={-140} r={26} fill="#ffffff" opacity={w} />
      </g>
      {puffs}
      {dots}
      {label && (
        <text x={540} y={y0 === 0 ? 280 : y0 + 70} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={44} letterSpacing={4} fill="#ffffff"
          style={{ paintOrder: "stroke", stroke: "rgba(0,20,50,0.6)", strokeWidth: 6 }}>
          {label}
        </text>
      )}
    </g>
  );
};

export const BreathCloud: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // temperature of the air in the main world
  const Ta = interpolate(t, [COOL.start + 0.1, T_SEVENTH - 0.3], [25, 0], { ...clamp, easing: ease });

  // split screen in the hook -> one world
  const merge = interpolate(t, [HOOK.end + 0.1, METER.start + 0.5], [0, 1], { ...clamp, easing: ease });
  const split = 230 + 610 * (1 - merge) + 1690 * merge; // boundary between panes
  const headYA = interpolate(merge, [0, 1], [610, 1000]);
  const sA = interpolate(merge, [0, 1], [0.72, 1]);
  const headXA = interpolate(merge, [0, 1], [230, 220]);

  const dotsO = interpolate(t, [METER.start + 0.2, METER.start + 0.7, CLIMAX.start, CLIMAX.start + 0.4], [0, 1, 1, 0.25], clamp);
  const spread = interpolate(t, [SUMMER.start + 0.3, SUMMER.end], [0, 1], { ...clamp, easing: ease }) * interpolate(t, [COOL.start, COOL.start + 1], [1, 0.25], clamp);
  const zoomA = interpolate(t, [SUMMER.start - 0.1, SUMMER.start + 0.7, COOL.start, COOL.start + 0.8], [1, 1.3, 1.3, 1], { ...clamp, easing: ease });
  const boost = interpolate(t, [T_CLOUD - 0.1, T_CLOUD + 0.1], [0, 0.4], clamp);

  // meter panel
  const meterO = interpolate(t, [METER.start + 0.3, METER.start + 0.7, TWIST.start + 0.2, TWIST.start + 0.5], [0, 1, 1, 0], clamp);
  const KPA = 165;
  const capW = cap(Ta) * KPA;
  const lineX = carry(Ta) * KPA;
  const below = capW < lineX;
  const lineHint = interpolate(t, [T_BELOW - 0.1, T_BELOW + 0.3], [0, 1], clamp);

  // "a seventh" picture: air boxes holding water
  const boxO = interpolate(t, [T_SEVENTH - 0.5, T_SEVENTH - 0.1, TWIST.start + 0.4, TWIST.start + 0.7], [0, 1, 1, 0], clamp);

  // magnifier: vapour squeezing into droplets, then scattering light
  const magO = interpolate(t, [TWIST.start + 0.5, TWIST.start + 0.9, T_CLOUD - 0.15, T_CLOUD + 0.1], [0, 1, 1, 0], clamp);
  const squeeze = interpolate(t, [T_SQUEEZE - 0.1, T_DROPLETS + 0.4], [0, 1], { ...clamp, easing: ease });
  const rays = interpolate(t, [CLIMAX.start - 0.1, T_LIGHT + 0.2], [0, 1], clamp);
  const MX = 560, MY = 740, MR = 250;

  const flash = interpolate(t, [T_CLOUD, T_CLOUD + 0.06, T_CLOUD + 0.5], [0, 0.55, 0], clamp);
  const skyCloud = interpolate(t, [T_CLOUD + 0.3, T_SKY + 0.4], [0, 1], { ...clamp, easing: ease });
  const skyO = interpolate(t, [T_CLOUD + 0.3, T_CLOUD + 0.6, PAYOFF.start, PAYOFF.start + 0.3], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [0, 0.1, HOOK.end - 0.1, HOOK.end + 0.2], [1, 1, 1, 0], clamp);
  const endA = interpolate(t, [PAYOFF.start, PAYOFF.start + 0.4], [0, 1], clamp);
  const endB = interpolate(t, [T_TINY - 0.1, T_TINY + 0.3], [0, 1], clamp);

  const drops = 11;
  return (
    <AbsoluteFill style={{ background: "#0d2240", overflow: "hidden" }}>
      <Audio src={staticFile("breath-cloud/narration.wav")} />
      <Audio src={staticFile("breath-cloud/bed.wav")} volume={0.6} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
 <g transform={`translate(330 1050) scale(${zoomA}) translate(-330 -1050)`}>
        <Pane id="a" t={t} Ta={merge < 1 ? 25 : Ta} y0={0} y1={split} headX={headXA} headY={headYA} s={sA} dotsO={dotsO} spread={spread} boost={boost}
          label={merge < 0.5 ? "SUMMER · 25°C" : undefined} />
        </g>
        {merge < 1 && (
          <Pane id="b" t={t} Ta={0} y0={split + 8} y1={1920} headX={230} headY={split + 300 + 400 * merge} s={0.72} dotsO={0} spread={0} boost={0}
            label="WINTER · 0°C" />
        )}
        {merge < 1 && <rect x={0} y={split} width={1080} height={8} fill="#0d2240" />}
        {/* question mark where the summer breath should be */}
        <text x={560} y={640} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={110} fill="#ffffff"
          opacity={interpolate(t, [0.9, 1.2, HOOK.end, HOOK.end + 0.2], [0, 0.9, 0.9, 0], clamp)}
          style={{ paintOrder: "stroke", stroke: "rgba(0,20,50,0.5)", strokeWidth: 8 }}>?</text>

        {/* big sky cloud: real clouds form the same way */}
        <g opacity={skyO}>
          {[[-150, 20, 110], [-40, -30, 140], [90, -10, 125], [190, 30, 95], [20, 40, 120]].map(([dx, dy, r], i) => (
            <circle key={i} cx={560 + dx} cy={640 + dy} r={1.3 * r * (0.3 + 0.7 * skyCloud)} fill="#ffffff" opacity={0.95} />
          ))}
          {[-160, 0, 160].map((dx, i) => {
            const y = 1000 - ((t * 140 + i * 90) % 260);
            return (
              <g key={i} opacity={0.9}>
                <path d={`M ${560 + dx} ${y + 120} L ${560 + dx} ${y}`} stroke="#ffb04a" strokeWidth={14} strokeLinecap="round" />
                <polygon points={`${560 + dx - 26},${y + 10} ${560 + dx + 26},${y + 10} ${560 + dx},${y - 28}`} fill="#ffb04a" />
              </g>
            );
          })}
        </g>

        {/* magnifier */}
        <g opacity={magO}>
          <line x1={420} y1={1010} x2={MX - MR * 0.6} y2={MY + MR * 0.8} stroke="#ffffff" strokeWidth={6} strokeDasharray="14 10" />
          <circle cx={MX} cy={MY} r={MR + 12} fill="#ffffff" />
          <circle cx={MX} cy={MY} r={MR} fill="#183a63" />
          {Array.from({ length: 66 }, (_, i) => {
            const d = i % drops;
            const cx0 = MX + (rnd(d + 300) - 0.5) * MR * 1.3;
            const cy0 = MY + (rnd(d + 400) - 0.5) * MR * 1.3;
            const x0 = MX + (rnd(i + 11) - 0.5) * MR * 1.6 + Math.sin(t * 3 + i) * 10 * (1 - squeeze);
            const y0 = MY + (rnd(i + 23) - 0.5) * MR * 1.6 + Math.cos(t * 2.6 + i) * 10 * (1 - squeeze);
            const x = x0 + (cx0 - x0) * squeeze;
            const y = y0 + (cy0 - y0) * squeeze;
            if (Math.hypot(x - MX, y - MY) > MR - 8) return null;
            return <circle key={i} cx={x} cy={y} r={7} fill={VAPOR} opacity={1 - 0.7 * squeeze} />;
          })}
          {Array.from({ length: drops }, (_, d) => {
            const cx0 = MX + (rnd(d + 300) - 0.5) * MR * 1.3;
            const cy0 = MY + (rnd(d + 400) - 0.5) * MR * 1.3;
            if (Math.hypot(cx0 - MX, cy0 - MY) > MR - 30) return null;
            return (
              <g key={`dr${d}`}>
                {rays > 0 &&
                  [0, 1, 2, 3, 4].map((k) => {
                    const a = rnd(d * 10 + k) * Math.PI * 2;
                    const L = 70 * rays;
                    return <line key={k} x1={cx0} y1={cy0} x2={cx0 + L * Math.cos(a)} y2={cy0 + L * Math.sin(a)} stroke="#fff3b0" strokeWidth={4} opacity={0.9 * rays} strokeLinecap="round" />;
                  })}
                <circle cx={cx0} cy={cy0} r={22 * squeeze} fill="#e8f6ff" stroke="#ffffff" strokeWidth={3} />
                <circle cx={cx0 - 6} cy={cy0 - 7} r={6 * squeeze} fill="#ffffff" />
              </g>
            );
          })}
          {rays > 0 && (
            <g opacity={rays}>
              {[-120, -40, 40].map((o, k) => (
                <line key={k} x1={MX - MR + 20} y1={MY - MR * 0.5 + o} x2={MX - 40} y2={MY - 20 + o * 0.4} stroke="#ffe27a" strokeWidth={10} strokeLinecap="round" />
              ))}
            </g>
          )}
        </g>
      </svg>

      {/* labels in the world */}
      <Tag x={720} y={1150} color="#ffffff" o={interpolate(t, [METER.start + 0.5, METER.start + 0.8, SUMMER.start + 1, SUMMER.start + 1.3], [0, 1, 1, 0], clamp)} size={36}>
        WATER VAPOR
      </Tag>
      <Tag x={600} y={1180} color="#ffffff" o={interpolate(t, [SUMMER.start + 1.4, SUMMER.start + 1.7, COOL.start, COOL.start + 0.3], [0, 1, 1, 0], clamp)} size={38}>
        SPREADS OUT · UNSEEN
      </Tag>
      <Tag x={MX} y={MY - MR - 50} color="#ffffff" o={magO * interpolate(t, [T_DROPLETS - 0.1, T_DROPLETS + 0.2], [0, 1], clamp) * interpolate(t, [CLIMAX.start, CLIMAX.start + 0.2], [1, 0], clamp)} size={40}>
        TINY DROPLETS
      </Tag>
      <Tag x={MX} y={MY - MR - 50} color="#ffe27a" o={magO * interpolate(t, [CLIMAX.start, CLIMAX.start + 0.2], [0, 1], clamp)} size={40}>
        SCATTERING LIGHT
      </Tag>
      <Tag x={MX} y={MY - MR - 50} color="#ffffff" o={magO * interpolate(t, [TWIST.start + 0.5, TWIST.start + 0.8, T_DROPLETS - 0.2, T_DROPLETS], [0, 1, 1, 0], clamp)} size={36}>
        ZOOM: INSIDE YOUR BREATH
      </Tag>
      <Tag x={560} y={260} color="#ffffff" o={skyO} size={44}>SAME THING, BIGGER:</Tag>
      <Tag x={560} y={315} color={ACCENT} o={skyO} size={40}>RISING AIR COOLS → CLOUD</Tag>

      {/* meter panel */}
      <div style={{ position: "absolute", top: 240, left: 90, width: 900, fontFamily: FONT, opacity: meterO, background: "rgba(5,20,45,0.78)", borderRadius: 22, padding: "18px 26px 22px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700, fontSize: 34, color: ACCENT, letterSpacing: 3 }}>ROOM FOR WATER</div>
          <div style={{ fontWeight: 700, fontSize: 54, color: Ta < 12 ? "#bfe6ff" : "#ffcf6b" }}>AIR {Math.round(Ta)}°C</div>
        </div>
        <div style={{ position: "relative", height: 58, marginTop: 10, background: "rgba(255,255,255,0.08)", borderRadius: 12 }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: 58, width: capW, background: below ? WARN : ACCENT, borderRadius: 12 }} />
          <div style={{ position: "absolute", left: lineX - 4, top: -12, height: 82, width: 8, background: "#ffffff", boxShadow: lineHint > 0 ? `0 0 ${18 * lineHint}px #ffffff` : undefined }} />
        </div>
        <div style={{ position: "relative", height: 44, marginTop: 6 }}>
          <div style={{ position: "absolute", left: Math.min(lineX - 200, 440), fontWeight: 700, fontSize: 30, color: "#ffffff", letterSpacing: 2, whiteSpace: "nowrap" }}>
            ▲ WATER IN YOUR BREATH
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 36, letterSpacing: 3, marginTop: 4, color: below ? WARN : "#9cffb0", opacity: lineHint }}>
          {below ? "BELOW THE LINE → YOU SEE IT" : "ABOVE THE LINE → INVISIBLE"}
        </div>
      </div>

      {/* a seventh as much: air boxes */}
      <div style={{ position: "absolute", top: 560, left: 110, width: 860, display: "flex", justifyContent: "space-between", fontFamily: FONT, opacity: boxO }}>
        {[
          { n: "AIR AT 30°C", k: 7, c: "#ffcf6b" },
          { n: "AIR AT 0°C", k: 1, c: "#bfe6ff" },
        ].map((b, j) => (
          <div key={j} style={{ width: 400, background: "rgba(5,20,45,0.8)", border: `4px solid ${b.c}`, borderRadius: 20, padding: "14px 12px", boxSizing: "border-box", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 34, color: b.c, letterSpacing: 2 }}>{b.n}</div>
            <div style={{ fontWeight: 700, fontSize: 26, color: "#ffffff", letterSpacing: 2, marginBottom: 6 }}>CAN HOLD</div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, minHeight: 120, alignContent: "center" }}>
              {Array.from({ length: b.k }, (_, i) => (
                <svg key={i} width={46} height={58} viewBox="0 0 46 58">
                  <path d="M 23 2 C 30 18 44 30 44 40 A 21 18 0 0 1 2 40 C 2 30 16 18 23 2 Z" fill={VAPOR} stroke="#ffffff" strokeWidth={3} />
                </svg>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AbsoluteFill style={{ background: "#ffffff", opacity: flash, pointerEvents: "none" }} />

      <SeriesTag name="Why It Happens" n={10} accent={ACCENT} until={HOOK.end} />
      <div style={{ position: "absolute", top: 1355, width: "100%", textAlign: "center", fontFamily: FONT, fontSize: 44, fontWeight: 700, letterSpacing: 2, color: "#ffffff",
        opacity: titleO, textShadow: "0 4px 18px rgba(0,20,50,0.9)" }}>
        SAME BREATH. WHY ONLY IN WINTER?
      </div>
      <div style={{ position: "absolute", top: 1398, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 4,
        color: "rgba(230,245,255,0.85)", opacity: interpolate(t, [METER.start + 0.5, METER.start + 0.8, CLIMAX.start, CLIMAX.start + 0.3], [0, 1, 1, 0], clamp) }}>
        SIMPLIFIED MODEL · NOT TO SCALE
      </div>
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 70, color: "#ffffff", opacity: endA, transform: `translateY(${20 * (1 - endA)}px)`, textShadow: "0 6px 26px rgba(0,20,50,0.8)" }}>
          EVERY WINTER BREATH
        </div>
        <div style={{ fontWeight: 700, fontSize: 92, color: ACCENT, opacity: endB, transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 4px 20px rgba(0,20,50,0.85)" }}>
          IS A TINY CLOUD
        </div>
      </div>
      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="Why It Happens" next={11} accent={ACCENT} />
    </AbsoluteFill>
  );
};
