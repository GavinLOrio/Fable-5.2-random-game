// Bundles a game into a single self-contained index.html (no server or network needed to play).
//   node tools/build.mjs              -> Dawnward    (src/             -> index.html)
//   node tools/build.mjs rome         -> Aquila      (rome/src/        -> rome/index.html)
//   node tools/build.mjs hollowpine   -> Hollowpine  (hollowpine/src/  -> hollowpine/index.html)
// An optional last argument writes a copy of the page without the <html> wrapper.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const sub = ['rome', 'hollowpine'].includes(args[0]) ? args[0] : null;
const extra = sub ? args[1] : args[0];
const entry = sub ? `${sub}/src/main.js` : 'src/main.js', pagePath = sub ? `${sub}/page.html` : 'src/page.html', outPath = sub ? `${sub}/index.html` : 'index.html';
const out = await build({ entryPoints: [entry], bundle: true, minify: !process.env.DEBUG, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = readFileSync(pagePath, 'utf8').replace('/*__BUNDLE__*/', () => js);
const head = page.slice(0, page.indexOf('<canvas'));
const body = page.slice(page.indexOf('<canvas'));
writeFileSync(outPath, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
${head}</head>
<body>
${body}</body>
</html>
`);
if (extra) writeFileSync(extra, page);
console.log('built', outPath, (js.length / 1024).toFixed(0) + ' KB js');
