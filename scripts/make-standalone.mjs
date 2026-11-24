/**
 * Takes the Vite production build and inlines the CSS + JS straight into
 * index.html, producing a single self-contained file with zero extra script
 * or stylesheet requests. Useful for locked-down preview proxies/hosts.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const indexPath = resolve(dist, 'index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

const read = (urlPath) => {
  const file = resolve(dist, urlPath.replace(/^\//, ''));
  if (!existsSync(file)) throw new Error(`missing asset: ${file}`);
  return readFileSync(file, 'utf8');
};

let html = readFileSync(indexPath, 'utf8');
let inlinedCss = 0;
let inlinedJs = 0;

// 1. stylesheet links -> <style>
html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, (tag) => {
  const href = /href="([^"]+)"/.exec(tag)?.[1];
  if (!href || !href.endsWith('.css')) return tag;
  inlinedCss++;
  return `<style>\n${read(href)}\n</style>`;
});

// 2. module entry script -> classic inline script, relocated to the end of <body>
// (a classic script in <head> would run before #root exists, so it must go last)
const bundles = [];
html = html.replace(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (_tag, src) => {
  inlinedJs++;
  bundles.push(read(src).replace(/<\/script/gi, '<\\/script'));
  return '';
});

// 3. drop module preloads (assets are already inlined)
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');

// 4. inject the app bundle right before </body>
// NOTE: a replacer *function* is mandatory here — a plain string replacement
// would interpret `$$`, `$&`, `$1`… and silently corrupt the minified bundle.
const appTags = bundles.map((js) => `<script>\n${js}\n</script>`).join('\n');
html = html.replace('</body>', () => `${appTags}\n</body>`);

// 5. guard: the inlined JS must be byte-identical to the built bundle
for (const js of bundles) {
  if (!html.includes(js)) throw new Error('inlined bundle was corrupted during substitution');
}

writeFileSync(indexPath, html);
writeFileSync(resolve(dist, 'standalone.html'), html);

const kb = (html.length / 1024).toFixed(0);
console.log(`✓ standalone build: dist/index.html (${kb} kB, ${inlinedCss} css + ${inlinedJs} js inlined)`);
