import React from "react";
import { FizzCue } from "../primitives/Fizz";
import { SunVanishes } from "./sunVanishes/SunVanishes";
import { LightningThunder } from "./lightningThunder/LightningThunder";
import { TreeFromAir } from "./treeFromAir/TreeFromAir";
import { SunflowerSpirals } from "./sunflowerSpirals/SunflowerSpirals";
import treeTimeline from "../../videos/tree-from-air/timeline.json";
import sunflowerTimeline from "../../videos/sunflower-spirals/timeline.json";
import lightningTimeline from "../../videos/lightning-thunder/timeline.json";
import sunVanishesTimeline from "../../videos/sun-vanishes/timeline.json";
import sunVanishesScript from "../../videos/sun-vanishes/script.json";
import lightningScript from "../../videos/lightning-thunder/script.json";
import treeScript from "../../videos/tree-from-air/script.json";
import sunflowerScript from "../../videos/sunflower-spirals/script.json";
import type { ThumbSpec } from "../primitives/Thumbnail";

/**
 * Every video is registered here. The id is the slug used by scripts/make.sh.
 * fizz: true puts the mascot in the video, reacting on cues from its timeline
 * (see src/primitives/Fizz.tsx). fizzCues overrides the automatic cues.
 * Leave both out for a video without the mascot.
 * thumb comes from the script's "thumb" block and registers <slug>-thumb (scripts/thumb.sh).
 */
export const VIDEOS: { id: string; component: React.FC; duration: number; timeline?: unknown; fizz?: boolean; fizzCues?: FizzCue[]; thumb?: ThumbSpec }[] = [
  { id: "sun-vanishes", component: SunVanishes, duration: sunVanishesTimeline.duration, thumb: sunVanishesScript.thumb },
  { id: "lightning-thunder", component: LightningThunder, duration: lightningTimeline.duration, thumb: lightningScript.thumb },
  { id: "tree-from-air", component: TreeFromAir, duration: treeTimeline.duration, thumb: treeScript.thumb },
  { id: "sunflower-spirals", component: SunflowerSpirals, duration: sunflowerTimeline.duration, thumb: sunflowerScript.thumb },
];
