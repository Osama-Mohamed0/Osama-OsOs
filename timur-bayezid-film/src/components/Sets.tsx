import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {noise1, rr} from '../lib/anim';
import {Flame} from './FX';
import {Rosette} from './Ornament';

export type SkyMode = 'dawn' | 'day' | 'heat' | 'sunset' | 'night' | 'storm' | 'winter' | 'dusk';

const SKY: Record<SkyMode, [string, string, string]> = {
  dawn: [C.turqDeep, C.turqLight, C.goldLight],
  day: [C.turqLight, C.parchmentLight, C.parchmentLight],
  heat: [C.goldLight, C.parchmentLight, C.gold],
  sunset: [C.redDeep, C.redLight, C.goldLight],
  dusk: [C.navyDeep, C.turqDeep, C.redLight],
  night: [C.ink, C.navyDeep, C.turqDeep],
  storm: [C.ink, C.inkSoft, C.inkFade],
  winter: [C.inkFade, C.silverDeep, C.silverLight],
};

/** Sky gradient + stylized miniature clouds. World size can be larger than the frame. */
export const Sky: React.FC<{mode: SkyMode; w?: number; h?: number; x?: number; clouds?: number; stars?: boolean; moon?: [number, number]}> = ({
  mode,
  w = 2600,
  h = 1100,
  x = -340,
  clouds = 5,
  stars,
  moon,
}) => {
  const f = useCurrentFrame();
  const [a, b, c] = SKY[mode];
  const id = `sky-${mode}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="60%" stopColor={b} />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
      </defs>
      <rect x={x} y={-200} width={w} height={h + 200} fill={`url(#${id})`} />
      {(stars || mode === 'night') &&
        Array.from({length: 90}).map((_, i) => (
          <circle
            key={i}
            cx={x + rr('st' + i, 0, w)}
            cy={rr('sty' + i, -150, h * 0.6)}
            r={rr('str' + i, 0.8, 2.4)}
            fill={C.parchmentLight}
            opacity={0.4 + 0.5 * Math.abs(noise1('stw' + i, f / 20))}
          />
        ))}
      {moon && (
        <g>
          <circle cx={moon[0]} cy={moon[1]} r={120} fill={C.parchmentLight} opacity={0.08} />
          <circle cx={moon[0]} cy={moon[1]} r={46} fill={C.parchmentLight} />
          <circle cx={moon[0] + 18} cy={moon[1] - 8} r={42} fill={C.navyDeep} />
        </g>
      )}
      {Array.from({length: clouds}).map((_, i) => (
        <MiniCloud
          key={i}
          x={x + ((rr('cl' + i, 0, w) + f * rr('cls' + i, 0.15, 0.4)) % w)}
          y={rr('cly' + i, 40, h * 0.35)}
          s={rr('clz' + i, 0.7, 1.4)}
          color={mode === 'night' || mode === 'storm' || mode === 'dusk' ? C.inkSoft : mode === 'sunset' ? C.goldLight : C.parchmentLight}
          opacity={mode === 'storm' ? 0.9 : 0.75}
        />
      ))}
    </g>
  );
};

/** Persian-miniature style curly cloud. */
export const MiniCloud: React.FC<{x: number; y: number; s?: number; color?: string; opacity?: number}> = ({x, y, s = 1, color = C.parchmentLight, opacity = 0.8}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <path
      d="M-120 10 C-130 -10 -100 -26 -80 -14 C-76 -40 -40 -46 -26 -24 C-14 -50 30 -50 38 -22 C56 -40 92 -30 88 -6 C110 -8 124 10 108 20 C60 28 -60 30 -120 10 Z"
      fill={color}
      stroke={C.inkFade}
      strokeOpacity={0.35}
      strokeWidth={2}
    />
    <path d="M-60 6 C-50 -6 -30 -4 -26 6 M10 0 C20 -12 40 -10 44 2" fill="none" stroke={C.inkFade} strokeOpacity={0.3} strokeWidth={2} />
  </g>
);

