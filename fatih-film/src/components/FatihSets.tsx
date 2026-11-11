import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {noise1, ramp, rr, EASE} from '../lib/anim';
import {Flame} from './FX';
import {Rosette} from './Ornament';

/* ------------------------------------------------------------ Theodosian land walls (side view) */
export const TheodosianWalls: React.FC<{
  x?: number;
  y?: number; // ground line
  w?: number;
  s?: number;
  damage?: number; // 0..1 breach in the middle
  torches?: boolean;
  flags?: 'byz' | 'ott' | 'none';
  flagRise?: number; // 0..1 Ottoman flags rising
  repair?: number; // 0..1 palisade filling the breach
  tone?: 'day' | 'night';
}> = ({x = -200, y = 820, w = 2400, s = 1, damage = 0, torches = false, flags = 'byz', flagRise = 0, repair = 0, tone = 'day'}) => {
  const f = useCurrentFrame();
  const stone = tone === 'night' ? '#6E604F' : C.parchmentDark;
  const stone2 = tone === 'night' ? '#584C3F' : C.parchmentShadow;
  const towersIn = Math.ceil(w / 260);
  const towersOut = Math.ceil(w / 260);
  const breachX = x + w / 2;
  const notch = (yy: number, h: number) => (damage > 0 ? `M${breachX - 160 * damage} ${yy} L${breachX - 60} ${yy + h * damage * 0.9} L${breachX + 70} ${yy + h * damage} L${breachX + 170 * damage} ${yy}` : '');
  return (
    <g transform={`scale(${s})`}>
      {/* inner wall */}
      <rect x={x} y={y - 330} width={w} height={330} fill={stone} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({length: 7}).map((_, r) => (
        <path key={r} d={`M${x} ${y - 300 + r * 42} H${x + w}`} stroke={C.redDeep} strokeOpacity={0.35} strokeWidth={5} />
      ))}
      {Array.from({length: towersIn}).map((_, i) => {
        const tx = x + 80 + i * 260;
        return (
          <g key={i}>
            <rect x={tx - 55} y={y - 430} width={110} height={430} fill={stone2} stroke={C.ink} strokeWidth={2.5} />
            {Array.from({length: 4}).map((__, k) => (
              <rect key={k} x={tx - 55 + k * 30} y={y - 456} width={22} height={28} fill={stone2} stroke={C.ink} strokeWidth={2} />
            ))}
            <path d={`M${tx - 8} ${y - 380} v40 h16 v-40 z`} fill={C.ink} />
            {flags !== 'none' && (
              <g transform={`translate(${tx} ${y - 456})`}>
                <path d="M0 0 L0 -120" stroke={C.ink} strokeWidth={4} />
                <path d={`M0 -120 Q30 ${-128 + Math.sin(f / 6 + i) * 6} 60 -116 L60 -86 Q30 ${-98 + Math.sin(f / 6 + i) * 6} 0 -90 Z`} fill={C.purple} stroke={C.ink} strokeWidth={2} opacity={1 - flagRise} />
                {flagRise > 0 && (
                  <g transform={`translate(0 ${(1 - ramp(flagRise, i * 0.08, i * 0.08 + 0.4)) * 120})`}>
                    <path d={`M0 -120 Q30 ${-128 + Math.sin(f / 6 + i) * 6} 64 -116 L64 -82 Q30 ${-96 + Math.sin(f / 6 + i) * 6} 0 -88 Z`} fill={C.red} stroke={C.ink} strokeWidth={2} opacity={ramp(flagRise, i * 0.08, i * 0.08 + 0.2)} />
                  </g>
                )}
              </g>
            )}
            {torches && <Flame x={tx + 62} y={y - 330} scale={0.35} seed={'wt' + i} />}
          </g>
        );
      })}
      {damage > 0 && <path d={notch(y - 330, 300)} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2.5} />}
      {/* outer wall (lower, in front) */}
      <rect x={x} y={y - 170} width={w} height={170} fill={stone2} stroke={C.ink} strokeWidth={2.5} />
      {Array.from({length: towersOut}).map((_, i) => {
        const tx = x + 210 + i * 260;
        return (
          <g key={i}>
            <rect x={tx - 40} y={y - 240} width={80} height={240} fill={stone} stroke={C.ink} strokeWidth={2.5} />
            {Array.from({length: 3}).map((__, k) => (
              <rect key={k} x={tx - 40 + k * 29} y={y - 262} width={22} height={24} fill={stone} stroke={C.ink} strokeWidth={2} />
            ))}
          </g>
        );
      })}
      {damage > 0 && <path d={notch(y - 170, 160)} fill={C.parchment} stroke={C.ink} strokeWidth={2.5} />}
      {repair > 0 && damage > 0 && (
        <g opacity={repair}>
          {Array.from({length: 9}).map((_, i) => (
            <rect key={i} x={breachX - 120 + i * 28} y={y - 160 + rr('pal' + i, 0, 30)} width={20} height={150} fill={C.horseBay} stroke={C.ink} strokeWidth={1.5} transform={`rotate(${rr('palr' + i, -6, 6)} ${breachX - 110 + i * 28} ${y})`} />
          ))}
        </g>
      )}
      {/* moat */}
      <rect x={x} y={y} width={w} height={40} fill={stone2} stroke={C.ink} strokeWidth={2} />
      <path d={`M${x} ${y + 40} H${x + w} V${y + 120} H${x} Z`} fill={tone === 'night' ? C.navyDeep : C.turqDeep} opacity={0.85} />
      <path d={`M${x} ${y + 60} Q${x + w / 4} ${y + 50 + Math.sin(f / 20) * 4} ${x + w / 2} ${y + 60} T${x + w} ${y + 60}`} stroke={C.turqLight} strokeOpacity={0.4} strokeWidth={3} fill="none" />
    </g>
  );
};

