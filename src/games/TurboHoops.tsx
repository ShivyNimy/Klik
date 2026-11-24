import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Flame, Timer, Trophy } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI } from './engine';

const W = 960;
const H = 540;
const GRAV = 1150;

export default function TurboHoops() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const drag = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const g = useRef({
    bx: 180,
    by: 440,
    vx: 0,
    vy: 0,
    flying: false,
    scored: false,
    rimPass: false,
    score: 0,
    streak: 0,
    best: 0,
    time: 60,
    hoop: { x: 780, y: 300, r: 40 },
    moving: 0,
    resetTimer: 0,
    swish: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    trail: [] as { x: number; y: number }[],
    t: 0,
    msg: '',
    msgLife: 0,
    fire: 0,
  });

  const reset = useCallback(() => {
    const s = g.current;
    s.bx = 180;
    s.by = 440;
    s.vx = 0;
    s.vy = 0;
    s.flying = false;
    s.scored = false;
    s.rimPass = false;
    s.score = 0;
    s.streak = 0;
    s.time = 60;
    s.resetTimer = 0;
    s.particles = [];
    s.trail = [];
    s.msg = '';
    s.msgLife = 0;
    s.fire = 0;
    s.moving = 0;
    drag.current = { active: false, x: 0, y: 0 };
    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setOver(false);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const point = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const shoot = () => {
    const s = g.current;
    const dx = s.bx - drag.current.x;
    const dy = s.by - drag.current.y;
    const power = Math.min(1250, Math.hypot(dx, dy) * 5.2);
    if (power < 120) return;
    const a = Math.atan2(dy, dx);
    s.vx = Math.cos(a) * power;
    s.vy = Math.sin(a) * power;
    s.flying = true;
    s.scored = false;
    s.rimPass = false;
    s.trail = [];
    sfx.playTone(300, 0.12, 'triangle', 0.12, 620);
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !over) {
      s.t += dt;
      s.time -= dt;
      const tl = Math.max(0, Math.ceil(s.time));
      setTimeLeft((v) => (v === tl ? v : tl));
      if (s.time <= 0) {
        setOver(true);
        s.best = Math.max(s.best, s.score);
        setBest(s.best);
        sfx.gameOver();
      }
      s.msgLife = Math.max(0, s.msgLife - dt);
      s.swish = Math.max(0, s.swish - dt);
      s.fire = Math.max(0, s.fire - dt);

      // hoop wiggles
      s.moving = Math.sin(s.t * 0.7) * 26;

      if (s.flying) {
        s.vy += GRAV * dt;
        s.bx += s.vx * dt;
        s.by += s.vy * dt;
        s.trail.push({ x: s.bx, y: s.by });
        if (s.trail.length > 18) s.trail.shift();

        const hx = s.hoop.x;
        const hy = s.hoop.y + s.moving;
        const leftRim = { x: hx - s.hoop.r, y: hy };
        const rightRim = { x: hx + s.hoop.r, y: hy };

        // scoring: ball center crosses rim line downward within rim span
        if (!s.scored && s.vy > 0 && s.by > hy && s.by < hy + 22 && s.bx > leftRim.x + 6 && s.bx < rightRim.x - 6) {
          s.scored = true;
          s.streak += 1;
          const cleanSwish = Math.abs(s.bx - hx) < 16;
          const distBonus = Math.round(Math.hypot(s.bx - 180, 430) / 6);
          const pts = 2 + (cleanSwish ? 1 : 0) + (s.streak > 1 ? s.streak : 0) + Math.round(distBonus / 10);
          s.score += pts;
          setScore(s.score);
          setStreak(s.streak);
          if (s.streak >= 3) s.fire = 1;
          s.msg = cleanSwish ? `SWISH! +${pts}` : `BUCKET! +${pts}`;
          s.msgLife = 1.4;
          s.swish = 0.6;
          sfx.coin();
          for (let i = 0; i < 26; i++) {
            s.particles.push({
              x: hx,
              y: hy,
              vx: rand(-220, 220),
              vy: rand(-260, 60),
              life: rand(0.3, 0.9),
              c: ['#fbbf24', '#f97316', '#f43f5e', '#a3e635'][Math.floor(Math.random() * 4)],
            });
          }
        }

        // rim collisions
        for (const rim of [leftRim, rightRim]) {
          const d = Math.hypot(s.bx - rim.x, s.by - rim.y);
          if (d < 16) {
            const nx = (s.bx - rim.x) / (d || 1);
            const ny = (s.by - rim.y) / (d || 1);
            const dot = s.vx * nx + s.vy * ny;
            s.vx = (s.vx - 2 * dot * nx) * 0.62;
            s.vy = (s.vy - 2 * dot * ny) * 0.62;
            s.bx = rim.x + nx * 16;
            s.by = rim.y + ny * 16;
            sfx.playTone(820, 0.05, 'square', 0.05, 600);
          }
        }

        // backboard
        if (s.bx > hx + 62 && s.bx < hx + 74 && s.by > hy - 120 && s.by < hy + 30) {
          s.bx = hx + 62;
          s.vx = -Math.abs(s.vx) * 0.55;
          sfx.playTone(240, 0.06, 'triangle', 0.06, 160);
        }

        // ground / walls
        if (s.by > H - 40) {
          s.by = H - 40;
          s.vy *= -0.62;
          s.vx *= 0.9;
          if (Math.abs(s.vy) < 60) {
            s.resetTimer += 0.15;
          }
          sfx.playNoise(0.05, 0.05, 400);
        }
        if (s.bx < 24) {
          s.bx = 24;
          s.vx = Math.abs(s.vx) * 0.6;
        }
        if (s.bx > W - 24) {
          s.bx = W - 24;
          s.vx = -Math.abs(s.vx) * 0.6;
        }

        s.resetTimer += dt;
        if (s.resetTimer > 1.8) {
          s.flying = false;
          s.resetTimer = 0;
          s.bx = 180;
          s.by = 440;
          s.vx = 0;
          s.vy = 0;
          s.trail = [];
          if (!s.scored) {
            s.streak = 0;
            setStreak(0);
            s.msg = 'MISS';
            s.msgLife = 0.8;
          }
        }
      }

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 700 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
    }

    // ---------------- RENDER ----------------
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1035');
    sky.addColorStop(0.5, '#3b1250');
    sky.addColorStop(1, '#0d0a1f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // city glow
    ctx.fillStyle = 'rgba(244,114,182,0.12)';
    for (let i = 0; i < 14; i++) {
      const bx = i * 76;
      const bh = 60 + ((i * 71) % 150);
      ctx.fillRect(bx, H - 120 - bh, 58, bh + 120);
    }

    // court floor
    const floorY = H - 120;
    const fl = ctx.createLinearGradient(0, floorY, 0, H);
    fl.addColorStop(0, '#3f1d5c');
    fl.addColorStop(1, '#1a0b2b');
    ctx.fillStyle = fl;
    ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = 'rgba(250,204,21,0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 180 - 90, H);
      ctx.lineTo(i * 180 + 90, floorY);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(250,204,21,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    const hx = s.hoop.x;
    const hy = s.hoop.y + s.moving;

    // pole
    ctx.fillStyle = '#334155';
    ctx.fillRect(hx + 66, hy - 150, 12, 330);
    ctx.fillStyle = '#475569';
    ctx.fillRect(hx + 60, H - 130, 24, 20);

    // backboard
    ctx.fillStyle = 'rgba(226,232,240,0.14)';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(hx + 52, hy - 120, 16, 150, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(hx + 54, hy - 60, 12, 62);
    ctx.stroke();

    // net
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      ctx.beginPath();
      ctx.moveTo(hx - s.hoop.r + t * s.hoop.r * 2, hy);
      ctx.lineTo(hx - s.hoop.r * 0.55 + t * s.hoop.r * 1.1, hy + 52);
      ctx.stroke();
    }
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx - s.hoop.r + i * 2, hy + i * 17);
      ctx.quadraticCurveTo(hx, hy + i * 17 + 8, hx + s.hoop.r - i * 2, hy + i * 17);
      ctx.stroke();
    }

    // rim
    ctx.strokeStyle = s.fire > 0 ? '#fbbf24' : '#f97316';
    ctx.lineWidth = 8;
    ctx.shadowColor = s.fire > 0 ? '#fbbf24' : '#f97316';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(hx, hy, s.hoop.r, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ball trail
    for (let i = 0; i < s.trail.length; i++) {
      const p = s.trail[i];
      ctx.globalAlpha = (i / s.trail.length) * 0.35;
      ctx.fillStyle = s.fire > 0 ? '#fb923c' : '#f97316';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // aim guide
    if (drag.current.active && !s.flying) {
      const power = Math.min(1250, Math.hypot(s.bx - drag.current.x, s.by - drag.current.y) * 5.2);
      const a = Math.atan2(s.by - drag.current.y, s.bx - drag.current.x);
      let px = s.bx;
      let py = s.by;
      let vx = Math.cos(a) * power;
      let vy = Math.sin(a) * power;
      for (let i = 0; i < 26; i++) {
        vy += GRAV * 0.03;
        px += vx * 0.03;
        py += vy * 0.03;
        if (py > H - 40) break;
        ctx.globalAlpha = 0.55 - i * 0.018;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(px, py, 4 - i * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // drag line
      ctx.strokeStyle = 'rgba(253,230,138,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(s.bx, s.by);
      ctx.lineTo(drag.current.x, drag.current.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ball
    const ballR = 22;
    if (s.fire > 0) {
      const g2 = ctx.createRadialGradient(s.bx, s.by, 4, s.bx, s.by, ballR + 18);
      g2.addColorStop(0, `rgba(251,146,60,${0.55 * s.fire})`);
      g2.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(s.bx, s.by, ballR + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    const bg = ctx.createRadialGradient(s.bx - 6, s.by - 8, 3, s.bx, s.by, ballR);
    bg.addColorStop(0, s.fire > 0 ? '#fdba74' : '#fb923c');
    bg.addColorStop(1, s.fire > 0 ? '#c2410c' : '#9a3412');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(s.bx, s.by, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.bx, s.by, ballR, 0, Math.PI * 2);
    ctx.moveTo(s.bx - ballR, s.by);
    ctx.lineTo(s.bx + ballR, s.by);
    ctx.moveTo(s.bx, s.by - ballR);
    ctx.lineTo(s.bx, s.by + ballR);
    ctx.stroke();

    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.9, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = 'rgba(10,6,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(20, 18, 180, 58, 14);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 36, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`${s.score}`, 36, 66);

    ctx.fillStyle = 'rgba(10,6,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(W - 200, 18, 180, 58, 14);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('SHOT CLOCK', W - 184, 40);
    ctx.fillStyle = s.time < 10 ? '#f87171' : '#fff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`${Math.max(0, Math.ceil(s.time))}s`, W - 184, 66);

    if (s.streak > 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText(`🔥 ${s.streak} STREAK`, W / 2, 60);
    }

    if (s.msgLife > 0) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = clamp(s.msgLife, 0, 1);
      ctx.fillStyle = s.msg.startsWith('SWISH') ? '#fbbf24' : s.msg === 'MISS' ? '#94a3b8' : '#a3e635';
      ctx.font = 'bold 34px Inter, sans-serif';
      ctx.fillText(s.msg, W / 2, 150);
      ctx.globalAlpha = 1;
    }
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1a1035]">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          if (!started || over) return;
          if (g.current.flying) return;
          const p = point(e);
          if (Math.hypot(p.x - g.current.bx, p.y - g.current.by) > 130) return;
          drag.current = { active: true, x: p.x, y: p.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current.active) return;
          const p = point(e);
          drag.current.x = p.x;
          drag.current.y = p.y;
        }}
        onPointerUp={() => {
          if (drag.current.active) {
            shoot();
            drag.current.active = false;
          }
        }}
        onPointerLeave={() => {
          if (drag.current.active) {
            shoot();
            drag.current.active = false;
          }
        }}
      />

      {started && !over && (
        <>
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-slate-200 backdrop-blur">
            Drag from the ball and release to shoot
          </div>
          <div className="pointer-events-none absolute left-3 top-24 flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-bold text-orange-300 backdrop-blur">
            <Flame size={11} /> {streak > 0 ? `${streak} in a row` : 'Start a streak'}
          </div>
        </>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-orange-950/85 via-purple-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
              🏀 Arcade Sports
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Turbo Street Hoops</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              60 seconds on the neon rooftop court. Drag to aim, release to shoot, and chain swishes to ignite the
              ball for bonus points.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-rose-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Tip Off
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Timer size={10} /> 60s on the clock
            </p>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🏀</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Buzzer Beater!</h3>
            <p className="mt-1 text-xs text-slate-300">
              Final score <b className="text-amber-300">{score}</b>
            </p>
            {best > 0 && (
              <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
                <Trophy size={12} className="text-amber-400" /> Best {best}
              </p>
            )}
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
