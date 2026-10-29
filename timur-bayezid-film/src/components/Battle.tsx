import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {EASE, noise1, ramp, rr} from '../lib/anim';
import {LOOK, LookKey, Rider} from '../characters/cast';
import {Look, Person, Prop} from '../characters/Person';
import {Gait} from '../characters/Mounts';
import {Sprite} from './Sprite';

export type Emblem = 'crescent' | 'threeRings' | 'eagle' | 'cross' | 'none';

/** Waving banner on a pole. */
export const Banner: React.FC<{
  x: number;
  y: number;
  h?: number;
  w?: number;
  color: string;
  accent?: string;
  emblem?: Emblem;
  seed?: string;
  scale?: number;
  tail?: boolean;
  wind?: number;
}> = ({x, y, h = 320, w = 150, color, accent = C.gold, emblem = 'none', seed = 'bn', scale = 1, tail = true, wind = 1}) => {
  const f = useCurrentFrame();
  const top = -h;
  const pts = 7;
  const wave = (i: number, row: number) => Math.sin(f / 5 * wind + i * 0.9 + rr(seed, 0, 6)) * (i / pts) * 16 * wind + row * 0;
  let upper = '';
  let lower = '';
  for (let i = 0; i <= pts; i++) {
    const px = (i / pts) * w;
    upper += `${i === 0 ? 'M' : 'L'}${px} ${top + wave(i, 0)} `;
    lower = `L${px} ${top + h * 0.38 + wave(i, 1) + (tail && i === pts ? 30 : 0)} ` + lower;
  }
  const d = `${upper}${tail ? `L${w + 20} ${top + h * 0.19 + wave(pts, 0)} ` : ''}${lower}Z`;
  const ex = w * 0.45;
  const ey = top + h * 0.19 + wave(3, 0);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={`M0 0 L0 ${top - 16}`} stroke={C.ink} strokeWidth={7} />
      <path d={`M0 0 L0 ${top - 16}`} stroke={C.goldDeep} strokeWidth={3.5} />
      <circle cx={0} cy={top - 22} r={8} fill={C.gold} stroke={C.ink} strokeWidth={2} />
      <path d={d} fill={color} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={upper.replace(/M0/, 'M0')} stroke={accent} strokeWidth={4} fill="none" transform="translate(0 8)" opacity={0.85} />
      {emblem === 'crescent' && (
        <g transform={`translate(${ex} ${ey})`}>
          <circle r={22} fill={accent} />
          <circle cx={8} cy={-3} r={19} fill={color} />
        </g>
      )}
      {emblem === 'threeRings' && (
        <g transform={`translate(${ex} ${ey})`} fill="none" stroke={accent} strokeWidth={5}>
          <circle cx={-14} cy={10} r={11} />
          <circle cx={14} cy={10} r={11} />
          <circle cx={0} cy={-14} r={11} />
        </g>
      )}
      {emblem === 'eagle' && (
        <path
          transform={`translate(${ex} ${ey - 4}) scale(0.9)`}
          d="M0 -20 l6 8 l14 -10 l-4 16 l12 2 l-12 8 l4 18 l-12 -8 l-8 14 l-8 -14 l-12 8 l4 -18 l-12 -8 l12 -2 l-4 -16 l14 10z"
          fill={accent}
        />
      )}
      {emblem === 'cross' && <path transform={`translate(${ex} ${ey})`} d="M-6 -24 H6 V-6 H24 V6 H6 V24 H-6 V6 H-24 V-6 H-6 Z" fill={accent} />}
    </g>
  );
};

