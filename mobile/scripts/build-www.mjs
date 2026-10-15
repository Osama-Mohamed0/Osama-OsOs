// يبني واجهة تطبيق الهاتف من نفس ملفات سطح المكتب (../src) ويضيف ملفات أندرويد فقط.
// التشغيل: npm run build:www
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const mobile = path.resolve(import.meta.dirname, '..');
const src = path.join(mobile, '..', 'src');
const www = path.join(mobile, 'www');
const out = path.join(www, 'js', 'mobile');

fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(src, www, { recursive: true });
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(www, 'assets', 'icon.ico'), { force: true }); // خاص بويندوز

await build({
  entryPoints: [path.join(mobile, 'native', 'index.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  outfile: path.join(out, 'native.js'),
  logLevel: 'warning',
});
fs.copyFileSync(path.join(mobile, 'web', 'mobile-api.js'), path.join(out, 'mobile-api.js'));
fs.copyFileSync(path.join(mobile, 'web', 'mobile-glue.js'), path.join(out, 'mobile-glue.js'));
fs.copyFileSync(require.resolve('jsqr/dist/jsQR.js'), path.join(out, 'jsQR.js'));

let html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!from.test(html)) throw new Error(`index.html: pattern not found ${from}`);
  html = html.replace(from, to);
};
// Capacitor يحقن جسره كسكربت مضمّن، وسياسة CSP الخاصة بسطح المكتب كانت ستمنعه
swap(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
swap(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
swap(/(\s*)<script src="js\/store\.js"><\/script>/, '$1<script src="js/mobile/native.js"></script>$1<script src="js/mobile/mobile-api.js"></script>$1<script src="js/store.js"></script>');
swap(/(\s*)<script src="js\/app\.js"><\/script>/, '$1<script src="js/app.js"></script>$1<script src="js/mobile/jsQR.js"></script>$1<script src="js/mobile/mobile-glue.js"></script>');
fs.writeFileSync(path.join(www, 'index.html'), html);
console.log('www built:', www);
