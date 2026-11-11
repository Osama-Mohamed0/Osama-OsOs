import React from 'react';
import {C} from '../theme';

/** 8-fold Islamic geometric rosette, drawn progressively (progress 0..1). */
export const Rosette: React.FC<{
  x?: number;
  y?: number;
  r?: number;
  color?: string;
  fill?: string;
  progress?: number;
  rot?: number;
  width?: number;
  dot?: boolean;
}> = ({x = 0, y = 0, r = 100, color = C.gold, fill = 'none', progress = 1, rot = 0, width = 3, dot = true}) => {
  const star = (rr: number, n: number, k: number) => {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i * k * 2 * Math.PI) / n - Math.PI / 2;
      pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`);
    }
    return 'M' + pts.join(' L') + ' Z';
  };
  const poly = (rr: number, n: number, off = 0) => {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n + off;
      pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`);
    }
    return 'M' + pts.join(' L') + ' Z';
  };
  const dash = (len: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - progress)});
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round">
      {fill !== 'none' && <path d={star(r, 16, 3)} fill={fill} stroke="none" opacity={progress} />}
      <path d={star(r, 16, 3)} style={dash(r * 40)} />
      <path d={star(r * 0.62, 8, 3)} style={dash(r * 18)} />
      <path d={poly(r * 0.36, 8, Math.PI / 8)} style={dash(r * 3)} />
      <circle r={r * 1.08} style={dash(r * 7)} strokeWidth={width * 0.7} />
      {dot && <circle r={r * 0.16} fill={color} opacity={progress} />}
    </g>
  );
};

/** Ornamental rectangular frame with corner rosettes. */
export const OrnateFrame: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  progress?: number;
  color?: string;
  inner?: string;
  bg?: string;
  bgOpacity?: number;
}> = ({x, y, w, h, progress = 1, color = C.gold, inner = C.red, bg, bgOpacity = 1}) => {
  const per = 2 * (w + h);
  const d = (inset: number) => `M${x + inset} ${y + inset} H${x + w - inset} V${y + h - inset} H${x + inset} Z`;
  return (
    <g>
      {bg && <rect x={x} y={y} width={w} height={h} fill={bg} opacity={bgOpacity * Math.min(1, progress * 2)} />}
      <path d={d(0)} fill="none" stroke={color} strokeWidth={5} strokeDasharray={per} strokeDashoffset={per * (1 - progress)} />
      <path d={d(12)} fill="none" stroke={inner} strokeWidth={2.5} strokeDasharray={per} strokeDashoffset={per * (1 - progress)} />
      <path d={d(20)} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="10 8" opacity={progress} />
      {[
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].map(([cx, cy], i) => (
        <Rosette key={i} x={cx} y={cy} r={26} progress={progress} color={color} fill={C.ink} width={2} />
      ))}
    </g>
  );
};

/** Horizontal divider with a central lozenge. */
export const Divider: React.FC<{x: number; y: number; w: number; progress?: number; color?: string}> = ({x, y, w, progress = 1, color = C.gold}) => {
  const hw = (w / 2) * progress;
  return (
    <g stroke={color} fill="none" strokeWidth={2.5}>
      <path d={`M${x - hw} ${y} L${x - 18} ${y} M${x + 18} ${y} L${x + hw} ${y}`} />
      <path d={`M${x - hw} ${y + 7} L${x - 30} ${y + 7} M${x + 30} ${y + 7} L${x + hw} ${y + 7}`} strokeWidth={1.2} />
      <path d={`M${x} ${y - 14} L${x + 14} ${y} L${x} ${y + 14} L${x - 14} ${y} Z`} fill={color} opacity={progress} />
      <circle cx={x - hw} cy={y} r={4} fill={color} opacity={progress} />
      <circle cx={x + hw} cy={y} r={4} fill={color} opacity={progress} />
    </g>
  );
};

/** Repeating girih-like star lattice (decorative background). */
export const StarLattice: React.FC<{w: number; h: number; cell?: number; color?: string; opacity?: number; offset?: number}> = ({
  w,
  h,
  cell = 160,
  color = C.gold,
  opacity = 0.18,
  offset = 0,
}) => {
  const items: React.ReactNode[] = [];
  for (let gx = -1; gx <= w / cell + 1; gx++) {
    for (let gy = -1; gy <= h / cell + 1; gy++) {
      items.push(<Rosette key={`${gx}-${gy}`} x={gx * cell + offset} y={gy * cell + ((gx % 2) * cell) / 2} r={cell * 0.42} color={color} width={1.4} />);
    }
  }
  return <g opacity={opacity}>{items}</g>;
};