/* ------------------------------------------------------------ old city plan (Constantinople & straits) */
const PENINSULA = 'M380 420 C520 380 760 330 980 300 C1120 285 1250 300 1340 330 C1400 360 1440 420 1430 480 C1400 560 1330 640 1240 700 C1100 780 900 820 700 840 C560 852 450 850 380 840 Z';
const GALATA = 'M1000 0 L1940 0 L1940 300 C1820 260 1640 240 1500 250 C1400 258 1300 245 1240 220 C1150 190 1060 120 1000 0 Z';
const ASIA = 'M1560 1080 L1600 720 C1640 600 1700 480 1760 420 C1820 380 1900 360 1940 360 L1940 1080 Z';
const THRACE = 'M-20 -20 L1000 -20 C1060 120 1150 190 1240 220 C1150 260 1000 280 880 300 C700 330 520 370 380 420 L380 840 C300 860 150 860 -20 850 Z';
const BOSPHORUS = 'M1240 220 C1300 245 1400 258 1500 250 C1640 240 1820 260 1940 300 L1940 360 C1900 360 1820 380 1760 420 C1700 480 1640 600 1600 720 L1430 480 C1440 420 1400 360 1340 330 Z';

export const CityPlan: React.FC<{
  showWalls?: number;
  chain?: number; // 0..1
  shipPath?: number; // 0..1 overland route drawn
  shipsInHorn?: number;
  siegeCamp?: number;
  rumeli?: number;
  ancientSieges?: number;
  labels?: boolean;
}> = ({showWalls = 1, chain = 0, shipPath = 0, shipsInHorn = 0, siegeCamp = 0, rumeli = 0, ancientSieges = 0, labels = true}) => {
  const f = useCurrentFrame();
  const label = (x: number, y: number, t: string, size = 34, color: string = C.ink, rot = 0) => (
    <text x={x} y={y} transform={`rotate(${rot} ${x} ${y})`} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={size} fill={color} stroke={C.parchmentLight} strokeWidth={6} paintOrder="stroke">
      {t}
    </text>
  );
  const LAND_WALL = 'M392 430 C400 560 398 700 386 838';
  return (
    <g>
      <rect x={-100} y={-100} width={2200} height={1300} fill={C.turq} opacity={0.22} />
      {/* sea hatching */}
      {Array.from({length: 26}).map((_, i) => (
        <path key={i} d={`M${-100 + (i % 2) * 40} ${880 + i * 9} H2100`} stroke={C.turqDeep} strokeOpacity={0.12} strokeWidth={2} />
      ))}
      <path d={THRACE} fill={C.parchmentLight} stroke={C.inkSoft} strokeWidth={3} />
      <path d={GALATA} fill={C.parchmentLight} stroke={C.inkSoft} strokeWidth={3} />
      <path d={ASIA} fill={C.parchmentLight} stroke={C.inkSoft} strokeWidth={3} />
      <path d={PENINSULA} fill={C.parchment} stroke={C.inkSoft} strokeWidth={3} />
      {/* Golden Horn water */}
      <path d="M380 420 C520 380 760 330 980 300 C1120 285 1250 300 1340 330 L1240 220 C1150 260 1000 280 880 300 C700 330 520 370 380 420 Z" fill={C.turq} opacity={0.45} />
      {/* hills of Galata */}
      {[[1060, 140], [1180, 110], [1300, 150]].map(([hx, hy], i) => (
        <path key={i} d={`M${hx - 70} ${hy + 40} L${hx - 10} ${hy - 20} L${hx + 20} ${hy + 5} L${hx + 70} ${hy + 40} Z`} fill={C.parchmentDark} stroke={C.inkFade} strokeWidth={2} />
      ))}
      {/* city walls */}
      <g opacity={showWalls}>
        <path d={LAND_WALL} stroke={C.redDeep} strokeWidth={14} fill="none" strokeDasharray="22 6" />
        <path d={PENINSULA} stroke={C.redDeep} strokeWidth={5} fill="none" strokeDasharray="10 8" />
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((k, i) => (
          <rect key={i} x={380} y={440 + k * 390} width={26} height={22} fill={C.redDeep} />
        ))}
      </g>
      {/* landmarks */}
      <g transform="translate(1180 520)">
        <path d="M-40 0 C-40 -50 40 -50 40 0 Z" fill={C.silver} stroke={C.ink} strokeWidth={2} />
        <rect x={-46} y={0} width={92} height={18} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
      </g>
      {labels && (
        <>
          {label(800, 640, 'القسطنطينية', 54, C.purpleDeep)}
          {label(1250, 600, 'آيا صوفيا', 26)}
          {label(1270, 100, 'غلطة', 38)}
          {label(1640, 330, 'البوسفور', 36, C.turqDeep, -20)}
          {label(820, 330, 'القرن الذهبي', 32, C.turqDeep, -8)}
          {label(900, 990, 'بحر مرمرة', 46, C.turqDeep)}
          {label(1810, 760, 'آسيا', 40)}
          {label(180, 600, 'تراقيا', 40)}
          {label(330, 700, 'الأسوار البرية', 26, C.redDeep, -86)}
        </>
      )}
      {/* chain across the Horn */}
      {chain > 0 && (
        <g>
          <path d={`M1340 360 L${1340 + (1250 - 1340) * chain} ${360 + (232 - 360) * chain}`} stroke={C.ink} strokeWidth={8} strokeDasharray="10 5" />
          {labels && chain > 0.9 && label(1420, 280, 'السلسلة', 28, C.ink)}
        </g>
      )}
      {/* Rumeli Hisari */}
      {rumeli > 0 && (
        <g transform="translate(1720 230)" opacity={rumeli}>
          <path d="M-40 20 L-30 -30 L0 -50 L30 -30 L40 20 Z" fill={C.red} stroke={C.ink} strokeWidth={2.5} />
          {labels && label(0, -70, 'روملي حصار', 28, C.redDeep)}
          <g transform="translate(70 230)">
            <path d="M-30 15 L-24 -20 L0 -34 L24 -20 L30 15 Z" fill={C.redLight} stroke={C.ink} strokeWidth={2} />
          </g>
        </g>
      )}
      {/* siege camp before the land walls */}
      {siegeCamp > 0 && (
        <g opacity={siegeCamp}>
          {Array.from({length: 36}).map((_, i) => {
            const yy = 380 + (i % 12) * 42;
            const xx = 300 - Math.floor(i / 12) * 70 - (i % 2) * 20;
            return <path key={i} d={`M${xx - 18} ${yy + 12} L${xx} ${yy - 14} L${xx + 18} ${yy + 12} Z`} fill={C.red} stroke={C.ink} strokeWidth={1.5} />;
          })}
          <path d="M250 640 L265 610 L280 640 Z" fill={C.gold} stroke={C.ink} strokeWidth={2} />
        </g>
      )}
      {/* overland ship route */}
      {shipPath > 0 && (
        <g>
          <path d="M1480 262 C1420 180 1320 120 1200 110 C1100 105 1040 170 1010 290" stroke={C.red} strokeWidth={10} fill="none" strokeDasharray={900} strokeDashoffset={900 * (1 - shipPath)} strokeLinecap="round" />
          {shipPath > 0.97 && <path d="M1010 290 L990 255 L1035 262 Z" fill={C.red} stroke={C.ink} strokeWidth={2} />}
        </g>
      )}
      {shipsInHorn > 0 &&
        Array.from({length: Math.round(shipsInHorn * 10)}).map((_, i) => (
          <g key={i} transform={`translate(${720 + i * 34} ${345 - i * 4 + Math.sin(f / 20 + i) * 2}) scale(0.5)`}>
            <path d="M-30 0 L30 0 L20 12 L-20 12 Z" fill={C.horseBay} stroke={C.ink} strokeWidth={2} />
            <path d="M0 0 L0 -40 L22 -10 Z" fill={C.white} stroke={C.ink} strokeWidth={1.5} />
          </g>
        ))}
      {/* failed ancient sieges: arrows that bounce off */}
      {ancientSieges > 0 &&
        [0, 1, 2].map((i) => {
          const p = ramp(ancientSieges, i * 0.25, i * 0.25 + 0.45);
          const back = p > 0.6 ? (p - 0.6) / 0.4 : 0;
          const tip = Math.min(1, p / 0.6);
          const y0 = 500 + i * 120;
          const xt = -150 + (350 - -150) * tip - back * 300;
          return p > 0 ? (
            <g key={i} opacity={1 - back}>
              <path d={`M-150 ${y0} L${xt} ${y0}`} stroke={C.inkFade} strokeWidth={9} strokeDasharray="20 12" />
              <path d={`M${xt + 26} ${y0} L${xt - 6} ${y0 - 18} L${xt - 6} ${y0 + 18} Z`} fill={C.inkFade} />
            </g>
          ) : null;
        })}
      <g transform="translate(150 980)">
        <Rosette r={70} color={C.inkFade} width={2} />
      </g>
    </g>
  );
};

