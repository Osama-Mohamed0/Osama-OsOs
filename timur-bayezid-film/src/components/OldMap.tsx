import React, {createContext, useContext} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, kf, noise1, ramp} from '../lib/anim';
import {CITIES, CityKey, LAKES, LAND, MAP_H, MAP_W, MOUNTAINS, RIVERS, project} from '../data/mapData';
import {Fire} from './FX';
import {Rosette} from './Ornament';

export type MapView = {f: number; cx: number; cy: number; w: number};
type Ctx = {k: number};
const MapCtx = createContext<Ctx>({k: 1});
export const useMapK = () => useContext(MapCtx).k;

/** Camera view centered on a city or lon/lat with width in map units. */
export const viewAt = (f: number, where: Where, w: number, dx = 0, dy = 0): MapView => {
  const [x, y] = pt(where);
  return {f, cx: x + dx, cy: y + dy, w};
};

const Mountains: React.FC<{k: number}> = () => (
  <g>
    {MOUNTAINS.map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${0.9 + (i % 3) * 0.2})`}>
        <path d="M-26 8 L-6 -22 L4 -8 L12 -18 L30 8 Z" fill={C.parchmentDark} stroke={C.inkFade} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M-6 -22 L-2 8 L-26 8 Z" fill={C.parchmentShadow} opacity={0.55} />
        <path d="M12 -18 L14 8 L4 -8 Z" fill={C.parchmentShadow} opacity={0.4} />
      </g>
    ))}
  </g>
);

const SeaLabel: React.FC<{x: number; y: number; text: string; size?: number; rot?: number}> = ({x, y, text, size = 40, rot = 0}) => (
  <text x={x} y={y} transform={`rotate(${rot} ${x} ${y})`} textAnchor="middle" fontFamily={FONT.display} fontStyle="italic" fontSize={size} fill={C.turqDeep} opacity={0.55} letterSpacing={6}>
    {text}
  </text>
);

export const OldMap: React.FC<{
  views: MapView[];
  children?: React.ReactNode;
  cities?: CityKey[];
  cityFrom?: number;
  ease?: (t: number) => number;
  tint?: string;
  showMountains?: boolean;
}> = ({views, children, cities = [], cityFrom = 0, ease = EASE.cine, tint, showMountains = true}) => {
  const f = useCurrentFrame();
  const ks = (p: 'cx' | 'cy' | 'w') => kf(f, views.map((v) => [v.f, v[p]] as [number, number]), ease);
  const w = ks('w') * (1 + noise1('mapz', f / 100) * 0.006);
  const cx = ks('cx') + noise1('mapx', f / 90) * w * 0.003;
  const cy = ks('cy') + noise1('mapy', f / 95) * w * 0.003;
  const h = (w * 9) / 16;
  const k = w / 1920;
  return (
    <AbsoluteFill style={{backgroundColor: C.parchment}}>
      <MapCtx.Provider value={{k}}>
        <svg width={1920} height={1080} viewBox={`${cx - w / 2} ${cy - h / 2} ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
          <image href={staticFile('tex/map_paper.jpg')} x={-200} y={-150} width={MAP_W + 400} height={MAP_H + 300} preserveAspectRatio="none" />
          {/* coast ripple bands (old map sea hatching) */}
          <g fill="none" strokeLinejoin="round">
            <path d={LAND} stroke={C.turqDeep} strokeOpacity={0.07} strokeWidth={70} />
            <path d={LAND} stroke={C.parchmentLight} strokeOpacity={0.6} strokeWidth={54} />
            <path d={LAND} stroke={C.turqDeep} strokeOpacity={0.1} strokeWidth={40} />
            <path d={LAND} stroke={C.parchmentLight} strokeOpacity={0.6} strokeWidth={28} />
            <path d={LAND} stroke={C.turqDeep} strokeOpacity={0.16} strokeWidth={16} />
          </g>
          <path d={LAND} fill={C.parchmentLight} fillOpacity={0.55} fillRule="evenodd" stroke={C.inkSoft} strokeWidth={2.4} />
          <path d={LAKES} fill={C.turq} fillOpacity={0.18} stroke={C.inkSoft} strokeWidth={1.6} />
          <path d={RIVERS} fill="none" stroke={C.turqDeep} strokeOpacity={0.55} strokeWidth={2.6} strokeLinecap="round" />
          {showMountains && <Mountains k={k} />}
          <SeaLabel x={1180} y={560} text="البحر الأسود" size={46} />
          <SeaLabel x={800} y={1260} text="البحر المتوسط" size={52} />
          <SeaLabel x={1660} y={830} text="بحر قزوين" size={38} rot={-70} />
          <SeaLabel x={2020} y={1900} text="الخليج" size={40} rot={30} />
          <g transform="translate(260 1640)">
            <Rosette r={90} color={C.inkFade} width={2} />
            <path d="M0 -150 L12 -100 L-12 -100 Z" fill={C.red} />
            <text x={0} y={-160} textAnchor="middle" fontFamily={FONT.display} fontSize={34} fill={C.inkSoft}>
              الشمال
            </text>
          </g>
          {cities.map((c, i) => (
            <City key={c} id={c} from={cityFrom + i * 6} />
          ))}
          {tint && <rect x={cx - w} y={cy - h} width={w * 2} height={h * 2} fill={tint} opacity={0.2} />}
          {children}
        </svg>
      </MapCtx.Provider>
    </AbsoluteFill>
  );
};

