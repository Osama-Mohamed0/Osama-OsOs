import React from 'react';
import {C} from '../theme';
import {limb} from '../lib/anim';

const OUT = C.ink;

export type Gait = 'stand' | 'walk' | 'trot' | 'gallop' | 'rear' | 'fall';

export interface HorseProps {
  x?: number;
  y?: number;
  scale?: number;
  facing?: 'left' | 'right';
  t?: number;
  gait?: Gait;
  coat?: string;
  mane?: string;
  cloth?: string;
  clothTrim?: string;
  armored?: boolean;
  phase?: number; // gait phase offset (variation in crowds)
  fall?: number; // 0..1 for gait fall
  rear?: number; // 0..1
  rider?: React.ReactNode;
  lod?: 0 | 1;
  opacity?: number;
}

const GAIT = {
  stand: {speed: 0, a: 0, bob: 0},
  walk: {speed: 0.16, a: 14, bob: 2},
  trot: {speed: 0.3, a: 24, bob: 6},
  gallop: {speed: 0.42, a: 36, bob: 10},
  rear: {speed: 0, a: 0, bob: 0},
  fall: {speed: 0.2, a: 20, bob: 0},
};

export const Horse: React.FC<HorseProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  facing = 'right',
  t = 0,
  gait = 'stand',
  coat = C.horseBay,
  mane = C.ink,
  cloth = C.red,
  clothTrim = C.gold,
  armored = false,
  phase = 0,
  fall = 0,
  rear = 0,
  rider,
  lod = 0,
  opacity = 1,
}) => {
  const g = GAIT[gait];
  const p = t * g.speed + phase;
  const flip = facing === 'left' ? -1 : 1;
  const bob = -Math.abs(Math.sin(p)) * g.bob;
  const pitch = gait === 'gallop' ? Math.sin(p + 0.6) * 4 : gait === 'trot' ? Math.sin(p * 2) * 1.2 : 0;
  const headBob = gait === 'stand' ? Math.sin(t / 30) * 2 : Math.sin(p + 1.2) * (g.a / 5);

  // rear / fall body rotation about hind hip / front feet
  const rearRot = -rear * 32;
  const fallRot = fall * 28;
  const fallDrop = fall * 70;

  const legAngles = (off: number, front: boolean): [number, number] => {
    if (gait === 'rear' && front) return [60 * rear + 10, -40 * rear - 30];
    if (gait === 'fall' && front) return [lerpN(10, 80, fall), lerpN(-10, -150, fall)];
    if (gait === 'stand') return front ? [4, 0] : [-6, 6];
    const s = Math.sin(p + off);
    const a1 = s * g.a + (front ? 4 : -4);
    const lift = Math.max(0, Math.cos(p + off));
    const a2 = front ? a1 - lift * g.a * 1.5 : a1 + lift * g.a * 1.1 - 8;
    return [a1, a2];
  };

  const leg = (hx: number, hy: number, off: number, front: boolean, near: boolean) => {
    const [a1, a2] = legAngles(off, front);
    const l = limb(hx, hy, a1, 56, a2, 60);
    const col = near ? coat : shade(coat);
    const up = taper(hx, hy, l.x1, l.y1, front ? 30 : 36, 13);
    const low = taper(l.x1, l.y1, l.x2, l.y2, 12, 9);
    return (
      <g>
        <path d={up} fill={col} stroke={OUT} strokeWidth={2.4} strokeLinejoin="round" />
        <path d={low} fill={col} stroke={OUT} strokeWidth={2.2} strokeLinejoin="round" />
        <circle cx={l.x1} cy={l.y1} r={7} fill={col} stroke={OUT} strokeWidth={2} />
        <ellipse cx={l.x2 + 2} cy={l.y2 - 3} rx={8} ry={6} fill={col} stroke={OUT} strokeWidth={2} />
        <path d={`M${l.x2 - 5} ${l.y2 - 1} L${l.x2 + 9} ${l.y2 - 1} L${l.x2 + 8} ${l.y2 + 6} L${l.x2 - 6} ${l.y2 + 6} Z`} fill={C.ink} />
      </g>
    );
  };

  const tailSway = Math.sin(t / 9 + phase) * 8 + (gait === 'gallop' ? -18 : 0);
  const clothFlap = gait === 'gallop' || gait === 'trot' ? Math.sin(p * 2) * 4 : 0;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * flip} ${scale})`} opacity={opacity}>
      <g transform={`translate(0 ${bob + fallDrop}) rotate(${pitch + rearRot + fallRot} ${rear > 0 ? -70 : 80} ${rear > 0 ? -60 : -10})`}>
        {/* far legs */}
        {leg(-64, -132, Math.PI * 0.85, false, false)}
        {leg(76, -130, Math.PI * 0.35, true, false)}
        {/* tail */}
        <path
          d={`M-100 -168 C-124 -170 ${-140 + tailSway / 2} -140 ${-142 + tailSway} -84 C${-130 + tailSway} -100 -120 -136 -98 -150 Z`}
          fill={mane}
          stroke={OUT}
          strokeWidth={2.4}
        />
        {/* body */}
        <path
          d="M-106 -156 C-114 -186 -84 -198 -40 -190 C0 -184 40 -190 72 -196 C104 -200 122 -176 114 -144 C108 -122 90 -110 60 -114 C20 -108 -30 -108 -64 -112 C-96 -112 -102 -134 -106 -156 Z"
          fill={coat}
          stroke={OUT}
          strokeWidth={2.6}
        />
        {/* belly shade */}
        <path d="M-90 -128 C-40 -116 40 -114 96 -130 C88 -116 70 -114 58 -116 L-58 -116 C-76 -116 -86 -120 -90 -128 Z" fill={shade(coat)} opacity={0.6} />
        {/* neck + head */}
        <g transform={`rotate(${headBob} 70 -180)`}>
          <path d="M58 -184 C80 -220 106 -256 128 -272 L152 -262 C142 -232 128 -196 112 -150 C96 -140 76 -150 58 -184 Z" fill={coat} stroke={OUT} strokeWidth={2.6} />
          <path
            d="M128 -278 C140 -288 156 -286 162 -272 L192 -226 C196 -214 186 -206 176 -212 L144 -232 C132 -240 124 -258 128 -278 Z"
            fill={coat}
            stroke={OUT}
            strokeWidth={2.6}
          />
          <path d="M134 -282 L138 -298 L146 -284 Z" fill={coat} stroke={OUT} strokeWidth={2} />
          <circle cx={150} cy={-258} r={3.4} fill={OUT} />
          <circle cx={184} cy={-219} r={2.2} fill={OUT} />
          {/* mane */}
          <path
            d={`M60 -190 C76 -214 100 -246 128 -276 L134 -270 C${112 + headBob} -246 ${92 + headBob} -214 ${74 + headBob} -186 Z`}
            fill={mane}
            stroke={OUT}
            strokeWidth={1.8}
          />
          {lod === 0 && (
            <g stroke={mane} strokeWidth={4} strokeLinecap="round">
              <path d={`M70 -196 l${-10 + headBob} 8`} />
              <path d={`M86 -218 l${-10 + headBob} 8`} />
              <path d={`M102 -238 l${-10 + headBob} 8`} />
            </g>
          )}
          {/* bridle */}
          <path d="M140 -270 L176 -214 M134 -252 L164 -240" stroke={C.gold} strokeWidth={3} fill="none" />
          {armored && <path d="M128 -278 C140 -288 156 -286 162 -272 L176 -246 L146 -240 Z" fill={C.silver} stroke={OUT} strokeWidth={2} />}
        </g>
        {/* reins */}
        <path d="M176 -214 C140 -200 90 -206 40 -206" stroke={C.inkSoft} strokeWidth={2} fill="none" />
        {/* caparison */}
        <path
          d={`M-56 -190 C-20 -182 20 -182 44 -190 L${50 + clothFlap} -112 C10 -102 -30 -102 ${-62 + clothFlap} -112 Z`}
          fill={cloth}
          stroke={OUT}
          strokeWidth={2.4}
        />
        <path d={`M${50 + clothFlap} -112 C10 -102 -30 -102 ${-62 + clothFlap} -112`} stroke={clothTrim} strokeWidth={5} fill="none" />
        {lod === 0 &&
          [-50, -30, -10, 10, 30, 46].map((tx) => (
            <path key={tx} d={`M${tx + clothFlap} -107 l0 10`} stroke={clothTrim} strokeWidth={3} strokeLinecap="round" />
          ))}
        {lod === 0 && <path d="M-40 -170 C-10 -164 20 -164 36 -170" stroke={clothTrim} strokeWidth={2.4} fill="none" opacity={0.8} />}
        {/* saddle */}
        <path d="M-38 -196 C-28 -206 22 -206 30 -196 L26 -186 L-34 -186 Z" fill={C.goldDeep} stroke={OUT} strokeWidth={2} />
        {/* rider */}
        {rider && <g transform="translate(-4 -198)">{rider}</g>}
        {/* near legs */}
        {leg(-70, -128, 0, false, true)}
        {leg(70, -126, Math.PI * 1.25, true, true)}
      </g>
    </g>
  );
};

/** Tapered quad between two points (widths w1 at start, w2 at end). */
function taper(x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  return `M${x1 + nx * w1 / 2} ${y1 + ny * w1 / 2} L${x2 + nx * w2 / 2} ${y2 + ny * w2 / 2} L${x2 - nx * w2 / 2} ${y2 - ny * w2 / 2} L${x1 - nx * w1 / 2} ${y1 - ny * w1 / 2} Z`;
}

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Darken a hex color (for far-side limbs). */
export function shade(hex: string, k = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

/* ------------------------------------------------------------------ elephant */
export const Elephant: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  facing?: 'left' | 'right';
  t?: number;
  walking?: boolean;
  phase?: number;
  opacity?: number;
}> = ({x = 0, y = 0, scale = 1, facing = 'right', t = 0, walking = true, phase = 0, opacity = 1}) => {
  const flip = facing === 'left' ? -1 : 1;
  const p = walking ? t * 0.1 + phase : 0;
  const sway = Math.sin(p) * 3;
  const trunk = Math.sin(t / 14 + phase) * 8;
  const ear = Math.sin(t / 10 + phase) * 4;
  const leg = (lx: number, off: number, near: boolean) => {
    const a = walking ? Math.sin(p + off) * 10 : 0;
    const l = limb(lx, -110, a, 50, a * 0.5, 50);
    return (
      <g>
        <path d={l.d} stroke={OUT} strokeWidth={near ? 40 : 37} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={l.d} stroke={near ? C.elephant : shade(C.elephant)} strokeWidth={near ? 35 : 32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * flip} ${scale})`} opacity={opacity}>
      <g transform={`translate(0 ${-Math.abs(Math.sin(p)) * 3}) rotate(${sway * 0.3})`}>
        {leg(-80, Math.PI, false)}
        {leg(70, 0, false)}
        <path d="M-130 -170 C-150 -150 -150 -120 -140 -96" stroke={OUT} strokeWidth={5} fill="none" />
        <path
          d="M-136 -150 C-150 -250 -40 -296 40 -278 C108 -264 146 -224 140 -160 C136 -118 108 -100 84 -100 L-100 -100 C-128 -104 -136 -124 -136 -150 Z"
          fill={C.elephant}
          stroke={OUT}
          strokeWidth={2.8}
        />
        {/* head + trunk */}
        <path
          d={`M110 -250 C150 -250 170 -220 166 -180 C164 -150 160 -120 ${158 + trunk / 2} -80 C${156 + trunk} -50 ${164 + trunk} -30 ${180 + trunk} -34 L${182 + trunk} -24 C${158 + trunk} -18 ${142 + trunk} -40 ${144 + trunk / 2} -80 C146 -120 140 -150 130 -170 Z`}
          fill={C.elephant}
          stroke={OUT}
          strokeWidth={2.8}
        />
        <path d="M150 -150 C170 -146 186 -132 192 -116 C178 -124 164 -132 148 -136 Z" fill={C.white} stroke={OUT} strokeWidth={2} />
        <circle cx={140} cy={-206} r={4} fill={OUT} />
        {/* ear */}
        <path
          d={`M96 -250 C${60 - ear} -250 ${50 - ear} -200 ${66 - ear} -160 C80 -140 104 -150 112 -176 C116 -206 112 -240 96 -250 Z`}
          fill={shade(C.elephant, 0.86)}
          stroke={OUT}
          strokeWidth={2.4}
        />
        {/* caparison */}
        <path d="M-90 -258 C-30 -272 40 -270 84 -252 L80 -150 C30 -138 -40 -138 -96 -150 Z" fill={C.turq} stroke={OUT} strokeWidth={2.4} />
        <path d="M80 -150 C30 -138 -40 -138 -96 -150" stroke={C.gold} strokeWidth={6} fill="none" />
        <path d="M-80 -236 C-30 -248 40 -246 76 -232" stroke={C.gold} strokeWidth={3} fill="none" />
        {[-80, -50, -20, 10, 40, 70].map((tx) => (
          <path key={tx} d={`M${tx} -144 l0 14`} stroke={C.gold} strokeWidth={4} strokeLinecap="round" />
        ))}
        {/* howdah */}
        <path d="M-60 -264 L50 -264 L44 -320 L-54 -320 Z" fill={C.ink} stroke={OUT} strokeWidth={2.4} />
        <path d="M-50 -270 L40 -270 L36 -312 L-46 -312 Z" fill={C.turqDeep} />
        <path d="M-64 -320 C-50 -380 40 -380 54 -320 Z" fill={C.turq} stroke={OUT} strokeWidth={2.4} />
        <path d="M-5 -372 L-5 -392" stroke={C.gold} strokeWidth={4} />
        <circle cx={-5} cy={-394} r={6} fill={C.gold} stroke={OUT} strokeWidth={1.5} />
        <path d="M-60 -322 L52 -322" stroke={C.gold} strokeWidth={5} />
        {/* mahout */}
        <g transform="translate(108 -258)">
          <circle cx={0} cy={-26} r={11} fill={C.skin} stroke={OUT} strokeWidth={2} />
          <path d="M-12 -30 C-12 -46 12 -46 12 -30 Z" fill={C.white} stroke={OUT} strokeWidth={2} />
          <path d="M-12 -14 L12 -14 L14 8 L-14 8 Z" fill={C.turqDeep} stroke={OUT} strokeWidth={2} />
        </g>
        {leg(-60, 0, true)}
        {leg(92, Math.PI, true)}
      </g>
    </g>
  );
};