/* ------------------------------------------------------------ Hagia Sophia */
export const HagiaSophia: React.FC<{x: number; y: number; s?: number; minarets?: number; tone?: string}> = ({x, y, s = 1, minarets = 0, tone = C.parchmentDark}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {minarets > 0 &&
      [-430, 430].map((mx, i) => (
        <g key={i} opacity={minarets} transform={`translate(${mx} 0) scale(1 ${0.3 + 0.7 * minarets})`}>
          <rect x={-14} y={-520} width={28} height={520} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />
          <rect x={-22} y={-380} width={44} height={12} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />
          <path d="M-15 -520 L0 -600 L15 -520 Z" fill={C.inkSoft} stroke={C.ink} strokeWidth={2} />
        </g>
      ))}
    <rect x={-380} y={-160} width={760} height={160} fill={tone} stroke={C.ink} strokeWidth={3} />
    {[-300, -150, 150, 300].map((bx) => (
      <path key={bx} d={`M${bx - 60} -160 C${bx - 60} -230 ${bx + 60} -230 ${bx + 60} -160 Z`} fill={tone} stroke={C.ink} strokeWidth={2.5} />
    ))}
    <rect x={-230} y={-260} width={460} height={100} fill={tone} stroke={C.ink} strokeWidth={3} />
    <rect x={-200} y={-300} width={400} height={44} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={2.5} />
    {Array.from({length: 13}).map((_, i) => (
      <rect key={i} x={-190 + i * 30} y={-292} width={14} height={26} rx={6} fill={C.goldLight} opacity={0.85} />
    ))}
    <path d="M-200 -300 C-200 -440 200 -440 200 -300 Z" fill={C.silver} stroke={C.ink} strokeWidth={3} />
    <path d="M-120 -405 C-60 -420 60 -420 120 -405" stroke={C.silverDeep} strokeWidth={3} fill="none" />
    <path d="M0 -405 L0 -450" stroke={C.gold} strokeWidth={4} />
    <circle cx={0} cy={-455} r={7} fill={C.gold} />
    {[-150, -50, 50, 150].map((dx) => (
      <path key={dx} d={`M${dx - 14} 0 L${dx - 14} -70 C${dx - 14} -96 ${dx + 14} -96 ${dx + 14} -70 L${dx + 14} 0 Z`} fill={C.ink} opacity={0.65} />
    ))}
  </g>
);