/** Volley of arrows along parabolic arcs (left→right if x1 > x0). */
export const ArrowVolley: React.FC<{
  from: number;
  dur?: number;
  count?: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  spread?: number;
  arc?: number;
  seed?: string;
  waves?: number;
  waveGap?: number;
  color?: string;
}> = ({from, dur = 40, count = 30, x0, x1, y0, y1, spread = 300, arc = 380, seed = 'av', waves = 1, waveGap = 20, color = C.ink}) => {
  const f = useCurrentFrame();
  const items: React.ReactNode[] = [];
  for (let wv = 0; wv < waves; wv++) {
    for (let i = 0; i < count; i++) {
      const s = `${seed}-${wv}-${i}`;
      const st = from + wv * waveGap + rr(s + 'd', 0, 10);
      const t = (f - st) / dur;
      if (t < 0 || t > 1.05) continue;
      const ox = x0 + rr(s + 'x', -spread / 2, spread / 2);
      const oy = y0 + rr(s + 'y', -40, 40);
      const tx = x1 + rr(s + 'tx', -spread / 2, spread / 2);
      const ty = y1 + rr(s + 'ty', -50, 50);
      const tt = Math.min(1, t);
      const px = ox + (tx - ox) * tt;
      const py = oy + (ty - oy) * tt - Math.sin(tt * Math.PI) * arc;
      const vx = tx - ox;
      const vy = ty - oy - Math.cos(tt * Math.PI) * Math.PI * arc;
      const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
      items.push(
        <g key={s} transform={`translate(${px} ${py}) rotate(${ang})`}>
          <path d="M-34 0 L10 0" stroke={color} strokeWidth={2.4} />
          <path d="M10 -4 L20 0 L10 4 Z" fill={color} />
          <path d="M-34 0 L-42 -5 M-34 0 L-42 5 M-28 0 L-36 -5 M-28 0 L-36 5" stroke={C.redDeep} strokeWidth={2} />
        </g>,
      );
    }
  }
  return <g>{items}</g>;
};

/** A rank of infantry (repeated unit with variation). */
export const InfantryRank: React.FC<{
  look: LookKey;
  n: number;
  x: number;
  y: number;
  gap?: number;
  scale?: number;
  facing?: 'left' | 'right';
  seed?: string;
  march?: boolean;
  prop?: Prop;
  armFront?: [number, number];
  advance?: number;
  expression?: 'neutral' | 'anger' | 'confident' | 'sad';
  fallen?: number; // fraction of soldiers that have fallen (0..1)
  attack?: boolean;
  vector?: boolean;
}> = ({look, n, x, y, gap = 60, scale = 0.5, facing = 'right', seed = 'ir', march = false, prop, armFront, advance = 0, expression = 'neutral', fallen = 0, attack = false, vector = false}) => {
  const f = useCurrentFrame();
  const L = LOOK[look] as Look;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const s = `${seed}${i}`;
    if (rr(s + 'fall', 0, 1) < fallen) continue;
    const px = x + i * gap + rr(s, -10, 10) + advance;
    const py = y + rr(s + 'y', -8, 8);
    if (vector) {
      items.push(
        <Person
          key={i}
          look={L}
          x={px}
          y={py}
          scale={scale * rr(s + 'sc', 0.94, 1.06)}
          facing={facing}
          t={f + rr(s + 't', 0, 200)}
          blinkSeed={i}
          pose={march ? 'walk' : 'stand'}
          walkPhase={march ? f / 6 + rr(s + 'p', 0, 6) : undefined}
          prop={prop}
          armFront={armFront}
          expression={expression}
          lod={1}
        />,
      );
    } else {
      const anim = march ? 'walk' : attack ? 'attack' : 'stand';
      const bob = !march && !attack ? Math.sin(f / 20 + i) * 1.5 : 0;
      items.push(
        <Sprite
          key={i}
          unit={look}
          anim={anim}
          x={px}
          y={py + bob}
          scale={scale * rr(s + 'sc', 0.94, 1.06)}
          facing={facing}
          phase={march ? f / 6 + rr(s + 'p', 0, 6) : (f / 5 + rr(s + 'p', 0, 6))}
        />,
      );
    }
  }
  return <g>{items}</g>;
};

