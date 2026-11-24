/* Verify the production output is rooted correctly for the GitHub project Pages URL. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const base = '/Klik/';
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');

assert.ok(html.includes(`href="${base}favicon.svg"`), 'favicon should use the Pages base path');
assert.ok(html.includes(`content="${base}images/99-nights.jpg"`), 'Open Graph image should use the Pages base path');
assert.ok(!html.includes('/src/main.tsx'), 'production HTML must not point at unbuilt TSX source');

const bundleRefs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
assert.ok(bundleRefs.some((url) => url.endsWith('.js')), 'built JavaScript bundle should be linked');
assert.ok(bundleRefs.some((url) => url.endsWith('.css')), 'built CSS bundle should be linked');

for (const url of bundleRefs) {
  assert.ok(url.startsWith(base), `bundle URL should start with ${base}: ${url}`);
  const localPath = resolve(dist, url.slice(base.length));
  assert.ok(existsSync(localPath), `built asset should exist: ${localPath}`);
}

const jsUrl = bundleRefs.find((url) => url.endsWith('.js'));
const js = readFileSync(resolve(dist, jsUrl.slice(base.length)), 'utf8');
assert.ok(js.includes(base), 'runtime asset helper should contain the configured Pages base path');

const thumbnails = readdirSync(resolve('public/images'));
for (const thumbnail of thumbnails) {
  assert.ok(js.includes(thumbnail), `catalog bundle should reference ${thumbnail}`);
}

console.log(`✓ GitHub Pages output uses ${base}, has built JS/CSS, and references ${thumbnails.length} local thumbnails`);
