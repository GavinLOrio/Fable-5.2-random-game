// Bundles src/ into a single self-contained index.html (no server or network needed to play).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = readFileSync('src/page.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
const head = page.slice(0, page.indexOf('<canvas'));
const body = page.slice(page.indexOf('<canvas'));
writeFileSync('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
${head}</head>
<body>
${body}</body>
</html>
`);
if (process.argv[2]) writeFileSync(process.argv[2], page);
console.log('built index.html', (js.length / 1024).toFixed(0) + ' KB js');