/** Interior of the great dome: ring of windows, gold mosaics, light shafts. */
export const SophiaInterior: React.FC<{light?: number; candles?: boolean; prayer?: boolean}> = ({light = 1, candles = false}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-300} y={-200} width={2520} height={1500} fill={C.goldDeep} />
      <path d="M-300 1300 L-300 560 C-100 -120 2020 -120 2220 560 L2220 1300 Z" fill={C.gold} opacity={0.4} />
      <ellipse cx={960} cy={120} rx={760} ry={250} fill={C.goldLight} stroke={C.ink} strokeWidth={3} />
      {Array.from({length: 40}).map((_, i) => {
        const a = Math.PI + (i / 39) * Math.PI;
        return <rect key={i} x={960 + Math.cos(a) * 700 - 10} y={160 + Math.sin(a) * 210 - 18} width={20} height={36} rx={9} fill={C.parchmentLight} stroke={C.ink} strokeWidth={1.5} />;
      })}
      <g transform="translate(960 70) scale(1 0.32)"><Rosette r={330} color={C.goldDeep} width={4} /></g>
      {/* arcades */}
      {[160, 560, 1360, 1760].map((ax, i) => (
        <g key={i}>
          <path d={`M${ax - 150} 1100 L${ax - 150} 560 C${ax - 150} 380 ${ax + 150} 380 ${ax + 150} 560 L${ax + 150} 1100 Z`} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={3} />
          <path d={`M${ax - 110} 1100 L${ax - 110} 580 C${ax - 110} 440 ${ax + 110} 440 ${ax + 110} 580 L${ax + 110} 1100 Z`} fill={C.inkSoft} opacity={0.6} />
        </g>
      ))}
      <g opacity={0.25 * light} style={{mixBlendMode: 'screen'}}>
        {[700, 900, 1100, 1300].map((lx, i) => (
          <path key={i} d={`M${lx - 30} 260 L${lx + 30} 260 L${lx + 160 + Math.sin(f / 50 + i) * 10} 1100 L${lx + 60} 1100 Z`} fill={C.parchmentLight} />
        ))}
      </g>
      <rect x={-300} y={1000} width={2520} height={300} fill={C.redDeep} />
      {candles &&
        Array.from({length: 18}).map((_, i) => <Flame key={i} x={140 + i * 95} y={980 - (i % 3) * 30} scale={0.3} seed={'sc' + i} glow={i % 3 === 0} />)}
    </g>
  );
};

