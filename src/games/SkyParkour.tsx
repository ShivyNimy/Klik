import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, Flag } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;

type PlatKind = 'normal' | 'lava' | 'bounce' | 'moving';
interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatKind;
  phase: number;
  baseX: number;
  range: number;
}
interface FlagPt {
  x: number;
  y: number;
  taken: boolean;
}

export default function SkyParkour() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'run' | 'dead' | 'won'>('run');
  const [stats, setStats] = useState({ time: 0, deaths: 0, stage: 1, checkpoints: 0 });
  const [best, setBest] = useState<number | null>(null);

  const g = useRef({
    px: 90,
    py: 380,
    vx: 0,
    vy: 0,
    onGround: false,
    jumps: 0,
    camX: 0,
    facing: 1,
    dashCd: 0,
    dashFx: 0,
    jumpHeld: false,
    dashHeld: false,
    platforms: [] as Platform[],
    flags: [] as FlagPt[],
    goal: { x: 0, y: 0 },
    checkpoint: { x: 90, y: 380 },
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    time: 0,
    deaths: 0,
    runTime: 0,
    startedAt: 0,
    won: false,
    shake: 0,
    squash: 0,
    stars: [] as { x: number; y: number; r: number; s: number }[],
  });

  const build = useCallback(() => {
    const s = g.current;
    s.platforms = [];
    s.flags = [];
    s.stars = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.6, 2), s: rand(4, 16) }));

    // ground start platform
    s.platforms.push({ x: 0, y: 440, w: 230, h: 120, kind: 'normal', phase: 0, baseX: 0, range: 0 });
    let x = 260;
    let y = 430;
    for (let i = 0; i < 46; i++) {
      const gap = rand(60, 118);
      const w = rand(70, 140);
      const dy = rand(-70, 55);
      y = clamp(y + dy, 170, 470);
      x += gap;
      const r = Math.random();
      let kind: PlatKind = 'normal';
      if (i > 6 && r < 0.16) kind = 'lava';
      else if (r < 0.3) kind = 'bounce';
      else if (i > 9 && r < 0.44) kind = 'moving';
      s.platforms.push({
        x,
        y,
        w,
        h: 22,
        kind,
        phase: rand(0, Math.PI * 2),
        baseX: x,
        range: kind === 'moving' ? rand(30, 70) : 0,
      });
      if (i === 14 || i === 28) {
        s.flags.push({ x: x + w / 2, y: y - 10, taken: false });
      }
      x += w;
    }
    s.goal = { x: x + 60, y: y - 40 };
    s.platforms.push({ x: x + 20, y: y + 40, w: 200, h: 120, kind: 'normal', phase: 0, baseX: x + 20, range: 0 });
    s.platforms.push({ x: x + 20, y: y - 90, w: 150, h: 20, kind: 'normal', phase: 0, baseX: x + 20, range: 0 });
  }, []);

  const reset = useCallback(() => {
    build();
    const s = g.current;
    s.px = 90;
    s.py = 380;
    s.vx = 0;
    s.vy = 0;
    s.camX = 0;
    s.jumps = 0;
    s.checkpoint = { x: 90, y: 380 };
    s.time = 0;
    s.runTime = 0;
    s.deaths = 0;
    s.won = false;
    s.particles = [];
    s.shake = 0;
    setStatus('run');
    setStats({ time: 0, deaths: 0, stage: 1, checkpoints: 0 });
  }, [build]);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const die = () => {
    const s = g.current;
    if (s.won) return;
    s.deaths += 1;
    s.shake = 0.4;
    sfx.gameOver();
    for (let i = 0; i < 26; i++) {
      s.particles.push({
        x: s.px,
        y: s.py,
        vx: rand(-190, 190),
        vy: rand(-260, 40),
        life: rand(0.3, 0.8),
        c: ['#f87171', '#fbbf24', '#fca5a5'][Math.floor(Math.random() * 3)],
      });
    }
    s.px = s.checkpoint.x;
    s.py = s.checkpoint.y;
    s.vx = 0;
    s.vy = 0;
    setStats((v) => ({ ...v, deaths: s.deaths }));
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && status === 'run' && !s.won) {
      s.runTime += dt;
      s.time += dt;
      const k = keys.current;
      let dir = 0;
      if (k['a'] || k['arrowleft']) dir -= 1;
      if (k['d'] || k['arrowright']) dir += 1;
      if (dir) s.facing = dir;

      const speed = 290;
      s.vx += (dir * speed - s.vx) * Math.min(1, dt * (s.onGround ? 16 : 8));

      // jump (edge triggered via key press counter)
      const jumpPressed = k['w'] || k['arrowup'] || k[' '] || k['space'];
      if (jumpPressed && !s.jumpHeld) {
        if (s.onGround) {
          s.vy = -520;
          s.jumps = 1;
          s.onGround = false;
          sfx.jump();
        } else if (s.jumps < 2) {
          s.vy = -460;
          s.jumps = 2;
          sfx.playTone(520, 0.12, 'sine', 0.1, 760);
        }
      }
      s.jumpHeld = !!jumpPressed;

      // dash
      s.dashCd = Math.max(0, s.dashCd - dt);
      const dashPressed = k['shift'] || k['x'];
      if (dashPressed && !s.dashHeld && s.dashCd <= 0) {
        s.vx = s.facing * 640;
        s.vy = Math.min(s.vy, -60);
        s.dashCd = 0.75;
        s.dashFx = 0.3;
        sfx.playNoise(0.18, 0.1, 1800);
      }
      s.dashHeld = !!dashPressed;
      s.dashFx = Math.max(0, (s.dashFx || 0) - dt);

      // physics
      s.vy += 1420 * dt;
      s.px += s.vx * dt;
      s.py += s.vy * dt;
      s.onGround = false;

      // platform collide
      for (const p of s.platforms) {
        if (p.kind === 'moving') p.x = p.baseX + Math.sin(s.time * 1.4 + p.phase) * p.range;
        const px = p.x;
        const halfW = 15;
        const prevBottom = s.py - s.vy * dt + 22;
        if (
          s.px + halfW > px &&
          s.px - halfW < px + p.w &&
          s.py + 20 >= p.y &&
          s.py + 20 <= p.y + 26 + Math.max(0, s.vy * dt) &&
          s.vy >= 0
        ) {
          if (p.kind === 'lava') {
            die();
            break;
          }
          s.py = p.y - 20;
          s.vy = p.kind === 'bounce' ? -720 : 0;
          if (p.kind === 'bounce') {
            sfx.powerup();
            for (let i = 0; i < 10; i++) {
              s.particles.push({
                x: s.px + rand(-12, 12),
                y: p.y,
                vx: rand(-90, 90),
                vy: rand(-120, -20),
                life: 0.45,
                c: '#22d3ee',
              });
            }
          }
          s.onGround = p.kind !== 'bounce';
          if (p.kind !== 'bounce') s.jumps = 0;
          s.squash = 0.18;
          if (Math.abs(s.vy) > 0) sfx.playTone(150, 0.06, 'triangle', 0.06, 90);
        }
      }
      s.squash = Math.max(0, s.squash - dt);

      // checkpoint flags
      for (const f of s.flags) {
        if (!f.taken && Math.abs(s.px - f.x) < 34 && Math.abs(s.py - f.y - 30) < 70) {
          f.taken = true;
          s.checkpoint = { x: f.x - 20, y: f.y - 40 };
          sfx.coin();
          setStats((v) => ({ ...v, checkpoints: v.checkpoints + 1 }));
          for (let i = 0; i < 16; i++) {
            s.particles.push({ x: f.x, y: f.y, vx: rand(-70, 70), vy: rand(-180, -40), life: 0.8, c: '#34d399' });
          }
        }
      }

      // fall death
      if (s.py > 640) die();

      // goal
      const distGoal = Math.hypot(s.px - s.goal.x, s.py - s.goal.y);
      if (distGoal < 60 && !s.won) {
        s.won = true;
        setStatus('won');
        setBest((b) => (b === null || s.runTime < b ? s.runTime : b));
        sfx.powerup();
        for (let i = 0; i < 70; i++) {
          s.particles.push({
            x: s.goal.x,
            y: s.goal.y,
            vx: rand(-260, 260),
            vy: rand(-320, 60),
            life: rand(0.6, 1.4),
            c: ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#38bdf8'][Math.floor(Math.random() * 5)],
          });
        }
      }

      // camera
      const target = clamp(s.px - 300, 0, 4200);
      s.camX += (target - s.camX) * Math.min(1, dt * 6);

      // stage calc
      const stage = clamp(1 + Math.floor(s.px / 1400), 1, 3);
      if (stage !== stats.stage) setStats((v) => ({ ...v, stage }));

      s.shake = Math.max(0, s.shake - dt);
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 480 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
    }

    // ---------------- render ----------------
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#38bdf8');
    sky.addColorStop(0.45, '#7dd3fc');
    sky.addColorStop(0.75, '#fde68a');
    sky.addColorStop(1, '#fca5a5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // clouds
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 230 - s.camX * 0.18) % (W + 400)) - 200;
      const cy = 70 + ((i * 71) % 220);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 80, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 60, cy + 8, 55, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 55, cy + 12, 48, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // distant floating islands
    for (let i = 0; i < 5; i++) {
      const ix = ((i * 420 - s.camX * 0.32) % 2400) - 300;
      const iy = 300 + ((i * 53) % 120);
      ctx.fillStyle = 'rgba(99,102,241,0.18)';
      ctx.beginPath();
      ctx.ellipse(ix, iy + 80, 150, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    const sh = s.shake > 0 ? s.shake * 12 : 0;
    ctx.translate(-s.camX + rand(-sh, sh), rand(-sh, sh));

    // platforms
    for (const p of s.platforms) {
      if (p.x + p.w < s.camX - 100 || p.x > s.camX + W + 100) continue;
      ctx.save();
      if (p.kind === 'lava') {
        const lg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        lg.addColorStop(0, '#f97316');
        lg.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lg;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(253,224,71,0.85)';
        ctx.lineWidth = 2;
        for (let i = 0; i < p.w; i += 14) {
          ctx.beginPath();
          ctx.moveTo(p.x + i, p.y + 3);
          ctx.lineTo(p.x + i + 7, p.y + 9);
          ctx.lineTo(p.x + i + 14, p.y + 3);
          ctx.stroke();
        }
      } else if (p.kind === 'bounce') {
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(p.x, p.y, p.w, 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        for (let i = 8; i < p.w - 8; i += 22) {
          ctx.beginPath();
          ctx.moveTo(p.x + i, p.y + 4);
          ctx.lineTo(p.x + i + 8, p.y + 4);
          ctx.stroke();
        }
      } else if (p.kind === 'moving') {
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#c4b5fd';
        ctx.fillRect(p.x, p.y, p.w, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⟷', p.x + p.w / 2, p.y + 17);
      } else {
        const pg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        pg.addColorStop(0, '#475569');
        pg.addColorStop(1, '#1e293b');
        ctx.fillStyle = pg;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(p.x, p.y, p.w, 5);
      }
      // grassy top for non hazard
      if (p.kind === 'normal' || p.kind === 'moving') {
        ctx.fillStyle = p.kind === 'moving' ? 'rgba(196,181,253,0.5)' : 'rgba(74,222,128,0.35)';
        ctx.fillRect(p.x, p.y - 3, p.w, 3);
      }
      ctx.restore();
    }

    // flags
    for (const f of s.flags) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y + 56);
      ctx.lineTo(f.x, f.y - 34);
      ctx.stroke();
      ctx.fillStyle = f.taken ? '#34d399' : '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 34);
      ctx.lineTo(f.x + 30, f.y - 22);
      ctx.lineTo(f.x, f.y - 8);
      ctx.closePath();
      ctx.fill();
      if (!f.taken) {
        ctx.fillStyle = 'rgba(52,211,153,0.85)';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CHECKPOINT', f.x + 6, f.y + 70);
      }
    }

    // goal crown
    const gy = Math.sin(s.time * 3) * 6;
    ctx.font = '34px serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑', s.goal.x, s.goal.y + gy);

    // particles
    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.8, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // player
    const sq = s.squash;
    ctx.save();
    ctx.translate(s.px, s.py);
    if (s.dashFx && s.dashFx > 0) {
      ctx.fillStyle = `rgba(129,230,255,${s.dashFx * 1.4})`;
      ctx.beginPath();
      ctx.ellipse(-s.facing * 22, 0, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // legs
    ctx.fillStyle = '#1f2937';
    const legSwing = s.onGround ? Math.sin(s.time * 16) * 4 : -3;
    ctx.fillRect(-8, 8, 6, 12 + legSwing);
    ctx.fillRect(3, 8, 6, 12 - legSwing);
    // body
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(-11, -12 - sq * 4, 22, 24 - sq * 6, 6);
    ctx.fill();
    // hood
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(0, -10, 11, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // head
    ctx.fillStyle = '#f5c99b';
    ctx.beginPath();
    ctx.arc(s.facing * 2, -22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b2415';
    ctx.beginPath();
    ctx.arc(s.facing * 2, -25, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(s.facing * 6, -21, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // progress bar
    const prog = clamp(s.px / (s.goal.x + 100), 0, 1);
    ctx.fillStyle = 'rgba(8,12,24,0.45)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 170, 16, 340, 10, 5);
    ctx.fill();
    const pg = ctx.createLinearGradient(W / 2 - 170, 0, W / 2 + 170, 0);
    pg.addColorStop(0, '#22d3ee');
    pg.addColorStop(1, '#a855f7');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 170, 16, 340 * prog, 10, 5);
    ctx.fill();
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText(prog > 0.97 ? '🏆' : '🏃', W / 2 - 170 + 340 * prog, 14);

    ctx.fillStyle = 'rgba(8,12,24,0.5)';
    ctx.beginPath();
    ctx.roundRect(14, 14, 132, 52, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.runTime.toFixed(1)}s`, 26, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(`DEATHS ${s.deaths} · STAGE ${stats.stage}/3`, 26, 56);
  }, true);

  const s = g.current;

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky-500">
      <canvas ref={canvasRef} className="h-full w-full" />
      {started && status === 'run' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur">
          <span>← → Run</span>
          <span className="text-white/30">|</span>
          <span>Space Double Jump</span>
          <span className="text-white/30">|</span>
          <span>Shift Dash</span>
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-sky-900/60 via-indigo-900/50 to-slate-950/80 p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
              ☁️ Obby Platformer
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">SkyBlox Parkour</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-200">
              Hop across floating islands, dodge lava, bounce off cyan pads and grab the crown. Don't look down!
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-blue-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Start Parkour
            </button>
            <div className="mt-4 flex justify-center gap-2 text-[10px] text-slate-300">
              <span className="rounded-md bg-white/10 px-2 py-1">← → Move</span>
              <span className="rounded-md bg-white/10 px-2 py-1">Space Jump ×2</span>
              <span className="rounded-md bg-white/10 px-2 py-1">Shift Dash</span>
            </div>
          </div>
        </div>
      )}

      {status === 'won' && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/80 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-5xl">👑</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Course Conquered!</h3>
            <p className="mt-1 text-xs text-slate-300">
              Time <b className="text-cyan-300">{s.runTime.toFixed(2)}s</b> · {s.deaths} falls ·{' '}
              {stats.checkpoints} checkpoints
            </p>
            {best !== null && (
              <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300">
                <Trophy size={12} /> Best: {best.toFixed(2)}s
              </p>
            )}
            <button
              onClick={() => {
                reset();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Run Again
            </button>
          </div>
        </div>
      )}

      {started && (
        <button
          onClick={reset}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur hover:bg-black/50"
        >
          <Flag size={12} /> Restart
        </button>
      )}
    </div>
  );
}