/** Rolling hills silhouette layer with cypress trees. */
export const Hills: React.FC<{
  y: number;
  color: string;
  seed?: string;
  amp?: number;
  w?: number;
  x?: number;
  trees?: number;
  treeColor?: string;
  stroke?: string;
  flowers?: boolean;
}> = ({y, color, seed = 'h', amp = 60, w = 2800, x = -440, trees = 0, treeColor = C.greenDeep, stroke = C.inkSoft, flowers = false}) => {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push([x + (i / n) * w, y - rr(seed + i, 0.2, 1) * amp]);
  let d = `M${x} ${y + 900} L${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    d += ` Q${(px + cx) / 2} ${Math.min(py, cy) - amp * 0.5} ${cx} ${cy}`;
  }
  d += ` L${x + w} ${y + 900} Z`;
  return (
    <g>
      <path d={d} fill={color} stroke={stroke} strokeWidth={2} strokeOpacity={0.5} />
      {Array.from({length: trees}).map((_, i) => {
        const tx = x + rr(seed + 't' + i, 0.03, 0.97) * w;
        const seg = Math.min(n - 1, Math.floor(((tx - x) / w) * n));
        const ty = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * (((tx - x) / w) * n - seg) - amp * 0.15;
        return <Cypress key={i} x={tx} y={ty + 30} s={rr(seed + 'ts' + i, 0.5, 1)} color={treeColor} />;
      })}
      {flowers &&
        Array.from({length: 40}).map((_, i) => (
          <g key={i} transform={`translate(${x + rr(seed + 'f' + i, 0, w)} ${y + rr(seed + 'fy' + i, 30, 260)})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-5} rx={2.5} ry={5} fill={i % 2 ? C.redLight : C.parchmentLight} transform={`rotate(${a})`} opacity={0.8} />
            ))}
            <circle r={2} fill={C.gold} />
          </g>
        ))}
    </g>
  );
};

export const Cypress: React.FC<{x: number; y: number; s?: number; color?: string}> = ({x, y, s = 1, color = C.greenDeep}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 -150 C18 -110 22 -50 14 0 L-14 0 C-22 -50 -18 -110 0 -150 Z" fill={color} stroke={C.ink} strokeWidth={2} />
    <path d="M0 -140 C6 -100 8 -50 4 -4" stroke={C.green} strokeWidth={3} fill="none" opacity={0.6} />
    <path d="M-3 0 L-3 14 L3 14 L3 0Z" fill={C.inkSoft} />
  </g>
);

/* --------------------------------------------------------------- skylines */
const Dome: React.FC<{x: number; y: number; r: number; color: string; finial?: string; ribbed?: boolean; drum?: number}> = ({x, y, r, color, finial = C.gold, ribbed, drum = 0}) => (
  <g>
    {drum > 0 && <rect x={x - r * 0.9} y={y - drum} width={r * 1.8} height={drum} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />}
    <path d={`M${x - r} ${y - drum} C${x - r} ${y - drum - r * 1.25} ${x + r} ${y - drum - r * 1.25} ${x + r} ${y - drum} Z`} fill={color} stroke={C.ink} strokeWidth={2.4} />
    {ribbed &&
      [-0.6, -0.2, 0.2, 0.6].map((k) => (
        <path key={k} d={`M${x + k * r} ${y - drum} C${x + k * r * 0.9} ${y - drum - r * 0.6} ${x + k * r * 0.4} ${y - drum - r * 0.9} ${x} ${y - drum - r * 0.94}`} stroke={C.turqDeep} strokeWidth={2} fill="none" />
      ))}
    <path d={`M${x} ${y - drum - r * 0.94} L${x} ${y - drum - r * 1.3}`} stroke={finial} strokeWidth={3} />
    <circle cx={x} cy={y - drum - r * 1.33} r={4} fill={finial} />
  </g>
);