/** A line of riders moving from x0 to x1 between frames (charges, retreats). */
export const CavalryLine: React.FC<{
  who: LookKey;
  n: number;
  x0: number;
  x1: number;
  y: number;
  from: number;
  dur: number;
  gap?: number;
  scale?: number;
  facing?: 'left' | 'right';
  gait?: Gait;
  seed?: string;
  rows?: number;
  rowGap?: number;
  prop?: Prop;
  armFront?: [number, number];
  ease?: (t: number) => number;
  opacity?: number;
}> = ({who, n, x0, x1, y, from, dur, gap = 150, scale = 0.45, facing = 'right', gait = 'gallop', seed = 'cl', rows = 1, rowGap = 40, prop, armFront, ease = EASE.soft, opacity = 1}) => {
  const f = useCurrentFrame();
  const p = ramp(f, from, from + dur, ease);
  const moving = f > from && f < from + dur;
  const items: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const s = `${seed}${r}-${i}`;
      const off = (facing === 'right' ? -1 : 1) * i * gap + rr(s, -30, 30) + (r % 2) * gap * 0.5;
      const px = x0 + (x1 - x0) * p + off;
      const py = y + r * rowGap + rr(s + 'y', -6, 6);
      items.push(
        <Sprite
          key={s}
          unit={who}
          anim={moving && gait !== 'stand' ? 'gallop' : 'ride'}
          x={px}
          y={py}
          scale={scale * (1 + r * 0.06)}
          facing={facing}
          phase={f * (gait === 'walk' ? 0.16 : gait === 'trot' ? 0.3 : 0.42) + rr(s + 'ph', 0, 6)}
          opacity={opacity}
        />,
      );
    }
  }
  return <g>{items}</g>;
};

/** Soft dust cloud band. */
export const DustCloud: React.FC<{x: number; y: number; w: number; h?: number; seed?: string; opacity?: number; color?: string}> = ({
  x,
  y,
  w,
  h = 200,
  seed = 'dc',
  opacity = 0.6,
  color = C.parchmentDark,
}) => {
  const f = useCurrentFrame();
  const gid = `dg-${seed}`;
  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={gid}>
          <stop offset="0%" stopColor={color} stopOpacity={0.75} />
          <stop offset="60%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {Array.from({length: Math.ceil(w / 90)}).map((_, i) => {
        const cx = x + i * 90 + noise1(seed + i, f / 40) * 30;
        const cy = y - rr(seed + 'y' + i, 0, h * 0.5) + noise1(seed + 'v' + i, f / 50) * 14;
        const r = rr(seed + 'r' + i, h * 0.35, h * 0.7) * (1 + 0.08 * Math.sin(f / 30 + i));
        return <circle key={i} cx={cx} cy={cy} r={r * 1.3} fill={`url(#${gid})`} />;
      })}
    </g>
  );
};

/** Clash sparks at a point (metal on metal). */
export const ClashSparks: React.FC<{x: number; y: number; at: number; seed?: string}> = ({x, y, at, seed = 'cs'}) => {
  const f = useCurrentFrame();
  const age = f - at;
  if (age < 0 || age > 14) return null;
  return (
    <g>
      {Array.from({length: 12}).map((_, i) => {
        const a = rr(seed + i, 0, Math.PI * 2);
        const sp = rr(seed + 's' + i, 6, 14);
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * age * sp * 0.6}
            y1={y + Math.sin(a) * age * sp * 0.6}
            x2={x + Math.cos(a) * age * sp}
            y2={y + Math.sin(a) * age * sp + age * 0.8}
            stroke={i % 2 ? C.goldLight : C.parchmentLight}
            strokeWidth={2.5}
            opacity={1 - age / 14}
          />
        );
      })}
      <circle cx={x} cy={y} r={30 * (1 - age / 14)} fill={C.parchmentLight} opacity={0.6 * (1 - age / 14)} />
    </g>
  );
};
