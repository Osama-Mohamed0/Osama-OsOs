import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, H, W} from '../theme';
import {EASE, noise1, ramp, rnd, rr} from '../lib/anim';

/* ------------------------------------------------------------- particles */
export type ParticleKind = 'dust' | 'ash' | 'embers' | 'snow' | 'motes' | 'rain' | 'sparks';

export const Particles: React.FC<{
  kind: ParticleKind;
  count?: number;
  seed?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  opacity?: number;
  speed?: number;
  size?: number;
  color?: string;
  wind?: number;
}> = ({kind, count = 60, seed = kind, x = 0, y = 0, w = W, h = H, opacity = 1, speed = 1, size = 1, color, wind = 0}) => {
  const f = useCurrentFrame();
  const items: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const s = `${seed}-${i}`;
    const px0 = rnd(s + 'x') * w;
    const py0 = rnd(s + 'y') * h;
    const sp = rr(s + 's', 0.4, 1.2) * speed;
    const sz = rr(s + 'z', 0.5, 1.5) * size;
    let px = px0;
    let py = py0;
    let o = 1;
    let r = 2;
    let fill = color ?? C.parchmentLight;
    switch (kind) {
      case 'dust':
        px = (px0 + f * sp * (1.2 + wind) + noise1(s, f / 40) * 40) % w;
        py = py0 + noise1(s + 'v', f / 50) * 30 - f * 0.1 * sp;
        r = 3 * sz;
        o = 0.35 + 0.3 * noise1(s + 'o', f / 30);
        fill = color ?? C.parchmentDark;
        break;
      case 'motes':
        px = px0 + noise1(s, f / 60) * 60;
        py = py0 + noise1(s + 'v', f / 70) * 50;
        r = 2.2 * sz;
        o = 0.25 + 0.35 * Math.max(0, noise1(s + 'o', f / 25));
        fill = color ?? C.goldLight;
        break;
      case 'ash':
        px = (px0 + noise1(s, f / 50) * 80 + f * wind) % w;
        py = (py0 + f * 0.9 * sp) % h;
        r = 2.6 * sz;
        o = 0.6;
        fill = color ?? C.inkFade;
        break;
      case 'snow':
        px = (px0 + noise1(s, f / 40) * 60 + f * (wind + 0.4) * sp + w) % w;
        py = (py0 + f * 1.6 * sp) % h;
        r = 3 * sz;
        o = 0.85;
        fill = color ?? C.white;
        break;
      case 'embers': {
        const life = (rnd(s + 'l') * 200 + f * sp * 1.4) % 200;
        px = px0 + noise1(s, f / 30) * 40 + life * wind;
        py = y + h - life * (h / 200) * 1.2 + (py0 - h) * 0.1;
        r = 2.4 * sz;
        o = Math.sin((life / 200) * Math.PI);
        fill = color ?? (i % 3 === 0 ? C.goldLight : C.redLight);
        break;
      }
      case 'sparks': {
        const life = (rnd(s + 'l') * 30 + f * sp) % 30;
        const ang = rnd(s + 'a') * Math.PI * 2;
        px = px0 + Math.cos(ang) * life * 6;
        py = py0 + Math.sin(ang) * life * 6 + life * life * 0.1;
        r = 2 * sz;
        o = 1 - life / 30;
        fill = color ?? C.goldLight;
        break;
      }
      case 'rain':
        px = (px0 + f * 2) % w;
        py = (py0 + f * 30 * sp) % h;
        r = 1;
        o = 0.4;
        break;
    }
    items.push(
      kind === 'rain' ? (
        <line key={i} x1={px} y1={py} x2={px - 6} y2={py - 40} stroke={C.parchmentLight} strokeOpacity={o} strokeWidth={1.4} />
      ) : (
        <circle key={i} cx={x + px} cy={kind === 'embers' ? py : y + py} r={r} fill={fill} opacity={Math.max(0, o) * opacity} />
      ),
    );
  }
  return <g>{items}</g>;
};

