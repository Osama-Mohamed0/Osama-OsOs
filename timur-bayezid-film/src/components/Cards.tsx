import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, ramp} from '../lib/anim';
import {Divider, OrnateFrame, Rosette} from './Ornament';

const rtl: React.CSSProperties = {direction: 'rtl', unicodeBidi: 'plaintext'};

/** Arabic text revealed right-to-left with a soft ink edge. */
export const Reveal: React.FC<{
  from: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({from, dur = 24, children, style}) => {
  const f = useCurrentFrame();
  const p = ramp(f, from, from + dur, EASE.out);
  const edge = p * 120 - 10;
  return (
    <div
      style={{
        ...rtl,
        WebkitMaskImage: `linear-gradient(to left, black ${edge - 10}%, transparent ${edge + 8}%)`,
        maskImage: `linear-gradient(to left, black ${edge - 10}%, transparent ${edge + 8}%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Date / place cartouche (top-right, RTL reading start). */
export const DateCard: React.FC<{text: string; sub?: string; from: number; to: number; corner?: 'tr' | 'tl' | 'br' | 'bl'}> = ({
  text,
  sub,
  from,
  to,
  corner = 'tr',
}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, from, to, 14);
  if (o <= 0) return null;
  const p = ramp(f, from, from + 22, EASE.out);
  const pos: React.CSSProperties =
    corner === 'tr'
      ? {right: 90, top: 70}
      : corner === 'tl'
        ? {left: 90, top: 70}
        : corner === 'br'
          ? {right: 90, bottom: 90}
          : {left: 90, bottom: 90};
  return (
    <div style={{position: 'absolute', ...pos, opacity: o, transform: `translateY(${(1 - p) * 16}px)`}}>
      <div
        style={{
          position: 'relative',
          padding: '14px 46px 16px',
          background: `linear-gradient(180deg, ${C.ink}ee, ${C.inkSoft}ee)`,
          border: `3px solid ${C.gold}`,
          boxShadow: `0 0 0 6px ${C.ink}aa, 0 10px 30px rgba(0,0,0,0.45)`,
          borderRadius: 6,
          textAlign: 'center',
          minWidth: 220,
        }}
      >
        <div style={{...rtl, fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.goldLight, lineHeight: 1.25}}>{text}</div>
        {sub && <div style={{...rtl, fontFamily: FONT.body, fontSize: 26, color: C.parchment, marginTop: 2}}>{sub}</div>}
        <svg width={40} height={40} style={{position: 'absolute', right: -20, top: -20}}>
          <Rosette x={20} y={20} r={14} color={C.gold} fill={C.ink} width={1.6} progress={p} />
        </svg>
        <svg width={40} height={40} style={{position: 'absolute', left: -20, bottom: -20}}>
          <Rosette x={20} y={20} r={14} color={C.gold} fill={C.ink} width={1.6} progress={p} />
        </svg>
      </div>
    </div>
  );
};

/** Name label pinned to a screen position (with leader line). */
export const NameTag: React.FC<{
  text: string;
  x: number;
  y: number;
  from: number;
  to: number;
  color?: string;
  size?: number;
  above?: boolean;
}> = ({text, x, y, from, to, color = C.redDeep, size = 40, above = true}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, from, to, 12);
  if (o <= 0) return null;
  const p = ramp(f, from, from + 18, EASE.out);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, ${above ? '-100%' : '0'}) translateY(${(1 - p) * (above ? 12 : -12)}px)`,
        opacity: o,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          ...rtl,
          fontFamily: FONT.display,
          fontWeight: 700,
          fontSize: size,
          color,
          padding: '2px 22px 6px',
          background: `${C.parchmentLight}e6`,
          border: `2px solid ${C.gold}`,
          borderRadius: 4,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Lower-third caption, e.g. «تقول الروايات…» */
export const Caption: React.FC<{text: string; from: number; to: number; y?: number; size?: number; tone?: 'dark' | 'light'}> = ({
  text,
  from,
  to,
  y = 900,
  size = 44,
  tone = 'dark',
}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, from, to, 14);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o}}>
        <Reveal from={from} dur={26}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: size,
              color: tone === 'dark' ? C.goldLight : C.ink,
              background: tone === 'dark' ? `linear-gradient(90deg, transparent, ${C.ink}dd 15%, ${C.ink}dd 85%, transparent)` : 'none',
              padding: '10px 120px 14px',
              textShadow: tone === 'dark' ? '0 2px 6px rgba(0,0,0,0.6)' : 'none',
            }}
          >
            {text}
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/** Big centered quote in calligraphic style. */
export const Quote: React.FC<{text: string; from: number; to: number; sub?: string; y?: number; size?: number; color?: string}> = ({
  text,
  from,
  to,
  sub,
  y = 430,
  size = 66,
  color = C.ink,
}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, from, to, 16);
  if (o <= 0) return null;
  const p = ramp(f, from, from + 30, EASE.out);
  return (
    <AbsoluteFill style={{alignItems: 'center', opacity: o, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: y, width: 1500, textAlign: 'center'}}>
        <Reveal from={from} dur={34}>
          <div style={{fontFamily: FONT.letter, fontSize: size, color, lineHeight: 1.6}}>{text}</div>
        </Reveal>
        <svg width={1500} height={40} style={{display: 'block', margin: '6px auto 0'}}>
          <Divider x={750} y={20} w={700} progress={p} color={C.gold} />
        </svg>
        {sub && (
          <div style={{...rtl, fontFamily: FONT.body, fontSize: 30, color: C.inkFade, marginTop: 4, opacity: ramp(f, from + 20, from + 40)}}>{sub}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Act opener: ink plate with rosette, act number and title. */
export const ActCard: React.FC<{name: string; title: string; from: number; to: number}> = ({name, title, from, to}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, from, to, 16);
  if (o <= 0) return null;
  const p = ramp(f, from, from + 40, EASE.out);
  return (
    <AbsoluteFill style={{opacity: o, alignItems: 'center', justifyContent: 'center'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, ${C.inkSoft} 0%, ${C.ink} 75%)`}} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <g opacity={0.55}>
          <Rosette x={960} y={540} r={400} progress={p} color={C.gold} width={2.2} rot={f * 0.05} dot={false} />
          <Rosette x={960} y={540} r={250} progress={p} color={C.red} width={1.6} rot={-f * 0.08} dot={false} />
        </g>
        <ellipse cx={960} cy={540} rx={520} ry={190} fill={C.ink} opacity={0.75} />
        <OrnateFrame x={110} y={90} w={1700} h={900} progress={p} color={C.gold} inner={C.redDeep} />
      </svg>
      <div style={{textAlign: 'center', transform: `scale(${0.92 + p * 0.08})`}}>
        <div style={{...rtl, fontFamily: FONT.display, fontSize: 44, color: C.gold, letterSpacing: 2, opacity: ramp(f, from + 6, from + 26)}}>{name}</div>
        <div style={{...rtl, fontFamily: FONT.title, fontSize: 130, color: C.parchmentLight, marginTop: 10, textShadow: `0 0 30px ${C.red}88`}}>
          <Reveal from={from + 12} dur={30}>
            {title}
          </Reveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};