const Minaret: React.FC<{x: number; y: number; h: number; color?: string; cap?: string}> = ({x, y, h, color = C.parchmentLight, cap = C.inkSoft}) => (
  <g>
    <rect x={x - 9} y={y - h} width={18} height={h} fill={color} stroke={C.ink} strokeWidth={2} />
    <rect x={x - 14} y={y - h * 0.7} width={28} height={8} fill={color} stroke={C.ink} strokeWidth={2} />
    <path d={`M${x - 10} ${y - h} L${x} ${y - h - 60} L${x + 10} ${y - h} Z`} fill={cap} stroke={C.ink} strokeWidth={2} />
  </g>
);

export const Skyline: React.FC<{kind: 'bursa' | 'constantinople' | 'samarkand' | 'sivas' | 'generic'; x?: number; y?: number; s?: number; tone?: number}> = ({
  kind,
  x = 960,
  y = 800,
  s = 1,
  tone = 0,
}) => {
  const wall = tone ? C.inkSoft : C.parchmentDark;
  const items: React.ReactNode[] = [];
  if (kind === 'bursa') {
    items.push(<rect key="w" x={-520} y={-60} width={1040} height={60} fill={wall} stroke={C.ink} strokeWidth={2} />);
    [-380, -150, 120, 360].forEach((dx, i) => items.push(<Dome key={'d' + i} x={dx} y={-60} r={i === 1 ? 110 : 70} color={C.green} drum={20} />));
    [-260, 0, 250].forEach((dx, i) => items.push(<Minaret key={'m' + i} x={dx} y={-60} h={230} cap={C.green} />));
  } else if (kind === 'constantinople') {
    items.push(<path key="w" d="M-600 0 L-600 -90 L600 -90 L600 0 Z" fill={wall} stroke={C.ink} strokeWidth={2} />);
    for (let i = 0; i < 13; i++) items.push(<rect key={'t' + i} x={-600 + i * 96} y={-130} width={40} height={50} fill={wall} stroke={C.ink} strokeWidth={2} />);
    items.push(<Dome key="hs" x={0} y={-90} r={190} color={C.silver} drum={60} finial={C.gold} />);
    items.push(<Dome key="h2" x={-240} y={-90} r={90} color={C.silver} drum={20} />);
    items.push(<Dome key="h3" x={250} y={-90} r={90} color={C.silver} drum={20} />);
  } else if (kind === 'samarkand') {
    items.push(<rect key="b" x={-260} y={-200} width={520} height={200} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />);
    items.push(<path key="iw" d="M-90 0 L-90 -150 C-90 -220 90 -220 90 -150 L90 0 Z" fill={C.turqDeep} stroke={C.ink} strokeWidth={2} />);
    items.push(<Dome key="g" x={0} y={-200} r={150} color={C.turq} drum={120} ribbed finial={C.gold} />);
    items.push(<Minaret key="m1" x={-230} y={0} h={360} color={C.turqLight} cap={C.turq} />);
    items.push(<Minaret key="m2" x={230} y={0} h={360} color={C.turqLight} cap={C.turq} />);
    for (let i = 0; i < 6; i++) items.push(<rect key={'tl' + i} x={-250 + i * 85} y={-190} width={60} height={14} fill={C.turq} opacity={0.8} />);
  } else if (kind === 'sivas') {
    items.push(<path key="w" d="M-700 0 L-700 -220 L700 -220 L700 0 Z" fill={wall} stroke={C.ink} strokeWidth={2.4} />);
    for (let i = 0; i < 15; i++) items.push(<rect key={'c' + i} x={-700 + i * 100} y={-250} width={50} height={32} fill={wall} stroke={C.ink} strokeWidth={2} />);
    [-560, -200, 200, 560].forEach((dx, i) => {
      items.push(<rect key={'tw' + i} x={dx - 60} y={-330} width={120} height={330} fill={wall} stroke={C.ink} strokeWidth={2.4} />);
      for (let k = 0; k < 3; k++) items.push(<rect key={`tc${i}${k}`} x={dx - 60 + k * 45} y={-360} width={30} height={32} fill={wall} stroke={C.ink} strokeWidth={2} />);
      items.push(<path key={'sl' + i} d={`M${dx - 6} -260 L${dx - 6} -220 L${dx + 6} -220 L${dx + 6} -260 Z`} fill={C.ink} />);
    });
    // stone courses
    for (let r = 0; r < 6; r++) items.push(<path key={'sc' + r} d={`M-700 ${-30 - r * 34} L700 ${-30 - r * 34}`} stroke={C.parchmentShadow} strokeWidth={1.5} opacity={0.6} />);
    items.push(<path key="gate" d="M-70 0 L-70 -110 C-70 -170 70 -170 70 -110 L70 0 Z" fill={C.inkSoft} stroke={C.ink} strokeWidth={2.4} />);
  } else {
    [-200, 0, 200].forEach((dx, i) => items.push(<Dome key={i} x={dx} y={0} r={60} color={C.parchmentDark} />));
  }
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{items}</g>;
};

