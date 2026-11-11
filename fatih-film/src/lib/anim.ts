import {Easing, interpolate, random} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const EASE = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  cine: Easing.bezier(0.45, 0.05, 0.25, 1),
  soft: Easing.bezier(0.33, 0, 0.2, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

/** Keyframe interpolation: kf(frame, [[0, 1], [30, 2]], EASE.inOut). */
export const kf = (f: number, keys: [number, number][], easing: (t: number) => number = EASE.inOut) => {
  if (keys.length === 1) return keys[0][1];
  return interpolate(
    f,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing},
  );
};

/** 0→1 ramp between frames a and b. */
export const ramp = (f: number, a: number, b: number, easing: (t: number) => number = EASE.inOut) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** Fade in at a..a+d and out at b-d..b */
export const fadeInOut = (f: number, a: number, b: number, d = 12) =>
  Math.min(ramp(f, a, a + d), 1 - ramp(f, b - d, b));

/** Smooth 1-D value noise in [-1, 1]. */
export const noise1 = (seed: string | number, x: number) => {
  const i = Math.floor(x);
  const t = x - i;
  const s = t * t * (3 - 2 * t);
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  return a + (b - a) * s;
};

export const rnd = (seed: string | number) => random(seed);
export const rr = (seed: string | number, a: number, b: number) => a + random(seed) * (b - a);

export const deg = (d: number) => (d * Math.PI) / 180;

/** Polyline limb: start point + two segments with absolute angles (deg, 0 = straight down, + = toward facing). */
export const limb = (x: number, y: number, a1: number, l1: number, a2: number, l2: number) => {
  const x1 = x + Math.sin(deg(a1)) * l1;
  const y1 = y + Math.cos(deg(a1)) * l1;
  const x2 = x1 + Math.sin(deg(a2)) * l2;
  const y2 = y1 + Math.cos(deg(a2)) * l2;
  return {x1, y1, x2, y2, d: `M${x} ${y} L${x1} ${y1} L${x2} ${y2}`};
};