/* ------------------------------------------------------------- sun rays */
export const SunRays: React.FC<{x: number; y: number; color?: string; opacity?: number; n?: number; len?: number}> = ({
  x,
  y,
  color = C.goldLight,
  opacity = 0.25,
  n = 14,
  len = 1600,
}) => {
  const f = useCurrentFrame();
  return (
    <g opacity={opacity} style={{mixBlendMode: 'screen'}}>
      <defs>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {Array.from({length: n}).map((_, i) => {
        const a = (i / n) * 360 + f * 0.04 + noise1('ray' + i, f / 80) * 2;
        const wdt = 2.5 + (i % 3) * 1.5;
        return (
          <path
            key={i}
            d={`M0 0 L${len} ${-len * Math.tan((wdt * Math.PI) / 180)} L${len} ${len * Math.tan((wdt * Math.PI) / 180)} Z`}
            transform={`translate(${x} ${y}) rotate(${a})`}
            fill={color}
            opacity={0.25 + 0.2 * noise1('rayo' + i, f / 40)}
          />
        );
      })}
      <circle cx={x} cy={y} r={260} fill="url(#sunGlow)" />
    </g>
  );
};

/* ------------------------------------------------------------- lightning */
export const Lightning: React.FC<{x1: number; y1: number; x2: number; y2: number; at: number; seed?: string; color?: string; width?: number}> = ({
  x1,
  y1,
  x2,
  y2,
  at,
  seed = 'bolt',
  color = C.goldLight,
  width = 6,
}) => {
  const f = useCurrentFrame();
  const age = f - at;
  if (age < 0 || age > 14) return null;
  const flick = age < 2 ? 1 : age < 4 ? 0.3 : age < 6 ? 0.9 : Math.max(0, 1 - (age - 6) / 8);
  const pts: [number, number][] = [[x1, y1]];
  const n = 12;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x1 + (x2 - x1) * t + (rnd(`${seed}-${i}`) - 0.5) * 120, y1 + (y2 - y1) * t + (rnd(`${seed}-y${i}`) - 0.5) * 30]);
  }
  pts.push([x2, y2]);
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
  const bi = 5;
  const branch = `M${pts[bi][0]} ${pts[bi][1]} L${pts[bi][0] + 80} ${pts[bi][1] + 90} L${pts[bi][0] + 60} ${pts[bi][1] + 170}`;
  return (
    <g opacity={flick}>
      <path d={d} stroke={color} strokeWidth={width * 4} strokeOpacity={0.25} fill="none" strokeLinejoin="round" />
      <path d={d} stroke={C.white} strokeWidth={width} fill="none" strokeLinejoin="round" />
      <path d={branch} stroke={C.white} strokeWidth={width * 0.5} fill="none" />
    </g>
  );
};

export const Flash: React.FC<{at: number; color?: string; peak?: number; dur?: number}> = ({at, color = C.parchmentLight, peak = 0.75, dur = 14}) => {
  const f = useCurrentFrame();
  const age = f - at;
  if (age < 0 || age > dur) return null;
  const o = age < 2 ? peak : age < 4 ? peak * 0.3 : age < 6 ? peak * 0.8 : peak * 0.8 * (1 - (age - 6) / (dur - 6));
  return <AbsoluteFill style={{backgroundColor: color, opacity: o, mixBlendMode: 'screen'}} />;
};

/* ------------------------------------------------------------- flame */
export const Flame: React.FC<{x: number; y: number; scale?: number; seed?: string; glow?: boolean}> = ({x, y, scale = 1, seed = 'fl', glow = true}) => {
  const f = useCurrentFrame();
  const n = (k: number, sp: number) => noise1(seed + k, f / sp);
  const h = 60 + n(1, 4) * 10;
  const sway = n(2, 6) * 8;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {glow && (
        <>
          <defs>
            <radialGradient id={`fg-${seed}`}>
              <stop offset="0%" stopColor={C.goldLight} stopOpacity={0.5} />
              <stop offset="100%" stopColor={C.goldLight} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={0} cy={-30} r={130 + n(3, 3) * 10} fill={`url(#fg-${seed})`} />
        </>
      )}
      <path d={`M-16 0 C-22 -20 ${-6 + sway} ${-h * 0.6} ${sway * 1.6} ${-h} C${10 + sway} ${-h * 0.6} 24 -22 16 0 Z`} fill={C.redLight} />
      <path d={`M-9 0 C-12 -14 ${-2 + sway} ${-h * 0.45} ${sway * 1.2} ${-h * 0.7} C${6 + sway} ${-h * 0.45} 14 -14 9 0 Z`} fill={C.gold} />
      <path d={`M-4 0 C-5 -8 ${sway * 0.6} ${-h * 0.3} ${sway * 0.8} ${-h * 0.42} C${3 + sway * 0.5} ${-h * 0.3} 6 -8 4 0 Z`} fill={C.parchmentLight} />
    </g>
  );
};

