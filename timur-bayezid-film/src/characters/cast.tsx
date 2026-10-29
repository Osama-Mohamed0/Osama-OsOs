/**
 * Character lock: every appearance of a character in the film goes through these components,
 * so features, costume and colors never drift. See characters/*.md for the design notes.
 */
import React from 'react';
import {C} from '../theme';
import {Look, Person, PersonProps} from './Person';
import {Elephant, Gait, Horse} from './Mounts';

type CharProps = Omit<PersonProps, 'look'>;

/* ----------------------------------------------------------------- looks */
export const LOOK = {
  bayezid: {
    name: 'bayezid',
    skin: C.skin,
    skinShade: C.skinShade,
    hair: C.beardBlack,
    beard: 'full',
    beardColor: C.beardBlack,
    mustache: 'thick',
    brow: C.beardBlack,
    nose: 'hooked',
    age: 0.2,
    headgear: 'ottomanTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    hgCap: C.red,
    plume: C.white,
    robe: C.red,
    robeShade: C.redDeep,
    trim: C.gold,
    pattern: 'cintamani',
    patternColor: C.goldLight,
    inner: C.green,
    sash: C.gold,
    boots: C.goldLight,
    prop: 'sword',
    bulk: 1.08,
  },
  timur: {
    name: 'timur',
    skin: '#DDB07F',
    skinShade: C.skinDark,
    hair: C.beardGrey,
    beard: 'thinLong',
    beardColor: C.beardGrey,
    mustache: 'droop',
    brow: C.beardGrey,
    eyes: 'narrow',
    nose: 'straight',
    age: 0.8,
    headgear: 'timuridCrown',
    hgMain: C.turq,
    hgAccent: C.ink,
    plume: C.white,
    robe: C.turqDeep,
    robeShade: '#0A434A',
    trim: C.gold,
    pattern: 'cloud',
    patternColor: C.turqLight,
    inner: C.ink,
    sash: C.ink,
    boots: C.ink,
    prop: 'staff',
    bulk: 1.02,
  },
  stefan: {
    name: 'stefan',
    skin: '#E8C09A',
    skinShade: C.skinShade,
    hair: C.beardBrown,
    hairStyle: 'long',
    beard: 'short',
    beardColor: C.beardBrown,
    mustache: 'thin',
    brow: C.beardBrown,
    nose: 'straight',
    headgear: 'serbCirclet',
    hgMain: C.gold,
    hgAccent: C.gold,
    robe: C.navy,
    robeShade: C.navyDeep,
    trim: C.silverLight,
    pattern: 'eagle',
    patternColor: C.silverLight,
    inner: C.silver,
    sash: C.silverDeep,
    boots: C.ink,
    armor: 'plate',
    armorColor: C.silver,
    cloak: C.navyDeep,
    prop: 'sword',
    bulk: 1.06,
  },
  suleyman: {
    name: 'suleyman',
    skin: C.skin,
    skinShade: C.skinShade,
    hair: C.beardBlack,
    beard: 'short',
    beardColor: C.beardBlack,
    mustache: 'thick',
    brow: C.beardBlack,
    nose: 'straight',
    headgear: 'princeTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    hgCap: C.red,
    plume: C.white,
    robe: C.redLight,
    robeShade: C.red,
    trim: C.gold,
    pattern: 'floral',
    patternColor: C.goldLight,
    inner: C.gold,
    sash: C.goldDeep,
    boots: C.goldLight,
    prop: 'sword',
  },
  isa: {
    name: 'isa',
    skin: C.skin,
    skinShade: C.skinShade,
    hair: C.beardBrown,
    beard: 'short',
    beardColor: C.beardBrown,
    mustache: 'thin',
    brow: C.beardBrown,
    nose: 'straight',
    headgear: 'princeTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    hgCap: C.goldDeep,
    robe: C.goldDeep,
    robeShade: '#6B4F14',
    trim: C.red,
    pattern: 'stripe',
    patternColor: C.goldLight,
    inner: C.red,
    sash: C.red,
    boots: C.red,
    prop: 'sword',
  },
  musa: {
    name: 'musa',
    skin: C.skin,
    skinShade: C.skinShade,
    hair: C.beardBlack,
    beard: 'stubble',
    beardColor: C.beardBlack,
    mustache: 'thin',
    brow: C.beardBlack,
    nose: 'small',
    headgear: 'princeTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    hgCap: C.redDeep,
    robe: C.redDeep,
    robeShade: '#4A0A0D',
    trim: C.greenLight,
    pattern: 'floral',
    patternColor: C.greenLight,
    inner: C.green,
    sash: C.green,
    boots: C.goldLight,
    prop: 'sword',
  },
  mehmed: {
    name: 'mehmed',
    skin: C.skin,
    skinShade: C.skinShade,
    hair: C.beardBlack,
    beard: 'none',
    beardColor: C.beardBlack,
    mustache: 'thin',
    brow: C.beardBlack,
    nose: 'small',
    headgear: 'princeTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    hgCap: C.green,
    plume: C.white,
    robe: C.green,
    robeShade: C.greenDeep,
    trim: C.gold,
    pattern: 'floral',
    patternColor: C.goldLight,
    inner: C.white,
    sash: C.gold,
    boots: C.goldLight,
    prop: 'sword',
  },
  envoy: {
    name: 'envoy',
    skin: '#DDB07F',
    skinShade: C.skinDark,
    hair: C.beardBlack,
    beard: 'goatee',
    beardColor: C.beardBlack,
    mustache: 'thin',
    brow: C.beardBlack,
    eyes: 'narrow',
    nose: 'straight',
    headgear: 'envoyCap',
    hgMain: C.ink,
    hgAccent: C.turq,
    robe: C.turq,
    robeShade: C.turqDeep,
    trim: C.ink,
    pattern: 'cloud',
    patternColor: C.turqLight,
    inner: C.white,
    sash: C.ink,
    boots: C.ink,
    prop: 'scroll',
  },
  muhammadSultan: {
    name: 'muhammadSultan',
    skin: '#DDB07F',
    skinShade: C.skinDark,
    hair: C.beardBlack,
    beard: 'goatee',
    beardColor: C.beardBlack,
    mustache: 'droop',
    brow: C.beardBlack,
    eyes: 'narrow',
    nose: 'straight',
    headgear: 'helmetTimurid',
    hgMain: C.silver,
    hgAccent: C.turq,
    plume: C.turqLight,
    robe: C.turq,
    robeShade: C.turqDeep,
    trim: C.gold,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.ink,
    sash: C.ink,
    boots: C.ink,
    armor: 'lamellar',
    armorColor: C.turqDeep,
    prop: 'lance',
    propColor: C.turq,
  },
  /* ------------------------------------------------ army units (crowd LOD) */
  janissary: {
    name: 'janissary',
    skin: C.skin,
    skinShade: C.skinShade,
    beard: 'none',
    beardColor: C.beardBlack,
    mustache: 'thick',
    brow: C.beardBlack,
    nose: 'straight',
    headgear: 'bork',
    hgMain: C.white,
    hgAccent: C.gold,
    robe: C.red,
    robeShade: C.redDeep,
    trim: C.gold,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.navy,
    sash: C.gold,
    boots: C.red,
    prop: 'axe',
    lod: 1,
  },
  sipahi: {
    name: 'sipahi',
    skin: C.skin,
    skinShade: C.skinShade,
    beard: 'short',
    beardColor: C.beardBlack,
    mustache: 'thick',
    brow: C.beardBlack,
    headgear: 'smallTurban',
    hgMain: C.white,
    hgAccent: C.red,
    robe: C.red,
    robeShade: C.redDeep,
    trim: C.gold,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.gold,
    sash: C.gold,
    boots: C.goldLight,
    armor: 'mail',
    armorColor: C.silverDeep,
    prop: 'lance',
    propColor: C.red,
    lod: 1,
  },
  tatar: {
    name: 'tatar',
    skin: '#D9A77A',
    skinShade: C.skinDark,
    beard: 'goatee',
    beardColor: C.beardBlack,
    mustache: 'droop',
    brow: C.beardBlack,
    eyes: 'narrow',
    headgear: 'furCap',
    hgMain: C.redDeep,
    hgAccent: C.inkSoft,
    robe: C.goldDeep,
    robeShade: '#6B4F14',
    trim: C.inkSoft,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.inkSoft,
    sash: C.inkSoft,
    boots: C.ink,
    prop: 'bow',
    lod: 1,
  },
  timuridArcher: {
    name: 'timuridArcher',
    skin: '#DDB07F',
    skinShade: C.skinDark,
    beard: 'goatee',
    beardColor: C.beardBlack,
    mustache: 'droop',
    brow: C.beardBlack,
    eyes: 'narrow',
    headgear: 'helmetTimurid',
    hgMain: C.silverDeep,
    hgAccent: C.turq,
    plume: C.ink,
    robe: C.turq,
    robeShade: C.turqDeep,
    trim: C.ink,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.ink,
    sash: C.ink,
    boots: C.ink,
    armor: 'lamellar',
    armorColor: C.ink,
    prop: 'bow',
    lod: 1,
  },
  serbKnight: {
    name: 'serbKnight',
    skin: '#E8C09A',
    skinShade: C.skinShade,
    beard: 'short',
    beardColor: C.beardBrown,
    mustache: 'thin',
    brow: C.beardBrown,
    headgear: 'helmetSerb',
    hgMain: C.silver,
    hgAccent: C.navy,
    robe: C.navy,
    robeShade: C.navyDeep,
    trim: C.silverLight,
    pattern: 'none',
    patternColor: C.silver,
    inner: C.silver,
    sash: C.silverDeep,
    boots: C.ink,
    armor: 'plate',
    armorColor: C.silver,
    prop: 'spear',
    shield: C.navy,
    lod: 1,
  },
  crusader: {
    name: 'crusader',
    skin: '#EAC7A4',
    skinShade: C.skinShade,
    beard: 'none',
    beardColor: C.beardBrown,
    mustache: 'none',
    brow: C.beardBrown,
    headgear: 'helmetSerb',
    hgMain: C.silver,
    hgAccent: C.parchmentLight,
    robe: C.parchmentLight,
    robeShade: C.parchmentDark,
    trim: C.navy,
    pattern: 'none',
    patternColor: C.silver,
    inner: C.silver,
    sash: C.inkSoft,
    boots: C.ink,
    armor: 'mail',
    armorColor: C.silver,
    prop: 'lance',
    propColor: C.navy,
    lod: 1,
  },
  timuridSoldier: {
    name: 'timuridSoldier',
    skin: '#DDB07F',
    skinShade: C.skinDark,
    beard: 'goatee',
    beardColor: C.beardBlack,
    mustache: 'droop',
    brow: C.beardBlack,
    eyes: 'narrow',
    headgear: 'helmetTimurid',
    hgMain: C.silverDeep,
    hgAccent: C.turq,
    plume: C.turq,
    robe: C.turqDeep,
    robeShade: '#0A434A',
    trim: C.gold,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.ink,
    sash: C.ink,
    boots: C.ink,
    armor: 'lamellar',
    armorColor: C.turqDeep,
    prop: 'lance',
    propColor: C.turq,
    lod: 1,
  },
  ottomanCourtier: {
    name: 'ottomanCourtier',
    skin: C.skin,
    skinShade: C.skinShade,
    beard: 'full',
    beardColor: C.beardBrown,
    mustache: 'thick',
    brow: C.beardBrown,
    headgear: 'smallTurban',
    hgMain: C.white,
    hgAccent: C.gold,
    robe: C.green,
    robeShade: C.greenDeep,
    trim: C.gold,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.gold,
    sash: C.gold,
    boots: C.goldLight,
    lod: 1,
  },
  refugee: {
    name: 'refugee',
    skin: C.skin,
    skinShade: C.skinShade,
    beard: 'full',
    beardColor: C.beardGrey,
    mustache: 'thick',
    brow: C.beardGrey,
    headgear: 'smallTurban',
    hgMain: C.parchmentLight,
    hgAccent: C.gold,
    robe: C.inkFade,
    robeShade: C.inkSoft,
    trim: C.parchmentDark,
    pattern: 'none',
    patternColor: C.gold,
    inner: C.parchmentDark,
    sash: C.parchmentShadow,
    boots: C.inkSoft,
    lod: 1,
  },
} satisfies Record<string, Look>;

