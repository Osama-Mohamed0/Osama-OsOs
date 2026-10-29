// Single-bundle renderer.
//   node scripts/render.mjs stills S01:120,S01:400 [scale]
//   node scripts/render.mjs scenes S01 S02 ...   (or "all") -> out/scenes/<id>.mp4 (no audio)
//   node scripts/render.mjs frames-only S05 0-59  (timing test)
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const [mode, ...args] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const common = {serveUrl, browserExecutable: BROWSER, chromiumOptions: {gl: process.env.GL ?? 'angle'}, logLevel: process.env.LOG ?? 'error'};

const manifestPath = path.join(ROOT, 'manifest.json');
const readManifest = () => (fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {scenes: {}});
const writeManifest = (m) => fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));

if (mode === 'stills') {
  const scale = Number(args[1] ?? 0.5);
  fs.mkdirSync(path.join(ROOT, 'out/stills'), {recursive: true});
  for (const item of args[0].split(',')) {
    const [id, fr] = item.split(':');
    const composition = await selectComposition({...common, id});
    const out = path.join(ROOT, `out/stills/${id}_${fr}.png`);
    await renderStill({...common, composition, frame: Number(fr), output: out, scale});
    console.log(out);
  }
} else if (mode === 'scenes' || mode === 'frames-only') {
  const ids = mode === 'frames-only' ? [args[0]] : args[0] === 'all' ? Object.keys((await import(path.join(ROOT, 'story/timing.json'), {with: {type: 'json'}})).default.scenes.map((s) => s.id)) : args;
  fs.mkdirSync(path.join(ROOT, 'out/scenes'), {recursive: true});
  for (const id of ids) {
    const composition = await selectComposition({...common, id, inputProps: process.env.PROPS ? JSON.parse(process.env.PROPS) : {}});
    const t0 = Date.now();
    const out = path.join(ROOT, mode === 'frames-only' ? `out/test_${id}.mp4` : `out/scenes/${id}.mp4`);
    const range = mode === 'frames-only' ? args[1].split('-').map(Number) : null;
    await renderMedia({
      ...common,
      composition,
      codec: 'h264',
      crf: 17,
      outputLocation: out,
      concurrency: Number(process.env.CONC ?? 4),
      imageFormat: 'jpeg',
      jpegQuality: 92,
      muted: true,
      frameRange: range,
      inputProps: process.env.PROPS ? JSON.parse(process.env.PROPS) : {},
      onProgress: ({progress}) => {
        if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`\r${id} ${Math.round(progress * 100)}%   `);
      },
    });
    const sec = (Date.now() - t0) / 1000;
    console.log(`\n${id} done in ${sec.toFixed(0)}s -> ${out}`);
    if (mode === 'scenes') {
      const m = readManifest();
      m.scenes[id] = {...(m.scenes[id] ?? {}), status: 'rendered', video: `out/scenes/${id}.mp4`, frames: composition.durationInFrames, renderSec: Math.round(sec), renderedAt: new Date().toISOString()};
      writeManifest(m);
    }
  }
}
setTimeout(() => process.exit(0), 3000);
