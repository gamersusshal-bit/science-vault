import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/ant-fall/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#c6ff3d";
const PERSON = "#ff8a3d";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const LIMIT = line("limit");
const WHY = line("why");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_SLIP = 0.35;
const T_SCALE = wordStart("twist", "scale");
const T_SURF = wordStart("why", "air");
const T_ALL = wordStart("why", "nearly");
const T_WEIGHT = wordStart("climax", "weight");
const T_BREAK = wordStart("climax", "break");

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 38, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,20,40,0.85)" }}>
    {children}
  </div>
);

// A generic ant, legs spread, about 220 px long at scale 1, centred on (0,0).
const Ant: React.FC<{ x: number; y: number; s: number; rot: number; t: number; walk?: number }> = ({ x, y, s, rot, t, walk = 0 }) => {
  const body = "#3b1c14";
  const hi = "#7a3b26";
  const leg = (side: number, k: number) => {
    const bx = -20 + k * 28;
    const wig = Math.sin(t * (walk ? 14 : 5) + k * 2 + side) * (walk ? 16 : 7);
    const kx = bx + (k - 1) * 30 + wig;
    const ky = side * 52;
    const fx = bx + (k - 1) * 62 + wig * 1.4;
    const fy = side * (86 - Math.abs(k - 1) * 6);
    return <path key={`${side}${k}`} d={`M ${bx} ${side * 10} L ${kx} ${ky} L ${fx} ${fy}`} fill="none" stroke={body} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />;
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {[-1, 1].map((sd) => [0, 1, 2].map((k) => leg(sd, k)))}
      {/* antennae */}
      <path d={`M 88 -8 Q 120 -50 ${150 + Math.sin(t * 6) * 6} -60`} fill="none" stroke={body} strokeWidth={6} strokeLinecap="round" />
      <path d={`M 88 8 Q 120 50 ${150 + Math.cos(t * 6) * 6} 60`} fill="none" stroke={body} strokeWidth={6} strokeLinecap="round" />
      {/* abdomen, thorax, head */}
      <ellipse cx={-70} cy={0} rx={52} ry={38} fill={body} />
      <ellipse cx={-78} cy={-12} rx={26} ry={12} fill={hi} opacity={0.6} />
      <ellipse cx={8} cy={0} rx={34} ry={20} fill={body} />
      <ellipse cx={78} cy={0} rx={30} ry={26} fill={body} />
      <ellipse cx={72} cy={-9} rx={13} ry={7} fill={hi} opacity={0.6} />
      <circle cx={92} cy={-12} r={6} fill="#111" />
      <circle cx={92} cy={12} r={6} fill="#111" />
    </g>
  );
};

// A generic person, spread-eagle, about 260 px tall, centred on (0,0).
const Person: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  const f = Math.sin(t * 8) * 4;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M -10 -60 L -95 ${-110 + f} M 10 -60 L 95 ${-110 - f} M -12 40 L -70 ${125 + f} M 12 40 L 70 ${125 - f}`}
        stroke={PERSON} strokeWidth={26} strokeLinecap="round" fill="none" />
      <rect x={-34} y={-75} width={68} height={125} rx={30} fill={PERSON} />
      <circle cx={0} cy={-110} r={32} fill="#ffc8a0" />
      <path d="M -32 -118 Q 0 -150 32 -118 Z" fill="#3a2a22" />
    </g>
  );
};

const Arrow: React.FC<{ x: number; y: number; len: number; up?: boolean; w: number; color: string; o?: number }> = ({ x, y, len, up, w, color, o = 1 }) => {
  if (len < 2) return null;
  const d = up ? -1 : 1;
  const head = Math.min(len * 0.45, w * 2.4);
  return (
    <g opacity={o}>
      <line x1={x} y1={y} x2={x} y2={y + d * (len - head * 0.8)} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M ${x - w * 1.4} ${y + d * (len - head)} L ${x + w * 1.4} ${y + d * (len - head)} L ${x} ${y + d * len} Z`} fill={color} />
    </g>
  );
};

