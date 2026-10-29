// Fixed visual identity for the whole film. Do not use colors outside this file.
export const C = {
  // parchment
  parchment: '#E9D8B4',
  parchmentLight: '#F3E6C8',
  parchmentDark: '#C9AE7E',
  parchmentShadow: '#9C7F52',
  // Ottoman
  red: '#A3171D',
  redDeep: '#6E0E12',
  redLight: '#C8402F',
  gold: '#C9A13B',
  goldLight: '#E8C766',
  goldDeep: '#8E6B1E',
  green: '#1F6B4A',
  greenDeep: '#0F4430',
  greenLight: '#3E8F67',
  // Timurid
  turq: '#1E9AA0',
  turqLight: '#5FC4C2',
  turqDeep: '#0F5E66',
  // Ink
  ink: '#1B1512',
  inkSoft: '#3A2E26',
  inkFade: '#5B4A3C',
  // Serbian
  silver: '#B9C0C7',
  silverLight: '#DDE2E6',
  silverDeep: '#7D868F',
  navy: '#1F2E5A',
  navyDeep: '#121B38',
  // skin / natural (derived warm tones of the parchment family)
  skin: '#E2B48A',
  skinShade: '#C48E64',
  skinDark: '#B97E55',
  white: '#F7F0E1',
  beardBlack: '#211915',
  beardGrey: '#BDB3A3',
  beardBrown: '#5A3A24',
  horseBay: '#7A4A2A',
  horseGrey: '#CFC6B8',
  horseBlack: '#2A211C',
  horseChestnut: '#9A5B2E',
  elephant: '#8D867C',
} as const;

export const ARMY = {
  ottoman: {main: C.red, accent: C.gold, deep: C.redDeep},
  timurid: {main: C.turq, accent: C.ink, deep: C.turqDeep},
  serb: {main: C.silver, accent: C.navy, deep: C.navyDeep},
  tatar: {main: C.goldDeep, accent: C.inkSoft, deep: C.ink},
} as const;

export const FONT = {
  title: 'Reem Kufi',
  display: 'Amiri',
  body: 'Noto Naskh Arabic',
  ui: 'Cairo',
  letter: 'Aref Ruqaa',
} as const;

export const W = 1920;
export const H = 1080;
