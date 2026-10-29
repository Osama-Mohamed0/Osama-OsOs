import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, noise1, ramp} from '../lib/anim';
import {Divider, Rosette} from './Ornament';

/**
 * Royal letter: a scroll that unrolls (vertically), then its text is written letter by letter.
 * Arabic shaping stays correct because we slice whole strings (the browser re-shapes each frame).
 */
export const Letter: React.FC<{
  lines: string[];
  heading?: string;
  from: number;
  unroll?: number;
  cps?: number; // characters per second
  writeFrom?: number;
  ink?: string;
  accent?: string;
  seal?: string;
  sealAt?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fontSize?: number;
  angry?: boolean;
  note?: string;
}> = ({
  lines,
  heading,
  from,
  unroll = 30,
  cps = 14,
  writeFrom,
  ink = C.ink,
  accent = C.turqDeep,
  seal = C.ink,
  sealAt,
  x = 960,
  y = 540,
  w = 1240,
  h = 820,
  fontSize = 52,
  angry = false,
  note,
}) => {
  const f = useCurrentFrame();
  const u = ramp(f, from, from + unroll, EASE.out);
  const curH = 60 + (h - 60) * u;
  const wf = writeFrom ?? from + unroll + 6;
  const total = lines.reduce((a, l) => a + l.length, 0);
  const typed = Math.max(0, ((f - wf) / 30) * cps);
  let remaining = typed;
  const shown = lines.map((l) => {
    const n = Math.max(0, Math.min(l.length, Math.floor(remaining)));
    remaining -= l.length;
    return l.slice(0, n);
  });
  // index of line being written (for the quill)
  let active = shown.findIndex((s, i) => s.length < lines[i].length);
  if (active < 0) active = lines.length - 1;
  const done = typed >= total;
  const jitter = angry ? noise1('lj', f / 2) * 1.5 : 0;
  const lineH = fontSize * 1.75;
  const top = y - curH / 2;
  const sealP = sealAt !== undefined ? ramp(f, sealAt, sealAt + 8, EASE.back) : 0;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}>
      {/* paper */}
      <div
        style={{
          position: 'absolute',
          left: x - w / 2,
          top,
          width: w,
          height: curH,
          background: `linear-gradient(90deg, ${C.parchmentDark} 0%, ${C.parchmentLight} 6%, ${C.parchmentLight} 94%, ${C.parchmentDark} 100%)`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          transform: `translateX(${jitter}px)`,
        }}
      >
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
          <rect x={26} y={30} width={w - 52} height={h - 60} fill="none" stroke={accent} strokeWidth={3} />
          <rect x={38} y={42} width={w - 76} height={h - 84} fill="none" stroke={C.gold} strokeWidth={1.5} strokeDasharray="8 6" />
          <Rosette x={w / 2} y={80} r={34} color={C.gold} fill={accent} width={2} progress={ramp(f, from + unroll * 0.5, from + unroll + 10)} />
          {heading && <Divider x={w / 2} y={190} w={w * 0.5} color={C.gold} progress={ramp(f, from + unroll * 0.6, from + unroll + 14)} />}
        </svg>
        {heading && (
          <div
            style={{
              position: 'absolute',
              top: 118,
              width: '100%',
              textAlign: 'center',
              fontFamily: FONT.title,
              fontSize: 40,
              color: accent,
              direction: 'rtl',
              opacity: ramp(f, from + unroll * 0.6, from + unroll + 10),
            }}
          >
            {heading}
          </div>
        )}
        <div style={{position: 'absolute', top: heading ? 230 : 140, right: 90, left: 90, direction: 'rtl'}}>
          {shown.map((s, i) => (
            <div key={i} style={{fontFamily: FONT.letter, fontSize, color: ink, lineHeight: `${lineH}px`, height: lineH, whiteSpace: 'nowrap', textAlign: 'right'}}>
              {s}
              {i === active && !done && f >= wf && (
                <span style={{display: 'inline-block', width: 4, height: fontSize * 0.9, background: ink, marginRight: 6, opacity: 0.6 + 0.4 * Math.sin(f / 2)}} />
              )}
            </div>
          ))}
        </div>
        {note && (
          <div style={{position: 'absolute', bottom: 56, width: '100%', textAlign: 'center', fontFamily: FONT.body, fontSize: 26, color: C.inkFade, direction: 'rtl', opacity: ramp(f, wf + 20, wf + 40)}}>
            {note}
          </div>
        )}
      </div>
      {/* rods */}
      {[top - 14, top + curH - 14].map((ry, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x - w / 2 - 40,
            top: ry,
            width: w + 80,
            height: 28,
            borderRadius: 14,
            background: `linear-gradient(180deg, ${C.goldLight}, ${C.goldDeep})`,
            border: `2px solid ${C.ink}`,
            boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
          }}
        />
      ))}
      {/* seal */}
      {sealAt !== undefined && sealP > 0 && (
        <svg width={220} height={220} style={{position: 'absolute', left: x - w / 2 + 70, top: top + curH - 250, transform: `scale(${2.2 - sealP * 1.2}) rotate(-12deg)`, opacity: Math.min(1, sealP * 1.5)}}>
          <circle cx={110} cy={110} r={78} fill={seal} opacity={0.88} />
          <circle cx={110} cy={110} r={66} fill="none" stroke={C.parchmentLight} strokeWidth={3} opacity={0.7} />
          <Rosette x={110} y={110} r={40} color={C.parchmentLight} width={2} />
        </svg>
      )}
    </div>
  );
};
