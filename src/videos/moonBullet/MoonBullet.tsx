import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { Starfield } from "../../primitives/Starfield";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/moon-bullet/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(w))!.start;

const ACCENT = "#7fe3ff";
const BULLET = "#ffb547";
const SLOWC = "#ff5a4f";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const SLOW = line("slow");
const FAST = line("fast");
const TWIST = line("twist");
const CLIMAX = line("climax");
const PAYOFF = line("payoff");
const T_FIRE = 0.3;
const T_BEHIND = wordStart("hook", "behind");
const T_DUST = wordStart("slow", "dust");
const T_CURVES = wordStart("fast", "curves");
const T_FALLING = wordStart("twist", "falling");
const T_RETURN = wordStart("climax", "around");

// ---------- World: the Moon, radius RW, centred at (CX, CY). Astronaut stands at the top (north pole). ----------
const CX = 540;
const CY = 900;
const RW = 400;
const ORB = RW + 30; // muzzle height: a grazing orbit just above a perfectly smooth surface
const A0 = 0.09; // the muzzle sits slightly ahead of the astronaut's feet
const TOP = { x: CX, y: CY - RW };
const PERIOD_S = 6498; // 108.3 minutes (NASA fact-sheet GM and radius)

// Bullet angle (radians, clockwise from the top) over video time. Time is compressed; the clock follows the angle.
const theta = (t: number) =>
  interpolate(
    t,
    [T_FIRE, HOOK.end, SLOW.start, FAST.end, TWIST.end, T_RETURN, timeline.duration + 2],
    [A0, 0.5, 0.8, 1.6, 3.7, Math.PI * 2 - 0.02, Math.PI * 2 + 3.2],
    { ...clamp },
  );
const polar = (a: number, r: number) => ({ x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) });

// Craters (world coords: angle from top, depth below the surface as a fraction of RW, radius)
const CRATERS = [
  [0.0, 0.18, 34], [0.5, 0.08, 18], [-0.35, 0.12, 26], [0.9, 0.35, 48], [-1.1, 0.4, 60], [2.2, 0.3, 52],
  [2.8, 0.55, 40], [-2.4, 0.25, 44], [1.6, 0.6, 30], [-1.8, 0.7, 36], [3.4, 0.15, 30], [0.2, 0.55, 70],
  [-0.6, 0.75, 46], [1.2, 0.12, 22], [-0.15, 0.05, 12], [0.28, 0.03, 9], [-0.25, 0.035, 8], [0.12, 0.09, 14],
] as const;

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}>
    {children}
  </div>
);

// A generic astronaut in a white suit holding a long-barrelled launcher, facing right. Height ~ h px, feet at (x, y).
const Astronaut: React.FC<{ x: number; y: number; h: number; duck: number; recoil: number }> = ({ x, y, h, duck, recoil }) => {
  const k = h / 200;
  const crouch = 1 - 0.38 * duck;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <ellipse cx={0} cy={2} rx={70} ry={10} fill="rgba(0,0,0,0.45)" />
      <g transform={`scale(1 ${crouch}) translate(${-recoil * 8} 0)`}>
        {/* legs */}
        <rect x={-30} y={-78} width={24} height={78} rx={10} fill="#e9edf2" />
        <rect x={6} y={-78} width={24} height={78} rx={10} fill="#d7dde5" />
        <rect x={-36} y={-12} width={32} height={14} rx={6} fill="#9aa3ad" />
        <rect x={2} y={-12} width={32} height={14} rx={6} fill="#9aa3ad" />
        {/* backpack + body */}
        <rect x={-58} y={-158} width={30} height={70} rx={8} fill="#b8c0ca" />
        <rect x={-36} y={-162} width={72} height={92} rx={22} fill="#f2f5f8" />
        <rect x={-14} y={-138} width={30} height={20} rx={4} fill={ACCENT} opacity={0.8} />
        {/* helmet */}
        <circle cx={0} cy={-190} r={34} fill="#f2f5f8" />
        <path d="M 2 -210 Q 32 -206 30 -184 Q 28 -168 4 -170 Z" fill="#1d2a3c" />
        <path d="M 10 -204 Q 22 -202 22 -194" stroke="#9fe9ff" strokeWidth={4} fill="none" opacity={0.8} />
        {/* arms + launcher */}
        <g transform={`rotate(${-recoil * 6} 10 -125)`}>
          <rect x={4} y={-132} width={70} height={20} rx={10} fill="#e9edf2" />
          <rect x={46} y={-140} width={120} height={16} rx={4} fill="#3a4554" />
          <rect x={60} y={-126} width={16} height={22} rx={3} fill="#3a4554" />
        </g>
      </g>
    </g>
  );
};

