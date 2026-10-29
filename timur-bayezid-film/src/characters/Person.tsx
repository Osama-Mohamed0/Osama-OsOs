import React from 'react';
import {C} from '../theme';
import {limb, noise1} from '../lib/anim';

export type Pose = 'stand' | 'walk' | 'throne' | 'horse' | 'broken' | 'kneel';
export type Expression = 'neutral' | 'confident' | 'anger' | 'sad';
export type Facing = 'left' | 'right';
export type Headgear =
  | 'ottomanTurban'
  | 'princeTurban'
  | 'timuridCrown'
  | 'bork'
  | 'serbCirclet'
  | 'helmetTimurid'
  | 'helmetSerb'
  | 'furCap'
  | 'envoyCap'
  | 'smallTurban'
  | 'none';
export type BeardStyle = 'full' | 'short' | 'thinLong' | 'goatee' | 'stubble' | 'none';
export type Prop = 'sword' | 'swordDrawn' | 'staff' | 'axe' | 'scroll' | 'bow' | 'lance' | 'spear' | 'none';

export interface Look {
  name: string;
  skin: string;
  skinShade: string;
  hair?: string;
  hairStyle?: 'none' | 'long' | 'short';
  beard: BeardStyle;
  beardColor: string;
  mustache: 'thick' | 'droop' | 'thin' | 'none';
  brow: string;
  eyes?: 'almond' | 'narrow';
  nose?: 'hooked' | 'straight' | 'small';
  age?: number;
  headgear: Headgear;
  hgMain: string;
  hgAccent: string;
  hgCap?: string;
  plume?: string;
  robe: string;
  robeShade: string;
  trim: string;
  pattern: 'cintamani' | 'floral' | 'cloud' | 'none' | 'eagle' | 'stripe';
  patternColor: string;
  inner: string;
  sash: string;
  boots: string;
  armor?: 'scale' | 'lamellar' | 'plate' | 'mail' | null;
  armorColor?: string;
  cloak?: string;
  prop?: Prop;
  propColor?: string;
  shield?: string;
  bulk?: number; // body width multiplier
  lod?: 0 | 1; // 1 = crowd level of detail
}

export interface PersonProps {
  look: Look;
  pose?: Pose;
  expression?: Expression;
  facing?: Facing;
  scale?: number;
  x?: number;
  y?: number;
  t?: number;
  talk?: boolean;
  prop?: Prop;
  armBack?: [number, number];
  armFront?: [number, number];
  headTilt?: number;
  lean?: number;
  walkPhase?: number;
  limp?: boolean;
  bound?: boolean;
  blinkSeed?: number;
  opacity?: number;
  lod?: 0 | 1;
  noBoots?: boolean;
}

const OUT = C.ink;
const SW = 2.6; // outline width

/* ----------------------------------------------------------- patterns */
export const PatternDefs: React.FC<{look: Look}> = ({look}) => {
  const id = `pat-${look.name}`;
  const pc = look.patternColor;
  let body: React.ReactNode = null;
  let size = 34;
  switch (look.pattern) {
    case 'cintamani':
      size = 38;
      body = (
        <>
          <circle cx={9} cy={8} r={3.6} fill={pc} />
          <circle cx={17} cy={8} r={3.6} fill={pc} />
          <circle cx={13} cy={15} r={3.6} fill={pc} />
          <path d="M22 26 q4 -4 8 0 t8 0" stroke={pc} strokeWidth={2.2} fill="none" />
          <path d="M22 31 q4 -4 8 0 t8 0" stroke={pc} strokeWidth={2.2} fill="none" />
        </>
      );
      break;
    case 'floral':
      size = 30;
      body = (
        <>
          <circle cx={15} cy={15} r={2.6} fill={pc} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={15} cy={9.5} rx={2.4} ry={4.2} fill={pc} opacity={0.85} transform={`rotate(${a} 15 15)`} />
          ))}
          <circle cx={0} cy={0} r={1.6} fill={pc} />
          <circle cx={30} cy={30} r={1.6} fill={pc} />
        </>
      );
      break;
    case 'cloud':
      size = 36;
      body = (
        <path
          d="M4 22 q4 -8 10 -4 q2 -7 9 -4 q6 -2 7 5 q-5 -2 -7 2 q-3 -4 -8 0 q-5 -3 -11 1z"
          fill={pc}
          opacity={0.9}
        />
      );
      break;
    case 'stripe':
      size = 16;
      body = <rect x={0} y={0} width={5} height={16} fill={pc} opacity={0.55} />;
      break;
    case 'eagle':
      size = 60;
      body = (
        <path
          d="M30 14 l4 6 l8 -6 l-2 10 l8 2 l-8 6 l2 12 l-8 -6 l-4 8 l-4 -8 l-8 6 l2 -12 l-8 -6 l8 -2 l-2 -10 l8 6z"
          fill={pc}
          opacity={0.75}
        />
      );
      break;
    default:
      body = null;
  }
  return (
    <defs>
      {body && (
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          {body}
        </pattern>
      )}
      <pattern id={`armor-scale-${look.name}`} width={14} height={12} patternUnits="userSpaceOnUse">
        <rect width={14} height={12} fill={look.armorColor ?? C.silver} />
        <path d="M0 0 q7 12 14 0" fill="none" stroke={C.ink} strokeOpacity={0.45} strokeWidth={1.3} />
        <path d="M-7 6 q7 12 14 0 M7 6 q7 12 14 0" fill="none" stroke={C.ink} strokeOpacity={0.45} strokeWidth={1.3} />
      </pattern>
      <pattern id={`armor-lam-${look.name}`} width={10} height={16} patternUnits="userSpaceOnUse">
        <rect width={10} height={16} fill={look.armorColor ?? C.turqDeep} />
        <rect x={1} y={1} width={8} height={14} rx={3} fill="none" stroke={C.goldLight} strokeOpacity={0.6} strokeWidth={1.2} />
      </pattern>
      <pattern id={`armor-mail-${look.name}`} width={7} height={7} patternUnits="userSpaceOnUse">
        <rect width={7} height={7} fill={look.armorColor ?? C.silverDeep} />
        <circle cx={3.5} cy={3.5} r={2.3} fill="none" stroke={C.ink} strokeOpacity={0.4} strokeWidth={1} />
      </pattern>
    </defs>
  );
};

