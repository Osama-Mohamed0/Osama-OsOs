import React from 'react';
import {AbsoluteFill, getInputProps} from 'remotion';
import {Person} from '../characters/Person';
import {Elephant} from '../characters/Mounts';
import {LOOK, LookKey, Rider} from '../characters/cast';

/** Renders one sprite frame on a transparent background (used by scripts/sprites.mjs). */
export const SPRITE_CELL = {foot: [300, 560], rider: [520, 600], elephant: [560, 560]} as const;
export const SPRITE_SCALE = 0.8;

export const SpriteGen: React.FC = () => {
  const {unit, anim, k, n} = getInputProps() as {unit: string; anim: string; k: number; n: number};
  const ph = (k / Math.max(1, n)) * Math.PI * 2;
  let node: React.ReactNode = null;
  let cell: readonly [number, number] = SPRITE_CELL.foot;
  if (unit === 'elephant') {
    cell = SPRITE_CELL.elephant;
    node = <Elephant x={cell[0] / 2 - 20} y={cell[1] - 20} scale={SPRITE_SCALE * 0.9} t={50} phase={ph} walking />;
  } else if (anim === 'gallop' || anim === 'ride') {
    cell = SPRITE_CELL.rider;
    // gait phase: Horse uses p = t*speed + phase; t=0 so phase drives the cycle
    node = (
      <Rider
        who={unit as LookKey}
        x={cell[0] / 2 - 10}
        y={cell[1] - 20}
        scale={SPRITE_SCALE}
        gait={anim === 'gallop' ? 'gallop' : 'stand'}
        phase={ph}
        t={50}
        lod={1}
      />
    );
  } else {
    cell = SPRITE_CELL.foot;
    const walk = anim === 'walk';
    const attack = anim === 'attack';
    const swing = Math.sin(ph);
    node = (
      <Person
        look={LOOK[unit as LookKey]}
        x={cell[0] / 2}
        y={cell[1] - 20}
        scale={SPRITE_SCALE}
        pose={walk ? 'walk' : 'stand'}
        walkPhase={walk ? ph : undefined}
        armFront={attack ? [70 + swing * 60, 60 + swing * 70] : undefined}
        t={50}
        lod={1}
      />
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <svg width={cell[0]} height={cell[1]} style={{overflow: 'visible'}}>
        {node}
      </svg>
    </AbsoluteFill>
  );
};