export type LookKey = keyof typeof LOOK;

/* ------------------------------------------------------- named characters */
export const Bayezid: React.FC<CharProps> = (p) => <Person look={LOOK.bayezid} {...p} />;
export const Timur: React.FC<CharProps> = (p) => (
  <Person look={LOOK.timur} limp armFront={p.prop === 'none' || p.pose === 'horse' || p.pose === 'throne' ? undefined : [14, 4]} {...p} />
);
export const Stefan: React.FC<CharProps> = (p) => <Person look={LOOK.stefan} {...p} />;
export const Suleyman: React.FC<CharProps> = (p) => <Person look={LOOK.suleyman} {...p} />;
export const Isa: React.FC<CharProps> = (p) => <Person look={LOOK.isa} {...p} />;
export const Musa: React.FC<CharProps> = (p) => <Person look={LOOK.musa} {...p} />;
export const Mehmed: React.FC<CharProps> = (p) => <Person look={LOOK.mehmed} {...p} />;
export const Envoy: React.FC<CharProps> = (p) => <Person look={LOOK.envoy} {...p} />;
export const MuhammadSultan: React.FC<CharProps> = (p) => <Person look={LOOK.muhammadSultan} {...p} />;

/* --------------------------------------------------------------- riders */
export const MOUNT_STYLE: Record<string, {coat: string; mane: string; cloth: string; trim: string; armored?: boolean}> = {
  bayezid: {coat: C.horseGrey, mane: C.inkSoft, cloth: C.red, trim: C.gold},
  timur: {coat: C.horseBlack, mane: C.ink, cloth: C.turq, trim: C.gold},
  stefan: {coat: C.horseGrey, mane: C.inkSoft, cloth: C.navy, trim: C.silverLight, armored: true},
  muhammadSultan: {coat: C.horseChestnut, mane: C.ink, cloth: C.turq, trim: C.gold},
  sipahi: {coat: C.horseBay, mane: C.ink, cloth: C.red, trim: C.gold},
  tatar: {coat: C.horseChestnut, mane: C.ink, cloth: C.goldDeep, trim: C.inkSoft},
  timuridArcher: {coat: C.horseBay, mane: C.ink, cloth: C.ink, trim: C.turq},
  timuridSoldier: {coat: C.horseBlack, mane: C.ink, cloth: C.turqDeep, trim: C.gold},
  serbKnight: {coat: C.horseGrey, mane: C.inkSoft, cloth: C.navy, trim: C.silverLight, armored: true},
  crusader: {coat: C.horseGrey, mane: C.inkSoft, cloth: C.parchmentLight, trim: C.navy, armored: true},
  suleyman: {coat: C.horseBay, mane: C.ink, cloth: C.redLight, trim: C.gold},
  isa: {coat: C.horseChestnut, mane: C.ink, cloth: C.goldDeep, trim: C.red},
  musa: {coat: C.horseBlack, mane: C.ink, cloth: C.redDeep, trim: C.greenLight},
  mehmed: {coat: C.horseGrey, mane: C.inkSoft, cloth: C.green, trim: C.gold},
  envoy: {coat: C.horseBay, mane: C.ink, cloth: C.turq, trim: C.ink},
  refugee: {coat: C.horseBay, mane: C.ink, cloth: C.inkFade, trim: C.parchmentDark},
};

