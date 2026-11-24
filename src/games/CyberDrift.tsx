import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Zap, Gauge } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;
const F = 300;
const HORIZON = H * 0.46;
const EYE = 13;
const ROAD_HALF = 7;
const PLAYER_D = 15;

interface Traffic {
  d: number;
  x: number;
  color: string;
  speed: number;
  passed: boolean;
}

export default function CyberDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [hud, setHud] = useState({ score: 0, speed: 0, nitro: 100, combo: 0, best: 0 });

  const g = useRef({
    px: 0,
    pd: PLAYER_D,
    speed: 90,
    nitro: 100,
    nitroOn: false,
    traffic: [] as Traffic[],
    score: 0,
    combo: 0,
    comboTime: 0,
    t: 0,
    spawn: 1,
    shake: 0,
    flash: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    best: 0,
    targetX: null as number | null,
    crash: false,
    boostFx: 0,
  });

  const reset = useCallback(() => {
    const s = g.current;
    s.px = 0;
    s.speed = 90;
    s.nitro = 100;
    s.nitroOn = false;
    s.traffic = [];
    s.score = 0;
    s.combo = 0;
    s.comboTime = 0;
    s.t = 0;
    s.spawn = 0.8;
    s.shake = 0;
    s.flash = 0;
    s.particles = [];
    s.crash = false;
    s.targetX = null;
    s.boostFx = 0;
    setDead(false);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const crash = () => {
    const s = g.current;
    if (s.crash) return;
    s.crash = true;
    s.shake = 0.8;
    s.flash = 1;
    s.best = Math.max(s.best, Math.floor(s.score));
    sfx.hit();
    setDead(true);
    for (let i = 0; i < 40; i++) {
      s.particles.push({
        x: W / 2 + s.px * 20,
        y: 470,
        vx: rand(-320, 320),
        vy: rand(-360, -40),
        life: rand(0.3, 0.9),
        c: ['#fbbf24', '#f97316', '#f43f5e', '#e2e8f0'][Math.floor(Math.random() * 4)],
      });
    }
  };

  const project = (d: number, x: number) => {
    const scale = F / Math.max(1, d);
    return { x: W / 2 + x * scale, y: HORIZON + (EYE * F) / Math.max(1, d), scale };
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !dead) {
      s.t += dt;
      const k = keys.current;
      let dir = 0;
      if (k['a'] || k['arrowleft']) dir -= 1;
      if (k['d'] || k['arrowright']) dir += 1;
      if (s.targetX !== null) {
        const diff = s.targetX - s.px;
        dir = Math.abs(diff) > 0.15 ? Math.sign(diff) : 0;
      }
      const steer = 11 * dt * (1 - clamp(s.speed / 420, 0, 0.55));
      s.px = clamp(s.px + dir * steer * 3.4, -ROAD_HALF + 1, ROAD_HALF - 1);

      const boosting = (k['w'] || k['arrowup'] || k[' '] || k['space'] || k['shift']) && s.nitro > 1;
      s.nitroOn = boosting;
      if (boosting) {
        s.nitro = clamp(s.nitro - dt * 26, 0, 100);
        s.speed = clamp(s.speed + dt * 210, 90, 430);
        s.boostFx = 0.2;
      } else {
        s.nitro = clamp(s.nitro + dt * 7, 0, 100);
        s.speed = clamp(s.speed + dt * 14, 90, 300);
      }
      s.boostFx = Math.max(0, s.boostFx - dt);
      s.score += dt * s.speed * 0.35;
      s.shake = Math.max(0, s.shake - dt);
      s.flash = Math.max(0, s.flash - dt * 1.6);

      // traffic movement
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = clamp(0.95 - s.speed / 900, 0.28, 0.95) * rand(0.8, 1.3);
        const lane = [-4.6, 0, 4.6][Math.floor(Math.random() * 3)];
        s.traffic.push({
          d: 135,
          x: lane + rand(-0.5, 0.5),
          color: ['#f472b6', '#38bdf8', '#a78bfa', '#fb7185', '#fbbf24'][Math.floor(Math.random() * 5)],
          speed: rand(30, 70),
          passed: false,
        });
      }

      for (const tr of s.traffic) {
        tr.d -= (s.speed - tr.speed) * dt * 0.55;
        const dx = Math.abs(s.px - tr.x);
        if (!tr.passed && tr.d < PLAYER_D + 2) {
          tr.passed = true;
          if (dx > 2.6 && dx < 4.4) {
            s.combo += 1;
            s.comboTime = 2;
            s.score += 150 * s.combo;
            s.nitro = clamp(s.nitro + 10, 0, 100);
            sfx.coin();
          }
        }
        if (tr.d < PLAYER_D + 1.2 && tr.d > PLAYER_D - 3 && dx < 2.5) crash();
      }
      s.traffic = s.traffic.filter((t) => t.d > 2);
      s.comboTime = Math.max(0, s.comboTime - dt);
      if (s.comboTime === 0) s.combo = 0;

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 500 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      setHud({
        score: Math.floor(s.score),
        speed: Math.round(s.speed * 0.55),
        nitro: Math.round(s.nitro),
        combo: s.combo,
        best: s.best,
      });
    }

    // ------------- RENDER -------------
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, '#12042b');
    sky.addColorStop(0.5, '#3b0764');
    sky.addColorStop(0.85, '#9d174d');
    sky.addColorStop(1, '#f472b6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, HORIZON + 2);

    // sun
    const sunY = HORIZON - 46;
    const sunG = ctx.createLinearGradient(0, sunY - 90, 0, sunY + 40);
    sunG.addColorStop(0, '#fde68a');
    sunG.addColorStop(0.55, '#fb7185');
    sunG.addColorStop(1, '#a21caf');
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(W / 2, sunY, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(24,4,45,0.85)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(W / 2 - 95, sunY + 8 + i * 15, 190, 4 + i * 1.4);
    }

    // skyline mountains
    ctx.fillStyle = '#1b0b32';
    ctx.beginPath();
    ctx.moveTo(0, HORIZON);
    for (let i = 0; i <= 12; i++) {
      const bx = (i / 12) * W;
      const bh = 30 + Math.abs(Math.sin(i * 2.3)) * 66;
      ctx.lineTo(bx, HORIZON - bh);
    }
    ctx.lineTo(W, HORIZON);
    ctx.closePath();
    ctx.fill();

    // neon city blocks
    for (let i = 0; i < 26; i++) {
      const bx = (i * 97) % W;
      const bw = 22 + ((i * 37) % 26);
      const bh = 18 + ((i * 53) % 60);
      ctx.fillStyle = 'rgba(15,6,30,0.9)';
      ctx.fillRect(bx, HORIZON - bh, bw, bh);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(56,189,248,0.55)' : i % 3 === 1 ? 'rgba(244,114,182,0.5)' : 'rgba(167,139,250,0.5)';
      for (let wy = HORIZON - bh + 5; wy < HORIZON - 4; wy += 9) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 2, 3);
        }
      }
    }

    // ground
    const grd = ctx.createLinearGradient(0, HORIZON, 0, H);
    grd.addColorStop(0, '#0b0418');
    grd.addColorStop(1, '#170727');
    ctx.fillStyle = grd;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);

    // road surface
    ctx.beginPath();
    ctx.moveTo(W / 2 - 2, HORIZON);
    ctx.lineTo(W / 2 + 2, HORIZON);
    const bl = project(PLAYER_D * 0.42, -ROAD_HALF);
    const br = project(PLAYER_D * 0.42, ROAD_HALF);
    ctx.lineTo(br.x + 340, H);
    ctx.lineTo(bl.x - 340, H);
    ctx.closePath();
    const roadG = ctx.createLinearGradient(0, HORIZON, 0, H);
    roadG.addColorStop(0, '#2a1035');
    roadG.addColorStop(1, '#12081f');
    ctx.fillStyle = roadG;
    ctx.fill();

    // horizontal grid lines (moving)
    for (let i = 0; i < 46; i++) {
      const d = 4 + ((i * 3.0 + (s.t * s.speed * 0.5) % 3) % 120);
      if (d < 6) continue;
      const p1 = project(d, -ROAD_HALF);
      const p2 = project(d, ROAD_HALF);
      ctx.strokeStyle = `rgba(168,85,247,${clamp(0.5 - d / 260, 0.05, 0.5)})`;
      ctx.lineWidth = Math.max(0.6, 60 / d);
      ctx.beginPath();
      ctx.moveTo(W / 2 - p1.scale * 40, p1.y);
      ctx.lineTo(W / 2 + p2.scale * 40, p2.y);
      ctx.stroke();
    }

    // lane dividers
    for (const laneX of [-2.33, 2.33]) {
      ctx.beginPath();
      for (let d = 6; d < 160; d += 4) {
        const p = project(d, laneX);
        if (d === 6) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([16, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // side neon rails
    for (const side of [-ROAD_HALF, ROAD_HALF]) {
      ctx.beginPath();
      for (let d = 5; d < 160; d += 3) {
        const p = project(d, side);
        if (d === 5) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const railG = ctx.createLinearGradient(0, HORIZON, 0, H);
      railG.addColorStop(0, 'rgba(34,211,238,0.1)');
      railG.addColorStop(1, 'rgba(34,211,238,0.9)');
      ctx.strokeStyle = railG;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // traffic cars far->near
    const sorted = [...s.traffic].sort((a, b) => b.d - a.d);
    for (const tr of sorted) {
      if (tr.d < 5) continue;
      const p = project(tr.d, tr.x);
      const scale = clamp(F / tr.d / 12, 0.24, 2.4);
      drawCar(ctx, p.x, p.y, scale, tr.color, true);
    }

    // player
    const shakeX = s.shake > 0 ? rand(-8, 8) * s.shake : 0;
    const pp = project(PLAYER_D, s.px);
    ctx.save();
    ctx.translate(pp.x + shakeX, pp.y + 6);
    // exhaust / nitro flames
    if (s.nitroOn) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(${i === 1 ? '56,189,248' : '244,114,182'},${0.5 - i * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(rand(-26, 26), 30 + rand(0, 16), 12, 26 + rand(0, 14), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawCar(ctx, 0, 0, 1.9, '#f8fafc', false);
    ctx.restore();

    // speed lines
    if (s.speed > 200 || s.nitroOn) {
      ctx.strokeStyle = `rgba(255,255,255,${clamp((s.speed - 200) / 500, 0, 0.5)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + s.t * 3;
        const r1 = 200 + ((s.t * 900 + i * 40) % 240);
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * 0.55);
        ctx.lineTo(W / 2 + Math.cos(a) * (r1 + 70), H / 2 + Math.sin(a) * (r1 + 40) * 0.55);
        ctx.stroke();
      }
    }

    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = 'rgba(8,4,18,0.6)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 210, 66, 14);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 30, 38);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`${Math.floor(s.score).toLocaleString()}`, 30, 62);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`${Math.round(s.speed * 0.55)} KM/H`, 212, 62);

    // nitro bar
    ctx.fillStyle = 'rgba(8,4,18,0.6)';
    ctx.beginPath();
    ctx.roundRect(W - 216, 16, 200, 30, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(W - 206, 28, 180, 8, 4);
    ctx.fill();
    const ng = ctx.createLinearGradient(W - 206, 0, W - 26, 0);
    ng.addColorStop(0, '#22d3ee');
    ng.addColorStop(1, '#f472b6');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.roundRect(W - 206, 28, 180 * (s.nitro / 100), 8, 4);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NITRO', W - 206, 25);

    if (s.combo > 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(16,185,129,0.95)';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText(`NEAR MISS ×${s.combo}`, W / 2, 108);
    }

    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, true);

  const onPointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * W;
    g.current.targetX = clamp((nx - W / 2) / 20, -ROAD_HALF + 1, ROAD_HALF - 1);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#12042b]">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          onPointer(e);
          if (!started) setStarted(true);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') onPointer(e);
        }}
      />

      {started && !dead && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur">
          <Gauge size={12} /> ← → Steer
          <span className="text-white/30">|</span>
          <Zap size={12} className="text-cyan-300" /> Hold W / Space = Nitro
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-purple-950/70 via-fuchsia-950/60 to-slate-950/85 p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
              🏎️ Synthwave Racer
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Cyber Drift GT</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Slip between neon traffic at 400 km/h. Squeeze past cars for near-miss combos and bank Nitro for
              overdrive.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-7 py-3 text-sm font-black text-black shadow-xl shadow-fuchsia-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-black" /> Ignite Engine
            </button>
            <p className="mt-3 text-[10px] text-slate-400">← → or drag to steer · Hold Space / W for Nitro</p>
          </div>
        </div>
      )}

      {dead && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">💥</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Wrecked!</h3>
            <p className="mt-1 text-xs text-slate-300">
              Score <b className="text-fuchsia-300">{hud.score.toLocaleString()}</b> · Best{' '}
              <b className="text-cyan-300">{hud.best.toLocaleString()}</b>
            </p>
            <button
              onClick={() => {
                sBestUpdate();
                reset();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2.5 text-sm font-black text-black shadow-lg"
            >
              <RotateCcw size={15} /> Race Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function sBestUpdate() {
  /* best is tracked in the game store; placeholder for future persistence */
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  isTraffic: boolean
) {
  const w = 52 * scale;
  const h = 30 * scale;
  ctx.save();
  ctx.translate(x, y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.42, w * 0.56, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.55, w, h * 1.05, 6 * scale);
  ctx.fill();
  // windshield
  ctx.fillStyle = 'rgba(10,16,32,0.85)';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 5 * scale, -h * 0.42, w - 10 * scale, h * 0.4, 4 * scale);
  ctx.fill();
  // rear lights
  ctx.fillStyle = isTraffic ? '#ef4444' : '#38bdf8';
  ctx.shadowColor = isTraffic ? '#ef4444' : '#38bdf8';
  ctx.shadowBlur = 10 * scale;
  ctx.fillRect(-w / 2 + 3 * scale, h * 0.18, w * 0.26, 4 * scale);
  ctx.fillRect(w / 2 - w * 0.29, h * 0.18, w * 0.26, 4 * scale);
  ctx.shadowBlur = 0;
  // spoiler
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  ctx.fillRect(-w / 2 - 2 * scale, -h * 0.72, w + 4 * scale, 4 * scale);
  // wheels
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w / 2 - 3 * scale, -h * 0.2, 5 * scale, h * 0.6);
  ctx.fillRect(w / 2 - 2 * scale, -h * 0.2, 5 * scale, h * 0.6);
  ctx.restore();
}
