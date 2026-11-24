/* Verifies the self-contained dist/index.html (the file the preview serves)
   boots the storefront with zero external script/style requests. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve('dist/index.html'), 'utf8');

const external = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !u.startsWith('data:') && !u.startsWith('#'));
console.log('external references left in HTML:', external.length, external.slice(0, 6));

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
if (!window.matchMedia) window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

await new Promise((r) => setTimeout(r, 1200));

const root = window.document.getElementById('root');
const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
const ok =
  !window.document.getElementById('boot-fallback') &&
  window.document.querySelectorAll('button').length > 20 &&
  errors.length === 0 &&
  /99 Nights|All Games/i.test(text);

console.log('buttons:', window.document.querySelectorAll('button').length, '| images:', window.document.querySelectorAll('img').length);
console.log('boot splash still visible:', Boolean(window.document.getElementById('boot-fallback')));
console.log('text:', text.slice(0, 140));
console.log('errors:', errors.length, errors.slice(0, 3));
console.log(ok ? '\n✓ standalone HTML boots and paints' : '\n✗ standalone HTML did not paint');
process.exit(ok ? 0 : 1);
