import React, {createContext, useContext} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, kf, noise1} from '../lib/anim';

/** Camera keyframe: frame, focus point (world px, 1920x1080 base), zoom, roll (deg). */
export type CamKey = {f: number; x?: number; y?: number; z?: number; r?: number};

type CamState = {x: number; y: number; z: number; r: number; sx: number; sy: number};
const Ctx = createContext<CamState>({x: 960, y: 540, z: 1, r: 0, sx: 0, sy: 0});

const track = (f: number, keys: CamKey[], prop: 'x' | 'y' | 'z' | 'r', def: number, ease: (t: number) => number) => {
  const pts = keys.filter((k) => k[prop] !== undefined).map((k) => [k.f, k[prop] as number] as [number, number]);
  if (pts.length === 0) return def;
  return kf(f, pts, ease);
};

/**
 * Virtual camera. Children use <Layer depth> for parallax (depth 1 = moves with the world focus,
 * 0 = fixed background, >1 = foreground that moves faster).
 * shake(frame) returns amplitude in px.
 */
export const Camera: React.FC<{
  keys: CamKey[];
  ease?: (t: number) => number;
  shake?: (f: number) => number;
  breathe?: number;
  children: React.ReactNode;
}> = ({keys, ease = EASE.cine, shake, breathe = 1, children}) => {
  const f = useCurrentFrame();
  const amp = shake ? shake(f) : 0;
  // constant gentle handheld drift so no shot is ever static
  const drift = breathe;
  const st: CamState = {
    x: track(f, keys, 'x', 960, ease) + noise1('cx', f / 70) * 6 * drift,
    y: track(f, keys, 'y', 540, ease) + noise1('cy', f / 80) * 4 * drift,
    z: track(f, keys, 'z', 1, ease) * (1 + noise1('cz', f / 120) * 0.004 * drift),
    r: track(f, keys, 'r', 0, ease) + noise1('cr', f / 90) * 0.15 * drift,
    sx: amp ? noise1('sx', f * 0.9) * amp : 0,
    sy: amp ? noise1('sy', f * 0.9 + 50) * amp : 0,
  };
  return (
    <Ctx.Provider value={st}>
      <AbsoluteFill style={{overflow: 'hidden'}}>{children}</AbsoluteFill>
    </Ctx.Provider>
  );
};

export const useCam = () => useContext(Ctx);

export const Layer: React.FC<{depth?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({depth = 1, children, style}) => {
  const c = useCam();
  const z = 1 + (c.z - 1) * depth;
  const fx = 960 + (c.x - 960) * depth - c.sx * depth;
  const fy = 540 + (c.y - 540) * depth - c.sy * depth;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: '0 0',
        transform: `translate(960px, 540px) rotate(${c.r * depth}deg) scale(${z}) translate(${-fx}px, ${-fy}px)`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