/* ----------------------------------------------------------- head */
const Head: React.FC<{look: Look; expression: Expression; t: number; talk: boolean; blink: boolean; lod: number}> = ({
  look,
  expression,
  t,
  talk,
  blink,
  lod,
}) => {
  const L = look;
  // brow geometry per expression: inner (near nose) y offset, outer y offset
  const browIn = {neutral: 0, confident: 1, anger: 5, sad: -5}[expression];
  const browOut = {neutral: 0, confident: -2, anger: -2, sad: 3}[expression];
  const narrow = L.eyes === 'narrow' || expression === 'anger';
  const eyeH = blink ? 0.5 : narrow ? 2.4 : expression === 'sad' ? 2.6 : 3.6;
  const lookDown = expression === 'sad' ? 1.4 : 0;
  const mouthOpen = talk ? Math.max(0, noise1(L.name + 'talk', t / 2.6)) * 5 : expression === 'anger' ? 2.5 : 0;
  const mouthCurve = {neutral: 0, confident: -2.4, anger: 2.2, sad: 3}[expression];
  const age = L.age ?? 0;

  const nose =
    L.nose === 'hooked'
      ? 'M18 -158 C21 -152 26 -146 28 -139 C29 -136 26 -134 21 -135'
      : L.nose === 'small'
        ? 'M19 -152 C22 -147 25 -142 25 -139 C24 -137 22 -136 19 -137'
        : 'M18 -157 C21 -151 25 -145 27 -139 C27 -136 24 -135 20 -136';

  return (
    <g>
      {/* long hair behind */}
      {L.hairStyle === 'long' && (
        <path
          d="M-24 -170 C-34 -140 -36 -110 -30 -88 L-4 -90 C-10 -110 -10 -140 -6 -160 Z"
          fill={L.hair}
          stroke={OUT}
          strokeWidth={SW}
        />
      )}
      {/* neck */}
      <path d="M-9 -122 L-9 -98 L13 -98 L13 -122 Z" fill={L.skinShade} stroke={OUT} strokeWidth={SW} />
      {/* face */}
      <path
        d="M3 -180 C-16 -180 -23 -166 -23 -150 C-23 -132 -14 -116 2 -112 C14 -110 24 -118 26 -130 C27 -138 27 -146 26 -156 C24 -172 16 -180 3 -180 Z"
        fill={L.skin}
        stroke={OUT}
        strokeWidth={SW}
      />
      {/* jaw shade */}
      <path d="M-20 -140 C-16 -124 -6 -115 4 -113 C-4 -120 -12 -128 -14 -140 Z" fill={L.skinShade} opacity={0.6} />
      {/* ear */}
      <ellipse cx={-15} cy={-146} rx={4.5} ry={7.5} fill={L.skinShade} stroke={OUT} strokeWidth={2} />
      {/* short hair at temple */}
      {L.hairStyle !== 'long' && L.headgear !== 'none' && (
        <path d="M-22 -160 C-21 -166 -16 -169 -12 -168 L-15 -155 C-18 -154 -21 -156 -22 -160Z" fill={L.hair ?? L.beardColor} />
      )}
      {L.hairStyle === 'long' && (
        <path d="M-23 -158 C-22 -176 -6 -184 8 -182 C0 -176 -8 -166 -12 -150 Z" fill={L.hair} />
      )}
      {/* cheek blush */}
      {lod === 0 && <ellipse cx={14} cy={-137} rx={6} ry={4} fill={C.redLight} opacity={0.18} />}
      {/* eyes */}
      {[
        {cx: -3, w: 6.5},
        {cx: 15.5, w: 5.5},
      ].map((e, i) => (
        <g key={i}>
          <path
            d={`M${e.cx - e.w} -151 Q${e.cx} ${-151 - eyeH * 1.6} ${e.cx + e.w} -151 Q${e.cx} ${-151 + eyeH * 0.9} ${e.cx - e.w} -151 Z`}
            fill={C.white}
            stroke={OUT}
            strokeWidth={1.6}
          />
          {!blink && <circle cx={e.cx + 1.6} cy={-151.4 + lookDown} r={narrow ? 1.9 : 2.3} fill={OUT} />}
          {expression === 'sad' && !blink && (
            <path d={`M${e.cx - e.w} -152.5 Q${e.cx} ${-155.5} ${e.cx + e.w} -152.5`} stroke={OUT} strokeWidth={2} fill="none" />
          )}
        </g>
      ))}
      {/* brows */}
      <path
        d={`M-11 ${-160 + browOut} Q-5 ${-164 + (browIn + browOut) / 2} 2 ${-160 + browIn}`}
        stroke={L.brow}
        strokeWidth={3.4}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M9 ${-160 + browIn} Q15 ${-164 + (browIn + browOut) / 2} 22 ${-160 + browOut}`}
        stroke={L.brow}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      {expression === 'anger' && <path d="M4 -163 L6 -157" stroke={L.skinShade} strokeWidth={1.6} />}
      {/* nose */}
      <path d={nose} fill="none" stroke={OUT} strokeWidth={2.1} strokeLinecap="round" />
      {/* age lines */}
      {age > 0.3 && (
        <g stroke={L.skinShade} strokeWidth={1.4} fill="none" opacity={0.9}>
          <path d="M-8 -170 q8 -2 16 0" />
          <path d="M-4 -174 q6 -1.5 12 0" />
          <path d="M20 -146 q3 3 2 7" />
          <path d="M-6 -144 q4 2 8 1" />
        </g>
      )}
      {/* mouth */}
      <path
        d={`M9 -126 Q14 ${-126 + mouthCurve} 20 -126.5`}
        stroke={OUT}
        strokeWidth={1.9}
        fill="none"
        strokeLinecap="round"
      />
      {mouthOpen > 0.4 && <ellipse cx={14.5} cy={-124.5} rx={4} ry={mouthOpen / 2} fill={C.redDeep} />}
      {/* beard */}
      <Beard look={L} />
    </g>
  );
};

const Beard: React.FC<{look: Look}> = ({look}) => {
  const b = look.beardColor;
  const beard = (() => {
    switch (look.beard) {
      case 'full':
        return (
          <path
            d="M-14 -139 C-17 -122 -10 -105 2 -97 C8 -93 16 -95 21 -103 C25 -111 26 -119 25 -127 C21 -122 16 -120 11 -121 C6 -122 2 -126 -2 -130 C-6 -134 -10 -137 -14 -139 Z"
            fill={b}
            stroke={OUT}
            strokeWidth={1.8}
          />
        );
      case 'short':
        return (
          <path
            d="M-17 -146 C-18 -130 -10 -114 4 -110 C14 -108 22 -114 25 -124 L26 -131 C21 -124 15 -121 10 -122 C4 -124 -1 -129 -6 -135 C-11 -139 -15 -142 -17 -146 Z"
            fill={b}
            stroke={OUT}
            strokeWidth={1.6}
          />
        );
      case 'thinLong':
        return (
          <path
            d="M4 -115 C6 -104 8 -94 10 -82 C12 -94 15 -106 18 -116 C14 -113 9 -113 4 -115 Z"
            fill={b}
            stroke={OUT}
            strokeWidth={1.4}
          />
        );
      case 'goatee':
        return (
          <path d="M6 -117 C7 -110 10 -104 13 -102 C16 -106 18 -112 19 -118 C15 -115 10 -115 6 -117Z" fill={b} stroke={OUT} strokeWidth={1.4} />
        );
      case 'stubble':
        return <path d="M-16 -140 C-12 -122 -2 -114 6 -113 C16 -112 23 -118 25 -128 C18 -120 6 -118 -2 -126 Z" fill={b} opacity={0.35} />;
      default:
        return null;
    }
  })();
  const mus = (() => {
    switch (look.mustache) {
      case 'thick':
        return (
          <path
            d="M6 -131 C9 -135 13 -134 15 -132.5 C17 -135 22 -135 26 -131 C23 -128.5 19 -128.5 15 -130 C11 -128 8 -128 6 -131 Z"
            fill={b}
            stroke={OUT}
            strokeWidth={1.4}
          />
        );
      case 'droop':
        return (
          <path
            d="M14 -133 C10 -134 6 -131 4 -126 C2 -118 1 -110 0 -104 C4 -110 6 -118 9 -126 C11 -129 13 -130 15 -131 C17 -130 20 -129 22 -126 C24 -119 25 -112 25 -106 C27 -114 27 -122 25 -128 C22 -133 17 -134 14 -133 Z"
            fill={b}
            stroke={OUT}
            strokeWidth={1.3}
          />
        );
      case 'thin':
        return <path d="M6 -130 C10 -133 14 -132 15 -131 C17 -133 22 -133 25 -130" stroke={b} strokeWidth={2.4} fill="none" />;
      default:
        return null;
    }
  })();
  return (
    <>
      {beard}
      {look.beard === 'full' && (
        <g stroke={C.inkFade} strokeWidth={1.3} fill="none" opacity={0.7}>
          <path d="M-8 -126 q2 12 8 20" />
          <path d="M2 -118 q2 10 6 18" />
          <path d="M14 -116 q0 8 -2 14" />
        </g>
      )}
      {mus}
    </>
  );
};

/* ----------------------------------------------------------- headgear */
const HeadgearView: React.FC<{look: Look; t: number}> = ({look, t}) => {
  const L = look;
  const sway = Math.sin(t / 9) * 3;
  switch (L.headgear) {
    case 'ottomanTurban':
      return (
        <g>
          {/* tall red kavuk */}
          <path d="M-14 -196 C-16 -224 -10 -240 4 -242 C18 -240 24 -224 22 -196 Z" fill={L.hgCap ?? C.red} stroke={OUT} strokeWidth={SW} />
          <path d="M-6 -200 C-7 -220 -2 -232 4 -236" stroke={C.redDeep} strokeWidth={2} fill="none" />
          {/* big white wrapped turban */}
          <path
            d="M-36 -176 C-46 -192 -36 -214 -12 -214 C0 -222 12 -222 22 -214 C46 -214 54 -192 44 -174 C30 -166 -22 -166 -36 -176 Z"
            fill={L.hgMain}
            stroke={OUT}
            strokeWidth={SW}
          />
          <g stroke={C.parchmentDark} strokeWidth={2} fill="none">
            <path d="M-38 -186 C-20 -200 20 -204 46 -190" />
            <path d="M-36 -198 C-16 -206 22 -210 42 -202" />
            <path d="M-30 -178 C-10 -190 26 -194 44 -180" />
          </g>
          {/* sorguc: jewel + plume */}
          <circle cx={30} cy={-196} r={5} fill={C.gold} stroke={OUT} strokeWidth={1.6} />
          <circle cx={30} cy={-196} r={2.2} fill={C.red} />
          <path
            d={`M30 -200 C34 -214 ${42 + sway} -226 ${48 + sway} -236 C${40 + sway} -230 34 -218 28 -201 Z`}
            fill={L.plume ?? C.white}
            stroke={OUT}
            strokeWidth={1.5}
          />
        </g>
      );
    case 'princeTurban':
    case 'smallTurban': {
      const small = L.headgear === 'smallTurban';
      return (
        <g>
          {!small && (
            <path d="M-10 -194 C-11 -212 -6 -222 4 -223 C14 -222 18 -212 17 -194 Z" fill={L.hgCap ?? C.red} stroke={OUT} strokeWidth={SW} />
          )}
          <path
            d={small ? 'M-26 -170 C-32 -184 -22 -200 4 -200 C30 -200 38 -184 32 -170 C18 -164 -14 -164 -26 -170 Z' : 'M-30 -172 C-38 -188 -28 -206 -8 -206 C4 -212 12 -212 20 -206 C40 -206 44 -188 38 -172 C24 -165 -18 -165 -30 -172 Z'}
            fill={L.hgMain}
            stroke={OUT}
            strokeWidth={SW}
          />
          <g stroke={C.parchmentDark} strokeWidth={1.8} fill="none">
            <path d={small ? 'M-26 -180 C-8 -190 18 -192 32 -182' : 'M-32 -182 C-14 -194 18 -198 38 -186'} />
            {!small && <path d="M-28 -194 C-10 -200 18 -202 36 -196" />}
          </g>
          {!small && <circle cx={26} cy={-190} r={3.6} fill={C.gold} stroke={OUT} strokeWidth={1.3} />}
          {!small && L.plume && (
            <path d={`M26 -193 C30 -204 ${34 + sway} -212 ${38 + sway} -218 C${32 + sway} -214 28 -206 24 -194 Z`} fill={L.plume} stroke={OUT} strokeWidth={1.2} />
          )}
        </g>
      );
    }
    case 'timuridCrown':
      return (
        <g>
          {/* conical crown */}
          <path d="M-22 -190 L-14 -238 C-6 -248 12 -248 20 -238 L28 -190 Z" fill={L.hgMain} stroke={OUT} strokeWidth={SW} />
          <g stroke={C.goldLight} strokeWidth={2} opacity={0.9}>
            <path d="M-8 -192 L-3 -240" />
            <path d="M3 -192 L3 -244" />
            <path d="M14 -192 L10 -240" />
          </g>
          <path d="M-16 -224 L22 -224" stroke={C.gold} strokeWidth={4} />
          <circle cx={3} cy={-249} r={6} fill={C.gold} stroke={OUT} strokeWidth={1.6} />
          <path d="M3 -255 L3 -264" stroke={C.gold} strokeWidth={3} />
          {/* gold band */}
          <path d="M-25 -188 L31 -188 L30 -176 L-24 -176 Z" fill={C.gold} stroke={OUT} strokeWidth={2} />
          {[-14, 0, 14].map((x) => (
            <circle key={x} cx={x + 3} cy={-182} r={2.6} fill={C.red} />
          ))}
          {/* fur brim */}
          <path
            d="M-29 -170 C-33 -178 -26 -182 -19 -179 C-12 -183 -2 -182 3 -179 C10 -183 20 -183 25 -179 C32 -182 38 -177 35 -170 C22 -165 -16 -165 -29 -170 Z"
            fill={L.hgAccent}
            stroke={OUT}
            strokeWidth={2}
          />
          <path d="M-22 -173 l2 -4 M-12 -174 l2 -5 M-1 -174 l1 -5 M10 -174 l1 -5 M21 -174 l1 -4" stroke={C.inkFade} strokeWidth={1.3} />
          {/* plume */}
          <path
            d={`M-12 -232 C-24 -246 ${-30 + sway} -262 ${-26 + sway} -280 C${-18 + sway} -266 -12 -250 -6 -234 Z`}
            fill={L.plume ?? C.white}
            stroke={OUT}
            strokeWidth={1.5}
          />
        </g>
      );
    case 'bork':
      return (
        <g>
          {/* hanging back flap */}
          <path
            d={`M-14 -230 C-30 -220 -40 -190 ${-44 + sway} -150 L${-30 + sway} -146 C-26 -180 -18 -206 -4 -222 Z`}
            fill={L.hgMain}
            stroke={OUT}
            strokeWidth={SW}
          />
          <path d="M-22 -174 C-24 -200 -18 -230 0 -236 C18 -232 26 -204 28 -174 Z" fill={L.hgMain} stroke={OUT} strokeWidth={SW} />
          <path d="M-24 -178 L30 -178 L29 -170 L-23 -170 Z" fill={L.hgAccent} stroke={OUT} strokeWidth={2} />
          {/* spoon holder ornament */}
          <path d="M18 -178 L22 -206 L27 -206 L24 -178 Z" fill={C.gold} stroke={OUT} strokeWidth={1.5} />
        </g>
      );
    case 'serbCirclet':
      return (
        <g>
          <path d="M-22 -168 L30 -168 L28 -176 L22 -186 L16 -178 L9 -190 L2 -178 L-5 -188 L-11 -177 L-18 -184 Z" fill={C.gold} stroke={OUT} strokeWidth={1.8} />
          <circle cx={9} cy={-174} r={2.4} fill={C.red} />
        </g>
      );
    case 'helmetTimurid':
      return (
        <g>
          <path d="M-26 -160 C-30 -130 -24 -112 -10 -104 L-6 -150 Z" fill={`url(#armor-mail-${L.name})`} stroke={OUT} strokeWidth={2} />
          <path d="M-26 -166 C-28 -196 -12 -216 3 -234 C18 -216 34 -196 32 -166 Z" fill={L.hgMain} stroke={OUT} strokeWidth={SW} />
          <path d="M-27 -170 L33 -170 L32 -162 L-26 -162 Z" fill={C.gold} stroke={OUT} strokeWidth={1.8} />
          <path d="M3 -234 L3 -246" stroke={C.gold} strokeWidth={3} />
          <path d={`M3 -246 C-6 -262 ${-18 + sway} -268 ${-28 + sway} -270 C${-16 + sway} -258 -6 -250 1 -244Z`} fill={L.plume ?? C.turq} stroke={OUT} strokeWidth={1.4} />
          <path d="M3 -230 L6 -170" stroke={C.silverLight} strokeWidth={2} opacity={0.6} />
        </g>
      );
    case 'helmetSerb':
      return (
        <g>
          <path d="M-26 -160 C-30 -130 -24 -112 -10 -104 L-6 -150 Z" fill={`url(#armor-mail-${L.name})`} stroke={OUT} strokeWidth={2} />
          <path d="M-25 -166 C-26 -200 -10 -222 3 -224 C18 -222 32 -200 31 -166 Z" fill={C.silver} stroke={OUT} strokeWidth={SW} />
          <path d="M3 -222 L4 -166" stroke={C.silverLight} strokeWidth={3} />
          <path d="M-26 -170 L32 -170 L31 -163 L-25 -163 Z" fill={C.navy} stroke={OUT} strokeWidth={1.8} />
          <path d="M18 -166 L20 -132" stroke={C.silverDeep} strokeWidth={4} />
        </g>
      );
    case 'furCap':
      return (
        <g>
          <path d="M-20 -178 C-22 -200 -10 -216 4 -216 C18 -216 28 -200 26 -178 Z" fill={L.hgMain} stroke={OUT} strokeWidth={SW} />
          <path
            d="M-30 -164 C-36 -176 -26 -184 -18 -178 C-10 -186 0 -184 4 -180 C12 -186 24 -186 28 -178 C36 -182 42 -174 36 -164 C22 -158 -16 -158 -30 -164 Z"
            fill={L.hgAccent}
            stroke={OUT}
            strokeWidth={SW}
          />
          <path d="M-22 -172 l3 -5 M-10 -174 l2 -6 M4 -174 l1 -6 M16 -174 l2 -5 M28 -172 l2 -5" stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.4} />
        </g>
      );
    case 'envoyCap':
      return (
        <g>
          <path d="M-22 -172 C-24 -200 -12 -222 4 -222 C20 -222 30 -200 28 -172 Z" fill={L.hgMain} stroke={OUT} strokeWidth={SW} />
          <path d="M-24 -176 L30 -176 L29 -166 L-23 -166 Z" fill={L.hgAccent} stroke={OUT} strokeWidth={2} />
          <circle cx={4} cy={-224} r={4} fill={C.gold} stroke={OUT} strokeWidth={1.3} />
        </g>
      );
    default:
      return null;
  }
};