/* ------------------------------------------------------------ Rumeli Hisari */
export const RumeliHisari: React.FC<{x: number; y: number; s?: number; build?: number}> = ({x, y, s = 1, build = 1}) => {
  const tower = (tx: number, w: number, h: number, i: number) => {
    const hh = h * Math.min(1, Math.max(0, build * 1.4 - i * 0.15));
    return (
      <g key={i}>
        <rect x={tx - w / 2} y={-hh} width={w} height={hh} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2.5} />
        {hh > h * 0.98 && <path d={`M${tx - w / 2 - 6} ${-h} L${tx} ${-h - w * 0.8} L${tx + w / 2 + 6} ${-h} Z`} fill={C.red} stroke={C.ink} strokeWidth={2.5} />}
        {hh > h * 0.5 && <rect x={tx - 6} y={-hh + 30} width={12} height={26} fill={C.ink} />}
      </g>
    );
  };
  const wallH = 120 * Math.min(1, build * 1.2);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M-320 0 L-200 ${-wallH - 60} L200 ${-wallH - 120} L340 0 Z`} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={2} opacity={build > 0.05 ? 1 : 0} />
      {tower(-240, 110, 260, 0)}
      {tower(20, 140, 380, 1)}
      {tower(260, 120, 300, 2)}
      {build < 1 &&
        [-240, 20, 260].map((tx, i) => (
          <g key={'sc' + i} stroke={C.horseBay} strokeWidth={4}>
            <path d={`M${tx - 70} 0 L${tx - 70} -300 M${tx + 70} 0 L${tx + 70} -300 M${tx - 70} -100 L${tx + 70} -100 M${tx - 70} -200 L${tx + 70} -200`} />
          </g>
        ))}
    </g>
  );
};

/* ------------------------------------------------------------ ships */
export const Ship: React.FC<{
  x: number;
  y: number;
  s?: number;
  facing?: 'left' | 'right';
  kind?: 'galley' | 'carrack';
  flag?: string;
  sail?: string;
  t?: number;
  bob?: boolean;
  tilt?: number;
  oars?: boolean;
}> = ({x, y, s = 1, facing = 'right', kind = 'galley', flag = C.red, sail = C.white, t = 0, bob = true, tilt = 0, oars = true}) => {
  const b = bob ? Math.sin(t / 18 + x) * 4 : 0;
  const r = bob ? Math.sin(t / 22 + x) * 1.5 : 0;
  const flip = facing === 'left' ? -1 : 1;
  if (kind === 'carrack') {
    return (
      <g transform={`translate(${x} ${y + b}) rotate(${r + tilt}) scale(${flip * s} ${s})`}>
        <path d="M-170 -60 L180 -60 L150 30 L-140 30 Z" fill={C.horseBay} stroke={C.ink} strokeWidth={3} />
        <path d="M-170 -60 L-190 -110 L-110 -110 L-100 -60 Z" fill={C.horseChestnut} stroke={C.ink} strokeWidth={2.5} />
        <path d="M120 -60 L130 -100 L200 -100 L180 -60 Z" fill={C.horseChestnut} stroke={C.ink} strokeWidth={2.5} />
        <path d="M-160 -20 H170" stroke={C.gold} strokeWidth={4} />
        {[-60, 50].map((mx, i) => (
          <g key={i}>
            <path d={`M${mx} -60 L${mx} ${-330 + i * 40}`} stroke={C.ink} strokeWidth={6} />
            <path d={`M${mx - 90} ${-300 + i * 40} Q${mx + 10} ${-250 + i * 40} ${mx - 90} ${-130 + i * 30} L${mx + 90} ${-130 + i * 30} Q${mx + 10} ${-250 + i * 40} ${mx + 90} ${-300 + i * 40} Z`} fill={sail} stroke={C.ink} strokeWidth={2.5} />
            <path d={`M${mx} ${-280 + i * 40} V${-150 + i * 30} M${mx - 50} ${-215 + i * 35} H${mx + 50}`} stroke={C.red} strokeWidth={8} />
          </g>
        ))}
        <path d={`M-60 -330 L-10 ${-320 + Math.sin(t / 5) * 4} L-60 -306 Z`} fill={flag} stroke={C.ink} strokeWidth={1.5} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y + b}) rotate(${r + tilt}) scale(${flip * s} ${s})`}>
      {oars &&
        Array.from({length: 9}).map((_, i) => (
          <path key={i} d={`M${-110 + i * 28} -10 l${-14 + Math.sin(t / 5 + i) * 10} 50`} stroke={C.horseBay} strokeWidth={4} />
        ))}
      <path d="M-170 -30 L200 -40 C190 -10 170 10 130 14 L-130 14 C-150 0 -165 -14 -170 -30 Z" fill={C.horseChestnut} stroke={C.ink} strokeWidth={3} />
      <path d="M-160 -26 H190" stroke={C.gold} strokeWidth={4} />
      <path d="M200 -40 L240 -46" stroke={C.ink} strokeWidth={5} />
      <path d="M20 -30 L20 -250" stroke={C.ink} strokeWidth={5} />
      <path d="M20 -250 L150 -60 L-80 -60 Z" fill={sail} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M20 -250 L60 ${-244 + Math.sin(t / 5) * 4} L20 -232 Z`} fill={flag} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
};

/* ------------------------------------------------------------ the great bombard + oxen */
export const GreatCannon: React.FC<{x: number; y: number; s?: number; fire?: number; facing?: 'left' | 'right'; glow?: number}> = ({x, y, s = 1, fire = -1, facing = 'right', glow = 0}) => {
  const f = useCurrentFrame();
  const age = fire >= 0 ? f - fire : -1;
  const recoil = age >= 0 && age < 12 ? Math.sin((age / 12) * Math.PI) * 30 : 0;
  const flip = facing === 'left' ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip * s} ${s})`}>
      {/* timber cradle */}
      <path d="M-260 0 L300 0 L280 -50 L-240 -50 Z" fill={C.horseBay} stroke={C.ink} strokeWidth={3} />
      {[-200, -60, 80, 220].map((wx) => (
        <circle key={wx} cx={wx} cy={4} r={34} fill={C.horseChestnut} stroke={C.ink} strokeWidth={3} />
      ))}
      <g transform={`translate(${-recoil} 0) rotate(-6 0 -100)`}>
        <path d="M-280 -150 L-60 -160 L380 -150 L380 -50 L-60 -40 L-280 -50 Z" fill={C.goldDeep} stroke={C.ink} strokeWidth={3.5} />
        {[-220, -120, 40, 180, 320].map((bx) => (
          <rect key={bx} x={bx - 8} y={-162} width={16} height={124} fill={C.gold} stroke={C.ink} strokeWidth={2} />
        ))}
        <ellipse cx={380} cy={-100} rx={22} ry={52} fill={C.ink} stroke={C.ink} strokeWidth={3} />
        {glow > 0 && <ellipse cx={-280} cy={-100} rx={18} ry={40} fill={C.redLight} opacity={glow} />}
        {age >= 0 && age < 16 && (
          <g transform="translate(400 -100)">
            <circle r={60 + age * 10} fill={C.goldLight} opacity={Math.max(0, 0.9 - age / 16)} />
            <circle r={30 + age * 6} fill={C.white} opacity={Math.max(0, 0.9 - age / 10)} />
          </g>
        )}
        {age >= 0 &&
          Array.from({length: 6}).map((_, i) => {
            const life = age - i * 3;
            if (life < 0 || life > 90) return null;
            return <circle key={i} cx={420 + life * 4 + i * 20} cy={-100 - life * 1.5 + noise1('cs' + i, f / 10) * 10} r={30 + life * 1.4} fill={C.inkFade} opacity={0.6 * (1 - life / 90)} />;
          })}
      </g>
    </g>
  );
};