export const Rider: React.FC<{
  who: LookKey;
  x?: number;
  y?: number;
  scale?: number;
  facing?: 'left' | 'right';
  t?: number;
  gait?: Gait;
  phase?: number;
  expression?: PersonProps['expression'];
  armFront?: [number, number];
  armBack?: [number, number];
  prop?: PersonProps['prop'];
  fall?: number;
  rear?: number;
  lod?: 0 | 1;
  opacity?: number;
}> = ({who, x = 0, y = 0, scale = 1, facing = 'right', t = 0, gait = 'stand', phase = 0, expression, armFront, armBack, prop, fall, rear, lod, opacity}) => {
  const st = MOUNT_STYLE[who] ?? MOUNT_STYLE.sipahi;
  const look = LOOK[who] as Look;
  return (
    <Horse
      x={x}
      y={y}
      scale={scale}
      facing={facing}
      t={t}
      gait={gait}
      phase={phase}
      coat={st.coat}
      mane={st.mane}
      cloth={st.cloth}
      clothTrim={st.trim}
      armored={st.armored}
      fall={fall}
      rear={rear}
      lod={lod ?? (look.lod ?? 0)}
      opacity={opacity}
      rider={
        <Person
          look={look}
          pose="horse"
          t={t}
          scale={0.62}
          expression={expression ?? 'neutral'}
          armFront={armFront}
          armBack={armBack}
          prop={prop}
          blinkSeed={phase * 10}
          lod={lod}
        />
      }
    />
  );
};