/* ----------------------------------------------------------- props */
const PropView: React.FC<{prop: Prop; x: number; y: number; angle: number; look: Look; t: number}> = ({prop, x, y, angle, look, t}) => {
  switch (prop) {
    case 'swordDrawn':
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M-3 0 C-6 -40 -2 -90 14 -128 C6 -88 4 -44 4 0 Z" fill={C.silverLight} stroke={OUT} strokeWidth={2} />
          <path d="M-10 2 L12 2" stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
          <path d="M0 4 L0 20" stroke={C.inkSoft} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case 'axe':
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M0 26 L0 -110" stroke={C.inkSoft} strokeWidth={6} strokeLinecap="round" />
          <path d="M0 -100 C18 -112 30 -104 34 -84 C24 -88 12 -86 0 -80 Z" fill={C.silver} stroke={OUT} strokeWidth={2} />
          <path d="M0 -98 C-10 -100 -14 -94 -14 -88 L0 -84 Z" fill={C.silverDeep} stroke={OUT} strokeWidth={1.6} />
          <circle cx={0} cy={-110} r={3.5} fill={C.gold} />
        </g>
      );
    case 'staff':
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M0 -50 L0 200" stroke={OUT} strokeWidth={9} strokeLinecap="round" />
          <path d="M0 -50 L0 200" stroke={C.goldDeep} strokeWidth={5} strokeLinecap="round" />
          <path d="M-8 -52 C-8 -66 8 -66 8 -52 Z" fill={C.gold} stroke={OUT} strokeWidth={1.6} />
          <circle cx={0} cy={-66} r={4} fill={C.turq} stroke={OUT} strokeWidth={1.2} />
        </g>
      );
    case 'scroll':
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <rect x={-8} y={-30} width={16} height={46} rx={5} fill={C.parchmentLight} stroke={OUT} strokeWidth={1.8} />
          <rect x={-10} y={-34} width={20} height={6} rx={3} fill={C.gold} stroke={OUT} strokeWidth={1.4} />
          <rect x={-10} y={14} width={20} height={6} rx={3} fill={C.gold} stroke={OUT} strokeWidth={1.4} />
          <circle cx={0} cy={-6} r={5} fill={C.ink} />
        </g>
      );
    case 'bow':
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M0 -70 C26 -60 30 -20 6 -6 C30 8 26 52 0 64" fill="none" stroke={C.goldDeep} strokeWidth={5} strokeLinecap="round" />
          <path d="M0 -70 L0 64" stroke={C.parchmentLight} strokeWidth={1.3} />
        </g>
      );
    case 'lance':
    case 'spear': {
      const flap = Math.sin(t / 4) * 6;
      return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M0 60 L0 -240" stroke={C.inkSoft} strokeWidth={5} strokeLinecap="round" />
          <path d="M-5 -240 L0 -270 L5 -240 Z" fill={C.silver} stroke={OUT} strokeWidth={1.5} />
          {prop === 'lance' && (
            <path
              d={`M2 -236 L${44} ${-226 + flap} L${30} ${-216 + flap / 2} L${44} ${-206 + flap} L2 -206 Z`}
              fill={look.propColor ?? C.red}
              stroke={OUT}
              strokeWidth={1.5}
            />
          )}
        </g>
      );
    }
    default:
      return null;
  }
};

