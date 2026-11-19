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
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/helicopter-tail-rotor/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, startsWith: string) =>
  line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith))!.start;

// ---------- Beats ----------
const T_STOP = wordStart("hook", "stop");
const T_SPINS = wordStart("hook", "spins");
const T_HOOK_END = line("hook").end;
const T_METER = line("meter").start;
const T_LINE = wordStart("meter", "line");
const T_TWIST = line("twist").start;
const T_ENGINE = wordStart("twist", "twists");
const T_BODY = wordStart("twist", "body");
const T_TAIL = line("tail").start;
const T_BLOWS = wordStart("tail", "blows");
const T_PUSH = wordStart("tail", "pushing");
const T_TAIL_END = line("tail").end;
const T_RE = line("rehook").start;
const T_GIANT = wordStart("rehook", "giant");
const T_TAN = line("tandem").start;
const T_OPP = wordStart("tandem", "opposite");
const T_HIT = wordStart("tandem", "cancel");
const T_PAY = line("payoff").start;
const T_FIGHT = wordStart("payoff", "fighting");

// ---------- Palette: dusk helipad, signal orange vs sky blue ----------
const ORANGE = "#ff7a1a";
const SKY = "#4cc3ff";
const PAINT = "#f4f1e8";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, dur = 0.5) => interpolate(t, [a, a + dur], [0, 1], { ...clamp, easing: ease });
const window_ = (t: number, a: number, b: number, f = 0.35) =>
  interpolate(t, [a, a + f, b - f, b], [0, 1, 1, 0], clamp);

// ---------- World ----------
const HX = 540; // single-rotor helicopter, main rotor mast
const HY = 820;
const TX = 1720; // tandem helicopter centre
const TY = 820;
const ROTOR_R = 290;
const RING_R = 400;

// Body yaw in degrees, clockwise on screen (seen from above). Main rotor turns counter-clockwise.
const SPIN_K = 45;
const spinAt = (t: number) => SPIN_K * Math.max(0, t - T_STOP) ** 2;
const HOOK_YAW = spinAt(T_METER);
const RECOVER_TO = Math.ceil(HOOK_YAW / 360) * 360;
const DRIFT_K = 12;
const TAIL_ON2 = T_BLOWS;
const driftAt = (t: number) => DRIFT_K * Math.max(0, Math.min(t, TAIL_ON2) - T_BODY) ** 2;
const MAX_DRIFT = driftAt(TAIL_ON2);

const yawAt = (t: number) => {
  if (t < T_METER) return spinAt(t) + (t < T_STOP ? 1.2 * Math.sin(t * 6) : 0);
  if (t < T_BODY) {
    return interpolate(t, [T_METER, T_METER + 1.1], [HOOK_YAW, RECOVER_TO], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }) +
      0.8 * Math.sin(t * 5) +
      // the pilot holding the nose on the line: small swings caught by the tail rotor
      7 * Math.sin((t - T_METER) * 4.2) * interpolate(t, [T_METER + 1.0, T_METER + 1.6, T_ENGINE - 0.6, T_BODY], [0, 1, 0.6, 0], clamp);
  }
  if (t < TAIL_ON2) return RECOVER_TO + driftAt(t);
  return (
    RECOVER_TO +
    interpolate(t, [TAIL_ON2, T_TAIL_END - 0.4], [MAX_DRIFT, 0], { ...clamp, easing: Easing.inOut(Easing.quad) }) +
    0.8 * Math.sin(t * 5)
  );
};
const tailRotorOn = (t: number) => t < T_STOP || (t >= T_METER && t < T_BODY) || t >= TAIL_ON2;

