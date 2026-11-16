import React from "react";
import { SunVanishes } from "./sunVanishes/SunVanishes";
import { LightningThunder } from "./lightningThunder/LightningThunder";
import { TreeFromAir } from "./treeFromAir/TreeFromAir";
import { SunflowerSpirals } from "./sunflowerSpirals/SunflowerSpirals";
import treeTimeline from "../../videos/tree-from-air/timeline.json";
import sunflowerTimeline from "../../videos/sunflower-spirals/timeline.json";
import lightningTimeline from "../../videos/lightning-thunder/timeline.json";
import sunVanishesTimeline from "../../videos/sun-vanishes/timeline.json";

/** Every video is registered here. The id is the slug used by scripts/make.sh. */
export const VIDEOS: { id: string; component: React.FC; duration: number }[] = [
  { id: "sun-vanishes", component: SunVanishes, duration: sunVanishesTimeline.duration },
  { id: "lightning-thunder", component: LightningThunder, duration: lightningTimeline.duration },
  { id: "tree-from-air", component: TreeFromAir, duration: treeTimeline.duration },
  { id: "sunflower-spirals", component: SunflowerSpirals, duration: sunflowerTimeline.duration },
];