export const Ox: React.FC<{x: number; y: number; s?: number; t?: number; phase?: number}> = ({x, y, s = 1, t = 0, phase = 0}) => {
  const p = t * 0.12 + phase;
  const leg = (lx: number, off: number) => {
    const a = Math.sin(p + off) * 14;
    const ex = lx + Math.sin((a * Math.PI) / 180) * 60;
    return <path d={`M${lx} -70 L${ex} -10`} stroke={C.ink} strokeWidth={15} strokeLinecap="round" />;
  };
  return (
    <g transform={`translate(${x} ${y - Math.abs(Math.sin(p)) * 3}) scale(${s})`}>
      {leg(-50, Math.PI)}
      {leg(50, 0)}
      <path d="M-80 -130 C-100 -80 -70 -60 -40 -60 L60 -60 C90 -60 100 -90 90 -130 C70 -150 -60 -150 -80 -130 Z" fill={C.horseChestnut} stroke={C.ink} strokeWidth={3} />
      <path d="M80 -130 C110 -140 130 -120 130 -90 C130 -70 110 -64 96 -70 Z" fill={C.horseChestnut} stroke={C.ink} strokeWidth={3} />
      <path d="M100 -132 C120 -160 140 -160 150 -150 M110 -134 C96 -160 80 -164 74 -156" stroke={C.parchmentLight} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M60 -150 L60 -60" stroke={C.horseBay} strokeWidth={10} />
      {leg(-30, 0)}
      {leg(70, Math.PI)}
    </g>
  );
};

