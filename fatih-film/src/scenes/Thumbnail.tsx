import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../theme';
import {Parchment, Svg} from '../components/Stage';
import {Lightning, SunRays} from '../components/FX';
import {Rosette} from '../components/Ornament';
import {Bayezid, Timur} from '../characters/cast';

/** YouTube thumbnail (1920x1080 → scaled to 1280x720 on export). */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.ink}}>
    <Parchment dark />
    <Svg>
      <defs>
        <linearGradient id="thL" x1="0" x2="1">
          <stop offset="0%" stopColor={C.redDeep} />
          <stop offset="100%" stopColor={C.red} stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id="thR" x1="1" x2="0">
          <stop offset="0%" stopColor={C.turqDeep} />
          <stop offset="100%" stopColor={C.turq} stopOpacity={0.2} />
        </linearGradient>
        <clipPath id="clL"><path d="M0 0 H1010 L910 1080 H0 Z" /></clipPath>
        <clipPath id="clR"><path d="M1010 0 H1920 V1080 H910 Z" /></clipPath>
      </defs>
      <g clipPath="url(#clL)">
        <rect width={1920} height={1080} fill="url(#thL)" />
        <SunRays x={420} y={420} opacity={0.35} color={C.goldLight} />
        <Bayezid x={440} y={2160} scale={4.9} expression="anger" prop="none" t={10} />
      </g>
      <g clipPath="url(#clR)">
        <rect width={1920} height={1080} fill="url(#thR)" />
        <g opacity={0.5}><Rosette x={1500} y={420} r={380} color={C.gold} width={3} dot={false} /></g>
        <Timur x={1480} y={2200} scale={4.9} facing="left" expression="confident" prop="none" t={10} />
      </g>
      <Lightning x1={1060} y1={-40} x2={900} y2={1120} at={0} seed="thumb" width={9} />
      <rect x={0} y={760} width={1920} height={320} fill={C.ink} opacity={0.72} />
    </Svg>
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70}}>
      <div style={{fontFamily: FONT.title, fontSize: 170, lineHeight: 1, color: C.goldLight, direction: 'rtl', textShadow: `0 6px 0 ${C.redDeep}, 0 0 40px ${C.ink}, 0 0 18px ${C.ink}`}}>
        كيف تسقط الصاعقة؟
      </div>
    </AbsoluteFill>
    <div style={{position: 'absolute', top: 40, left: 50, padding: '8px 30px 14px', background: C.red, border: `4px solid ${C.gold}`, fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.parchmentLight, direction: 'rtl'}}>
      أنقرة ١٤٠٢
    </div>
  </AbsoluteFill>
);
