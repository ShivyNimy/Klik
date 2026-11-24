import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, Zap } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI } from './engine';

const W = 960;
const H = 540;
const ARENA = 1900;
const SEG_SPACING = 5;

interface Pt {
  x: number;
  y: number;
}
interface Orb {
  x: number;
  y: number;
  r: number;
  hue: number;
  pulse: number;
}
interface Bot {
  pts: Pt[];
  angle: number;
  targetAngle: number;
  length: number;
  hue: number;
  name: string;
  alive: boolean;
  boost: number;
  thinkCd: number;
  speed: number;
}

const BOT_NAMES = ['V1PER', 'N3XUS', 'NOODLE', 'FRACTAL', 'Z3R0', 'KRAIT', 'PIXEL', 'GLITCH', 'HYDRA', 'ORO'];

export default function SnakeArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [hud, setHud] = useState({ length: 10, rank: 1, total: 9, best: 10, boost: 100, killer: '' });

  const mouse = useRef({ x: W / 2, y: H / 2 - 100, down: false });
  const g = useRef({
    pts: Array.from({ length: 90 }, (_, i) => ({ x: -i * SEG_SPACING, y: 0 })) as Pt[],
    angle: 0,
    length: 24,
    targetLength: 24,
    alive: true,
    boost: 100,
    boosting: false,
    bots: [] as Bot[],
    orbs: [] as Orb[],
    camX: 0,
    camY: 0,
    best: 24,
    hue: 265,
    t: 0,
    killer: '',
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
  });

  const reset = useCallback(() => {
    const s = g.current;
    s.pts = [];
    const startX = 0;
    const startY = 0;
    for (let i = 0; i < 90; i++) s.pts.push({ x: startX - i * SEG_SPACING, y: startY });
    s.angle = 0;
    s.length = 24;
    s.targetLength = 24;
    s.alive = true;
    s.boost = 100;
    s.boosting = false;
    s.hue = rand(0, 360);
    s.t = 0;
    s.killer = '';
    s.particles = [];

    s.orbs = Array.from({ length: 420 }, () => {
      const a = rand(0, Math.PI * 2);
      const r = rand(60, ARENA);
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        r: rand(3.5, 6.5),
        hue: rand(0, 360),
        pulse: rand(0, Math.PI * 2),
      };
    });

    s.bots = Array.from({ length: 8 }, (_, i) => {
      const a = rand(0, Math.PI * 2);
      const r = rand(300, ARENA * 0.85);
      const pts: Pt[] = [];
      for (let k = 0; k < 110; k++) pts.push({ x: Math.cos(a) * r - k * SEG_SPACING, y: Math.sin(a) * r });
      return {
        pts,
        angle: a,
        targetAngle: a,
        length: rand(12, 40),
        hue: [0, 30, 120, 180, 210, 320, 350, 60][i],
        name: BOT_NAMES[i % BOT_NAMES.length],
        alive: true,
        boost: rand(0, 100),
        thinkCd: 0,
        speed: rand(105, 128),
      };
    });
    setDead(false);
    setHud({ length: 24, rank: 1, total: 9, best: 24, boost: 100, killer: '' });
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  useEffect(() => {
    const up = () => {
      mouse.current.down = false;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const die = (killer: string) => {
    const s = g.current;
    if (!s.alive) return;
    s.alive = false;
    s.killer = killer;
    s.best = Math.max(s.best, Math.floor(s.length));
    sfx.gameOver();
    // scatter orbs
    for (let i = 0; i < s.pts.length; i += 3) {
      const p = s.pts[i];
      s.orbs.push({ x: p.x + rand(-8, 8), y: p.y + rand(-8, 8), r: rand(5, 9), hue: s.hue, pulse: 0 });
    }
    for (let i = 0; i < 30; i++) {
      s.particles.push({
        x: s.pts[0].x,
        y: s.pts[0].y,
        vx: rand(-220, 220),
        vy: rand(-220, 220),
        life: rand(0.3, 0.8),
        c: `hsl(${s.hue}, 90%, 65%)`,
      });
    }
    setDead(true);
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && s.alive) {
      s.t += dt;
      // steering: mouse relative to center of canvas
      const dx = mouse.current.x - W / 2;
      const dy = mouse.current.y - H / 2;
      if (Math.hypot(dx, dy) > 12) {
        const target = Math.atan2(dy, dx);
        const diff = ((target - s.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        s.angle += clamp(diff, -6.2 * dt, 6.2 * dt);
      }

      const wantBoost = mouse.current.down && s.length > 12;
      s.boosting = wantBoost;
      const speed = wantBoost ? 340 : 176;

      const head = s.pts[0];
      const nx = head.x + Math.cos(s.angle) * speed * dt;
      const ny = head.y + Math.sin(s.angle) * speed * dt;
      s.pts.unshift({ x: nx, y: ny });

      if (wantBoost) {
        s.length = Math.max(10, s.length - dt * 5);
        s.boost = clamp(s.boost - dt * 12, 0, 100);
        if (Math.random() < dt * 14) {
          s.orbs.push({ x: nx - Math.cos(s.angle) * 18, y: ny - Math.sin(s.angle) * 18, r: 5, hue: s.hue, pulse: 0 });
        }
      } else {
        s.boost = clamp(s.boost + dt * 9, 0, 100);
      }

      // trim tail
      while (s.pts.length > Math.ceil((s.length * 8 + 40) / SEG_SPACING) * 1) s.pts.pop();
      const maxPts = Math.floor((s.length * 9 + 60) / SEG_SPACING);
      if (s.pts.length > maxPts) s.pts.length = maxPts;

      // arena bounds
      const distC = Math.hypot(nx, ny);
      if (distC > ARENA) {
        s.angle += Math.PI * dt * 3;
        s.pts[0] = { x: head.x, y: head.y };
      }

      // eat orbs
      for (const o of s.orbs) {
        o.pulse += dt * 3;
        if (Math.hypot(o.x - nx, o.y - ny) < 26) {
          s.length += o.r - o.pulse * 0 > 5.4 ? 2.4 : 1.1;
          o.r = -1;
          if (Math.random() < 0.25) sfx.playTone(700 + Math.random() * 300, 0.05, 'sine', 0.05);
        }
      }
      s.orbs = s.orbs.filter((o) => o.r > 0);
      // replenish food
      while (s.orbs.length < 380) {
        const a = rand(0, Math.PI * 2);
        const r = rand(60, ARENA);
        s.orbs.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, r: rand(3.5, 6), hue: rand(0, 360), pulse: 0 });
      }

      // ---- bots ----
      for (const b of s.bots) {
        if (!b.alive) continue;
        b.thinkCd -= dt;
        const bh = b.pts[0];
        if (b.thinkCd <= 0) {
          b.thinkCd = rand(0.3, 0.9);
          // find nearest orb
          let best: Orb | null = null;
          let bd = 460;
          for (let i = 0; i < s.orbs.length; i += 3) {
            const o = s.orbs[i];
            const d = Math.hypot(o.x - bh.x, o.y - bh.y);
            if (d < bd) {
              bd = d;
              best = o;
            }
          }
          let targetA = best ? Math.atan2(best.y - bh.y, best.x - bh.x) : b.angle;
          // avoid arena edge
          const cd = Math.hypot(bh.x, bh.y);
          if (cd > ARENA * 0.88) targetA = Math.atan2(-bh.y, -bh.x);
          b.targetAngle = targetA;
        }
        let diff = ((b.targetAngle - b.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
        b.pts.unshift({
          x: bh.x + Math.cos(b.angle) * b.speed * dt,
          y: bh.y + Math.sin(b.angle) * b.speed * dt,
        });
        const maxB = Math.floor((b.length * 9 + 60) / SEG_SPACING);
        if (b.pts.length > maxB) b.pts.length = maxB;

        for (const o of s.orbs) {
          if (Math.hypot(o.x - b.pts[0].x, o.y - b.pts[0].y) < 26) {
            o.r = -1;
            b.length += 1;
          }
        }
        s.orbs = s.orbs.filter((o) => o.r > 0);
      }

      // ---- collisions ----
      // player head vs bot bodies
      for (const b of s.bots) {
        if (!b.alive) continue;
        for (let i = 4; i < b.pts.length; i += 2) {
          const p = b.pts[i];
          if (Math.hypot(p.x - s.pts[0].x, p.y - s.pts[0].y) < 15) {
            die(b.name);
            break;
          }
        }
      }
      // bot heads vs player body + other bots
      for (const b of s.bots) {
        if (!b.alive) continue;
        const bh = b.pts[0];
        let hit = false;
        for (let i = 6; i < s.pts.length; i += 2) {
          if (Math.hypot(s.pts[i].x - bh.x, s.pts[i].y - bh.y) < 15) {
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const ob of s.bots) {
            if (ob === b || !ob.alive) continue;
            for (let i = 6; i < ob.pts.length; i += 3) {
              if (Math.hypot(ob.pts[i].x - bh.x, ob.pts[i].y - bh.y) < 13) {
                hit = true;
                break;
              }
            }
            if (hit) break;
          }
        }
        if (hit) {
          b.alive = false;
          for (let i = 0; i < b.pts.length; i += 3) {
            s.orbs.push({ x: b.pts[i].x, y: b.pts[i].y, r: rand(5, 9), hue: b.hue, pulse: 0 });
          }
          sfx.playTone(200, 0.25, 'sawtooth', 0.08, 80);
        }
      }

      // respawn bots to keep arena busy
      if (s.bots.filter((b) => b.alive).length < 7) {
        const a = rand(0, Math.PI * 2);
        const r = rand(500, ARENA * 0.8);
        const pts: Pt[] = [];
        for (let k = 0; k < 90; k++) pts.push({ x: Math.cos(a) * r - k * SEG_SPACING, y: Math.sin(a) * r });
        s.bots.push({
          pts,
          angle: a,
          targetAngle: a,
          length: rand(14, 30),
          hue: rand(0, 360),
          name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          alive: true,
          boost: 0,
          thinkCd: 0,
          speed: rand(105, 128),
        });
        if (s.bots.length > 12) s.bots = s.bots.filter((b) => b.alive);
      }

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // camera
      s.camX += (s.pts[0].x - s.camX) * Math.min(1, dt * 10);
      s.camY += (s.pts[0].y - s.camY) * Math.min(1, dt * 10);

      // leaderboard
      const scores = [
        { name: 'YOU', len: s.length },
        ...s.bots.filter((b) => b.alive).map((b) => ({ name: b.name, len: b.length })),
      ].sort((a, b) => b.len - a.len);
      const rank = scores.findIndex((x) => x.name === 'YOU') + 1;
      s.best = Math.max(s.best, Math.floor(s.length));
      if (Math.floor(s.t * 8) % 2 === 0)
        setHud({
          length: Math.floor(s.length),
          rank,
          total: scores.length,
          best: Math.max(Math.floor(s.length), s.best),
          boost: Math.round(s.boost),
          killer: s.killer,
        });
    }

    // ------------- RENDER -------------
    const camX = s.camX;
    const camY = s.camY;
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);

    // grid
    const cell = 70;
    const ox = (-camX + W / 2) % cell;
    const oy = (-camY + H / 2) % cell;
    ctx.strokeStyle = 'rgba(45,212,191,0.07)';
    ctx.lineWidth = 1;
    for (let x = ox; x < W; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = oy; y < H; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // arena boundary
    ctx.strokeStyle = 'rgba(244,63,94,0.4)';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(W / 2 - camX, H / 2 - camY, ARENA, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const toScreen = (x: number, y: number) => ({ x: x - camX + W / 2, y: y - camY + H / 2 });

    // orbs
    for (const o of s.orbs) {
      const p = toScreen(o.x, o.y);
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
      ctx.fillStyle = `hsla(${o.hue}, 90%, 65%, 0.95)`;
      ctx.shadowColor = `hsl(${o.hue}, 90%, 60%)`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, o.r + Math.sin(o.pulse) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // bots
    for (const b of s.bots) {
      if (!b.alive) continue;
      drawSnake(ctx, b.pts, b.hue, b.length, b.name, toScreen, false);
    }

    // player
    drawSnake(ctx, s.pts, s.hue, s.length, 'YOU', toScreen, true);

    // particles
    for (const p of s.particles) {
      const sp = toScreen(p.x, p.y);
      ctx.globalAlpha = clamp(p.life / 0.8, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(sp.x, sp.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // minimap
    const mmR = 54;
    const mmX = W - 76;
    const mmY = H - 74;
    ctx.fillStyle = 'rgba(5,10,20,0.72)';
    ctx.beginPath();
    ctx.arc(mmX, mmY, mmR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,212,191,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (const b of s.bots) {
      if (!b.alive) continue;
      ctx.fillStyle = `hsla(${b.hue}, 85%, 60%, 0.85)`;
      ctx.beginPath();
      ctx.arc(mmX + (b.pts[0].x / ARENA) * mmR, mmY + (b.pts[0].y / ARENA) * mmR, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mmX + (s.pts[0].x / ARENA) * mmR, mmY + (s.pts[0].y / ARENA) * mmR, 3, 0, Math.PI * 2);
    ctx.fill();

    // score chip
    ctx.fillStyle = 'rgba(5,10,20,0.6)';
    ctx.beginPath();
    ctx.roundRect(16, H - 60, 168, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LENGTH', 30, H - 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`${Math.floor(s.length)}`, 30, H - 22);
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(`RANK #${hud.rank}/${hud.total}`, 90, H - 26);
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070f]">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-none touch-none"
        onPointerMove={(e) => {
          const canvas = canvasRef.current!;
          const r = canvas.getBoundingClientRect();
          mouse.current.x = ((e.clientX - r.left) / r.width) * W;
          mouse.current.y = ((e.clientY - r.top) / r.height) * H;
        }}
        onPointerDown={(e) => {
          mouse.current.down = true;
          const canvas = canvasRef.current!;
          const r = canvas.getBoundingClientRect();
          mouse.current.x = ((e.clientX - r.left) / r.width) * W;
          mouse.current.y = ((e.clientY - r.top) / r.height) * H;
        }}
        onPointerUp={() => (mouse.current.down = false)}
        onPointerLeave={() => (mouse.current.down = false)}
      />

      {started && !dead && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-slate-300 backdrop-blur">
            🖱️ Mouse steers · Hold click to boost
          </div>
          <div className="pointer-events-none absolute right-3 top-3 w-32 rounded-lg border border-white/10 bg-black/50 p-2 backdrop-blur">
            <div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-teal-300">
              <Trophy size={10} /> Leaderboard
            </div>
            <div className="space-y-0.5 text-[9.5px] font-semibold text-slate-300">
              <div className="flex justify-between text-white">
                <span>1. YOU</span>
                <span>{hud.length}</span>
              </div>
              <div className="flex justify-between opacity-70">
                <span>Rank</span>
                <span>#{hud.rank}</span>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-24 w-28">
            <div className="mb-0.5 flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-violet-300">
              <span className="flex items-center gap-1">
                <Zap size={9} /> Boost
              </span>
              <span>{hud.boost}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                style={{ width: `${hud.boost}%` }}
              />
            </div>
          </div>
        </>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-emerald-950/70 via-slate-950/80 to-black/90 p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              🐍 .io Arena
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Neon Slither Arena</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Devour glowing orbs, grow into a monster and cut off rival serpents so they smash into your body.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-7 py-3 text-sm font-black text-black shadow-xl shadow-emerald-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-black" /> Slither In
            </button>
            <p className="mt-3 text-[10px] text-slate-400">Mouse / finger steers · hold to boost</p>
          </div>
        </div>
      )}

      {dead && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🐍💀</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Ssssmashed!</h3>
            <p className="mt-1 text-xs text-slate-300">
              Length <b className="text-emerald-300">{hud.best}</b> · Rank #{hud.rank}
              {hud.killer && (
                <>
                  {' '}
                  · eliminated by <b className="text-rose-300">{hud.killer}</b>
                </>
              )}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-sm font-black text-black shadow-lg"
            >
              <RotateCcw size={15} /> Respawn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  hue: number,
  length: number,
  name: string,
  toScreen: (x: number, y: number) => { x: number; y: number },
  isPlayer: boolean
) {
  if (!pts || pts.length < 2) return;
  const total = pts.length;
  for (let i = total - 1; i >= 0; i--) {
    const p = toScreen(pts[i].x, pts[i].y);
    if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
    const t = i / Math.max(1, total);
    const r = clamp(14 - t * 7, 3, 14);
    ctx.fillStyle = `hsl(${hue}, ${isPlayer ? 85 : 70}%, ${isPlayer ? 62 - t * 12 : 58 - t * 14}%)`;
    if (i < total - 3 && i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // head
  const hp = toScreen(pts[0].x, pts[0].y);
  const h2 = toScreen(pts[Math.min(4, pts.length - 1)].x, pts[Math.min(4, pts.length - 1)].y);
  const ang = Math.atan2(hp.y - h2.y, hp.x - h2.x);
  ctx.save();
  ctx.translate(hp.x, hp.y);
  ctx.rotate(ang);
  ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
  ctx.shadowBlur = 20;
  ctx.fillStyle = `hsl(${hue}, 90%, 66%)`;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -6, 5, 0, Math.PI * 2);
  ctx.arc(6, 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(8, -6, 2.6, 0, Math.PI * 2);
  ctx.arc(8, 6, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // nametag
  ctx.fillStyle = isPlayer ? '#fff' : 'rgba(226,232,240,0.75)';
  ctx.font = `bold ${isPlayer ? 12 : 10}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(isPlayer ? 'YOU' : name, hp.x, hp.y - 26);
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.fillText(`${Math.floor(length)}`, hp.x, hp.y - 15);
}