export const MoonBullet: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ---------- Camera: scale + world focus point, pinned to a screen anchor ----------
  const keys = [0, HOOK.end, SLOW.start + 0.2, FAST.start + 0.3, FAST.end, TWIST.start + 0.5, TWIST.end, CLIMAX.start + 0.6, T_RETURN - 1.0, T_RETURN - 0.2, PAYOFF.start + 0.3, timeline.duration];
  const camS = interpolate(t, keys, [4.2, 3.4, 2.2, 1.55, 1.7, 1.0, 1.12, 1.0, 1.0, 2.6, 1.0, 1.0], { ...clamp, easing: ease });
  const camFx = interpolate(t, keys, [620, 640, 640, 660, 660, 540, 580, 540, 540, 540, 540, 540], { ...clamp, easing: ease });
  const camFy = interpolate(t, keys, [500, 500, 560, 640, 640, 900, 900, 900, 900, 560, 900, 900], { ...clamp, easing: ease });
  const anchorY = interpolate(t, keys, [900, 900, 860, 820, 840, 830, 860, 860, 860, 900, 830, 830], { ...clamp, easing: ease });
  const shake = 10 * Math.exp(-Math.max(0, t - T_FIRE) * 9) * (t > T_FIRE ? 1 : 0) + 14 * Math.exp(-Math.max(0, t - T_RETURN) * 7) * (t > T_RETURN ? 1 : 0);
  const sx = (x: number) => 540 + (x - camFx) * camS + Math.sin(frame * 2.1) * shake;
  const sy = (y: number) => anchorY + (y - camFy) * camS + Math.cos(frame * 1.7) * shake;

  // ---------- Bullet ----------
  const fired = t >= T_FIRE;
  const a = theta(t);
  const bp = polar(a, ORB);
  const trail: string[] = [];
  const trailLen = 0.9; // radians of glowing trail
  for (let i = 0; i <= 24; i++) {
    const ai = Math.max(A0, a - (trailLen * i) / 24);
    const p = polar(ai, ORB);
    trail.push(`${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`);
  }
  // Path already flown (dashed ring that builds up as the bullet goes around)
  const flown = Math.min(a, Math.PI * 2) - A0;
  const ringO = interpolate(t, [HOOK.end, METER.start + 0.5], [0, 1], clamp);
  const ringPath = (() => {
    if (flown <= 0.01) return "";
    const p0 = polar(A0, ORB);
    const p1 = polar(flown + A0, ORB);
    const large = flown > Math.PI ? 1 : 0;
    if (flown >= Math.PI * 2 - A0 - 0.03) {
      const pm = polar(Math.PI + A0, ORB);
      return `M ${sx(p0.x)} ${sy(p0.y)} A ${ORB * camS} ${ORB * camS} 0 1 1 ${sx(pm.x)} ${sy(pm.y)} A ${ORB * camS} ${ORB * camS} 0 1 1 ${sx(p0.x)} ${sy(p0.y)}`;
    }
    return `M ${sx(p0.x)} ${sy(p0.y)} A ${ORB * camS} ${ORB * camS} 0 ${large} 1 ${sx(p1.x)} ${sy(p1.y)}`;
  })();

  // ---------- Too-slow bullet (a separate test shot): a falling arc that hits the dust ----------
  const slowT0 = SLOW.start + 0.1;
  const slowP = interpolate(t, [slowT0, T_DUST + 0.05], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const slowOn = t >= slowT0 && t < FAST.start + 0.6;
  // Elliptical-ish drop: angle grows, radius shrinks to the surface
  const slowPos = (q: number) => polar(A0 + 0.36 * q, ORB - (ORB - RW) * q * q);
  const sp = slowPos(slowP);
  const slowPts: string[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = slowPos((slowP * i) / 30);
    slowPts.push(`${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`);
  }
  const dust = interpolate(t, [T_DUST, T_DUST + 0.9], [0, 1], clamp);
  const slowFade = interpolate(t, [FAST.start + 0.1, FAST.start + 0.6], [1, 0], clamp);
  const dustP = polar(A0 + 0.36, RW);

  // ---------- Fall demo: straight line vs curved ground ----------
  const fallO = interpolate(t, [T_CURVES - 0.4, T_CURVES + 0.2, TWIST.start + 0.6, TWIST.start + 1.1], [0, 1, 1, 0], clamp);
  const tanLen = interpolate(t, [T_CURVES - 0.4, T_CURVES + 0.8], [0, 380], { ...clamp, easing: ease });
  const TY = CY - ORB; // height of the straight line (muzzle height)
  const gapAngles = [0.4, 0.62, 0.84];

  // ---------- Gravity arrow on the bullet (twist) ----------
  const gravO = interpolate(t, [T_FALLING - 0.8, T_FALLING - 0.2, T_RETURN - 1.3, T_RETURN - 0.9], [0, 1, 1, 0], clamp);
  const gpulse = 1 + 0.12 * Math.sin(t * 10);
  const inward = { x: (CX - bp.x) / ORB, y: (CY - bp.y) / ORB };

  // ---------- Astronaut ----------
  const astH = (30 * camS) / 0.66; // muzzle exactly at orbit height
  const duck = interpolate(t, [T_RETURN - 0.7, T_RETURN - 0.35, T_RETURN + 0.9, T_RETURN + 1.4], [0, 1, 1, 0], { ...clamp, easing: ease });
  const recoil = Math.exp(-Math.max(0, t - T_FIRE) * 8) * (fired ? 1 : 0);
  const muzzle = { x: sx(TOP.x) + astH * 0.83, y: sy(TOP.y) - astH * 0.66 };
  const flash = interpolate(t, [T_FIRE, T_FIRE + 0.25], [1, 0], clamp) * (fired ? 1 : 0);
  const returnFlash = interpolate(t, [T_RETURN - 0.05, T_RETURN + 0.1, T_RETURN + 0.6], [0, 1, 0], clamp);

  // ---------- HUD ----------
  const titleO = interpolate(t, [HOOK.end - 0.3, HOOK.end], [1, 0], clamp);
  const behindO = interpolate(t, [T_BEHIND - 0.2, T_BEHIND + 0.2, HOOK.end + 0.4, HOOK.end + 0.8], [0, 1, 1, 0], clamp);
  const behindDraw = interpolate(t, [T_BEHIND - 0.2, T_BEHIND + 0.5], [0, 1], { ...clamp, easing: ease });
  const clockIn = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 14, stiffness: 170 } });
  const clockOut = interpolate(t, [PAYOFF.start - 0.6, PAYOFF.start - 0.2], [1, 0], clamp);
  const aM = theta(METER.end); // the clock starts its countdown once its target has been said
  const left = Math.max(0, PERIOD_S * (1 - Math.min(1, Math.max(0, a - aM) / (Math.PI * 2 - 0.02 - aM))));
  const hh = Math.floor(left / 3600);
  const mm = Math.floor((left % 3600) / 60);
  const ss = Math.floor(left % 60);
  const clockStr = `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const zero = t >= T_RETURN;
  const zeroPop = spring({ frame: frame - Math.round(T_RETURN * fps), fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });

  // Speed meter (km/s), shown for the slow / fast tests
  const meterO = interpolate(t, [SLOW.start - 0.3, SLOW.start + 0.1, TWIST.start + 0.5, TWIST.start + 1.0], [0, 1, 1, 0], clamp);
  const speed = interpolate(t, [SLOW.start, SLOW.start + 0.5, FAST.start, FAST.start + 0.6], [0, 1.2, 1.2, 1.68], { ...clamp, easing: ease });
  const MX0 = 110;
  const MW = 780;
  const MAXV = 2.5;
  const mx = (v: number) => MX0 + (MW * v) / MAXV;
  const isOrbit = speed > 1.6;

  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "fell") * fps), fps, config: { damping: 11, stiffness: 170 } });
  const simpO = interpolate(t, [TWIST.start, TWIST.start + 0.5, PAYOFF.start, PAYOFF.start + 0.4], [0, 1, 1, 0], clamp);

  const moonC = { x: sx(CX), y: sy(CY) };
  const RS = RW * camS;
  const tp = { x: sx(TOP.x), y: sy(TOP.y) };

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #101522 0%, #06080e 60%, #020305 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("moon-bullet/narration.wav")} />
      <Audio src={staticFile("moon-bullet/bed.wav")} volume={0.6} />
      <Starfield seed="moon" drift={2} />

      {/* Earth hanging in the sky, for scale and colour */}
      <div style={{ position: "absolute", left: 60, top: 560 - 20 * camS, width: 70, height: 70, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #bfe8ff 0%, #3c8fe0 40%, #154a8a 75%, #0a2240 100%)",
        boxShadow: "0 0 30px 6px rgba(90,170,255,0.35)", opacity: 0.85 }} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="moonFill" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#d9d6cf" />
            <stop offset="45%" stopColor="#a9a59d" />
            <stop offset="85%" stopColor="#5f5c57" />
            <stop offset="100%" stopColor="#3a3835" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Moon */}
        <circle cx={moonC.x} cy={moonC.y} r={RS + 18 * camS * 0.4} fill="rgba(200,220,255,0.05)" />
        <circle cx={moonC.x} cy={moonC.y} r={RS} fill="url(#moonFill)" />
        {CRATERS.map(([ang, d, r], i) => {
          const p = polar(ang, RW * (1 - d));
          return (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={r * camS * 0.5} fill="rgba(60,58,55,0.35)" />
              <circle cx={sx(p.x) + r * camS * 0.06} cy={sy(p.y) + r * camS * 0.06} r={r * camS * 0.42} fill="rgba(40,38,36,0.3)" />
            </g>
          );
        })}

        {/* Path already flown */}
        <path d={ringPath} fill="none" stroke={BULLET} strokeWidth={3} strokeDasharray="4 12" opacity={0.75 * ringO} />

        {/* Straight line vs falling path */}
        {fallO > 0 && (
          <g opacity={fallO}>
            <line x1={sx(TOP.x)} y1={sy(TY)} x2={sx(TOP.x + tanLen)} y2={sy(TY)} stroke="#ffffff" strokeWidth={4} strokeDasharray="10 10" />
            {gapAngles.map((g, i) => {
              const p = polar(g, ORB);
              const top = { x: p.x, y: TY };
              if (p.x - TOP.x > tanLen) return null;
              return (
                <g key={i}>
                  <line x1={sx(top.x)} y1={sy(top.y)} x2={sx(p.x)} y2={sy(p.y) - 10} stroke={ACCENT} strokeWidth={5} />
                  <polygon points={`${sx(p.x) - 11},${sy(p.y) - 22} ${sx(p.x) + 11},${sy(p.y) - 22} ${sx(p.x)},${sy(p.y) - 4}`} fill={ACCENT} />
                </g>
              );
            })}
          </g>
        )}

        {/* Too-slow test shot */}
        {slowOn && (
          <g opacity={slowFade}>
            <polyline points={slowPts.join(" ")} fill="none" stroke={SLOWC} strokeWidth={5} strokeDasharray="10 8" />
            {slowP < 1 && <circle cx={sx(sp.x)} cy={sy(sp.y)} r={9} fill={SLOWC} filter="url(#glow)" />}
            {dust > 0 &&
              [0, 1, 2, 3, 4, 5, 6].map((i) => {
                const ang = -Math.PI / 2 + (i - 3) * 0.42;
                const d = 70 * dust * (0.6 + 0.1 * i);
                return (
                  <circle key={i} cx={sx(dustP.x) + Math.cos(ang) * d} cy={sy(dustP.y) + Math.sin(ang) * d * 0.8 - 10 * dust}
                    r={16 + 18 * dust} fill="#cfc8bb" opacity={0.75 * (1 - dust)} />
                );
              })}
          </g>
        )}

        {/* Main bullet */}
        {fired && (
          <g>
            <polyline points={trail.join(" ")} fill="none" stroke={BULLET} strokeWidth={7} strokeLinecap="round" opacity={0.55} filter="url(#glow)" />
            <circle cx={sx(bp.x)} cy={sy(bp.y)} r={Math.max(7, 3.2 * camS)} fill="#fff3d6" stroke={BULLET} strokeWidth={4} filter="url(#glow)" />
          </g>
        )}

        {/* Gravity arrow: the bullet is falling the whole time */}
        {gravO > 0 && (
          <g opacity={gravO}>
            <line x1={sx(bp.x)} y1={sy(bp.y)} x2={sx(bp.x + inward.x * 95 * gpulse)} y2={sy(bp.y + inward.y * 95 * gpulse)} stroke={ACCENT} strokeWidth={7} />
            <polygon
              points={(() => {
                const tip = { x: bp.x + inward.x * 120 * gpulse, y: bp.y + inward.y * 120 * gpulse };
                const base = { x: bp.x + inward.x * 92 * gpulse, y: bp.y + inward.y * 92 * gpulse };
                const nx = -inward.y * 16;
                const ny = inward.x * 16;
                return `${sx(tip.x)},${sy(tip.y)} ${sx(base.x) + nx},${sy(base.y) + ny} ${sx(base.x) - nx},${sy(base.y) - ny}`;
              })()}
              fill={ACCENT}
            />
          </g>
        )}

        {/* "Behind" ghost arrow in the hook */}
        {behindO > 0 && (
          <g opacity={behindO}>
            <path d={`M ${tp.x - 470} ${tp.y - 120} Q ${tp.x - 250} ${tp.y - 60} ${tp.x - 250 + 220 * behindDraw - 220} ${tp.y - 95 + 30 * behindDraw}`}
              fill="none" stroke={BULLET} strokeWidth={6} strokeDasharray="14 12" />
            <circle cx={tp.x - 250 + 220 * behindDraw - 220} cy={tp.y - 95 + 30 * behindDraw} r={11} fill={BULLET} filter="url(#glow)" />
          </g>
        )}

        {/* Astronaut */}
        <Astronaut x={tp.x} y={tp.y + 2} h={astH} duck={duck} recoil={recoil} />
        {flash > 0 && <circle cx={muzzle.x} cy={muzzle.y} r={14 + 40 * (1 - flash)} fill="#fff6cf" opacity={flash} filter="url(#glow)" />}
        {returnFlash > 0 && (
          <circle cx={tp.x - 10} cy={tp.y - astH * 0.85} r={30 + 120 * returnFlash} fill="none" stroke={BULLET} strokeWidth={8} opacity={returnFlash} />
        )}
      </svg>

      {/* World labels */}
      <Tag x={sx(TOP.x + 240)} y={sy(TY) - 40} color="#ffffff" o={fallO * interpolate(tanLen, [220, 330], [0, 1], clamp)} size={34}>
        STRAIGHT LINE
      </Tag>
      <Tag x={sx(polar(0.8, ORB).x) - 150} y={sy(polar(0.8, ORB).y) + 60} color={ACCENT} o={fallO * interpolate(tanLen, [300, 380], [0, 1], clamp)} size={36}>
        FALLS
      </Tag>
      <Tag x={Math.min(880, Math.max(200, sx(bp.x + inward.x * -70)))} y={Math.min(1120, Math.max(420, sy(bp.y + inward.y * -70)))} color={ACCENT} o={gravO} size={36}>
        STILL FALLING
      </Tag>
      <Tag x={sx(dustP.x) + 40} y={sy(dustP.y) - 150} color={SLOWC} o={interpolate(t, [T_DUST - 0.1, T_DUST + 0.3], [0, 1], clamp) * slowFade * (slowOn ? 1 : 0)} size={40}>
        TOO SLOW: CRASH
      </Tag>
      <Tag x={tp.x - 260} y={tp.y - 175} color={BULLET} o={behindO} size={38}>
        BACK FROM BEHIND?
      </Tag>
      <Tag x={540} y={tp.y - astH - 70} color="#ffffff" o={duck * interpolate(t, [T_RETURN - 0.5, T_RETURN - 0.2], [0, 1], clamp) * (t < PAYOFF.start ? 1 : 0)} size={40}>
        DUCK!
      </Tag>

      {/* ================= HUD ================= */}
      <SeriesTag name="What If" n={6} accent={ACCENT} until={HOOK.end} />
      <div style={{ position: "absolute", top: 222, width: "100%", textAlign: "center", fontFamily: FONT, opacity: titleO }}>
        <div style={{ fontSize: 26, letterSpacing: 8, fontWeight: 500, color: "rgba(210,230,255,0.75)" }}>THOUGHT EXPERIMENT</div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          FIRE FORWARD
          <br />
          <span style={{ color: BULLET }}>ON THE MOON</span>
        </div>
      </div>

      {/* Countdown clock */}
      <div style={{ position: "absolute", top: 165, width: "100%", textAlign: "center", fontFamily: FONT,
        opacity: Math.min(1, clockIn) * clockOut, transform: `translateY(${30 * (1 - Math.min(1, clockIn))}px)` }}>
        <div style={{ fontSize: 30, letterSpacing: 7, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>BULLET BACK IN</div>
        <div style={{ fontSize: 168, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, fontVariantNumeric: "tabular-nums",
          color: zero ? "#ffffff" : BULLET, transform: `scale(${zero ? 1 + 0.2 * (1 - Math.min(1, zeroPop)) : 1})`,
          textShadow: zero ? "0 0 50px rgba(255,255,255,0.6)" : "0 0 40px rgba(255,180,70,0.35)" }}>
          {clockStr}
        </div>
      </div>

      {/* Speed meter */}
      <div style={{ position: "absolute", left: 0, top: 1150, width: 1080, height: 230, opacity: meterO, fontFamily: FONT }}>
        <div style={{ position: "absolute", left: MX0 - 30, top: -22, width: MW + 60, height: 186, borderRadius: 24, background: "rgba(6,9,16,0.82)", border: "1px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position: "absolute", left: MX0, top: 0, fontSize: 30, letterSpacing: 5, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
          BULLET SPEED
        </div>
        <div style={{ position: "absolute", right: 1080 - MX0 - MW, top: 0, fontSize: 30, letterSpacing: 2, fontWeight: 700,
          color: isOrbit ? ACCENT : SLOWC, fontVariantNumeric: "tabular-nums" }}>
          {speed.toFixed(2)} KM/S
        </div>
        <div style={{ position: "absolute", left: MX0, top: 52, width: MW, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)" }} />
        <div style={{ position: "absolute", left: MX0, top: 52, width: mx(speed) - MX0, height: 30, borderRadius: 15,
          background: isOrbit ? ACCENT : SLOWC, boxShadow: `0 0 20px ${isOrbit ? ACCENT : SLOWC}` }} />
        {/* marks */}
        {[
          { v: 1.4, label: "FASTEST RIFLE", c: "#ffffff", below: true },
          { v: 1.68, label: "ORBIT", c: ACCENT, below: false },
          { v: 2.38, label: "ESCAPE", c: "#c9a6ff", below: true },
        ].map((m) => (
          <React.Fragment key={m.label}>
            <div style={{ position: "absolute", left: mx(m.v) - 2, top: 42, width: 4, height: 50, background: m.c }} />
            <div style={{ position: "absolute", left: mx(m.v), top: m.below ? 104 : 104, transform: m.below ? (m.v > 2 ? "translateX(-70%)" : "translateX(-100%)") : "translateX(10%)",
              fontSize: 30, fontWeight: 700, letterSpacing: 2, color: m.c, whiteSpace: "nowrap" }}>
              {m.label}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ position: "absolute", top: 1392, width: "100%", textAlign: "center", fontFamily: FONT, fontSize: 24, letterSpacing: 3,
        color: "rgba(220,230,245,0.75)", opacity: simpO }}>
        SIMPLIFIED: SMOOTH AIRLESS MOON · NO REAL RIFLE IS THIS FAST
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontSize: 62, fontWeight: 700, letterSpacing: 4, color: "#ffffff", opacity: Math.min(1, endA),
          transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`, textShadow: "0 4px 20px rgba(0,0,0,0.9)" }}>
          IT NEVER TURNED
        </div>
        <div style={{ fontSize: 112, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: BULLET, opacity: Math.min(1, endB),
          transform: `scale(${0.8 + 0.2 * endB})`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
          IT FELL AROUND
        </div>
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="What If" next={7} accent={ACCENT} />
    </AbsoluteFill>
  );
};