/* --------------------------------------------------------------- interiors */
/** Ottoman throne hall: arches, Iznik tile band, carpet, window light. */
export const ThroneHall: React.FC<{light?: number}> = ({light = 1}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchmentLight} />
      {/* tile band */}
      <rect x={-300} y={560} width={2520} height={90} fill={C.white} stroke={C.ink} strokeWidth={2} />
      {Array.from({length: 30}).map((_, i) => (
        <g key={i} transform={`translate(${-280 + i * 86} 605)`}>
          <circle r={30} fill="none" stroke={C.turqDeep} strokeWidth={3} />
          <path d="M0 -26 C10 -10 10 10 0 26 C-10 10 -10 -10 0 -26Z" fill={C.red} />
          <path d="M-26 0 C-10 -10 10 -10 26 0 C10 10 -10 10 -26 0Z" fill={C.turq} opacity={0.8} />
        </g>
      ))}
      {/* arches */}
      {[-200, 300, 800, 1300, 1800].map((ax, i) => (
        <g key={i}>
          <path d={`M${ax - 170} 560 L${ax - 170} 160 C${ax - 170} -40 ${ax + 170} -40 ${ax + 170} 160 L${ax + 170} 560`} fill={C.parchment} stroke={C.ink} strokeWidth={3} />
          <path d={`M${ax - 140} 560 L${ax - 140} 170 C${ax - 140} 10 ${ax + 140} 10 ${ax + 140} 170 L${ax + 140} 560`} fill={i === 2 ? C.goldLight : C.parchmentDark} opacity={i === 2 ? 0.8 : 0.55} />
          {/* voussoirs red/white */}
          {Array.from({length: 9}).map((_, k) => {
            const a = Math.PI - (k / 8) * Math.PI;
            return <circle key={k} cx={ax + Math.cos(a) * 160} cy={160 - Math.sin(a) * 150} r={14} fill={k % 2 ? C.red : C.white} stroke={C.ink} strokeWidth={1.5} />;
          })}
          <rect x={ax - 190} y={140} width={30} height={420} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
          <rect x={ax + 160} y={140} width={30} height={420} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
        </g>
      ))}
      {/* window light shafts */}
      <g opacity={0.22 * light} style={{mixBlendMode: 'screen'}}>
        <path d={`M640 60 L960 60 L${1260 + Math.sin(f / 60) * 10} 1100 L${340 + Math.sin(f / 60) * 10} 1100 Z`} fill={C.goldLight} />
      </g>
      {/* floor + carpet */}
      <rect x={-300} y={650} width={2520} height={700} fill={C.parchmentDark} />
      <path d="M420 1100 L620 690 L1300 690 L1500 1100 Z" fill={C.red} stroke={C.ink} strokeWidth={3} />
      <path d="M470 1090 L650 712 L1270 712 L1450 1090 Z" fill="none" stroke={C.gold} strokeWidth={6} />
      <path d="M540 1070 L690 740 L1230 740 L1380 1070 Z" fill="none" stroke={C.navy} strokeWidth={3} />
      <g transform="translate(960 880) scale(1 0.45)">
        <Rosette r={110} color={C.gold} width={4} />
      </g>
    </g>
  );
};

