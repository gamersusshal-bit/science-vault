import React from "react";
import { SunVanishes } from "./sunVanishes/SunVanishes";
import sunVanishesTimeline from "../../videos/sun-vanishes/timeline.json";

/** Every video is registered here. The id is the slug used by scripts/make.sh. */
export const VIDEOS: { id: string; component: React.FC; duration: number }[] = [
  { id: "sun-vanishes", component: SunVanishes, duration: sunVanishesTimeline.duration },
];
