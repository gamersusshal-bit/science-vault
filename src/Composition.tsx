import { Composition } from "remotion";
import { VIDEOS } from "./videos";

const FPS = 30;

export const MyComposition = () => {
  return (
    <>
      {VIDEOS.map((v) => (
        <Composition
          key={v.id}
          id={v.id}
          component={v.component}
          durationInFrames={Math.ceil(v.duration * FPS)}
          fps={FPS}
          width={1080}
          height={1920}
        />
      ))}
    </>
  );
};
