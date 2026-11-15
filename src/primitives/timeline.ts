import { Line } from "./Captions";

export type Timeline = { duration: number; beats?: Record<string, number>; lines: Line[] };

/** Helpers for reading story beats out of a generated timeline.json. */
export const useTimeline = (json: unknown) => {
  const timeline = json as Timeline;
  const line = (id: string) => timeline.lines.find((l) => l.id === id)!;
  const wordStart = (id: string, startsWith: string) =>
    line(id).words.find((w) => w.text.toLowerCase().startsWith(startsWith.toLowerCase()))!.start;
  return { timeline, line, wordStart };
};