/** City marker with label; glow pulse and optional burning. */
export const City: React.FC<{id: CityKey; from?: number; glow?: number; burn?: number; color?: string; size?: number; labelSide?: 'up' | 'down' | 'left' | 'right'; label?: string}> = ({
  id,
  from = 0,
  glow,
  burn,
  color = C.ink,
  size = 1,
  labelSide = 'up',
  label,
}) => {
  const f = useCurrentFrame();
  const k = Math.max(0.55, useMapK());
  const c = CITIES[id];
  const o = ramp(f, from, from + 14);
  if (o <= 0) return null;
  const s = k * size;
  const g = glow !== undefined && f >= glow ? ramp(f, glow, glow + 12) : 0;
  const pulse = g ? 1 + 0.25 * Math.sin((f - (glow ?? 0)) / 5) : 1;
  const lx = labelSide === 'left' ? -18 : labelSide === 'right' ? 18 : 0;
  const ly = labelSide === 'up' ? -22 : labelSide === 'down' ? 46 : 12;
  return (
    <g transform={`translate(${c.x} ${c.y})`} opacity={o}>
      {g > 0 && <circle r={46 * s * pulse} fill={color === C.ink ? C.goldLight : color} opacity={0.35 * g} />}
      {burn !== undefined && f >= burn && <Fire x={0} y={0} scale={0.55 * s} seed={'cf' + id} />}
      <circle r={9 * s} fill={C.parchmentLight} stroke={color} strokeWidth={3 * s} />
      <circle r={4 * s} fill={color} />
      <text
        x={lx * s}
        y={ly * s}
        textAnchor={labelSide === 'left' ? 'end' : labelSide === 'right' ? 'start' : 'middle'}
        fontFamily={FONT.display}
        fontWeight={700}
        fontSize={32 * s}
        fill={C.ink}
        stroke={C.parchmentLight}
        strokeWidth={6 * s}
        paintOrder="stroke"
      >
        {label ?? c.name}
      </text>
    </g>
  );
};

