import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Line } from "../../primitives/Captions";
import { SeriesTag } from "../../primitives/SeriesTag";
import { SeriesOutro } from "../../primitives/SeriesOutro";
import { FONT, useFonts } from "../../primitives/useFonts";
import timelineJson from "../../../videos/runaway-ramp/timeline.json";

const timeline = timelineJson as { duration: number; lines: Line[] };
const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
const wordStart = (id: string, w: string) =>
  line(id).words.find((x) => x.text.toLowerCase().replace(/[^a-z]/g, "").startsWith(w))!.start;

const ACCENT = "#ffb347";
const RED = "#ff4d3d";
const SKY = "#7fd0ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

const HOOK = line("hook");
const METER = line("meter");
const ROAD = line("road");
const SINK = line("sink");
const SHOVE = line("shove");
const STOP = line("stop");
const PAYOFF = line("payoff");
const T_ENTER = SINK.start; // front wheels reach the gravel
const T_ZERO = wordStart("stop", "zero");

const PX_PER_KMH = 8; // scroll speed in px/s per km/h
const GROUND = 1160;
const TRUCK_X = 300; // truck's rear on screen
const WHEEL_R = 46;
const WHEELS = [70, 150, 330, 410, 540]; // x offsets from the truck's rear
const FRONT = 600;

// Speed: 100 km/h until the gravel, then a steady slowdown to zero (simplified constant deceleration).
const speedAt = (t: number) =>
  t < T_ENTER ? interpolate(t, [0, 1.5], [92, 100], clamp) : Math.max(0, 100 * (1 - (t - T_ENTER) / (T_ZERO - T_ENTER)));
const distAt = (t: number) => {
  // integral of speed * PX_PER_KMH
  const a = Math.min(t, 1.5);
  let s = PX_PER_KMH * (92 * a + (8 * a * a) / 3); // rough integral of the 92->100 ramp
  if (t > 1.5) s += PX_PER_KMH * 100 * (Math.min(t, T_ENTER) - 1.5);
  if (t > T_ENTER) {
    const T = T_ZERO - T_ENTER;
    const u = Math.min(1, (t - T_ENTER) / T);
    s += PX_PER_KMH * 100 * T * (u - (u * u) / 2);
  }
  return s;
};
const BED_START = distAt(T_ENTER) + TRUCK_X + FRONT; // world x where the gravel begins
const BED_PX = distAt(T_ZERO) - distAt(T_ENTER); // 150 m of gravel, in px
const BED_LEN = BED_PX * 1.12; // the bed is a little longer than the stop

const Tag: React.FC<{ x: number; y: number; color: string; o: number; size?: number; pill?: boolean; children: React.ReactNode }> = ({
  x, y, color, o, size = 36, pill = false, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color, opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.9)",
    ...(pill ? { background: "rgba(20,14,30,0.82)", padding: "10px 26px", borderRadius: 40 } : {}) }}>
    {children}
  </div>
);

