import React from "react";
import { FizzCue } from "../primitives/Fizz";
import { SunVanishes } from "./sunVanishes/SunVanishes";
import { LightningThunder } from "./lightningThunder/LightningThunder";
import { TreeFromAir } from "./treeFromAir/TreeFromAir";
import { SunflowerSpirals } from "./sunflowerSpirals/SunflowerSpirals";
import { JetEngineFan } from "./jetEngineFan/JetEngineFan";
import jetEngineFanTimeline from "../../videos/jet-engine-fan/timeline.json";
import jetEngineFanScript from "../../videos/jet-engine-fan/script.json";
import { SpinDizzy } from "./spinDizzy/SpinDizzy";
import treeTimeline from "../../videos/tree-from-air/timeline.json";
import sunflowerTimeline from "../../videos/sunflower-spirals/timeline.json";
import lightningTimeline from "../../videos/lightning-thunder/timeline.json";
import sunVanishesTimeline from "../../videos/sun-vanishes/timeline.json";
import sunVanishesScript from "../../videos/sun-vanishes/script.json";
import lightningScript from "../../videos/lightning-thunder/script.json";
import treeScript from "../../videos/tree-from-air/script.json";
import sunflowerScript from "../../videos/sunflower-spirals/script.json";
import spinDizzyTimeline from "../../videos/spin-dizzy/timeline.json";
import spinDizzyScript from "../../videos/spin-dizzy/script.json";
import { CityStreaming } from "./cityStreaming/CityStreaming";
import cityStreamingTimeline from "../../videos/city-streaming/timeline.json";
import cityStreamingScript from "../../videos/city-streaming/script.json";
import { PowerLineTube } from "./powerLineTube/PowerLineTube";
import powerLineTubeTimeline from "../../videos/power-line-tube/timeline.json";
import powerLineTubeScript from "../../videos/power-line-tube/script.json";
import { HelicopterTailRotor } from "./helicopterTailRotor/HelicopterTailRotor";
import helicopterTailRotorTimeline from "../../videos/helicopter-tail-rotor/timeline.json";
import helicopterTailRotorScript from "../../videos/helicopter-tail-rotor/script.json";
import { PineconeWeather } from "./pineconeWeather/PineconeWeather";
import pineconeWeatherTimeline from "../../videos/pinecone-weather/timeline.json";
import pineconeWeatherScript from "../../videos/pinecone-weather/script.json";
import { EarthTunnel } from "./earthTunnel/EarthTunnel";
import earthTunnelTimeline from "../../videos/earth-tunnel/timeline.json";
import earthTunnelScript from "../../videos/earth-tunnel/script.json";
import { ShellDissolving } from "./shellDissolving/ShellDissolving";
import shellDissolvingTimeline from "../../videos/shell-dissolving/timeline.json";
import shellDissolvingScript from "../../videos/shell-dissolving/script.json";
import { DoublingGiant } from "./doublingGiant/DoublingGiant";
import doublingGiantTimeline from "../../videos/doubling-giant/timeline.json";
import doublingGiantScript from "../../videos/doubling-giant/script.json";
import { CoconutWater } from "./coconutWater/CoconutWater";
import coconutWaterTimeline from "../../videos/coconut-water/timeline.json";
import coconutWaterScript from "../../videos/coconut-water/script.json";
import { EarthTunnelLong } from "./earthTunnelLong/EarthTunnelLong";
import earthTunnelLongTimeline from "../../videos/earth-tunnel-long/timeline.json";
import earthTunnelLongScript from "../../videos/earth-tunnel-long/script.json";
import { BlackHoleFall } from "./blackHoleFall/BlackHoleFall";
import blackHoleFallTimeline from "../../videos/black-hole-fall/timeline.json";
import blackHoleFallScript from "../../videos/black-hole-fall/script.json";
import { RunawayRamp } from "./runawayRamp/RunawayRamp";
import runawayRampTimeline from "../../videos/runaway-ramp/timeline.json";
import runawayRampScript from "../../videos/runaway-ramp/script.json";
import { RedFishDark } from "./redFishDark/RedFishDark";
import redFishDarkTimeline from "../../videos/red-fish-dark/timeline.json";
import redFishDarkScript from "../../videos/red-fish-dark/script.json";
import { OxygenVanishes } from "./oxygenVanishes/OxygenVanishes";
import oxygenVanishesTimeline from "../../videos/oxygen-vanishes/timeline.json";
import oxygenVanishesScript from "../../videos/oxygen-vanishes/script.json";
import { AntFall } from "./antFall/AntFall";
import antFallTimeline from "../../videos/ant-fall/timeline.json";
import antFallScript from "../../videos/ant-fall/script.json";
import { MoonBullet } from "./moonBullet/MoonBullet";
import moonBulletTimeline from "../../videos/moon-bullet/timeline.json";
import moonBulletScript from "../../videos/moon-bullet/script.json";
import { RocketVacuum } from "./rocketVacuum/RocketVacuum";
import rocketVacuumTimeline from "../../videos/rocket-vacuum/timeline.json";
import rocketVacuumScript from "../../videos/rocket-vacuum/script.json";
import { TrainJump } from "./trainJump/TrainJump";
import trainJumpTimeline from "../../videos/train-jump/timeline.json";
import trainJumpScript from "../../videos/train-jump/script.json";
import { BreathCloud } from "./breathCloud/BreathCloud";
import breathCloudTimeline from "../../videos/breath-cloud/timeline.json";
import breathCloudScript from "../../videos/breath-cloud/script.json";
import type { ThumbSpec } from "../primitives/Thumbnail";

