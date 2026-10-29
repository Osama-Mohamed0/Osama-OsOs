// Pre-render crowd unit sprites (transparent PNG) -> public/sprites/<unit>_<anim>_<k>.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const common = {serveUrl, browserExecutable: BROWSER, logLevel: 'error'};
export const SPEC = [
  ['janissary', 'stand', 1], ['janissary', 'walk', 8], ['janissary', 'attack', 6],
  ['serbKnight', 'stand', 1], ['serbKnight', 'attack', 6],
  ['timuridSoldier', 'stand', 1], ['timuridSoldier', 'walk', 8], ['timuridArcher', 'stand', 1],
  ['ottomanCourtier', 'stand', 1],
  ...['sipahi', 'tatar', 'timuridArcher', 'timuridSoldier', 'serbKnight', 'crusader', 'refugee', 'suleyman', 'mehmed', 'isa', 'musa', 'bayezid', 'stefan', 'muhammadSultan', 'timur'].flatMap((u) => [[u, 'gallop', 8], [u, 'ride', 1]]),
  ['elephant', 'walk', 8],
];
const only = process.argv[2];
fs.mkdirSync(path.join(ROOT, 'public/sprites'), {recursive: true});
for (const [unit, anim, n] of SPEC) {
  if (only && unit !== only) continue;
  const id = unit === 'elephant' ? 'SpriteElephant' : anim === 'gallop' || anim === 'ride' ? 'SpriteRider' : 'SpriteFoot';
  for (let k = 0; k < n; k++) {
    const inputProps = {unit, anim, k, n};
    const composition = await selectComposition({...common, id, inputProps});
    await renderStill({...common, composition, inputProps, frame: 0, imageFormat: 'png', output: path.join(ROOT, `public/sprites/${unit}_${anim}_${k}.png`)});
  }
  console.log(unit, anim, n);
}
process.exit(0);
