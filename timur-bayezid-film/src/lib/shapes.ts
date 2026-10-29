import {rr} from './anim';

/** Smooth irregular blob path around (cx, cy). */
export const blob = (cx: number, cy: number, r: number, seed: string, n = 10, irregular = 0.3) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = r * (1 - irregular / 2 + rr(seed + i, 0, irregular));
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    d += i === 0 ? `M${mx} ${my}` : '';
    const p2 = pts[(i + 2) % n];
    d += ` Q${p1[0]} ${p1[1]} ${(p1[0] + p2[0]) / 2} ${(p1[1] + p2[1]) / 2}`;
  }
  return d + 'Z';
};