/* ----------------------------------------------------------- arm */
const Arm: React.FC<{x: number; y: number; a: [number, number]; look: Look; front: boolean}> = ({x, y, a, look, front}) => {
  const l = limb(x, y, a[0], 50, a[1], 46);
  const w = 21 * (look.bulk ?? 1);
  const sleeve = look.armor && look.armor !== 'mail' ? look.armorColor ?? look.robe : look.robe;
  // cuff position 82% along forearm
  const cx = l.x1 + (l.x2 - l.x1) * 0.78;
  const cy = l.y1 + (l.y2 - l.y1) * 0.78;
  return (
    <g>
      <path d={l.d} stroke={OUT} strokeWidth={w + SW * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={l.d} stroke={front ? sleeve : look.robeShade} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${cx} ${cy} L${l.x2 - (l.x2 - l.x1) * 0.05} ${l.y2 - (l.y2 - l.y1) * 0.05}`} stroke={look.trim} strokeWidth={w - 1} strokeLinecap="butt" />
      <circle cx={l.x2} cy={l.y2} r={8.5} fill={look.skin} stroke={OUT} strokeWidth={2} />
    </g>
  );
};

/* default arm angles per pose & expression: [back, front] each [upper, fore] */
const ARMS: Record<string, [[number, number], [number, number]]> = {
  'stand-neutral': [[-6, -2], [10, 18]],
  'stand-confident': [[-22, 22], [22, -34]],
  'stand-anger': [[-8, 6], [78, 98]],
  'stand-sad': [[2, 8], [6, 12]],
  'walk-neutral': [[-6, 4], [8, 22]],
  'walk-confident': [[-6, 4], [22, -34]],
  'walk-anger': [[-6, 4], [60, 90]],
  'walk-sad': [[2, 8], [6, 12]],
  'throne-neutral': [[-14, 40], [26, 70]],
  'throne-confident': [[-24, 30], [30, 76]],
  'throne-anger': [[-14, 40], [70, 100]],
  'throne-sad': [[-4, 40], [14, 60]],
  'horse-neutral': [[-10, 40], [30, 80]],
  'horse-confident': [[-30, 10], [30, 80]],
  'horse-anger': [[150, 170], [30, 80]],
  'horse-sad': [[-4, 30], [20, 70]],
  'broken-neutral': [[30, 80], [24, 76]],
  'broken-confident': [[30, 80], [24, 76]],
  'broken-anger': [[30, 80], [24, 76]],
  'broken-sad': [[30, 80], [24, 76]],
  'kneel-neutral': [[20, 70], [40, 100]],
  'kneel-confident': [[20, 70], [40, 100]],
  'kneel-anger': [[20, 70], [40, 100]],
  'kneel-sad': [[20, 70], [40, 100]],
};

/* ----------------------------------------------------------- person */
export const Person: React.FC<PersonProps> = ({
  look,
  pose = 'stand',
  expression = 'neutral',
  facing = 'right',
  scale = 1,
  x = 0,
  y = 0,
  t = 0,
  talk = false,
  prop,
  armBack,
  armFront,
  headTilt,
  lean,
  walkPhase,
  limp = false,
  bound = false,
  blinkSeed = 0,
  opacity = 1,
  lod,
  noBoots = false,
}) => {
  const L = look;
  const LOD = lod ?? L.lod ?? 0;
  const bulk = L.bulk ?? 1;
  const flip = facing === 'left' ? -1 : 1;
  const breathe = Math.sin((t + blinkSeed * 13) / 22) * 0.9;
  const blinkCycle = (t + blinkSeed * 37) % 110;
  const blink = blinkCycle < 4;
  const [defBack, defFront] = ARMS[`${pose}-${expression}`] ?? ARMS['stand-neutral'];
  const aBack = armBack ?? defBack;
  const aFront = armFront ?? defFront;
  const P = prop ?? L.prop ?? 'none';

  // walk / limp
  const ph = walkPhase ?? t / 7;
  const isWalk = pose === 'walk';
  const step = isWalk ? Math.sin(ph) : 0;
  const bob = isWalk ? Math.abs(Math.cos(ph)) * (limp ? 7 : 3) : 0;
  const limpTilt = isWalk && limp ? Math.max(0, Math.sin(ph)) * 4 : 0;

  // hip placement
  const hip = {
    stand: {x: 0, y: -200},
    walk: {x: 0, y: -200 + bob},
    throne: {x: 0, y: -94},
    horse: {x: 0, y: 0},
    broken: {x: -6, y: -88},
    kneel: {x: -6, y: -96},
  }[pose];
  const bodyLean = lean ?? (pose === 'broken' ? 20 : pose === 'kneel' ? 8 : expression === 'sad' ? 5 : 0) + limpTilt;
  const hTilt = headTilt ?? (pose === 'broken' ? 16 : expression === 'sad' ? 10 : expression === 'anger' ? -3 : 0);

  const skirtW = 1 * bulk;
  const robeFill = L.robe;

  /* ---------- lower body */
  const lower = (() => {
    if (pose === 'stand' || pose === 'walk') {
      const sway = isWalk ? step * 6 : 0;
      const bootBack = isWalk ? -step * 16 : 0;
      const bootFront = isWalk ? step * (limp ? 7 : 16) : 0;
      return (
        <g>
          {!noBoots && (
            <>
              <path
                d={`M${-30 + bootBack} -20 L${-6 + bootBack} -20 L${2 + bootBack} -4 C${6 + bootBack} -2 ${8 + bootBack} -6 ${10 + bootBack} -8 L${8 + bootBack} 0 L${-30 + bootBack} 0 Z`}
                fill={L.boots}
                stroke={OUT}
                strokeWidth={SW}
              />
              <path
                d={`M${4 + bootFront} -20 L${28 + bootFront} -20 L${36 + bootFront} -4 C${40 + bootFront} -2 ${42 + bootFront} -6 ${44 + bootFront} -8 L${42 + bootFront} 0 L${4 + bootFront} 0 Z`}
                fill={L.boots}
                stroke={OUT}
                strokeWidth={SW}
              />
            </>
          )}
          <path
            d={`M${-40 * skirtW} ${hip.y + 4} L${-62 * skirtW + sway} -14 C${-30 + sway} -8 ${30 + sway} -8 ${64 * skirtW + sway} -16 L${40 * skirtW} ${hip.y + 4} Z`}
            fill={robeFill}
            stroke={OUT}
            strokeWidth={SW}
          />
          {L.pattern !== 'none' && LOD === 0 && (
            <path
              d={`M${-40 * skirtW} ${hip.y + 4} L${-62 * skirtW + sway} -14 C${-30 + sway} -8 ${30 + sway} -8 ${64 * skirtW + sway} -16 L${40 * skirtW} ${hip.y + 4} Z`}
              fill={`url(#pat-${L.name})`}
            />
          )}
          {/* front opening */}
          <path d={`M6 ${hip.y + 8} L${24 + sway} -12 L${46 + sway} -14 L16 ${hip.y + 8} Z`} fill={L.inner} stroke={OUT} strokeWidth={2} />
          <path d={`M6 ${hip.y + 8} L${24 + sway} -12`} stroke={L.trim} strokeWidth={5} />
          <path d={`M${-62 * skirtW + sway} -14 C${-30 + sway} -8 ${30 + sway} -8 ${64 * skirtW + sway} -16`} stroke={L.trim} strokeWidth={5} fill="none" />
          {/* fold shading */}
          <path d={`M-22 ${hip.y + 20} L${-34 + sway} -14`} stroke={L.robeShade} strokeWidth={6} opacity={0.6} />
          <path d={`M-4 ${hip.y + 24} L${-6 + sway} -10`} stroke={L.robeShade} strokeWidth={4} opacity={0.4} />
        </g>
      );
    }
    if (pose === 'throne') {
      return (
        <g>
          <path d="M-58 -10 L-84 -10 L-92 0 L-54 0 Z" fill={L.boots} stroke={OUT} strokeWidth={2} />
          <path d="M70 -12 L96 -12 L108 -2 L70 0 Z" fill={L.boots} stroke={OUT} strokeWidth={2} />
          <path
            d="M-42 -92 C-70 -76 -98 -56 -104 -26 C-106 -12 -96 -6 -80 -6 L84 -8 C100 -8 108 -16 104 -30 C98 -58 72 -78 44 -92 Z"
            fill={robeFill}
            stroke={OUT}
            strokeWidth={SW}
          />
          {L.pattern !== 'none' && LOD === 0 && (
            <path
              d="M-42 -92 C-70 -76 -98 -56 -104 -26 C-106 -12 -96 -6 -80 -6 L84 -8 C100 -8 108 -16 104 -30 C98 -58 72 -78 44 -92 Z"
              fill={`url(#pat-${L.name})`}
            />
          )}
          <path d="M-96 -24 C-60 -40 -20 -44 0 -40 C30 -44 70 -40 100 -26" stroke={L.robeShade} strokeWidth={5} fill="none" opacity={0.7} />
          <path d="M-80 -6 L84 -8" stroke={L.trim} strokeWidth={5} />
          <path d="M4 -86 L12 -40" stroke={L.trim} strokeWidth={5} />
        </g>
      );
    }
    if (pose === 'broken' || pose === 'kneel') {
      return (
        <g>
          <path d="M-72 -18 L-50 -18 L-46 0 L-78 0 Z" fill={L.boots} stroke={OUT} strokeWidth={2} />
          <path
            d={`M-46 ${hip.y} C-70 -60 -80 -24 -70 -4 L58 -4 C70 -8 70 -30 56 -40 C40 -52 20 -56 34 ${hip.y} Z`}
            fill={robeFill}
            stroke={OUT}
            strokeWidth={SW}
          />
          {L.pattern !== 'none' && LOD === 0 && (
            <path d={`M-46 ${hip.y} C-70 -60 -80 -24 -70 -4 L58 -4 C70 -8 70 -30 56 -40 C40 -52 20 -56 34 ${hip.y} Z`} fill={`url(#pat-${L.name})`} />
          )}
          <path d="M-70 -4 L58 -4" stroke={L.trim} strokeWidth={5} />
          <path d="M-30 -60 C0 -50 30 -46 54 -40" stroke={L.robeShade} strokeWidth={5} fill="none" opacity={0.7} />
        </g>
      );
    }
    // horse: near leg + skirt drape (hip at 0,0)
    const flap = Math.sin(t / 3.2) * 5;
    return (
      <g>
        <path
          d={`M-40 4 C-54 30 ${-74 + flap} 56 ${-70 + flap} 70 C-40 66 10 62 36 52 C40 30 42 14 40 4 Z`}
          fill={robeFill}
          stroke={OUT}
          strokeWidth={SW}
        />
        {L.pattern !== 'none' && LOD === 0 && (
          <path d={`M-40 4 C-54 30 ${-74 + flap} 56 ${-70 + flap} 70 C-40 66 10 62 36 52 C40 30 42 14 40 4 Z`} fill={`url(#pat-${L.name})`} />
        )}
        <path d={`M${-70 + flap} 70 C-40 66 10 62 36 52`} stroke={L.trim} strokeWidth={4} fill="none" />
        <path d="M8 18 L34 52 L22 96" stroke={OUT} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M8 18 L34 52 L22 96" stroke={L.robeShade} strokeWidth={21} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M10 84 L34 84 L44 100 L46 106 L12 106 Z" fill={L.boots} stroke={OUT} strokeWidth={2} />
      </g>
    );
  })();

  /* ---------- scabbard (behind skirt) */
  const scabbard =
    P === 'sword' && pose !== 'horse' ? (
      <path
        d={`M-26 ${hip.y + 6} C-40 ${hip.y + 50} -56 ${hip.y + 92} -74 ${hip.y + 120}`}
        stroke={OUT}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
    ) : null;
  const scabbardFill =
    P === 'sword' && pose !== 'horse' ? (
      <g>
        <path
          d={`M-26 ${hip.y + 6} C-40 ${hip.y + 50} -56 ${hip.y + 92} -74 ${hip.y + 120}`}
          stroke={C.redDeep}
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
        />
        <path d={`M-14 ${hip.y - 2} L-32 ${hip.y + 18}`} stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
      </g>
    ) : null;

  /* ---------- upper body (relative to hip) */
  const torsoD = `M${-40 * bulk} 6 C${-44 * bulk} -30 ${-50 * bulk} -70 ${-48 * bulk} -92 C-30 -104 -14 -104 0 -104 C14 -104 30 -104 ${46 * bulk} -92 C${48 * bulk} -70 ${42 * bulk} -30 ${40 * bulk} 6 Z`;
  const armorD = `M${-36 * bulk} 0 C${-40 * bulk} -30 ${-44 * bulk} -66 ${-42 * bulk} -88 C-26 -98 26 -98 ${40 * bulk} -88 C${42 * bulk} -66 ${38 * bulk} -30 ${36 * bulk} 0 Z`;

  const shoulderBack = {x: -38 * bulk, y: -86};
  const shoulderFront = {x: 34 * bulk, y: -86};
  const lf = limb(shoulderFront.x, shoulderFront.y, aFront[0], 50, aFront[1], 46);
  const lb = limb(shoulderBack.x, shoulderBack.y, aBack[0], 50, aBack[1], 46);

  const propBack = P === 'bow' || P === 'spear' || P === 'lance';
  const propNode =
    P !== 'none' && P !== 'sword' ? (
      <PropView
        prop={P}
        look={L}
        t={t}
        x={propBack ? lb.x2 : lf.x2}
        y={propBack ? lb.y2 : lf.y2}
        angle={
          P === 'staff' ? -4 : P === 'swordDrawn' ? aFront[1] - 160 : P === 'axe' ? aFront[1] - 150 : P === 'scroll' ? 10 : P === 'bow' ? 0 : -8
        }
      />
    ) : null;

  const upper = (
    <g transform={`translate(${hip.x} ${hip.y}) rotate(${bodyLean}) scale(1 ${1 + breathe * 0.006})`}>
      {L.cloak && (
        <path
          d={`M${-46 * bulk} -94 C-70 -50 ${-84 + Math.sin(t / 8) * 4} 20 ${-80 + Math.sin(t / 8) * 6} ${pose === 'stand' || pose === 'walk' ? 190 : 80} L-20 ${pose === 'stand' || pose === 'walk' ? 194 : 84} C-30 0 -10 -60 0 -100 Z`}
          fill={L.cloak}
          stroke={OUT}
          strokeWidth={SW}
        />
      )}
      {propBack && propNode}
      <Arm x={shoulderBack.x} y={shoulderBack.y} a={aBack} look={L} front={false} />
      <path d={torsoD} fill={robeFill} stroke={OUT} strokeWidth={SW} />
      {L.pattern !== 'none' && LOD === 0 && <path d={torsoD} fill={`url(#pat-${L.name})`} />}
      {L.armor && (
        <path
          d={armorD}
          fill={
            L.armor === 'scale'
              ? `url(#armor-scale-${L.name})`
              : L.armor === 'lamellar'
                ? `url(#armor-lam-${L.name})`
                : L.armor === 'mail'
                  ? `url(#armor-mail-${L.name})`
                  : L.armorColor
          }
          stroke={OUT}
          strokeWidth={2}
        />
      )}
      {L.armor === 'plate' && (
        <g>
          <path d="M-30 -80 C-10 -86 10 -86 30 -80 L28 -20 C10 -12 -10 -12 -28 -20 Z" fill={C.silverLight} stroke={OUT} strokeWidth={2} />
          <path d="M0 -84 L0 -14" stroke={C.silverDeep} strokeWidth={2} />
          {L.pattern === 'eagle' && (
            <path
              d="M0 -70 l4 6 l8 -6 l-2 10 l8 2 l-8 6 l2 12 l-8 -6 l-4 8 l-4 -8 l-8 6 l2 -12 l-8 -6 l8 -2 l-2 -10 l8 6z"
              fill={L.patternColor}
              stroke={OUT}
              strokeWidth={1}
            />
          )}
        </g>
      )}
      {!L.armor && (
        <>
          <path d="M-12 -103 L4 -52 L16 -103 Z" fill={L.inner} stroke={OUT} strokeWidth={2} />
          <path d="M-12 -103 L4 -52 L16 -103" stroke={L.trim} strokeWidth={4.5} fill="none" strokeLinejoin="round" />
        </>
      )}
      {/* sash */}
      <path d={`M${-42 * bulk} -10 C-10 -4 10 -4 ${42 * bulk} -10 L${42 * bulk} 8 C10 14 -10 14 ${-42 * bulk} 8 Z`} fill={L.sash} stroke={OUT} strokeWidth={2} />
      {LOD === 0 && (
        <path
          d={`M20 6 C22 20 ${22 + Math.sin(t / 7) * 2} 34 ${18 + Math.sin(t / 7) * 3} 46 L28 46 C30 32 30 18 30 6 Z`}
          fill={L.sash}
          stroke={OUT}
          strokeWidth={1.8}
        />
      )}
      {/* head group */}
      <g transform={`translate(0 0) rotate(${hTilt} 2 -108)`}>
        <Head look={L} expression={expression} t={t} talk={talk} blink={blink} lod={LOD} />
        <HeadgearView look={L} t={t} />
      </g>
      {/* bound hands rope */}
      {bound && (
        <g>
          <path
            d={`M${lb.x2} ${lb.y2} L${lf.x2} ${lf.y2}`}
            stroke={C.inkSoft}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <path d={`M${lf.x2} ${lf.y2} C${lf.x2 + 20} ${lf.y2 + 40} ${lf.x2 + 10} ${lf.y2 + 70} ${lf.x2 + 30} ${lf.y2 + 90}`} stroke={C.inkSoft} strokeWidth={4} fill="none" />
        </g>
      )}
      <Arm x={shoulderFront.x} y={shoulderFront.y} a={aFront} look={L} front />
      {!propBack && propNode}
    </g>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * flip} ${scale})`} opacity={opacity}>
      <PatternDefs look={L} />
      {L.shield && pose !== 'horse' && (
        <g transform={`translate(${-60} ${hip.y - 40})`}>
          <path d="M0 -40 C24 -40 34 -30 34 -10 C34 30 14 56 0 70 C-14 56 -34 30 -34 -10 C-34 -30 -24 -40 0 -40 Z" fill={L.shield} stroke={OUT} strokeWidth={SW} />
        </g>
      )}
      {scabbard}
      {scabbardFill}
      {lower}
      {upper}
    </g>
  );
};
