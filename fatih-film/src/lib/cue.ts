import {CUES} from '../data/cues';
import {TIMING} from '../data/timing';

/** Scene-local frame at which `word` (n-th occurrence, partial match) is spoken. */
export const cue = (scene: string, word: string, nth = 0, fallback = 0): number => {
  const c = CUES[scene];
  if (!c) return fallback;
  let k = 0;
  for (const [w, t] of c.words) {
    if (w.includes(word)) {
      if (k === nth) return c.offset + Math.round(t * 30);
      k++;
    }
  }
  return fallback;
};

export const narrStart = (scene: string) => TIMING[scene]?.narrFrom ?? 0;
export const narrEnd = (scene: string) => (TIMING[scene] ? TIMING[scene].narrFrom + TIMING[scene].narrFrames : 0);
export const sceneLen = (scene: string) => TIMING[scene]?.frames ?? 300;
