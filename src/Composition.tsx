import { Composition } from "remotion";
import { SunVanishes } from "./videos/sunVanishes/SunVanishes";
import timeline from "./videos/sunVanishes/timeline.json";

const FPS = 30;

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={SunVanishes}
      durationInFrames={Math.ceil(timeline.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
