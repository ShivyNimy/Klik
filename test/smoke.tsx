/* Headless smoke test: mounts the storefront and every game, then drives input. */
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
(window as any).matchMedia = (q: string) => ({
  matches: false,
  media: q,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return false;
  },
});
(globalThis as any).matchMedia = (window as any).matchMedia;
(globalThis as any).localStorage = window.localStorage;

const errors: string[] = [];
window.addEventListener('error', (e) => errors.push('window error: ' + (e as any).message));
const origError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map(String).join(' ');
  if (msg.includes('not wrapped in act') || msg.includes("scrollTo()")) return;
  errors.push('console.error: ' + msg);
  origError(...args);
};

// ---- canvas 2d context stub ----
const makeGradient = () => ({ addColorStop() {} });
let currentCanvas: any = null;
(window.HTMLCanvasElement.prototype as any).getContext = function (this: any, type: string) {
  if (type !== '2d') return null;
  currentCanvas = this;
  const target: any = {
    canvas: this,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    font: '10px sans-serif',
    textAlign: 'left',
    shadowBlur: 0,
    shadowColor: '#000',
  };
  return new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern')
        return () => makeGradient();
      if (prop === 'measureText') return () => ({ width: 12 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set(t, prop: string, v) {
      t[prop] = v;
      return true;
    },
  });
};

(window.HTMLCanvasElement.prototype as any).getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540, x: 0, y: 0 };
};
(window.Element.prototype as any).scrollIntoView = function () {};
(window.SVGElement.prototype as any).getBBox = function () {
  return { x: 0, y: 0, width: 0, height: 0 };
};

const frame = (ms = 16) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { GAME_COMPONENTS } = await import('../src/games/registry');
  const App = (await import('../src/App')).default;

  const root = createRoot(document.getElementById('root')!);
  root.render(React.createElement(App));
  await frame(120);
  console.log('✓ storefront mounted, root children:', document.getElementById('root')!.children.length);

  // Open the flagship game through the DOM (simulates a click on the card)
  const clickText = (needle: string) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const el = buttons.find((b) => (b.textContent || '').toLowerCase().includes(needle));
    if (el) {
      (el as HTMLElement).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  };
  console.log('✓ opened 99 Nights:', clickText('play now'));
  await frame(200);
  console.log('✓ clicked enter:', clickText('enter the forest'));
  await frame(500);

  // drive some input
  const key = (k: string, type = 'keydown') =>
    window.dispatchEvent(new window.KeyboardEvent(type, { key: k, bubbles: true }));
  for (const k of ['w', 'd', ' ', 'e', '1', '2', '3', '4', 'r', 'f']) {
    key(k);
    await frame(60);
    key(k, 'keyup');
  }
  await frame(400);
  console.log('✓ drove keyboard input for 99 Nights');

  root.unmount();
  await frame(50);

  // ---- mount every game standalone ----
  for (const [id, Comp] of Object.entries(GAME_COMPONENTS)) {
    const host = document.createElement('div');
    host.style.width = '960px';
    host.style.height = '540px';
    document.body.appendChild(host);
    const r2 = createRoot(host);
    const before = errors.length;
    r2.render(React.createElement(Comp as any));
    await frame(120);

    // click any start CTA
    const btns = Array.from(host.querySelectorAll('button'));
    const cta = btns.find((b) =>
      /play|start|enter|begin|deploy|defend|ignite|race|slither|tip off|sync|mining|draw|stacking|scanning/i.test(
        b.textContent || ''
      )
    );
    cta?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await frame(300);

    // press some keys
    for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', ' ', 'x', '1', '2']) {
      key(k);
      await frame(50);
      key(k, 'keyup');
    }
    // click canvas (games listen on pointer events)
    const canvas = host.querySelector('canvas');
    if (canvas) {
      canvas.dispatchEvent(
        new window.PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 300, button: 0, buttons: 1 })
      );
      await frame(80);
      canvas.dispatchEvent(
        new window.PointerEvent('pointermove', { bubbles: true, clientX: 420, clientY: 320, buttons: 1 })
      );
      canvas.dispatchEvent(
        new window.PointerEvent('pointerup', { bubbles: true, clientX: 420, clientY: 320, buttons: 0 })
      );
    }
    await frame(500);

    const newErrs = errors.slice(before);
    console.log(`${newErrs.length ? '✗' : '✓'} ${id}${newErrs.length ? ' — ' + newErrs.slice(0, 3).join(' | ') : ''}`);
    r2.unmount();
    host.remove();
    await frame(30);
  }

  console.log('\nTOTAL ERRORS:', errors.length);
  if (errors.length) {
    console.log(errors.slice(0, 12).join('\n'));
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error('SMOKE TEST CRASH:', e);
  process.exitCode = 1;
});
