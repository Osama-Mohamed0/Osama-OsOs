import React from 'react';
import {staticFile} from 'remotion';

/** Pre-rendered unit sprite (see scripts/sprites.mjs). x,y = feet / hooves; scale matches Person/Rider scale. */
const RENDER_SCALE = 0.8;
const CELLS = {foot: {w: 300, h: 560, ax: 150, ay: 540}, rider: {w: 520, h: 600, ax: 250, ay: 580}, elephant: {w: 560, h: 560, ax: 260, ay: 540}};
const FRAMES: Record<string, number> = {stand: 1, ride: 1, walk: 8, gallop: 8, attack: 6};

export const Sprite: React.FC<{
  unit: string;
  anim: 'stand' | 'walk' | 'attack' | 'gallop' | 'ride';
  x: number;
  y: number;
  scale?: number;
  facing?: 'left' | 'right';
  phase?: number; // radians
  opacity?: number;
}> = ({unit, anim, x, y, scale = 0.5, facing = 'right', phase = 0, opacity = 1}) => {
  const kind = unit === 'elephant' ? 'elephant' : anim === 'gallop' || anim === 'ride' ? 'rider' : 'foot';
  const c = CELLS[kind];
  const n = unit === 'elephant' ? 8 : FRAMES[anim];
  const k = n > 1 ? ((Math.floor(((phase / (Math.PI * 2)) % 1) * n) % n) + n) % n : 0;
  const s = scale / RENDER_SCALE;
  const flip = facing === 'left' ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip * s} ${s})`} opacity={opacity}>
      <image href={staticFile(`sprites/${unit}_${anim}_${k}.png`)} x={-c.ax} y={-c.ay} width={c.w} height={c.h} />
    </g>
  );
};