export {Elephant, Horse};

/* ------------------------------------------------------------ throne prop */
export const Throne: React.FC<{x?: number; y?: number; scale?: number; color?: string}> = ({x = 0, y = 0, scale = 1, color = C.red}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* back */}
    <path d="M-130 -100 L-120 -330 C-80 -380 80 -380 120 -330 L130 -100 Z" fill={C.goldDeep} stroke={C.ink} strokeWidth={3} />
    <path d="M-110 -110 L-102 -320 C-70 -360 70 -360 102 -320 L110 -110 Z" fill={color} stroke={C.ink} strokeWidth={2} />
    <path d="M-80 -150 L-74 -300 C-50 -330 50 -330 74 -300 L80 -150 Z" fill="none" stroke={C.gold} strokeWidth={4} />
    <circle cx={0} cy={-240} r={26} fill="none" stroke={C.gold} strokeWidth={4} />
    <path d="M0 -266 L0 -214 M-26 -240 L26 -240 M-18 -258 L18 -222 M18 -258 L-18 -222" stroke={C.gold} strokeWidth={2.5} />
    <circle cx={0} cy={-380} r={10} fill={C.gold} stroke={C.ink} strokeWidth={2} />
    {/* seat platform */}
    <path d="M-170 -100 L170 -100 L160 -20 L-160 -20 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
    <path d="M-160 -86 L160 -86" stroke={C.goldDeep} strokeWidth={4} />
    {[-130, -90, -50, -10, 30, 70, 110, 150].map((tx) => (
      <path key={tx} d={`M${tx - 10} -70 l10 -10 l10 10 l-10 10 z`} fill={C.red} stroke={C.ink} strokeWidth={1.5} />
    ))}
    <path d="M-180 -20 L180 -20 L180 0 L-180 0 Z" fill={C.goldDeep} stroke={C.ink} strokeWidth={3} />
    {/* cushion */}
    <path d="M-140 -100 C-140 -120 140 -120 140 -100 Z" fill={C.green} stroke={C.ink} strokeWidth={2} />
  </g>
);
