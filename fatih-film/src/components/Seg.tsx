import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp} from '../lib/anim';

/**
 * Time segment inside a scene. The incoming segment fades in ON TOP of the outgoing one
 * (which stays opaque until it ends), so cross-fades never dip to black.
 */
export const Seg: React.FC<{from: number; to: number; fadeIn?: number; fadeOut?: number; children: React.ReactNode}> = ({
  from,
  to,
  fadeIn = 12,
  fadeOut = 0,
  children,
}) => {
  const f = useCurrentFrame();
  if (f < from - 1 || f > to + 1) return null;
  const a = fadeIn > 0 ? ramp(f, from, from + fadeIn) : 1;
  const b = fadeOut > 0 ? 1 - ramp(f, to - fadeOut, to) : 1;
  return <AbsoluteFill style={{opacity: Math.min(a, b)}}>{children}</AbsoluteFill>;
};