/**
 * Every video is registered here. The id is the slug used by scripts/make.sh.
 * fizz: true puts the mascot in the video, reacting on cues from its timeline
 * (see src/primitives/Fizz.tsx). fizzCues overrides the automatic cues.
 * Leave both out for a video without the mascot.
 * thumb comes from the script's "thumb" block and registers <slug>-thumb (scripts/thumb.sh).
 * width/height default to a 1080x1920 Short; weekly long videos set width: 1920, height: 1080 (PLAYBOOK section 6).
 */
export const VIDEOS: { id: string; component: React.FC; duration: number; timeline?: unknown; fizz?: boolean; fizzCues?: FizzCue[]; thumb?: ThumbSpec; width?: number; height?: number }[] = [
  { id: "sun-vanishes", component: SunVanishes, duration: sunVanishesTimeline.duration, thumb: sunVanishesScript.thumb },
  { id: "lightning-thunder", component: LightningThunder, duration: lightningTimeline.duration, thumb: lightningScript.thumb },
  { id: "tree-from-air", component: TreeFromAir, duration: treeTimeline.duration, thumb: treeScript.thumb },
  { id: "sunflower-spirals", component: SunflowerSpirals, duration: sunflowerTimeline.duration, thumb: sunflowerScript.thumb },
  { id: "jet-engine-fan", component: JetEngineFan, duration: jetEngineFanTimeline.duration, thumb: jetEngineFanScript.thumb },
  { id: "spin-dizzy", component: SpinDizzy, duration: spinDizzyTimeline.duration, thumb: spinDizzyScript.thumb },
  { id: "city-streaming", component: CityStreaming, duration: cityStreamingTimeline.duration, thumb: cityStreamingScript.thumb },
  { id: "power-line-tube", component: PowerLineTube, duration: powerLineTubeTimeline.duration, thumb: powerLineTubeScript.thumb },
  { id: "helicopter-tail-rotor", component: HelicopterTailRotor, duration: helicopterTailRotorTimeline.duration, thumb: helicopterTailRotorScript.thumb },
  { id: "pinecone-weather", component: PineconeWeather, duration: pineconeWeatherTimeline.duration, thumb: pineconeWeatherScript.thumb },
  { id: "earth-tunnel", component: EarthTunnel, duration: earthTunnelTimeline.duration, thumb: earthTunnelScript.thumb },
  { id: "shell-dissolving", component: ShellDissolving, duration: shellDissolvingTimeline.duration, thumb: shellDissolvingScript.thumb },
  { id: "doubling-giant", component: DoublingGiant, duration: doublingGiantTimeline.duration, thumb: doublingGiantScript.thumb },
  { id: "coconut-water", component: CoconutWater, duration: coconutWaterTimeline.duration, thumb: coconutWaterScript.thumb },
  { id: "earth-tunnel-long", component: EarthTunnelLong, duration: earthTunnelLongTimeline.duration, thumb: earthTunnelLongScript.thumb, width: 1920, height: 1080 },
  { id: "black-hole-fall", component: BlackHoleFall, duration: blackHoleFallTimeline.duration, thumb: blackHoleFallScript.thumb },
  { id: "runaway-ramp", component: RunawayRamp, duration: runawayRampTimeline.duration, thumb: runawayRampScript.thumb },
  { id: "red-fish-dark", component: RedFishDark, duration: redFishDarkTimeline.duration, thumb: redFishDarkScript.thumb },
  { id: "oxygen-vanishes", component: OxygenVanishes, duration: oxygenVanishesTimeline.duration, thumb: oxygenVanishesScript.thumb },
  { id: "ant-fall", component: AntFall, duration: antFallTimeline.duration, thumb: antFallScript.thumb },
  { id: "moon-bullet", component: MoonBullet, duration: moonBulletTimeline.duration, thumb: moonBulletScript.thumb },
  { id: "rocket-vacuum", component: RocketVacuum, duration: rocketVacuumTimeline.duration, thumb: rocketVacuumScript.thumb },
  { id: "train-jump", component: TrainJump, duration: trainJumpTimeline.duration, thumb: trainJumpScript.thumb },
  { id: "breath-cloud", component: BreathCloud, duration: breathCloudTimeline.duration, thumb: breathCloudScript.thumb },
];
