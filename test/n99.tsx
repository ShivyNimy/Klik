/* Focused soak test for 99 Nights in the Forest (day/night cycle, monsters, rescue). */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost:5173/',
});
const { window } = dom;
(globalThis as any).window = window;
(globalThis as any).document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
(globalThis as any).HTMLElement = window.HTMLElement;
(globalThis as any).HTMLCanvasElement = window.HTMLCanvasElement;
(globalThis as any).Element = window.Element;
(globalThis as any).Node = window.Node;
(globalThis as any).getComputedStyle = window.getComputedStyle.bind(window);
(globalThis as any).requestAnimationFrame = window.requestAnimationFrame.bind(window);
(globalThis as any).cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
(globalThis as any).devicePixelRatio = 1;
(globalThis as any).localStorage = window.localStorage;
(window as any).matchMedia = (q: string) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
(globalThis as any).matchMedia = (window as any).matchMedia;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const errors: string[] = [];
window.addEventListener('error', (e) => errors.push((e as any).message));
const origError = console.error;
console.error = (...a: any[]) => {
  const m = a.map(String).join(' ');
  if (m.includes('not wrapped in act') || m.includes('scrollTo()')) return;
  errors.push(m);
  origError(...a);
};

const makeGradient = () => ({ addColorStop() {} });
(window.HTMLCanvasElement.prototype as any).getContext = function (this: any, type: string) {
  if (type !== '2d') return null;
  const target: any = { canvas: this, globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', shadowBlur: 0 };
  return new Proxy(target, {
    get(t, p: string) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return () => makeGradient();
      if (p === 'measureText') return () => ({ width: 12 });
      return () => {};
    },
    set(t, p: string, v) {
      t[p] = v;
      return true;
    },
  });
};
(window.HTMLCanvasElement.prototype as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540, x: 0, y: 0 });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const Game = (await import('../src/games/NinetyNineNights')).default;

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(Game as any));
  await wait(200);

  const startBtn = Array.from(host.querySelectorAll('button')).find((b) => /enter the forest/i.test(b.textContent || ''));
  startBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(200);

  const key = (k: string, type: string) =>
    window.dispatchEvent(new window.KeyboardEvent(type, { key: k, bubbles: true }));

  // run for ~10 seconds while moving around and swinging
  const start = Date.now();
  let ticks = 0;
  while (Date.now() - start < 10000) {
    key('d', 'keydown');
    key('s', 'keydown');
    key(' ', 'keydown');
    await wait(120);
    key(' ', 'keyup');
    key('d', 'keyup');
    key('s', 'keyup');
    key('e', 'keydown');
    key('1', 'keydown');
    key('2', 'keydown');
    key('3', 'keydown');
    key('4', 'keydown');
    key('e', 'keyup');
    key('1', 'keyup');
    key('2', 'keyup');
    key('3', 'keyup');
    key('4', 'keyup');
    await wait(120);
    ticks++;
  }

  const text = host.textContent || '';
  const nightMatch = text.match(/Night\s*(\d+)/);
  console.log('✓ ran', ticks, 'input ticks · HUD night:', nightMatch ? nightMatch[1] : '?');
  console.log('✓ errors:', errors.length, errors.slice(0, 3).join(' | '));
  root.unmount();
  if (errors.length) process.exitCode = 1;
}
run().catch((e) => {
  origError('CRASH', e);
  process.exitCode = 1;
});
