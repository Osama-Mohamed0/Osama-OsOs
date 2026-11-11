import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../theme';
import {Svg} from '../components/Stage';
import {SunRays} from '../components/FX';
import {Sky} from '../components/Sets';
import {Ship, TheodosianWalls} from '../components/FatihSets';
import {Mehmed2} from '../characters/cast';

/** YouTube thumbnail (1920x1080 → scaled to 1280x720 on export). */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.ink}}>
    <Svg>
      <Sky mode="sunset" clouds={3} />
      <SunRays x={1350} y={520} n={14} opacity={0.4} color={C.goldLight} />
      <g transform="translate(0 -40)">
        <TheodosianWalls x={-200} y={760} w={2400} damage={0.6} torches />
      </g>
      <path d="M700 1080 C900 760 1100 560 1350 500 C1600 440 1750 380 1980 330 L1980 1080 Z" fill={C.greenDeep} stroke={C.ink} strokeWidth={4} />
      {[0, 1, 2].map((i) => (
        <Ship key={i} x={1150 + i * 290} y={500 - i * 55} s={0.75} kind="galley" tilt={-18} oars={false} bob={false} flag={C.red} sail={C.parchmentLight} />
      ))}
      <rect x={0} y={0} width={1920} height={1080} fill={C.ink} opacity={0.15} />
      <Mehmed2 x={460} y={2120} scale={4.6} facing="right" expression="confident" prop="none" t={10} />
      <rect x={0} y={790} width={1920} height={290} fill={C.ink} opacity={0.75} />
    </Svg>
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 60, paddingRight: 70}}>
      <div style={{fontFamily: FONT.title, fontSize: 150, lineHeight: 1, color: C.goldLight, direction: 'rtl', textShadow: `0 6px 0 ${C.redDeep}, 0 0 40px ${C.ink}, 0 0 18px ${C.ink}`}}>
        سفن تعبر البر!
      </div>
    </AbsoluteFill>
    <div style={{position: 'absolute', top: 40, right: 50, padding: '8px 30px 14px', background: C.red, border: `4px solid ${C.gold}`, fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.parchmentLight, direction: 'rtl'}}>
      القسطنطينية ١٤٥٣
    </div>
  </AbsoluteFill>
);
