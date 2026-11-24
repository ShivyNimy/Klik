import { useEffect, useRef } from 'react';

/**
 * Runs a render/update callback on requestAnimationFrame with
 * delta-time in seconds, clamped to avoid huge jumps after tab switches.
 */
export function useAnimationFrame(callback: (dt: number) => void, active = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cbRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** Tracks the set of keys currently held down. */
export function useKeys() {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'spacebar'].includes(
          e.key.toLowerCase()
        )
      ) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return keys;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

/** Sets up a canvas that fills its parent with devicePixelRatio scaling. */
export function useCanvasSize(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasRef, width, height]);
}

/** Sets a canvas backing store for crisp rendering on high-DPI screens. */
export function useHiDPI(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasRef, width, height]);
}

/** Converts a pointer event to logical canvas coordinates. */
export function toCanvasPoint(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * width,
    y: ((e.clientY - r.top) / r.height) * height,
  };
}
