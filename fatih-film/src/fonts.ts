import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const faces: [string, string, string][] = [
  ['Amiri', 'fonts/Amiri-Regular.ttf', '400'],
  ['Amiri', 'fonts/Amiri-Bold.ttf', '700'],
  ['Reem Kufi', 'fonts/ReemKufi.ttf', '400 700'],
  ['Cairo', 'fonts/Cairo.ttf', '200 1000'],
  ['Noto Naskh Arabic', 'fonts/NotoNaskhArabic.ttf', '400 700'],
  ['Aref Ruqaa', 'fonts/ArefRuqaa-Regular.ttf', '400'],
  ['Aref Ruqaa', 'fonts/ArefRuqaa-Bold.ttf', '700'],
];

export const fontsReady = Promise.all(
  faces.map(([family, file, weight]) => loadFont({family, url: staticFile(file), weight})),
);