/** Burning city glow on a map / landscape. */
export const Fire: React.FC<{x: number; y: number; scale?: number; seed?: string; smoke?: boolean}> = ({x, y, scale = 1, seed = 'fire', smoke = true}) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {smoke &&
        Array.from({length: 7}).map((_, i) => {
          const life = (f * 0.8 + i * 30) % 210;
          return (
            <circle
              key={i}
              cx={noise1(seed + 'sm' + i, f / 40) * 30 + life * 0.4}
              cy={-life * 1.1}
              r={20 + life * 0.4}
              fill={C.inkSoft}
              opacity={0.35 * Math.sin((life / 210) * Math.PI)}
            />
          );
        })}
      <Flame x={-18} y={0} scale={0.8} seed={seed + 'a'} />
      <Flame x={14} y={4} scale={1} seed={seed + 'b'} />
      <Flame x={0} y={6} scale={0.7} seed={seed + 'c'} glow={false} />
    </g>
  );
};

/* ------------------------------------------------------------- ink transition */
/** Ink blooms covering the frame (mode 'out') or receding from it (mode 'in'). */
export const InkWipe: React.FC<{from: number; dur?: number; mode: 'in' | 'out'; color?: string; seed?: string}> = ({
  from,
  dur = 22,
  mode,
  color = C.ink,
  seed = 'ink',
}) => {
  const f = useCurrentFrame();
  let p = ramp(f, from, from + dur, mode === 'out' ? EASE.in : EASE.out);
  if (mode === 'in') p = 1 - p;
  if (p <= 0.001) return null;
  const blobs = Array.from({length: 9}).map((_, i) => ({
    x: rr(seed + 'x' + i, 100, 1820),
    y: rr(seed + 'y' + i, 100, 980),
    r: rr(seed + 'r' + i, 0.6, 1.2),
    d: rr(seed + 'd' + i, 0, 0.35),
  }));
  return (
    <AbsoluteFill>
      <svg width={W} height={H}>
        <defs>
          <filter id={`inkf-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={7} />
            <feDisplacementMap in="SourceGraphic" scale={90} />
          </filter>
        </defs>
        <g filter={`url(#inkf-${seed})`}>
          {blobs.map((b, i) => {
            const q = Math.max(0, Math.min(1, (p - b.d) / (1 - b.d)));
            return <circle key={i} cx={b.x} cy={b.y} r={q * 1300 * b.r} fill={color} />;
          })}
          {p > 0.98 && <rect width={W} height={H} fill={color} />}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Short dip in from / out to a tone at the head and tail of every scene. */
export const SceneFade: React.FC<{len: number; inDur?: number; outDur?: number; color?: string}> = ({len, inDur = 10, outDur = 10, color = C.ink}) => {
  const f = useCurrentFrame();
  const a = inDur > 0 ? 1 - ramp(f, 0, inDur, EASE.out) : 0;
  const b = outDur > 0 ? ramp(f, len - outDur, len, EASE.in) : 0;
  const o = Math.max(a, b);
  if (o <= 0) return null;
  return <AbsoluteFill style={{backgroundColor: color, opacity: o}} />;
};

/** Soft colored light wash (sunset, fire, moon). */
export const Wash: React.FC<{color: string; opacity: number; blend?: React.CSSProperties['mixBlendMode']; radial?: [number, number]}> = ({
  color,
  opacity,
  blend = 'multiply',
  radial,
}) => (
  <AbsoluteFill
    style={{
      background: radial ? `radial-gradient(circle at ${radial[0]}px ${radial[1]}px, ${color} 0%, transparent 70%)` : color,
      opacity,
      mixBlendMode: blend,
      pointerEvents: 'none',
    }}
  />
);
