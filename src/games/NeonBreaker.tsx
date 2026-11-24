import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Heart, Trophy, Zap } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;
const COLS = 11;
const ROWS = 5;

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  hue: number;
  alive: boolean;
}
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
interface Powerup {
  x: number;
  y: number;
  kind: 'wide' | 'multi' | 'life';
  vy: number;
}

export default function NeonBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, best: 0 });
  const mouseX = useRef(W / 2);

  const g = useRef({
    paddle: { x: W / 2, w: 130, h: 14 },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerups: [] as Powerup[],
    score: 0,
    lives: 3,
    level: 1,
    launched: false,
    wideTimer: 0,
    t: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    shake: 0,
    best: 0,
  });

  const buildLevel = (level: number) => {
    const s = g.current;
    s.bricks = [];
    const padX = 70;
    const bw = (W - padX * 2) / COLS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r + c) % 7 === 0 && level > 1) continue;
        s.bricks.push({
          x: padX + c * bw + 3,
          y: 60 + r * 32,
          w: bw - 6,
          h: 26,
          hp: r < 2 ? 2 : 1,
          hue: 300 + r * 22 + c * 3,
          alive: true,
        });
      }
    }
  };

  const resetBall = () => {
    const s = g.current;
    s.balls = [{ x: s.paddle.x, y: H - 80, vx: 0, vy: 0, r: 9 }];
    s.launched = false;
  };

  const reset = useCallback(() => {
    const s = g.current;
    s.paddle = { x: W / 2, w: 130, h: 14 };
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.powerups = [];
    s.particles = [];
    s.wideTimer = 0;
    buildLevel(1);
    resetBall();
    setHud({ score: 0, lives: 3, level: 1, best: s.best });
    setOver(false);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const launch = useCallback(() => {
    const s = g.current;
    if (!s.launched && s.balls.length) {
      s.launched = true;
      s.balls[0].vx = rand(-220, 220);
      s.balls[0].vy = -430;
      sfx.powerup();
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') launch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [launch, started]);

  const point = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !over) {
      s.t += dt;
      s.shake = Math.max(0, s.shake - dt);
      s.wideTimer = Math.max(0, s.wideTimer - dt);
      s.paddle.w = s.wideTimer > 0 ? 210 : 130;

      const k = keys.current;
      if (k['arrowleft'] || k['a']) mouseX.current -= 560 * dt;
      if (k['arrowright'] || k['d']) mouseX.current += 560 * dt;
      s.paddle.x += (clamp(mouseX.current, s.paddle.w / 2, W - s.paddle.w / 2) - s.paddle.x) * Math.min(1, dt * 18);

      if (!s.launched) {
        s.balls.forEach((b) => {
          b.x = s.paddle.x;
          b.y = H - 80;
        });
      }

      for (const b of s.balls) {
        if (!s.launched) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x - b.r < 8) {
          b.x = 8 + b.r;
          b.vx = Math.abs(b.vx);
          sfx.playTone(420, 0.04, 'square', 0.04);
        }
        if (b.x + b.r > W - 8) {
          b.x = W - 8 - b.r;
          b.vx = -Math.abs(b.vx);
          sfx.playTone(420, 0.04, 'square', 0.04);
        }
        if (b.y - b.r < 8) {
          b.y = 8 + b.r;
          b.vy = Math.abs(b.vy);
          sfx.playTone(420, 0.04, 'square', 0.04);
        }

        // paddle
        if (
          b.y + b.r > H - 60 &&
          b.y - b.r < H - 46 &&
          b.x > s.paddle.x - s.paddle.w / 2 - 6 &&
          b.x < s.paddle.x + s.paddle.w / 2 + 6 &&
          b.vy > 0
        ) {
          const rel = (b.x - s.paddle.x) / (s.paddle.w / 2);
          const angle = clamp(rel, -1, 1) * 1.02;
          const speed = Math.min(780, Math.hypot(b.vx, b.vy) * 1.02 + 8);
          b.vx = Math.sin(angle) * speed;
          b.vy = -Math.abs(Math.cos(angle) * speed);
          b.y = H - 60 - b.r;
          sfx.playTone(300, 0.06, 'triangle', 0.09, 460);
        }

        // bricks
        for (const br of s.bricks) {
          if (!br.alive) continue;
          if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
            const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
            const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
            if (overlapX < overlapY) b.vx *= -1;
            else b.vy *= -1;
            br.hp -= 1;
            s.score += br.hp <= 0 ? 110 : 45;
            s.shake = 0.12;
            sfx.playTone(620 + Math.random() * 240, 0.05, 'square', 0.05, 900);
            for (let i = 0; i < 8; i++) {
              s.particles.push({
                x: b.x,
                y: b.y,
                vx: rand(-180, 180),
                vy: rand(-180, 180),
                life: rand(0.15, 0.45),
                c: `hsl(${br.hue}, 90%, 65%)`,
              });
            }
            if (br.hp <= 0) {
              br.alive = false;
              if (Math.random() < 0.12) {
                s.powerups.push({
                  x: br.x + br.w / 2,
                  y: br.y + br.h / 2,
                  kind: (['wide', 'multi', 'life'] as const)[Math.floor(Math.random() * 3)],
                  vy: 130,
                });
              }
            }
            break;
          }
        }
      }

      s.balls = s.balls.filter((b) => {
        if (b.y - b.r > H) {
          if (s.balls.length === 1) {
            s.lives -= 1;
            s.launched = false;
            s.shake = 0.4;
            sfx.gameOver();
            if (s.lives <= 0) {
              s.best = Math.max(s.best, s.score);
              setHud({ score: s.score, lives: 0, level: s.level, best: s.best });
              setOver(true);
            }
            const nb = { x: s.paddle.x, y: H - 80, vx: 0, vy: 0, r: 9 };
            s.balls = [nb];
            return false;
          }
          return false;
        }
        return true;
      });
      if (s.balls.length === 0) resetBall();

      // powerups
      for (const p of s.powerups) {
        p.y += p.vy * dt;
        if (p.y > H - 70 && p.y < H - 40 && Math.abs(p.x - s.paddle.x) < s.paddle.w / 2 + 10) {
          p.vy = -999;
          if (p.kind === 'wide') {
            s.wideTimer = 10;
            sfx.powerup();
          } else if (p.kind === 'multi') {
            const base = s.balls[0];
            if (base) {
              s.balls.push({ ...base, vx: base.vx + rand(-140, 140), vy: -Math.abs(base.vy) });
              s.balls.push({ ...base, vx: base.vx + rand(-140, 140), vy: -Math.abs(base.vy) });
            }
            sfx.powerup();
          } else {
            s.lives = Math.min(5, s.lives + 1);
            sfx.coin();
          }
        }
      }
      s.powerups = s.powerups.filter((p) => p.y < H + 20);

      // level clear
      if (s.bricks.every((b) => !b.alive)) {
        s.level += 1;
        buildLevel(s.level);
        resetBall();
        s.score += 300;
        sfx.powerup();
      }

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      setHud({ score: s.score, lives: s.lives, level: s.level, best: s.best });
    }

    // ---------------- RENDER ----------------
    ctx.fillStyle = '#05040f';
    ctx.fillRect(0, 0, W, H);

    // background grid perspective
    ctx.strokeStyle = 'rgba(139,92,246,0.16)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const y = H - Math.pow(i / 18, 2.2) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 26, H);
      ctx.lineTo(W / 2 + i * 150, 0);
      ctx.stroke();
    }
    // horizon glow
    const hg = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.8);
    hg.addColorStop(0, 'rgba(236,72,153,0)');
    hg.addColorStop(0.5, 'rgba(236,72,153,0.16)');
    hg.addColorStop(1, 'rgba(236,72,153,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, H * 0.55, W, H * 0.25);

    const shx = s.shake > 0 ? rand(-4, 4) : 0;

    // bricks
    for (const br of s.bricks) {
      if (!br.alive) continue;
      ctx.save();
      ctx.translate(shx, 0);
      const grad = ctx.createLinearGradient(br.x, br.y, br.x + br.w, br.y + br.h);
      grad.addColorStop(0, `hsla(${br.hue}, 95%, ${br.hp > 1 ? 68 : 58}%, 0.95)`);
      grad.addColorStop(1, `hsla(${br.hue + 30}, 85%, ${br.hp > 1 ? 48 : 38}%, 0.95)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(br.x, br.y, br.w, br.h, 6);
      ctx.fill();
      ctx.strokeStyle = `hsla(${br.hue}, 100%, 80%, 0.7)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(br.x + 4, br.y + 4, br.w - 8, 3);
      ctx.restore();
    }

    // powerups
    for (const p of s.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(s.t * 3);
      ctx.fillStyle = p.kind === 'wide' ? '#22d3ee' : p.kind === 'multi' ? '#a78bfa' : '#f472b6';
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-13, -13, 26, 26, 7);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#04121a';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.kind === 'wide' ? 'W' : p.kind === 'multi' ? 'M' : '+', p.x, p.y + 5);
    }

    // paddle
    const pg = ctx.createLinearGradient(s.paddle.x - s.paddle.w / 2, 0, s.paddle.x + s.paddle.w / 2, 0);
    pg.addColorStop(0, '#22d3ee');
    pg.addColorStop(0.5, '#a855f7');
    pg.addColorStop(1, '#ec4899');
    ctx.fillStyle = pg;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.roundRect(s.paddle.x - s.paddle.w / 2, H - 60, s.paddle.w, s.paddle.h, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // balls
    for (const b of s.balls) {
      const bg = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2.2);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.4, '#67e8f9');
      bg.addColorStop(1, 'rgba(103,232,249,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.45, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3.4, 3.4);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = 'rgba(5,4,15,0.6)';
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#a5f3fc';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${s.score.toLocaleString()}`, 20, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(`STAGE ${s.level}`, W / 2, 26);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbcfe8';
    ctx.fillText(`LIVES ${'♥'.repeat(Math.max(0, s.lives))}`, W - 20, 26);

    if (!s.launched && started && !over) {
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,255,255,${0.55 + Math.sin(s.t * 4) * 0.3})`;
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('Click or press SPACE to launch', W / 2, H - 100);
    }
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05040f]">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-none touch-none"
        onPointerMove={(e) => {
          mouseX.current = point(e).x;
        }}
        onPointerDown={(e) => {
          mouseX.current = point(e).x;
          launch();
        }}
      />

      {started && !over && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold text-slate-300 backdrop-blur">
          <Zap size={11} className="text-cyan-300" /> Mouse / ← → to move · Space to launch
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-fuchsia-950/85 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-300">
              🧱 Neon Arcade
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Neon Prism Breaker</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Deflect the plasma orb and shatter every crystal brick. Catch capsules for multi-ball, wide paddles
              and extra lives.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-7 py-3 text-sm font-black text-white shadow-xl shadow-fuchsia-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Break Some Bricks
            </button>
            <div className="mt-3 flex justify-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Heart size={10} className="text-rose-400" /> 3 lives
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={10} className="text-amber-400" /> Endless stages
              </span>
            </div>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">💔</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Prism Shattered</h3>
            <p className="mt-1 text-xs text-slate-300">
              Score <b className="text-fuchsia-300">{hud.score.toLocaleString()}</b> · Stage {hud.level}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