const signedDrift = (yaw: number) => {
  let d = ((yaw % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
};

// Arc helpers (angles in degrees, 0 = up, clockwise positive)
const pt = (cx: number, cy: number, r: number, a: number) => {
  const rad = ((a - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const Arc: React.FC<{
  cx: number;
  cy: number;
  r: number;
  a0: number;
  a1: number;
  color: string;
  width: number;
  opacity: number;
}> = ({ cx, cy, r, a0, a1, color, width, opacity }) => {
  if (opacity <= 0.001 || Math.abs(a1 - a0) < 1) return null;
  const p0 = pt(cx, cy, r, a0);
  const p1 = pt(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  const dir = a1 > a0 ? 1 : -1;
  // arrowhead at p1, pointing along the tangent
  const tang = ((a1 + 90 * dir - 90) * Math.PI) / 180;
  const tx = Math.cos(tang);
  const ty = Math.sin(tang);
  const nx = -ty;
  const ny = tx;
  const h = width * 3.2;
  const head = `M ${p1.x + tx * h} ${p1.y + ty * h} L ${p1.x + nx * h * 0.8} ${p1.y + ny * h * 0.8} L ${
    p1.x - nx * h * 0.8
  } ${p1.y - ny * h * 0.8} Z`;
  return (
    <g opacity={opacity}>
      <path
        d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} ${sweep} ${p1.x} ${p1.y}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 10px ${color})` }}
      />
      <path d={head} fill={color} />
    </g>
  );
};

const Tag: React.FC<{
  x: number;
  y: number;
  color: string;
  opacity: number;
  size?: number;
  children: React.ReactNode;
}> = ({ x, y, color, opacity, size = 38, children }) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 3,
        color,
        opacity,
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: 1.1,
        textShadow: "0 3px 14px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)",
      }}
    >
      {children}
    </div>
  );

// Main rotor seen from above: blur disc + four blades
const Rotor: React.FC<{ r: number; angle: number; tint?: string }> = ({ r, angle, tint = "rgba(220,235,255,0.10)" }) => (
  <g>
    <circle r={r} fill={tint} stroke="rgba(230,240,255,0.25)" strokeWidth={2} />
    {[0, 90, 180, 270].map((a) => (
      <g key={a} transform={`rotate(${angle + a})`}>
        <path d={`M -9 0 L -7 ${-r} L 7 ${-r} L 9 0 Z`} fill="rgba(30,34,40,0.85)" />
        {/* trailing blur */}
        <path d={`M 0 0 L ${-r * 0.22} ${-r * 0.97} L 0 ${-r} Z`} fill="rgba(30,34,40,0.25)" />
      </g>
    ))}
    <circle r={20} fill="#2b3038" stroke="#9aa4b0" strokeWidth={3} />
  </g>
);

// Single-rotor helicopter body, nose up, origin at the mast
const Body: React.FC<{ tailOn: boolean; t: number; tailGlow: number }> = ({ tailOn, t, tailGlow }) => (
  <g>
    {/* tail boom */}
    <path d="M -16 40 L -9 330 L 9 330 L 16 40 Z" fill="#e9e4d8" stroke="#5a5f66" strokeWidth={3} />
    {/* horizontal stabiliser */}
    <rect x={-52} y={262} width={104} height={16} rx={6} fill="#e9e4d8" stroke="#5a5f66" strokeWidth={3} />
    {/* orange stripe */}
    <rect x={-9} y={150} width={18} height={70} fill={ORANGE} />
    {/* cabin */}
    <ellipse cx={0} cy={-20} rx={74} ry={120} fill="#f2ede2" stroke="#5a5f66" strokeWidth={4} />
    <ellipse cx={0} cy={-88} rx={54} ry={46} fill="#24384c" stroke="#5a5f66" strokeWidth={3} />
    <ellipse cx={-14} cy={-100} rx={14} ry={20} fill="rgba(255,255,255,0.35)" />
    {/* tail rotor: a disc seen edge-on on the left of the boom */}
    {tailOn ? (
      <g>
        <rect x={-34} y={278} width={14} height={104} rx={7} fill={SKY} opacity={0.55 + 0.25 * Math.sin(t * 40)} />
        <rect x={-34} y={278} width={14} height={104} rx={7} fill="none" stroke={SKY} strokeWidth={3} opacity={0.9} />
        <circle cx={-27} cy={330} r={60} fill={SKY} opacity={0.12 * tailGlow} />
      </g>
    ) : (
      <g>
        <rect x={-30} y={282} width={7} height={96} rx={3} fill="#7c838c" />
      </g>
    )}
    <circle cx={-27} cy={330} r={9} fill="#3a4048" />
  </g>
);

export const HelicopterTailRotor: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const yaw = yawAt(t);
  const drift = signedDrift(yaw);
  const tailOn = tailRotorOn(t);
  const rotorAngle = -t * 760; // counter-clockwise from above
  const stopFlash = interpolate(t, [T_STOP, T_STOP + 0.5], [1, 0], clamp) * (t >= T_STOP ? 1 : 0);
  const demoOffFlash = interpolate(t, [T_BODY, T_BODY + 0.5], [1, 0], clamp) * (t >= T_BODY ? 1 : 0);

  // ---------- Camera ----------
  const toTandem = interpolate(t, [T_RE - 0.15, T_RE + 1.0], [0, 1], { ...clamp, easing: ease });
  const back = interpolate(t, [T_PAY - 0.35, T_PAY + 0.6], [0, 1], { ...clamp, easing: ease });
  const pan = toTandem * (1 - back);
  const punch =
    0.06 * spring({ frame: frame - Math.round(T_SPINS * fps), fps, config: { damping: 12, stiffness: 120 } }) *
    interpolate(t, [T_METER, T_METER + 0.8], [1, 0], clamp);
  const hitPunch =
    t >= T_HIT ? 0.05 * Math.exp(-(t - T_HIT) * 3) * Math.cos((t - T_HIT) * 18) : 0;
  const meterZoom = interpolate(t, [T_METER + 0.8, T_ENGINE, T_BODY + 0.4], [0, 0.07, 0], { ...clamp, easing: ease });
  const scale = 1 + punch + meterZoom - 0.16 * pan + hitPunch + 0.03 * Math.sin(t * 0.6);
  const fx = HX + (TX - HX) * pan;
  const fy = HY + 40 * pan;
  const camera = `translate(${540 - fx * scale}px, ${900 - fy * scale}px) scale(${scale})`;

  // ---------- Overlays ----------
  const ringOn = ramp(t, T_METER - 0.1, 0.5);
  const targetLine = ramp(t, T_LINE - 0.3, 0.5);
  const engineArc = ramp(t, T_ENGINE - 0.1, 0.7) * (1 - ramp(t, T_RE - 0.3, 0.4));
  const bodyArc = ramp(t, T_BODY - 0.1, 0.7) * (1 - ramp(t, T_RE - 0.3, 0.4));
  const pushOn = ramp(t, T_PUSH - 0.2, 0.5) * (1 - ramp(t, T_RE - 0.3, 0.4));
  const airOn = ramp(t, T_BLOWS - 0.15, 0.4) * (1 - ramp(t, T_RE - 0.3, 0.4));
  const payArcs = ramp(t, T_PAY + 0.1, 0.6);

  // tandem
  const giantTag = window_(t, T_GIANT - 0.1, T_OPP + 0.2);
  const tanArrows = ramp(t, T_OPP - 0.2, 0.6) * (1 - back);
  const cancel = ramp(t, T_HIT - 0.05, 0.25) * (1 - back);
  const hitFlash = t >= T_HIT ? Math.exp(-(t - T_HIT) * 4) : 0;
  const bodyTwistMerge = interpolate(t, [T_OPP + 0.4, T_HIT], [0, 1], { ...clamp, easing: ease });

  // HUD
  const titleIn = 1 - ramp(t, T_METER - 0.25, 0.35);
  const title2 = spring({ frame: frame - Math.round(T_SPINS * fps), fps, config: { damping: 12, stiffness: 160 } });
  const hudOn = ramp(t, T_METER, 0.4) * (1 - ramp(t, T_RE - 0.3, 0.3));
  const onLine = Math.abs(drift) < 3;
  const payA = spring({ frame: frame - Math.round(T_PAY * fps), fps, config: { damping: 15, stiffness: 160 } });
  const payB = spring({ frame: frame - Math.round(T_FIGHT * fps), fps, config: { damping: 11, stiffness: 170 } });

  // downwash ripples
  const ripples = [0, 1, 2, 3].map((i) => {
    const p = ((t * 0.55 + i / 4) % 1 + 1) % 1;
    return { r: 120 + p * 520, o: 0.22 * (1 - p) };
  });

  // tail-rotor air puffs (in body coordinates, moving left)
  const puffs = [0, 1, 2, 3, 4].map((i) => {
    const p = ((t * 1.6 + i / 5) % 1 + 1) % 1;
    return { x: -50 - p * 230, o: (1 - p) * airOn, s: 0.7 + p * 0.8 };
  });

  const tandemRotorA = t * 700;
  const tandemRotorB = -t * 700;

  return (
    <AbsoluteFill style={{ background: "#16202b", overflow: "hidden" }}>
      <Audio src={staticFile("helicopter-tail-rotor/narration.wav")} />
      <Audio src={staticFile("helicopter-tail-rotor/bed.wav")} volume={0.6} />

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: camera, transformOrigin: "0 0" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
          {/* deck: concrete slabs */}
          <rect x={-1400} y={-800} width={5200} height={3600} fill="#1b2631" />
          {Array.from({ length: 26 }).map((_, i) => (
            <line key={`v${i}`} x1={-1400 + i * 200} y1={-800} x2={-1400 + i * 200} y2={2800} stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
          ))}
          {Array.from({ length: 19 }).map((_, i) => (
            <line key={`h${i}`} x1={-1400} y1={-800 + i * 200} x2={3800} y2={-800 + i * 200} stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
          ))}
          {/* edge lights */}
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * 360;
            const p1 = pt(HX, HY + 60, 560, a);
            const p2 = pt(TX, TY, 640, a);
            const blink = 0.5 + 0.5 * Math.sin(t * 3 + i);
            return (
              <g key={`l${i}`}>
                <circle cx={p1.x} cy={p1.y} r={9} fill="#9fe870" opacity={0.4 + 0.5 * blink} />
                <circle cx={p2.x} cy={p2.y} r={9} fill="#9fe870" opacity={0.4 + 0.5 * blink} />
              </g>
            );
          })}
          {/* helipad markings */}
          <circle cx={HX} cy={HY + 60} r={470} fill="none" stroke={PAINT} strokeWidth={14} opacity={0.35} />
          <g opacity={0.22} fill={PAINT}>
            <rect x={HX - 150} y={HY - 140} width={60} height={400} />
            <rect x={HX + 90} y={HY - 140} width={60} height={400} />
            <rect x={HX - 90} y={HY + 30} width={180} height={60} />
          </g>
          <circle cx={TX} cy={TY} r={600} fill="none" stroke={PAINT} strokeWidth={14} opacity={0.3} />
          {/* downwash ripples */}
          {ripples.map((r, i) => (
            <circle key={`r${i}`} cx={HX} cy={HY} r={r.r} fill="none" stroke="#bfe6ff" strokeWidth={4} opacity={r.o * (1 - pan)} />
          ))}
          {ripples.map((r, i) => (
            <circle key={`rt${i}`} cx={TX} cy={TY} r={r.r * 1.2} fill="none" stroke="#bfe6ff" strokeWidth={4} opacity={r.o * pan} />
          ))}

          {/* compass ring with the target line */}
          <g opacity={ringOn}>
            <circle cx={HX} cy={HY} r={RING_R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
            {Array.from({ length: 36 }).map((_, i) => {
              const a = i * 10;
              const p1 = pt(HX, HY, RING_R, a);
              const p2 = pt(HX, HY, RING_R + (i % 9 === 0 ? 34 : 16), a);
              return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.5)" strokeWidth={3} />;
            })}
          </g>
          <line
            x1={HX}
            y1={HY}
            x2={HX}
            y2={HY - RING_R}
            stroke={SKY}
            strokeWidth={6}
            strokeDasharray="18 14"
            opacity={Math.max(targetLine, 0.5 * ringOn)}
          />

          {/* shadow */}
          <g transform={`translate(${HX + 34} ${HY + 44}) rotate(${yaw})`} opacity={0.35}>
            <ellipse cx={0} cy={-20} rx={74} ry={120} fill="#000" />
            <rect x={-14} y={40} width={28} height={290} fill="#000" />
          </g>

          {/* ===== single-rotor helicopter ===== */}
          <g transform={`translate(${HX} ${HY}) rotate(${yaw})`}>
            <Body tailOn={tailOn} t={t} tailGlow={airOn} />
            {/* air puffs from the tail rotor */}
            {puffs.map((p, i) => (
              <g key={i} transform={`translate(${p.x} 330) scale(${p.s})`} opacity={p.o}>
                <path d="M 10 -34 Q -10 0 10 34" fill="none" stroke={SKY} strokeWidth={7} strokeLinecap="round" />
              </g>
            ))}
            {/* push on the tail */}
            <g opacity={Math.max(pushOn, payArcs * (1 - pan))}>
              <line x1={30} y1={330} x2={150} y2={330} stroke={SKY} strokeWidth={14} strokeLinecap="round" />
              <path d="M 150 300 L 196 330 L 150 360 Z" fill={SKY} />
            </g>
            {/* nose pointer */}
            <line x1={0} y1={-140} x2={0} y2={-RING_R + 6} stroke={ORANGE} strokeWidth={7} opacity={ringOn} />
            <circle cx={0} cy={-RING_R + 6} r={14} fill={ORANGE} opacity={ringOn} />
            <Rotor r={ROTOR_R} angle={rotorAngle} />
          </g>

          {/* twist arrows (screen-aligned, around the mast) */}
          <Arc cx={HX} cy={HY} r={ROTOR_R + 40} a0={40} a1={-70} color={ORANGE} width={14} opacity={Math.max(engineArc, payArcs * (1 - pan))} />
          <Arc cx={HX} cy={HY} r={175} a0={150} a1={150 + 100} color={SKY} width={12} opacity={bodyArc} />

          {/* ===== tandem helicopter (generic, original) ===== */}
          <g transform={`translate(${TX} ${TY})`}>
            <g transform="translate(34 44)" opacity={0.35}>
              <rect x={-70} y={-330} width={140} height={660} rx={60} fill="#000" />
            </g>
            <rect x={-70} y={-330} width={140} height={660} rx={60} fill="#e2ddd0" stroke="#5a5f66" strokeWidth={4} />
            <rect x={-46} y={-320} width={92} height={70} rx={30} fill="#24384c" />
            <rect x={-10} y={-200} width={20} height={440} fill={ORANGE} opacity={0.8} />
            <rect x={-40} y={200} width={80} height={140} rx={20} fill="#cfc9bb" stroke="#5a5f66" strokeWidth={3} />
            <g transform="translate(0 -230)">
              <Rotor r={270} angle={tandemRotorA * -1} />
            </g>
            <g transform="translate(0 250)">
              <Rotor r={270} angle={tandemRotorB * -1} />
            </g>
          </g>
          {/* tandem rotor directions */}
          <Arc cx={TX} cy={TY - 230} r={305} a0={60} a1={-60} color={ORANGE} width={14} opacity={tanArrows} />
          <Arc cx={TX} cy={TY + 250} r={305} a0={120} a1={240} color={SKY} width={14} opacity={tanArrows} />
          {/* the two body twists, meeting in the middle */}
          <Arc
            cx={TX}
            cy={TY}
            r={130}
            a0={-40 + 30 * bodyTwistMerge}
            a1={40 + 10 * bodyTwistMerge}
            color={ORANGE}
            width={11}
            opacity={tanArrows * (1 - cancel)}
          />
          <Arc
            cx={TX}
            cy={TY}
            r={130}
            a0={220 - 30 * bodyTwistMerge}
            a1={140 - 10 * bodyTwistMerge}
            color={SKY}
            width={11}
            opacity={tanArrows * (1 - cancel)}
          />
          <circle cx={TX} cy={TY} r={60 + 260 * (1 - hitFlash)} fill="none" stroke="#ffffff" strokeWidth={10} opacity={hitFlash * 0.9} />
        </svg>

        {/* stop flash on the tail rotor */}
        {stopFlash > 0 && (
          <div
            style={{
              position: "absolute",
              left: HX - 27 - 120,
              top: HY + 330 - 120,
              width: 240,
              height: 240,
              borderRadius: "50%",
              border: `8px solid ${ORANGE}`,
              boxSizing: "border-box",
              opacity: stopFlash,
              transform: `scale(${1.4 - 0.6 * stopFlash})`,
            }}
          />
        )}

        {/* world labels */}
        <Tag x={HX - 210} y={HY + 340} color={t < T_STOP + 0.05 ? SKY : ORANGE} opacity={window_(t, -1, T_SPINS + 0.2)} size={40}>
          {t < T_STOP + 0.05 ? "TAIL ROTOR" : "TAIL ROTOR OFF"}
        </Tag>
        <Tag x={HX} y={HY - RING_R - 42} color={ORANGE} opacity={window_(t, T_ENGINE - 0.1, T_BODY + 0.4)} size={40}>
          ENGINE TWISTS ROTOR
        </Tag>
        <Tag x={HX} y={HY + RING_R + 70} color={SKY} opacity={window_(t, T_BODY - 0.1, T_TAIL + 0.1)} size={40}>
          BODY TWISTS BACK
        </Tag>
        <Tag x={HX} y={HY + RING_R + 70} color={SKY} opacity={window_(t, T_BLOWS - 0.1, T_RE - 0.1)} size={40}>
          AIR OUT, TAIL PUSHED BACK
        </Tag>
        <Tag x={TX} y={TY - 680} color="#ffffff" opacity={giantTag} size={60}>
          NO TAIL ROTOR?
        </Tag>
        <Tag x={TX} y={TY - 680} color="#ffffff" opacity={cancel} size={64}>
          TWISTS CANCEL
        </Tag>
        <Tag x={HX + 120} y={HY + RING_R + 70} color={SKY} opacity={payArcs * (1 - pan)} size={40}>
          LITTLE ROTOR PUSHES
        </Tag>
      </AbsoluteFill>

      {/* ================= SCREEN ================= */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }}
      />

      <SeriesTag name="How It Works" n={4} accent={ORANGE} until={T_HOOK_END} />

      {/* opening title, from frame 0 */}
      <div
        style={{
          position: "absolute",
          top: 235,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          lineHeight: 1.05,
          opacity: titleIn,
          textShadow: "0 6px 30px rgba(0,0,0,0.9)",
        }}
      >
        <div style={{ fontSize: 84, color: "#ffffff", letterSpacing: -1 }}>STOP THE TAIL ROTOR</div>
        <div
          style={{
            fontSize: 96,
            color: ORANGE,
            letterSpacing: -1,
            opacity: Math.min(1, title2),
            transform: `scale(${0.7 + 0.3 * Math.min(1.1, title2)})`,
          }}
        >
          WHY DOES IT SPIN?
        </div>
      </div>

      {/* heading meter */}
      <div
        style={{
          position: "absolute",
          top: 190,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          opacity: hudOn,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 36, letterSpacing: 6, color: "rgba(255,255,255,0.85)" }}>
          NOSE OFF THE LINE
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 1.0,
            fontVariantNumeric: "tabular-nums",
            color: onLine ? SKY : ORANGE,
            textShadow: onLine ? "0 0 40px rgba(76,195,255,0.5)" : "0 0 40px rgba(255,122,26,0.55)",
          }}
        >
          {Math.round(Math.abs(drift))}°
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 5,
            color: t >= T_BODY && t < T_BLOWS ? "#ffd2b0" : SKY,
            opacity: t >= T_BODY && t < T_BLOWS ? 0.7 + 0.3 * demoOffFlash : 0.9,
          }}
        >
          {t >= T_BODY && t < T_BLOWS ? "TAIL ROTOR OFF · DEMO" : "TARGET 0° · TOP VIEW, SIMPLIFIED"}
        </div>
      </div>

      {/* payoff */}
      <div style={{ position: "absolute", top: 200, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: 5,
            color: SKY,
            opacity: Math.min(1, payA),
            transform: `translateY(${24 * (1 - Math.min(1, payA))}px)`,
          }}
        >
          THE LITTLE ROTOR
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 100,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: "#ffffff",
            opacity: Math.min(1, payB),
            transform: `scale(${0.8 + 0.2 * payB})`,
            textShadow: "0 6px 30px rgba(0,0,0,0.9)",
          }}
        >
          FIGHTS
          <br />
          <span style={{ color: ORANGE }}>THE BIG ONE</span>
        </div>
      </div>


      <Captions lines={timeline.lines} top={1440} accent={ORANGE} />
    </AbsoluteFill>
  );
};