/* ---------------------------------------------------------------- arrows */
const catmull = (pts: [number, number][], seg = 16): [number, number][] => {
  if (pts.length < 3) {
    const out: [number, number][] = [];
    for (let i = 0; i <= seg; i++) out.push([pts[0][0] + ((pts[1][0] - pts[0][0]) * i) / seg, pts[0][1] + ((pts[1][1] - pts[0][1]) * i) / seg]);
    return out;
  }
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < seg; j++) {
      const t = j / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

export type Where = CityKey | [number, number] | {x: number; y: number};
export const pt = (w: Where): [number, number] =>
  Array.isArray(w) ? project(w[0], w[1]) : typeof w === 'object' ? [w.x, w.y] : [CITIES[w].x, CITIES[w].y];

/** Animated campaign arrow through waypoints (cities or lon/lat). */
export const MapArrow: React.FC<{
  via: Where[];
  from: number;
  dur: number;
  color?: string;
  width?: number;
  zigzag?: boolean;
  dashed?: boolean;
  fadeAt?: number;
  ease?: (t: number) => number;
}> = ({via, from, dur, color = C.red, width = 14, zigzag = false, dashed = false, fadeAt, ease = EASE.inOut}) => {
  const f = useCurrentFrame();
  const p = ramp(f, from, from + dur, ease);
  if (p <= 0) return null;
  const fade = fadeAt !== undefined ? 1 - ramp(f, fadeAt, fadeAt + 15) : 1;
  let pts = catmull(via.map(pt));
  if (zigzag) {
    pts = pts.map(([x, y], i) => {
      if (i === 0 || i === pts.length - 1) return [x, y];
      const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = nx - x;
      const dy = ny - y;
      const L = Math.hypot(dx, dy) || 1;
      const off = (i % 2 === 0 ? 1 : -1) * 10;
      return [x + (-dy / L) * off, y + (dx / L) * off];
    });
  }
  const n = Math.max(2, Math.ceil(p * (pts.length - 1)) + 1);
  const shown = pts.slice(0, n);
  const d = 'M' + shown.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  const [tx, ty] = shown[shown.length - 1];
  const [px, py] = shown[Math.max(0, shown.length - 2)];
  const ang = (Math.atan2(ty - py, tx - px) * 180) / Math.PI;
  const hw = width * 1.6;
  return (
    <g opacity={fade}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={width + 6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 2} ${width * 1.6}` : undefined} opacity={0.85} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 2} ${width * 1.6}` : undefined} />
      <g transform={`translate(${tx} ${ty}) rotate(${ang})`}>
        <path d={`M${hw * 1.5} 0 L${-hw * 0.5} ${-hw} L0 0 L${-hw * 0.5} ${hw} Z`} fill={color} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </g>
  );
};

/** Territory fill revealed from an origin point. */
export const Territory: React.FC<{
  d: string;
  color: string;
  from: number;
  dur?: number;
  origin: Where;
  opacity?: number;
  id: string;
  fadeAt?: number;
  pattern?: boolean;
}> = ({d, color, from, dur = 40, origin, opacity = 0.42, id, fadeAt, pattern = true}) => {
  const f = useCurrentFrame();
  const p = ramp(f, from, from + dur, EASE.inOut);
  if (p <= 0) return null;
  const fade = fadeAt !== undefined ? 1 - ramp(f, fadeAt, fadeAt + 20) : 1;
  const [ox, oy] = pt(origin);
  return (
    <g opacity={fade}>
      <defs>
        <clipPath id={`tc-${id}`}>
          <circle cx={ox} cy={oy} r={p * 2600} />
        </clipPath>
        <pattern id={`th-${id}`} width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={18} stroke={color} strokeWidth={4} strokeOpacity={0.5} />
        </pattern>
      </defs>
      <g clipPath={`url(#tc-${id})`}>
        <path d={d} fill={color} fillOpacity={opacity} stroke={color} strokeWidth={5} strokeOpacity={0.9} />
        {pattern && <path d={d} fill={`url(#th-${id})`} />}
      </g>
    </g>
  );
};

/** Text placed on the map (scales with zoom). */
export const MapLabel: React.FC<{at: Where; text: string; from: number; to?: number; color?: string; size?: number; dy?: number; dx?: number}> = ({
  at,
  text,
  from,
  to = 99999,
  color = C.redDeep,
  size = 40,
  dy = 0,
  dx = 0,
}) => {
  const f = useCurrentFrame();
  const k = Math.max(0.55, useMapK());
  const o = Math.min(ramp(f, from, from + 14), 1 - ramp(f, to - 12, to));
  if (o <= 0) return null;
  const [x, y] = pt(at);
  const s = 1 + (1 - ramp(f, from, from + 14, EASE.back)) * 0.3;
  return (
    <text
      x={x + dx * k}
      y={y + dy * k}
      textAnchor="middle"
      fontFamily={FONT.display}
      fontWeight={700}
      fontSize={size * k * s}
      fill={color}
      stroke={C.parchmentLight}
      strokeWidth={7 * k}
      paintOrder="stroke"
      opacity={o}
    >
      {text}
    </text>
  );
};