export const RunawayRamp: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const v = speedAt(t);
  const scroll = distAt(t);
  const inBed = t >= T_ENTER;
  const sink = interpolate(t, [T_ENTER, T_ENTER + 1.4, T_ZERO], [0, 26, 44], { ...clamp, easing: Easing.out(Easing.quad) });
  const gravelUsedM = inBed ? (150 * (distAt(t) - distAt(T_ENTER))) / BED_PX : 0;

  // World tilt: downhill during the hook, levelling onto the ramp.
  const tilt = interpolate(t, [0, METER.end], [7, 0], { ...clamp, easing: ease });

  // Camera: zoom into the front wheel for the road and sink lines.
  const zoom = interpolate(t, [ROAD.start - 0.2, ROAD.start + 0.7, SHOVE.start + 0.2, SHOVE.start + 1.2], [0, 1, 1, 0], { ...clamp, easing: ease });
  const push = interpolate(t, [STOP.start, timeline.duration], [0, 0.32], { ...clamp, easing: ease });
  const BASE = 1.7;
  const scale = BASE * (1 + 0.9 * zoom) * (1 + push);
  const fx = TRUCK_X + WHEELS[4];
  const fy = GROUND - WHEEL_R + sink * 0.6;
  const px = interpolate(zoom, [0, 1], [TRUCK_X + 300 + 160 * push / 0.32, fx]);
  const py = interpolate(zoom, [0, 1], [GROUND - 100, fy]);
  const ay = interpolate(zoom, [0, 1], [980, 1000]);
  const shake = 5 * (v / 100) * (1 - zoom) + (inBed ? 8 * Math.exp(-(t - T_ENTER) * 3) : 0);
  const camX = 540 - px * scale + Math.sin(frame * 2.7) * shake;
  const camY = ay - py * scale + Math.cos(frame * 3.1) * shake;

  // Wheel spin
  const wheelRot = (scroll / (2 * Math.PI * WHEEL_R)) * 360;

  // Brake glow: hot in the hook, fades as the truck reaches the ramp
  const brakeHot = interpolate(t, [0, 0.25, METER.end, ROAD.start + 0.5], [0.6, 1, 0.9, 0.25], clamp);
  const flash = interpolate(t, [0, 0.12, 0.6], [0, 1, 0], clamp);

  // ---------- Labels ----------
  const fadeIO = (a: number, b: number, c: number, d: number) => interpolate(t, [a, b, c, d], [0, 1, 1, 0], clamp);
  const titleO = interpolate(t, [HOOK.end - 0.1, HOOK.end + 0.3], [1, 0], clamp);
  const hudO = interpolate(t, [METER.start, METER.start + 0.35], [0, 1], clamp) * interpolate(t, [PAYOFF.start - 0.3, PAYOFF.start], [1, 0], clamp);
  const hudPop = spring({ frame: frame - Math.round(METER.start * fps), fps, config: { damping: 12, stiffness: 160 } });
  const brakeTagO = fadeIO(0, 0.2, METER.start + 0.6, METER.start + 1.0);
  const roadTagO = fadeIO(ROAD.start + 0.6, ROAD.start + 1.0, SINK.start - 0.1, SINK.start + 0.2);
  const sinkTagO = fadeIO(wordStart("sink", "wheels") - 0.1, wordStart("sink", "wheels") + 0.3, SHOVE.start + 0.2, SHOVE.start + 0.6);
  const looseTagO = fadeIO(SINK.start + 0.2, SINK.start + 0.6, SHOVE.start, SHOVE.start + 0.4);
  const barsO = fadeIO(ROAD.start + 1.0, ROAD.start + 1.4, SHOVE.start + 0.4, SHOVE.start + 0.8);
  const gravelBar = interpolate(t, [SINK.start + 0.4, SINK.start + 1.6], [0.04, 1], { ...clamp, easing: ease });
  const shoveO = fadeIO(SHOVE.start + 0.9, SHOVE.start + 1.3, STOP.start + 0.4, STOP.start + 0.8);
  const plowO = fadeIO(wordStart("stop", "deeper") - 0.1, wordStart("stop", "deeper") + 0.3, T_ZERO - 0.2, T_ZERO);
  const zeroPop = spring({ frame: frame - Math.round(T_ZERO * fps), fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  const endA = spring({ frame: frame - Math.round(PAYOFF.start * fps), fps, config: { damping: 14, stiffness: 160 } });
  const endB = spring({ frame: frame - Math.round(wordStart("payoff", "it") * fps), fps, config: { damping: 11, stiffness: 170 } });

  // ---------- World pieces in screen space (world x minus scroll) ----------
  const toScreen = (wx: number) => wx - scroll;
  const bedX0 = toScreen(BED_START);
  const bedX1 = toScreen(BED_START + BED_LEN);
  const signX = toScreen(BED_START - 900);

  // Stones: only the visible ones (world-anchored, deterministic)
  const stones: React.ReactNode[] = [];
  const STEP = 22;
  const first = Math.max(Math.floor((scroll - 400) / STEP), Math.floor(BED_START / STEP));
  const last = Math.min(Math.floor((scroll + 1300) / STEP), Math.floor((BED_START + BED_LEN) / STEP));
  for (let i = first; i <= last; i++) {
    for (let row = 0; row < 6; row++) {
      const wx = i * STEP + random(`x${i}-${row}`) * 14 + (row % 2) * 11;
      const r = 8 + random(`r${i}-${row}`) * 4;
      const y = GROUND - 12 + row * 17 + random(`y${i}-${row}`) * 5;
      const shade = 150 + Math.floor(random(`c${i}-${row}`) * 70);
      stones.push(
        <circle key={`${i}-${row}`} cx={toScreen(wx)} cy={y} r={r} fill={`rgb(${shade},${shade - 18},${shade - 45})`} stroke="rgba(60,40,20,0.5)" strokeWidth={1.5} />,
      );
    }
  }

  // Gravel being shoved: particles thrown ahead of each wheel while moving in the bed
  const spray: React.ReactNode[] = [];
  if (inBed && t < T_ZERO + 0.6) {
    WHEELS.forEach((wo, wi) => {
      for (let k = 0; k < 7; k++) {
        const life = 0.55;
        const phase = ((t * 1.0 + k / 7 + wi * 0.13) % 1) * life;
        const born = t - phase;
        const vb = speedAt(born) / 100;
        if (vb <= 0.02) continue;
        const ang = -0.5 - random(`a${wi}-${k}-${Math.floor(born * 10)}`) * 1.4;
        const sp = 260 * vb + 80;
        const x0 = TRUCK_X + wo + WHEEL_R * 0.7;
        const y0 = GROUND - 6 + sink * 0.5;
        const x = x0 + Math.cos(ang) * sp * phase * 1.6;
        const y = y0 + Math.sin(ang) * sp * phase + 600 * phase * phase;
        spray.push(<circle key={`${wi}-${k}`} cx={x} cy={y} r={6 + (k % 3) * 2} fill="#d9c49a" opacity={1 - phase / life} />);
      }
    });
  }

  // Smoke from the brakes in the hook
  const smoke = [...Array(10)].map((_, k) => {
    const p = ((t * 0.9 + k / 10) % 1);
    const wo = WHEELS[k % WHEELS.length];
    return (
      <circle key={k} cx={TRUCK_X + wo - 120 * p} cy={GROUND - WHEEL_R - 140 * p} r={18 + 50 * p} fill="rgba(210,210,215,0.5)"
        opacity={(1 - p) * brakeHot * interpolate(t, [ROAD.start, ROAD.start + 0.6], [1, 0], clamp)} />
    );
  });

  const truckY = sink;
  const mountainShift = (k: number) => -(scroll * k) % 1080;
  const posts = [...Array(8)].map((_, k) => k * 260 - (scroll % 260) - 300);
  const dashes = [...Array(14)].map((_, k) => k * 120 - (scroll % 120) - 300);
  const pile = inBed ? 8 + 22 * Math.min(1, (t - T_ENTER) / 3) : 0;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #2c3e6b 0%, #c96b45 52%, #f1a35a 70%, #f5c27a 100%)", overflow: "hidden" }}>
      <Audio src={staticFile("runaway-ramp/narration.wav")} />
      <Audio src={staticFile("runaway-ramp/bed.wav")} volume={0.6} />

      {/* Distant ridges (parallax) */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[0, 1].map((rep) => (
          <path key={rep} transform={`translate(${mountainShift(0.12) + rep * 1080} 0)`}
            d="M0 900 L140 700 L260 800 L420 620 L560 760 L700 640 L860 790 L1000 680 L1080 760 L1080 1300 L0 1300 Z" fill="#7a3f3a" opacity={0.75} />
        ))}
        {[0, 1].map((rep) => (
          <path key={`b${rep}`} transform={`translate(${mountainShift(0.3) + rep * 1080} 0)`}
            d="M0 1000 L180 850 L320 930 L500 800 L680 920 L820 840 L1080 960 L1080 1300 L0 1300 Z" fill="#5a2c2e" opacity={0.9} />
        ))}
      </svg>

      {/* ================= WORLD ================= */}
      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) scale(${scale})`, transformOrigin: "0 0" }}>
        <AbsoluteFill style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${TRUCK_X + 300}px ${GROUND}px` }}>
          <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
            {/* Earth below the road */}
            <rect x={-1500} y={GROUND} width={4000} height={1400} fill="#3b2418" />
            {/* Asphalt (before the bed) */}
            <rect x={-1500} y={GROUND - 4} width={Math.max(0, bedX0 + 1500)} height={34} fill="#2a2a30" />
            {dashes.filter((x) => x + 60 < bedX0).map((x, k) => (
              <rect key={k} x={x} y={GROUND + 8} width={60} height={6} fill="#f4d35e" />
            ))}
            {posts.map((x, k) => (
              <g key={`p${k}`}>
                <rect x={x} y={GROUND - 70} width={10} height={66} fill="#e8e2d6" />
                <rect x={x} y={GROUND - 70} width={10} height={14} fill={RED} />
              </g>
            ))}
            {/* Gravel bed: a trench filled with round stones */}
            <rect x={bedX0} y={GROUND - 14} width={Math.max(0, bedX1 - bedX0)} height={120} fill="#8a7550" />
            {stones}
            {/* Bed end barrier */}
            <rect x={bedX1} y={GROUND - 120} width={40} height={130} fill="#c9c2b4" stroke="#6d6356" strokeWidth={3} />

            {/* Ramp sign */}
            <g transform={`translate(${signX} ${GROUND - 460})`}>
              <rect x={-6} y={120} width={12} height={340} fill="#9aa0a8" />
              <rect x={-230} y={0} width={460} height={150} rx={14} fill="#1f7a4a" stroke="#fff" strokeWidth={6} />
            </g>

            {/* Truck: trailer + cab, sinking into the bed */}
            <g transform={`translate(${TRUCK_X} ${truckY})`}>
              <rect x={0} y={GROUND - 300} width={440} height={200} rx={8} fill="#dfe6ee" stroke="#8b97a6" strokeWidth={4} />
              <rect x={20} y={GROUND - 280} width={400} height={20} fill="#b9c4d1" />
              <rect x={0} y={GROUND - 100} width={600} height={22} fill="#3d434d" />
              <path d={`M 455 ${GROUND - 100} L 455 ${GROUND - 250} L 545 ${GROUND - 250} L 600 ${GROUND - 180} L 600 ${GROUND - 100} Z`}
                fill={ACCENT} stroke="#9a5a10" strokeWidth={4} />
              <path d={`M 480 ${GROUND - 235} L 540 ${GROUND - 235} L 580 ${GROUND - 185} L 480 ${GROUND - 185} Z`} fill="#3a5c7a" />
              <rect x={590} y={GROUND - 140} width={16} height={26} fill="#fff6c0" />
              {WHEELS.map((wo, i) => (
                <g key={i} transform={`translate(${wo} ${GROUND - WHEEL_R}) rotate(${wheelRot})`}>
                  <circle r={WHEEL_R} fill="#1a1a1e" />
                  <circle r={WHEEL_R - 14} fill="#55595f" />
                  <circle r={18} fill={`rgba(255,${Math.round(90 - 60 * brakeHot)},40,${0.25 + 0.75 * brakeHot})`}
                    style={{ filter: `drop-shadow(0 0 ${14 * brakeHot}px rgba(255,80,40,0.9))` }} />
                  {[0, 1, 2, 3, 4].map((s) => (
                    <rect key={s} x={-3} y={-WHEEL_R + 4} width={6} height={12} fill="#777" transform={`rotate(${s * 72})`} />
                  ))}
                </g>
              ))}
            </g>
            {/* Stones in front of the wheels once sunk (drawn over the tyre bottoms) */}
            {inBed &&
              WHEELS.map((wo, i) => (
                <g key={`cover${i}`}>
                  {[...Array(6)].map((_, k) => (
                    <circle key={k} cx={TRUCK_X + wo - WHEEL_R + k * 18 + (random(`cv${i}${k}`) * 6)} cy={GROUND - 6 + (k % 2) * 8}
                      r={10} fill={`rgb(${170 + k * 6},${152 + k * 5},${118 + k * 4})`} stroke="rgba(60,40,20,0.5)" strokeWidth={1.5} />
                  ))}
                </g>
              ))}
            {inBed &&
              WHEELS.map((wo, i) => (
                <path key={`pile${i}`} d={`M ${TRUCK_X + wo + WHEEL_R * 0.3} ${GROUND - 4} Q ${TRUCK_X + wo + WHEEL_R + 14} ${GROUND - 4 - pile * 2} ${TRUCK_X + wo + WHEEL_R + 40} ${GROUND - 4}`}
                  fill="#b9a27a" stroke="#7a6444" strokeWidth={2} />
              ))}
            {spray}
            {smoke}
          </svg>
          {/* Sign text (in world) */}
          <div style={{ position: "absolute", left: signX - 230, top: GROUND - 460, width: 460, height: 150, display: "flex",
            alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 44,
            lineHeight: 1.0, color: "#fff" }}>
            RUNAWAY
            <br />
            TRUCK RAMP
          </div>
        </AbsoluteFill>

      </AbsoluteFill>

      {/* Flash on the first frame: brakes give out */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 45% 60%, rgba(255,120,60,${0.6 * flash}) 0%, rgba(0,0,0,0) 55%)` }} />

      {/* Screen-space labels */}
      <Tag x={540} y={570} color={RED} o={brakeTagO} size={52}>BRAKES OVERHEATED</Tag>
      <Tag x={540} y={1360} color="#ffffff" o={roadTagO} size={42} pill>HARD ROAD: RIDES ON TOP</Tag>
      <Tag x={540} y={1360} color={ACCENT} o={looseTagO * (1 - sinkTagO)} size={42} pill>ROUND, LOOSE STONES</Tag>
      <Tag x={540} y={1360} color={ACCENT} o={sinkTagO} size={42} pill>THE WHEEL SINKS IN</Tag>
      <Tag x={540} y={540} color="#ffffff" o={shoveO} size={48}>GRAVEL SHOVED ASIDE</Tag>
      <Tag x={540} y={600} color={ACCENT} o={shoveO} size={38}>EVERY TURN, EVERY WHEEL</Tag>
      <Tag x={540} y={560} color={ACCENT} o={plowO} size={52}>DEEPER = HARDER PLOW</Tag>

      {/* Resistance bars: road vs gravel (rolling resistance 0.01 vs 0.25, drawn to scale) */}
      <div style={{ position: "absolute", left: 90, top: 500, width: 840, padding: "18px 24px", boxSizing: "border-box", borderRadius: 18,
        background: "rgba(20,14,30,0.78)", opacity: barsO, fontFamily: FONT, fontWeight: 700 }}>
        <div style={{ fontSize: 30, letterSpacing: 4, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>HOLDS THE TRUCK BACK</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
          <div style={{ width: 170, fontSize: 34, color: "#cfe8ff" }}>ROAD</div>
          <div style={{ width: 600 * 0.04, height: 34, background: SKY, borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 170, fontSize: 34, color: ACCENT }}>GRAVEL</div>
          <div style={{ width: 600 * gravelBar, height: 34, background: ACCENT, borderRadius: 6 }} />
        </div>
      </div>

      <SeriesTag name="How It Works" n={5} accent={ACCENT} until={HOOK.end} />

      {/* Title */}
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 86,
        lineHeight: 1.05, letterSpacing: -2, color: "#fff", opacity: titleO, textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
        NO BRAKES.
        <br />
        <span style={{ color: ACCENT }}>WHY GRAVEL?</span>
      </div>

      {/* HUD: speedometer + gravel used */}
      <div style={{ position: "absolute", top: 165, width: "100%", textAlign: "center", fontFamily: FONT, opacity: hudO,
        transform: `scale(${0.85 + 0.15 * Math.min(1, hudPop)})` }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 170, lineHeight: 1, letterSpacing: -4, fontVariantNumeric: "tabular-nums",
            color: v < 0.5 ? "#7dff9a" : "#ffffff", textShadow: "0 4px 30px rgba(0,0,0,0.6)",
            transform: `scale(${t >= T_ZERO ? 1 + 0.2 * (1 - Math.min(1, zeroPop)) : 1})` }}>
            {Math.round(v)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 44, color: "rgba(255,255,255,0.85)" }}>KM/H</div>
        </div>
        <div style={{ margin: "12px auto 0", width: 780, position: "relative" }}>
          <div style={{ height: 30, borderRadius: 15, background: "rgba(0,0,0,0.35)", border: "2px solid rgba(255,255,255,0.5)", overflow: "hidden" }}>
            <div style={{ width: `${(Math.min(150, gravelUsedM) / 150) * 100}%`, height: "100%", background: ACCENT }} />
          </div>
          <div style={{ marginTop: 8, fontWeight: 700, fontSize: 34, letterSpacing: 3, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            {t < T_ENTER ? "GRAVEL AHEAD: 150 M" : `GRAVEL USED: ${Math.round(Math.min(150, gravelUsedM))} M OF 150`}
          </div>
        </div>
      </div>

      {/* Payoff */}
      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 700, fontSize: 64, color: "#fff", opacity: Math.min(1, endA), transform: `translateY(${24 * (1 - Math.min(1, endA))}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
          IT DOESN'T GRIP
        </div>
        <div style={{ fontWeight: 700, fontSize: 112, lineHeight: 1.05, color: ACCENT, opacity: Math.min(1, endB), transform: `scale(${0.8 + 0.2 * endB})`,
          textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
          IT SWALLOWS
        </div>
      </div>

      <div style={{ position: "absolute", top: 1385, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 22,
        letterSpacing: 4, color: "rgba(255,255,255,0.6)", opacity: (1 - zoom) * interpolate(t, [timeline.duration - 2.2, timeline.duration - 1.9], [1, 0], clamp) }}>
        SIMPLIFIED: LEVEL BED, STEADY SLOWDOWN
      </div>

      <Captions lines={timeline.lines} top={1440} accent={ACCENT} />
      <SeriesOutro name="How It Works" next={6} accent={ACCENT} />
    </AbsoluteFill>
  );
};