/* ------------------------------------------------------------ siege tower */
export const SiegeTower: React.FC<{x: number; y: number; s?: number; burn?: number}> = ({x, y, s = 1, burn = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-90 0 L-70 -420 L70 -420 L90 0 Z" fill={burn > 0.5 ? C.inkSoft : C.horseBay} stroke={C.ink} strokeWidth={3} />
    {[-340, -260, -180, -100].map((yy) => (
      <path key={yy} d={`M-80 ${yy} H80`} stroke={C.ink} strokeWidth={3} />
    ))}
    <path d="M-80 -420 L80 -20 M80 -420 L-80 -20" stroke={C.ink} strokeWidth={2} opacity={0.5} />
    {[-60, 60].map((wx) => (
      <circle key={wx} cx={wx} cy={0} r={26} fill={C.horseChestnut} stroke={C.ink} strokeWidth={3} />
    ))}
    {burn > 0 &&
      Array.from({length: 8}).map((_, i) => <Flame key={i} x={-60 + (i % 4) * 40} y={-60 - Math.floor(i / 4) * 160 - burn * 120} scale={0.6 + burn * 0.8} seed={'st' + i} />)}
  </g>
);

/* ------------------------------------------------------------ small Byzantine hall */
export const ByzantineHall: React.FC = () => (
  <g>
    <rect x={-300} y={-200} width={2520} height={1500} fill={C.purpleDeep} />
    {[-100, 400, 900, 1400, 1900].map((ax, i) => (
      <g key={i}>
        <path d={`M${ax - 170} 760 L${ax - 170} 200 C${ax - 170} 20 ${ax + 170} 20 ${ax + 170} 200 L${ax + 170} 760`} fill={C.purple} stroke={C.ink} strokeWidth={3} />
        <path d={`M${ax - 130} 760 L${ax - 130} 220 C${ax - 130} 80 ${ax + 130} 80 ${ax + 130} 220 L${ax + 130} 760`} fill={C.goldDeep} opacity={0.55} />
        <g transform={`translate(${ax} 260)`}><Rosette r={60} color={C.goldLight} width={2} /></g>
      </g>
    ))}
    <rect x={-300} y={760} width={2520} height={600} fill={C.inkSoft} />
    <path d="M520 1100 L700 780 L1220 780 L1400 1100 Z" fill={C.purple} stroke={C.gold} strokeWidth={5} />
  </g>
);

/* ------------------------------------------------------------ tunnel cross-section */
export const TunnelSection: React.FC<{progA: number; progB: number; t: number}> = ({progA, progB, t}) => (
  <g>
    <rect x={-300} y={-200} width={2520} height={520} fill={C.parchment} />
    <rect x={-300} y={320} width={2520} height={1000} fill={C.horseBay} />
    {Array.from({length: 60}).map((_, i) => (
      <circle key={i} cx={rr('tu' + i, -300, 2220)} cy={rr('tuy' + i, 360, 1080)} r={rr('tur' + i, 4, 14)} fill={C.horseChestnut} opacity={0.7} />
    ))}
    {/* wall above ground */}
    <rect x={1100} y={-60} width={220} height={380} fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
    <rect x={1400} y={-160} width={260} height={480} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={3} />
    {/* Ottoman tunnel from the left */}
    <path d={`M200 330 L200 650 L${200 + progA * 1000} 650`} stroke={C.ink} strokeWidth={84} fill="none" strokeLinejoin="round" />
    <path d={`M200 330 L200 650 L${200 + progA * 1000} 650`} stroke={C.inkSoft} strokeWidth={74} fill="none" strokeLinejoin="round" />
    <Flame x={200 + progA * 1000 - 40} y={640} scale={0.4} seed="tla" />
    {/* counter-tunnel from the city side */}
    <path d={`M1760 330 L1760 650 L${1760 - progB * 500} 650`} stroke={C.ink} strokeWidth={84} fill="none" strokeLinejoin="round" />
    <path d={`M1760 330 L1760 650 L${1760 - progB * 500} 650`} stroke={C.purpleDeep} strokeWidth={74} fill="none" strokeLinejoin="round" />
    <Flame x={1760 - progB * 500 + 40} y={640} scale={0.4} seed="tlb" />
    {Array.from({length: 12}).map((_, i) => (
      <circle key={'d' + i} cx={200 + progA * 1000 - 10 + Math.sin(t / 3 + i) * 10} cy={600 + ((t * 3 + i * 20) % 80)} r={4} fill={C.parchmentDark} opacity={0.8} />
    ))}
  </g>
);

export {EASE};
