import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";

export const FONT = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';

/** Blocks rendering until the brand font is ready, so no frame uses a fallback. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('500 40px "Space Grotesk"'),
      document.fonts.load('700 40px "Space Grotesk"'),
    ])
      .catch(() => undefined)
      .then(() => continueRender(handle));
  }, [handle]);
};
