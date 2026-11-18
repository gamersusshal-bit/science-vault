import { Composition } from "remotion";
import { LandscapeThumbnail, Thumbnail } from "./primitives/Thumbnail";
import { VIDEOS } from "./videos";
import { FizzSheet, withFizz } from "./primitives/Fizz";

const FPS = 30;

export const MyComposition = () => {
  return (
    <>
      {VIDEOS.map((v) => (
        <Composition
          key={v.id}
          id={v.id}
          component={v.fizz ? withFizz(v.component, v.timeline, v.fizzCues) : v.component}
          durationInFrames={Math.ceil(v.duration * FPS)}
          fps={FPS}
          width={v.width ?? 1080}
          height={v.height ?? 1920}
        />
      ))}
      <Composition id="fizz-sheet" component={FizzSheet} durationInFrames={60} fps={FPS} width={1920} height={1080} />
      {VIDEOS.filter((v) => v.thumb).map((v) => (
        <Composition
          key={`${v.id}-thumb`}
          id={`${v.id}-thumb`}
          component={() =>
            (v.width ?? 1080) > (v.height ?? 1920) ? (
              <LandscapeThumbnail scene={v.component} spec={v.thumb!} />
            ) : (
              <Thumbnail scene={v.component} spec={v.thumb!} />
            )
          }
          durationInFrames={Math.ceil(v.duration * FPS)}
          fps={FPS}
          width={v.width ?? 1080}
          height={v.height ?? 1920}
        />
      ))}
    </>
  );
};
