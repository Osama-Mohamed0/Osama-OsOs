// يبني نسخة الويب من نفس ملفات التطبيق (../src) في المجلد _site، جاهزة للنشر على GitHub Pages.
// التشغيل: node web/build-web.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const web = path.resolve(import.meta.dirname);
const root = path.join(web, '..');
const out = path.join(root, '_site');
const siteUrl = (process.env.SITE_URL || 'https://osama-mohamed0.github.io/Osama-OsOs/').replace(/\/?$/, '/');

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), out, { recursive: true });
for (const f of ['assets/icon.ico', 'assets/tray.png']) fs.rmSync(path.join(out, f), { force: true }); // خاصة بويندوز
fs.copyFileSync(path.join(web, 'web.js'), path.join(out, 'js', 'web.js'));
fs.copyFileSync(path.join(web, 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
fs.copyFileSync(path.join(web, 'icon-192.png'), path.join(out, 'assets', 'icon-192.png'));
fs.copyFileSync(path.join(web, 'icon-maskable.png'), path.join(out, 'assets', 'icon-maskable.png'));

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!from.test(html)) throw new Error(`index.html: pattern not found ${from}`);
  html = html.replace(from, to);
};
const desc = 'تطبيق عربي مجاني لمتابعة المهام والعادات وجلسات التركيز. بياناتك تبقى على جهازك.';
swap(
  /(\s*)<title>إنجاز<\/title>/,
  `$1<title>إنجاز</title>
    <meta name="description" content="${desc}">
    <meta name="theme-color" content="#2a78d6">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="icon" type="image/png" href="assets/icon-192.png">
    <link rel="apple-touch-icon" href="assets/icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta property="og:type" content="website">
    <meta property="og:title" content="إنجاز — المهام والعادات والتركيز">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${siteUrl}assets/icon.png">
    <meta property="og:url" content="${siteUrl}">`
);
swap(/(\s*)<script src="js\/app\.js"><\/script>/, '$1<script src="js/app.js"></script>$1<script src="js/web.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), html);

// قائمة الملفات للعمل دون إنترنت، ورقم إصدار يتغير مع أي تعديل
const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(path.relative(out, full).split(path.sep).join('/'));
  }
};
walk(out);
const hash = crypto.createHash('sha256');
for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(out, f)));
const sw = fs
  .readFileSync(path.join(web, 'sw.js'), 'utf8')
  .replace('__VERSION__', hash.digest('hex').slice(0, 12))
  .replace('__FILES__', JSON.stringify(['./', ...files], null, 2));
fs.writeFileSync(path.join(out, 'sw.js'), sw);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`site built: ${out} (${files.length} files)`);
