import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, H, W} from '../theme';

/** Parchment background with optional slow drift (parallax far layer). */
export const Parchment: React.FC<{dark?: boolean; drift?: number; tint?: string; tintOpacity?: number}> = ({
  dark = false,
  drift = 0,
  tint,
  tintOpacity = 0.25,
}) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 300) * 30 * drift;
  const dy = Math.cos(f / 380) * 18 * drift;
  return (
    <AbsoluteFill style={{backgroundColor: dark ? C.ink : C.parchment, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: '-6%',
          top: '-6%',
          width: '112%',
          height: '112%',
          transform: `translate(${dx}px, ${dy}px)`,
          backgroundImage: `url(${staticFile(dark ? 'tex/parchment_dark.jpg' : 'tex/parchment.jpg')})`,
          backgroundSize: '100% 100%',
        }}
      />
      {tint && <AbsoluteFill style={{backgroundColor: tint, opacity: tintOpacity, mixBlendMode: 'multiply'}} />}
    </AbsoluteFill>
  );
};

/**
 * Finishing layer. Film grain and the base vignette are applied in the final ffmpeg encode
 * (scripts/assemble.py) where they cost nothing; here we only add per-scene extra darkening.
 */
export const Finish: React.FC<{vignette?: number; grain?: number; warm?: number}> = ({vignette = 0.6}) => {
  const extra = Math.max(0, vignette - 0.6);
  if (extra <= 0) return null;
  return <Img src={staticFile('tex/vignette.png')} style={{position: 'absolute', width: W, height: H, opacity: extra * 2.2, pointerEvents: 'none'}} />;
};

/** Full-frame SVG layer in 1920x1080 units. */
export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties; viewBox?: string}> = ({children, style, viewBox}) => (
  <svg width={W} height={H} viewBox={viewBox ?? `0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);
