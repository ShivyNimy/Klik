/* Loads the real (esbuild IIFE) browser bundle into jsdom to verify first paint. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Bundle the real app exactly like a browser would receive it.
const outfile = join(tmpdir(), 'klik-browser-bundle.js');
await build({
  entryPoints: [new URL('../src/main.tsx', import.meta.url).pathname],
  bundle: true,
  format: 'iife',
  jsx: 'automatic',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.BASE_URL': '"/"',
  },
  loader: { '.css': 'empty' },
  outfile,
  logLevel: 'silent',
});

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(
  /<script type="module"[^>]*><\/script>/g,
  ''
);

const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'dangerously', url: 'http://localhost:5173/' });
const { window } = dom;

const errors = [];
window.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + e.reason));

const makeGradient = () => ({ addColorStop() {} });
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type !== '2d') return null;
  const target = { canvas: this, globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif' };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return () => makeGradient();
      if (p === 'measureText') return () => ({ width: 12 });
      return () => {};
    },
    set(t, p, v) {
      t[p] = v;
      return true;
    },
  });
};
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540, x: 0, y: 0,
});
window.Element.prototype.scrollIntoView = function () {};
if (!window.matchMedia) {
  window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}

const code = readFileSync(outfile, 'utf8');
const script = window.document.createElement('script');
script.textContent = code;
window.document.body.appendChild(script);

await new Promise((r) => setTimeout(r, 900));

const root = window.document.getElementById('root');
const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
const hasBoot = !!window.document.getElementById('boot-fallback');
const nodes = root.children.length;
const cards = window.document.querySelectorAll('img').length;
const buttons = window.document.querySelectorAll('button').length;

console.log('root children:', nodes, '| imgs:', cards, '| buttons:', buttons);
console.log('boot splash still visible:', hasBoot);
console.log('first 180 chars of rendered text:', text.slice(0, 180));
console.log('runtime errors:', errors.length, errors.slice(0, 3));

const ok = !hasBoot && nodes > 0 && buttons > 20 && errors.length === 0 && /KLIK|All Games|99 Nights/i.test(text);
console.log(ok ? '\n✓ browser bundle boots and paints the storefront' : '\n✗ browser bundle failed to paint');
if (!ok) process.exitCode = 1;
process.exit(ok ? 0 : 1);