export const AntFall: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Speeds (km/h) ----------
  const antTop = 7;
  const antV = interpolate(t, [T_SLIP, T_SLIP + 0.6], [0, antTop], { ...clamp, easing: Easing.out(Easing.cubic) });
  const personV = 200 * (1 - Math.exp(-Math.max(0, t - METER.start) / 2.2));
  // scaled-up ant speeds up in the climax
  const bigV = interpolate(t, [T_WEIGHT, T_BREAK], [antTop, 95], { ...clamp, easing: Easing.in(Easing.quad) });
  const grow = interpolate(t, [T_SCALE, T_SCALE + 1.6], [0, 1], { ...clamp, easing: ease });
  const reset = interpolate(t, [PAYOFF.start - 0.15, PAYOFF.start + 0.35], [0, 1], { ...clamp, easing: ease });
  const shownAntV = t < T_WEIGHT ? antV : bigV;

  // ---------- Fall scroll: how far the building has moved up past the camera ----------
  const scroll = interpolate(t, [T_SLIP, CLIMAX.start, T_BREAK], [0, 1900, 3600], clamp) + (t > T_SLIP ? (t - T_SLIP) * 20 : 0);

  // ---------- Ant placement ----------
  const ledgeY = 720;
  const slip = interpolate(t, [T_SLIP, T_SLIP + 0.7], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const walkIn = interpolate(t, [0, T_SLIP], [-70, 0], clamp);
  const antS = interpolate(grow, [0, 1], [1.25, 2.4]) * (1 - reset) + 0.9 * reset;
  // during the climax the big ant drops toward the ground
  const dropBig = interpolate(t, [T_WEIGHT, T_BREAK], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const antX = 330 + walkIn * (1 - slip) + 200 * slip;
  const antYfall = interpolate(slip, [0, 1], [ledgeY - 70, 860]) + Math.sin(t * 1.6) * 10 * slip;
  const antY = antYfall + dropBig * 180;
  const antRot = interpolate(slip, [0, 1], [0, 6]) + Math.sin(t * 1.3) * 5 * slip;
  const groundY = interpolate(t, [T_WEIGHT, T_BREAK], [2100, 1290], { ...clamp, easing: Easing.in(Easing.quad) });

  // ---------- Camera ----------
  const zoomWhy = interpolate(t, [WHY.start - 0.2, WHY.start + 0.7, WHY.end - 0.1, TWIST.start + 0.4], [0, 1, 1, 0], { ...clamp, easing: ease });
  const impact = t > T_BREAK ? Math.exp(-(t - T_BREAK) * 5) : 0;
  const shake = (t > T_SLIP ? 6 * Math.exp(-(t - T_SLIP) * 4) : 0) + 22 * impact;
  const scale = 1 + 0.7 * zoomWhy;
  const camera = `translate(${Math.sin(frame * 2.3) * shake}px, ${Math.cos(frame * 1.9) * shake}px) scale(${scale})`;

  // ---------- Person ----------
  const personT = t - METER.start;
  const personY = personT < 0 ? -300 : 560 + 0.5 * 900 * personT * personT;
  const personO = interpolate(t, [METER.start, METER.start + 0.1], [0, 1], clamp);

  // ---------- Forces on the ant ----------
  const forceO = interpolate(t, [WHY.start + 0.2, WHY.start + 0.6], [0, 1], clamp) * interpolate(t, [T_BREAK - 0.15, T_BREAK], [1, 0], clamp);
  const airO = interpolate(t, [T_SURF - 0.1, T_SURF + 0.3], [0, 1], clamp) * forceO;
  const gravLen = 150 * (1 + 4 * Math.pow(dropBig > 0 ? 1 : grow, 1) * interpolate(t, [T_WEIGHT - 0.2, T_WEIGHT + 0.6], [0, 1], clamp));
  const airLen = 60 * (t < T_WEIGHT ? 1 : 1 + 0.6 * interpolate(t, [T_WEIGHT, T_WEIGHT + 0.6], [0, 1], clamp));

  // ---------- Labels ----------
  const fadeIO = (a: number, b: number, c: number, d: number) => interpolate(t, [a, b, c, d], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [HOOK.end - 0.15, HOOK.end + 0.25], [1, 0], clamp);
  const hudO = interpolate(t, [METER.start - 0.15, METER.start + 0.25], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.3, PAYOFF.start + 0.1], [1, 0], clamp);
  const hudPop = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 12, stiffness: 160 } });
  const topO = fadeIO(LIMIT.start + 0.3, LIMIT.start + 0.6, WHY.start, WHY.start + 0.3);
  const jogO = fadeIO(wordStart("limit", "slower"), wordStart("limit", "slower") + 0.3, WHY.end, WHY.end + 0.3);
  const gravTagO = fadeIO(WHY.start + 0.4, WHY.start + 0.8, TWIST.start + 0.2, TWIST.start + 0.5);
  const allO = fadeIO(T_ALL, T_ALL + 0.3, TWIST.start + 0.2, TWIST.start + 0.5);
  const sizeO = fadeIO(T_SCALE + 0.5, T_SCALE + 0.9, CLIMAX.start + 0.2, CLIMAX.start + 0.5);
  const barsO = fadeIO(CLIMAX.start, CLIMAX.start + 0.35, T_BREAK + 0.6, PAYOFF.start);
  const surfGrow = interpolate(t, [CLIMAX.start + 0.1, CLIMAX.start + 0.7], [0, 1], { ...clamp, easing: ease });
  const weightGrow = interpolate(t, [T_WEIGHT, T_WEIGHT + 1.4], [0, 1], { ...clamp, easing: ease });
  const crackO = interpolate(t, [T_BREAK, T_BREAK + 0.1], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.2, PAYOFF.start + 0.2], [1, 0], clamp);
  const flash = interpolate(t, [T_BREAK - 0.03, T_BREAK + 0.05, T_BREAK + 0.6], [0, 1, 0], clamp);
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "to") * fps), fps, config: { damping: 11, stiffness: 170 } });
  const noteO = fadeIO(LIMIT.start, LIMIT.start + 0.4, WHY.start, WHY.start + 0.4);

  // payoff: small ant on the pavement walking away
  const walkX = interpolate(t, [PAYOFF.start, timeline.duration], [420, 700], clamp);

  // Building windows
  const BW = 300;
  const rows = Array.from({ length: 40 }, (_, r) => r);
  const winH = 120;

  // speed bar mapping
  const BAR = 720;
  const vx = (v: number) => (BAR * Math.min(v, 220)) / 220;

  return (
    <AbsoluteFill style={{ background: "#9fd8ff", overflow: "hidden" }}>
      <Audio src={staticFile("ant-fall/narration.wav")} />
      <Audio src={staticFile("ant-fall/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: `${antX}px ${antY}px` }}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #145a9c 0%, #2f7fc4 50%, #5aa6dc 100%)" }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          {/* distant city */}
          {Array.from({ length: 9 }, (_, i) => {
            const h = 500 + ((i * 271) % 600);
            const y = 1500 - h - ((scroll * 0.15) % 400) * 0 - scroll * 0.12;
            return <rect key={i} x={340 + i * 90} y={y} width={80} height={h + 2000} fill="#2a5f8e" opacity={0.7} />;
          })}
          {/* clouds drift up as we fall */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = ((((i * 520 + 300 - scroll * 0.5) % 2400) + 2400) % 2400) - 300;
            const x = 380 + ((i * 337) % 600);
            return (
              <g key={i} opacity={0.45}>
                <ellipse cx={x} cy={y} rx={130} ry={44} fill="#ffffff" />
                <ellipse cx={x + 70} cy={y - 24} rx={80} ry={40} fill="#ffffff" />
              </g>
            );
          })}
          {/* skyscraper on the left, scrolling up */}
          <rect x={0} y={0} width={BW} height={1920} fill="#5b7488" />
          {rows.map((r) => {
            const y = ((r * winH - scroll) % (winH * 40) + winH * 40) % (winH * 40) - winH;
            return (
              <g key={r}>
                {[30, 120, 210].map((x) => (
                  <rect key={x} x={x} y={y + 18} width={64} height={84} rx={4} fill={(r + x) % 3 === 0 ? "#cfeaff" : "#9cc7e6"} />
                ))}
                <rect x={0} y={y} width={BW} height={8} fill="#4a6173" />
              </g>
            );
          })}
          {/* the roof ledge the ant falls from */}
          <rect x={0} y={ledgeY - scroll} width={BW + 40} height={26} fill="#3d5163" />
          <rect x={0} y={ledgeY - scroll - 900} width={BW + 40} height={900} fill="#9fd8ff" opacity={0} />

          {/* pavement rushing up in the climax */}
          <rect x={0} y={groundY} width={1080} height={900} fill="#8a8f98" />
          <rect x={0} y={groundY} width={1080} height={16} fill="#6c717a" />
          {crackO > 0 && (
            <g opacity={crackO} stroke="#2b2e34" strokeWidth={8} fill="none" strokeLinecap="round">
              {Array.from({ length: 8 }, (_, i) => {
                const a = Math.PI * (0.05 + 0.9 * (i / 7));
                const r = 150 + (i % 3) * 60;
                return <path key={i} d={`M ${antX} ${groundY + 4} L ${antX + Math.cos(a) * r * 0.5} ${groundY + 4 + Math.sin(a) * 40} L ${antX + Math.cos(a) * r} ${groundY + 8 + Math.sin(a) * 90}`} />;
              })}
            </g>
          )}

          {/* falling person (comparison), accelerating out of frame */}
          {personO > 0 && personY < 2200 && t < WHY.end && (
            <g opacity={personO}>
              <Person x={800} y={personY} t={t} />
              {/* speed streaks */}
              {Array.from({ length: 6 }, (_, i) => (
                <line key={i} x1={740 + i * 24} y1={personY - 170 - personV * 1.2} x2={740 + i * 24} y2={personY - 170}
                  stroke="#ffffff" strokeWidth={5} opacity={0.6} />
              ))}
            </g>
          )}

          {/* air push (many small arrows along the body) and gravity (one arrow from the middle) */}
          {t < PAYOFF.start && (
            <g>
              <g opacity={airO}>
                {[-150, -100, -50, 0, 50, 100, 150].map((dx, i) => (
                  <Arrow key={i} x={antX + dx * antS * 0.85} y={antY + 95 * antS + airLen} len={airLen} up w={10} color={ACCENT} />
                ))}
              </g>
              <Arrow x={antX - 70 * antS} y={antY} len={Math.min(gravLen, 330) * forceO} w={16} color="#ff4d6d" o={forceO} />
            </g>
          )}

          {/* the ant */}
          {t < PAYOFF.start - 0.15 || reset < 1 ? (
            <Ant x={antX} y={antY} s={antS} rot={antRot} t={t} />
          ) : null}
          {/* payoff: small ant walking on the pavement next to the crack */}
          {reset > 0 && (
            <g opacity={reset}>
              <Ant x={walkX} y={1200} s={0.9} rot={0} t={t} walk={1} />
            </g>
          )}
        </svg>

        {/* World labels */}
        <Tag x={antX} y={antY - 130 * antS} color="#ffffff" o={topO} size={40}>TOP SPEED, ALREADY</Tag>
        <Tag x={antX} y={antY + 95 * antS + airLen + 40} color={ACCENT} o={airO * (1 - zoomWhy * 0.2)} size={32}>AIR PUSH</Tag>
        <Tag x={antX - 70 * antS - 110} y={antY + 60} color="#ff8aa0" o={gravTagO} size={34}>WEIGHT</Tag>
        <Tag x={antX} y={antY - 130 * antS} color="#ffffff" o={allO} size={40}>BALANCED</Tag>
        <Tag x={540} y={560} color="#ffffff" o={sizeO} size={44}>SCALED UP TO YOUR SIZE</Tag>
        <Tag x={antX} y={1140} color="#ffffff" o={interpolate(t, [T_BREAK, T_BREAK + 0.2], [0, 1], clamp) * crackO} size={56}>CRACK</Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill style={{ background: `rgba(255,255,255,${0.45 * flash})` }} />

      {/* HUD: fall-speed bars */}
      <div style={{ position: "absolute", top: 165, left: 0, width: "100%", fontFamily: FONT, opacity: hudO,
        transform: `scale(${0.85 + 0.15 * Math.min(1, hudPop)})`, transformOrigin: "540px 0px" }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 32, letterSpacing: 7, color: "#ffffff", textShadow: "0 2px 10px rgba(0,20,40,0.9)" }}>FALL SPEED · KM/H</div>
        <div style={{ position: "relative", margin: "14px auto 0", width: BAR + 40, height: 230, background: "rgba(8,30,50,0.72)", borderRadius: 18, padding: "18px 20px", boxSizing: "border-box" }}>
          {/* person row */}
          <div style={{ fontWeight: 700, fontSize: 30, color: PERSON, letterSpacing: 3 }}>YOU · {Math.round(personV)}</div>
          <div style={{ position: "relative", height: 34, marginTop: 6, background: "rgba(255,255,255,0.15)", borderRadius: 8 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 34, width: vx(personV) - 40, background: PERSON, borderRadius: 8 }} />
            <div style={{ position: "absolute", left: vx(200) - 40 - 3, top: -8, width: 6, height: 50, background: "#fff" }} />
          </div>
          {/* ant row */}
          <div style={{ fontWeight: 700, fontSize: 30, color: ACCENT, letterSpacing: 3, marginTop: 16 }}>
            {t < T_SCALE ? "ANT" : "GIANT ANT"} · {Math.round(shownAntV)}
          </div>
          <div style={{ position: "relative", height: 34, marginTop: 6, background: "rgba(255,255,255,0.15)", borderRadius: 8 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 34, width: Math.max(8, vx(shownAntV) - 40), background: ACCENT, borderRadius: 8,
              boxShadow: `0 0 16px ${ACCENT}` }} />
            <div style={{ position: "absolute", left: vx(9) - 40 + 20, top: -6, width: 4, height: 46, background: "#fff", opacity: jogO }} />
          </div>
        </div>
        <div style={{ position: "absolute", top: 108, left: 140 + vx(200) - 40 - 60, fontWeight: 700, fontSize: 26, color: "#fff",
          opacity: interpolate(t, [METER.start + 0.3, METER.start + 0.6], [0, 1], clamp) }}>200</div>
      </div>
      <Tag x={540} y={505} color={ACCENT} o={jogO * hudO} size={40}>SLOWER THAN A JOG</Tag>

      {/* surface vs weight bars in the climax (pictures, no numbers spoken) */}
      <div style={{ position: "absolute", top: 470, left: 140, width: 760, fontFamily: FONT, opacity: barsO, background: "rgba(8,30,50,0.78)", borderRadius: 18, padding: "14px 20px", boxSizing: "border-box" }}>
        <div style={{ fontWeight: 700, fontSize: 34, color: ACCENT, letterSpacing: 3, textShadow: "0 2px 10px rgba(0,20,40,0.9)" }}>SURFACE ×100</div>
        <div style={{ height: 36, width: 8 + 68 * surfGrow, background: ACCENT, borderRadius: 8, marginTop: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }} />
        <div style={{ fontWeight: 700, fontSize: 34, color: "#ff4d6d", letterSpacing: 3, marginTop: 16, textShadow: "0 2px 10px rgba(0,20,40,0.9)" }}>WEIGHT ×1000</div>
        <div style={{ height: 36, width: 8 + 680 * weightGrow, background: "#ff4d6d", borderRadius: 8, marginTop: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }} />
      </div>

      <SeriesTag name="Why It Happens" n={9} accent={ACCENT} until={HOOK.end} />

      {/* Opening title */}
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700,
        fontSize: 86, lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: titleO, textShadow: "0 4px 24px rgba(0,30,60,0.75)" }}>
        IT FELL OFF A
        <br />
        <span style={{ color: ACCENT, textShadow: "0 0 30px rgba(0,40,20,0.8), 0 4px 18px rgba(0,30,60,0.8)" }}>SKYSCRAPER</span>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 260, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 70, color: "#ffffff", opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          textShadow: "0 6px 26px rgba(0,30,60,0.8)" }}>
          IT NEVER FALLS
          <br />
          FAST ENOUGH
        </div>
        <div style={{ fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: ACCENT, opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 0 30px rgba(0,40,20,0.7), 0 4px 18px rgba(0,30,60,0.8)" }}>
          TO GET HURT
        </div>
      </div>

      <div style={{ position: "absolute", top: 1395, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500,
        fontSize: 24, letterSpacing: 4, color: "rgba(230,245,255,0.85)", opacity: noteO }}>
        ANT SHOWN ENLARGED · SPEEDS ROUNDED
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="Why It Happens" next={10} accent={ACCENT} />
    </AbsoluteFill>
  );
};
