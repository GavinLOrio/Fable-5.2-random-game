// Bundles a game into a single self-contained index.html (no server or network needed to play).
//   node tools/build.mjs            -> Dawnward  (src/        -> index.html)
//   node tools/build.mjs rome       -> Aquila    (rome/src/   -> rome/index.html)
// An optional last argument writes a copy of the page without the <html> wrapper.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const rome = args[0] === 'rome';
const extra = rome ? args[1] : args[0];
const entry = rome ? 'rome/src/main.js' : 'src/main.js', pagePath = rome ? 'rome/page.html' : 'src/page.html', outPath = rome ? 'rome/index.html' : 'index.html';
const out = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
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