/** Timurid tent interior (turquoise fabric, gold patterns, poles, carpet). */
export const TentInterior: React.FC<{night?: boolean; candle?: [number, number]}> = ({night = true, candle}) => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 50) * 6;
  return (
    <g>
      <rect x={-300} y={-200} width={2520} height={1500} fill={night ? C.turqDeep : C.turq} />
      {/* fabric folds */}
      {Array.from({length: 14}).map((_, i) => (
        <path key={i} d={`M${-300 + i * 180} -200 C${-300 + i * 180 + 40 + sway} 300 ${-300 + i * 180 - 20} 600 ${-300 + i * 180 + 10} 760`} stroke={C.ink} strokeOpacity={0.25} strokeWidth={30} fill="none" />
      ))}
      {/* gold patterned bands */}
      <rect x={-300} y={120} width={2520} height={70} fill={C.ink} opacity={0.75} />
      {Array.from({length: 28}).map((_, i) => (
        <g key={i} transform={`translate(${-280 + i * 92} 155)`}>
          <Rosette r={24} color={C.gold} width={1.6} />
        </g>
      ))}
      <rect x={-300} y={520} width={2520} height={40} fill={C.ink} opacity={0.6} />
      {/* poles */}
      <rect x={300} y={-200} width={26} height={980} fill={C.goldDeep} stroke={C.ink} strokeWidth={2} />
      <rect x={1600} y={-200} width={26} height={980} fill={C.goldDeep} stroke={C.ink} strokeWidth={2} />
      {/* floor carpet */}
      <rect x={-300} y={760} width={2520} height={600} fill={C.redDeep} />
      <path d="M200 1080 L380 790 L1540 790 L1720 1080 Z" fill={C.red} stroke={C.gold} strokeWidth={5} />
      <path d="M300 1070 L440 820 L1480 820 L1620 1070 Z" fill="none" stroke={C.turqLight} strokeWidth={3} strokeDasharray="14 10" />
      {candle && (
        <g>
          <rect x={candle[0] - 10} y={candle[1]} width={20} height={70} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />
          <path d={`M${candle[0] - 34} ${candle[1] + 70} L${candle[0] + 34} ${candle[1] + 70} L${candle[0] + 20} ${candle[1] + 90} L${candle[0] - 20} ${candle[1] + 90} Z`} fill={C.gold} stroke={C.ink} strokeWidth={2} />
          <Flame x={candle[0]} y={candle[1]} scale={0.5} seed="candle" />
        </g>
      )}
    </g>
  );
};

/** Row of tents for camps (Ottoman red or Timurid turquoise). */
export const TentRow: React.FC<{x: number; y: number; n: number; gap?: number; color: string; s?: number; seed?: string; fires?: boolean}> = ({
  x,
  y,
  n,
  gap = 220,
  color,
  s = 1,
  seed = 'tr',
  fires = false,
}) => (
  <g>
    {Array.from({length: n}).map((_, i) => {
      const tx = x + i * gap + rr(seed + i, -30, 30);
      const ty = y + rr(seed + 'y' + i, -10, 10);
      const ts = s * rr(seed + 's' + i, 0.8, 1.15);
      return (
        <g key={i} transform={`translate(${tx} ${ty}) scale(${ts})`}>
          <path d="M-90 0 L-70 -70 C-40 -110 40 -110 70 -70 L90 0 Z" fill={color} stroke={C.ink} strokeWidth={2.4} />
          <path d="M-70 -70 C-40 -60 40 -60 70 -70" stroke={C.gold} strokeWidth={4} fill="none" />
          <path d="M-20 0 L0 -60 L20 0 Z" fill={C.ink} opacity={0.75} />
          <path d="M0 -102 L0 -140" stroke={C.ink} strokeWidth={3} />
          <path d="M0 -140 L26 -132 L0 -124 Z" fill={color === C.red ? C.gold : C.turqLight} />
          {fires && <Flame x={110} y={10} scale={0.45} seed={seed + 'f' + i} />}
        </g>
      );
    })}
  </g>
);
