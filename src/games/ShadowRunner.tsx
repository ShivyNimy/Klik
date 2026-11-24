import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Heart, Trophy, Swords } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;

interface Plat {
  x: number;
  y: number;
  w: number;
}
interface Drone {
  x: number;
  y: number;
  hp: number;
  phase: number;
  dead: boolean;
}

export default function ShadowRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState({ dist: 0, hp: 3, score: 0, kills: 0, best: 0 });

  const g = useRef({
    px: 0,
    py: 380,
    vy: 0,
    onGround: true,
    jumps: 0,
    jumpHeld: false,
    slashHeld: false,
    slashTimer: 0,
    slashCd: 0,
    plats: [] as Plat[],
    drones: [] as Drone[],
    cam: 0,
    speed: 300,
    hp: 3,
    kills: 0,
    score: 0,
    dist: 0,
    t: 0,
    best: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    shake: 0,
    inv: 0,
    moon: 0,
  });

  const buildWorld = useCallback(() => {
    const s = g.current;
    s.plats = [{ x: 0, y: 430, w: 460 }];
    s.drones = [];
    s.px = 120;
    s.py = 380;
    s.vy = 0;
    s.onGround = true;
    s.jumps = 0;
    s.cam = 0;
    s.speed = 300;
    s.hp = 3;
    s.kills = 0;
    s.score = 0;
    s.dist = 0;
    s.t = 0;
    s.particles = [];
    s.shake = 0;
    s.inv = 0;
    setOver(false);
    setHud({ dist: 0, hp: 3, score: 0, kills: 0, best: s.best });
  }, []);

  useEffect(() => {
    if (started) buildWorld();
  }, [started, buildWorld]);

  useHiDPI(canvasRef, W, H);

  const extend = () => {
    const s = g.current;
    const last = s.plats[s.plats.length - 1];
    while (last.x + last.w < s.px + 1600) {
      const gap = rand(70, 150);
      const w = rand(130, 320);
      const y = clamp(last.y + rand(-60, 70), 250, 460);
      const next = { x: last.x + last.w + gap, y, w };
      s.plats.push(next);
      if (Math.random() < 0.5) {
        s.drones.push({
          x: next.x + rand(60, w - 30),
          y: y - rand(90, 190),
          hp: 1,
          phase: rand(0, 6),
          dead: false,
        });
      }
      return extend();
    }
    s.plats = s.plats.filter((p) => p.x + p.w > s.px - 900);
  };

  const slash = useCallback(() => {
    const s = g.current;
    if (s.slashCd > 0) return;
    s.slashCd = 0.32;
    s.slashTimer = 0.24;
    sfx.playTone(880, 0.1, 'sawtooth', 0.07, 300);
    for (const d of s.drones) {
      if (d.dead) continue;
      if (Math.hypot(d.x - s.px, d.y - (s.py - 10)) < 110) {
        d.dead = true;
        s.kills += 1;
        s.score += 120;
        sfx.hit();
        for (let i = 0; i < 14; i++) {
          s.particles.push({
            x: d.x,
            y: d.y,
            vx: rand(-220, 220),
            vy: rand(-220, 120),
            life: rand(0.2, 0.6),
            c: ['#f43f5e', '#22d3ee', '#fbbf24'][Math.floor(Math.random() * 3)],
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (['x', 'j', 'enter'].includes(e.key.toLowerCase())) slash();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slash, started]);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !over) {
      s.t += dt;
      s.speed = 300 + Math.min(280, s.t * 6);
      s.px += s.speed * dt;
      s.dist += s.speed * dt * 0.05;
      s.score += s.speed * dt * 0.06;
      s.cam = s.px - 260;
      s.moon = s.cam * 0.08;

      const k = keys.current;
      const jump = k['w'] || k['arrowup'] || k[' '] || k[' '];
      if (jump && !s.jumpHeld) {
        if (s.onGround) {
          s.vy = -640;
          s.jumps = 1;
          s.onGround = false;
          sfx.jump();
        } else if (s.jumps < 2) {
          s.vy = -560;
          s.jumps = 2;
          sfx.playTone(620, 0.1, 'sine', 0.09, 900);
        }
      }
      s.jumpHeld = !!jump;

      const sl = k['x'] || k['enter'];
      if (sl && !s.slashHeld) slash();
      s.slashHeld = !!sl;
      s.slashTimer = Math.max(0, s.slashTimer - dt);
      s.slashCd = Math.max(0, s.slashCd - dt);
      s.inv = Math.max(0, s.inv - dt);
      s.shake = Math.max(0, s.shake - dt);

      s.vy += 1750 * dt;
      s.py += s.vy * dt;

      // platform collision (world x = px)
      s.onGround = false;
      for (const p of s.plats) {
        if (s.px + 14 > p.x && s.px - 14 < p.x + p.w) {
          if (s.py + 24 >= p.y && s.py + 24 <= p.y + 34 && s.vy >= 0) {
            s.py = p.y - 24;
            s.vy = 0;
            s.onGround = true;
            s.jumps = 0;
          }
        }
      }

      if (s.py > H + 80) {
        s.hp -= 1;
        s.inv = 1.2;
        s.shake = 0.5;
        sfx.hit();
        // return to nearest platform
        const near = s.plats.find((p) => p.x + p.w > s.px - 100) ?? s.plats[0];
        s.px = Math.max(near.x + 40, s.px);
        s.py = near.y - 24;
        s.vy = 0;
        if (s.hp <= 0) {
          s.best = Math.max(s.best, Math.floor(s.score));
          setHud({ dist: Math.floor(s.dist), hp: 0, score: Math.floor(s.score), kills: s.kills, best: s.best });
          setOver(true);
          sfx.gameOver();
        }
      }

      // drones
      for (const d of s.drones) {
        if (d.dead) continue;
        d.x -= 70 * dt;
        d.phase += dt * 3;
        const dx = d.x - s.px;
        const dy = d.y - (s.py - 8);
        if (Math.hypot(dx, dy) < 40 && s.inv <= 0) {
          d.dead = true;
          s.hp -= 1;
          s.inv = 1.1;
          s.shake = 0.35;
          sfx.hit();
          if (s.hp <= 0) {
            s.best = Math.max(s.best, Math.floor(s.score));
            setHud({ dist: Math.floor(s.dist), hp: 0, score: Math.floor(s.score), kills: s.kills, best: s.best });
            setOver(true);
            sfx.gameOver();
          }
        }
      }
      s.drones = s.drones.filter((d) => !d.dead && d.x > s.cam - 300);

      extend();

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 800 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      if (Math.floor(s.t * 8) % 2 === 0)
        setHud({
          dist: Math.floor(s.dist),
          hp: Math.max(0, s.hp),
          score: Math.floor(s.score),
          kills: s.kills,
          best: s.best,
        });
    }

    // ---------------- RENDER ----------------
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a0418');
    sky.addColorStop(0.55, '#25063b');
    sky.addColorStop(1, '#07060f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // blood moon
    const mx = W - 180 - (s.moon % 120);
    ctx.fillStyle = 'rgba(220,38,38,0.16)';
    ctx.beginPath();
    ctx.arc(mx, 110, 150, 0, Math.PI * 2);
    ctx.fill();
    const mg = ctx.createRadialGradient(mx - 20, 90, 10, mx, 110, 80);
    mg.addColorStop(0, '#fca5a5');
    mg.addColorStop(0.6, '#dc2626');
    mg.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, 110, 80, 0, Math.PI * 2);
    ctx.fill();

    // far skyline
    for (let i = 0; i < 26; i++) {
      const bx = ((i * 180 - s.cam * 0.16) % 2400) - 400;
      const bh = 90 + ((i * 57) % 170);
      ctx.fillStyle = '#0d0719';
      ctx.fillRect(bx, H - bh, 120, bh);
      ctx.fillStyle = i % 4 === 0 ? 'rgba(34,211,238,0.35)' : 'rgba(244,63,94,0.22)';
      for (let wy = H - bh + 14; wy < H - 20; wy += 22) {
        for (let wx = bx + 10; wx < bx + 110; wx += 22) {
          if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }

    ctx.save();
    ctx.translate(-s.cam + rand(-3, 3) * (s.shake > 0 ? 3 : 0), 0);

    // platforms (rooftops)
    for (const p of s.plats) {
      if (p.x + p.w < s.cam - 100 || p.x > s.cam + W + 200) continue;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.x, p.y, p.w, 200);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.w, 10);
      ctx.fillStyle = 'rgba(34,211,238,0.9)';
      ctx.fillRect(p.x, p.y, p.w, 3);
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 14;
      ctx.fillRect(p.x, p.y, p.w, 2);
      ctx.shadowBlur = 0;
      // windows
      ctx.fillStyle = 'rgba(56,189,248,0.1)';
      for (let wx = p.x + 14; wx < p.x + p.w - 14; wx += 34) {
        for (let wy = p.y + 30; wy < H - 40; wy += 46) {
          ctx.fillRect(wx, wy, 18, 22);
        }
      }
      // AC units
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.fillRect(p.x + p.w - 40, p.y - 16, 26, 16);
    }

    // drones
    for (const d of s.drones) {
      if (d.x < s.cam - 100 || d.x > s.cam + W + 100) continue;
      const dy = Math.sin(d.phase) * 6;
      ctx.save();
      ctx.translate(d.x, d.y + dy);
      ctx.fillStyle = 'rgba(244,63,94,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(6, -1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(226,232,240,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-20, -13);
      ctx.moveTo(12, -8);
      ctx.lineTo(20, -13);
      ctx.stroke();
      ctx.restore();
    }

    // particles
    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.6, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // player ninja
    ctx.save();
    ctx.translate(s.px, s.py);
    if (s.inv > 0) ctx.globalAlpha = 0.45 + Math.sin(s.t * 30) * 0.3;
    // scarf
    ctx.fillStyle = '#f43f5e';
    const scarf = Math.sin(s.t * 8) * 8;
    ctx.beginPath();
    ctx.moveTo(-6, -20);
    ctx.quadraticCurveTo(-42, -16 + scarf, -66, -6 + scarf);
    ctx.lineTo(-60, 4 + scarf);
    ctx.quadraticCurveTo(-34, -4 + scarf, -6, -10);
    ctx.closePath();
    ctx.fill();
    // legs
    ctx.fillStyle = '#0f172a';
    const legPhase = s.onGround ? Math.sin(s.t * 20) * 8 : 4;
    ctx.save();
    ctx.translate(-4, 8);
    ctx.rotate(legPhase * 0.04);
    ctx.fillRect(-4, 0, 8, 18);
    ctx.restore();
    ctx.save();
    ctx.translate(6, 8);
    ctx.rotate(-legPhase * 0.04);
    ctx.fillRect(-4, 0, 8, 18);
    ctx.restore();
    // body
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(-11, -18, 22, 28, 8);
    ctx.fill();
    // head
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(0, -26, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 12;
    ctx.fillRect(-4, -29, 16, 4);
    ctx.shadowBlur = 0;
    // katana
    ctx.save();
    ctx.translate(6, -4);
    const ang = s.slashTimer > 0 ? -1.2 + (1 - s.slashTimer / 0.24) * 2.2 : -0.6;
    ctx.rotate(ang);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(52, 0);
    ctx.stroke();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, -1.5);
    ctx.lineTo(52, -1.5);
    ctx.stroke();
    ctx.restore();
    if (s.slashTimer > 0) {
      ctx.strokeStyle = `rgba(34,211,238,${s.slashTimer * 3})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, -6, 72, -1.3, 1.1);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // HUD (screen space)
    ctx.fillStyle = 'rgba(8,4,18,0.72)';
    ctx.beginPath();
    ctx.roundRect(20, 18, 210, 56, 14);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DISTANCE', 34, 38);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(`${Math.floor(s.dist)} m`, 34, 62);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('INTEGRITY', W - 34, 38);
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('♥ '.repeat(Math.max(0, s.hp)).trim() || '—', W - 34, 62);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`SCORE ${Math.floor(s.score).toLocaleString()} · ${s.kills} DRONES SLICED`, W / 2, 34);
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07060f]">
      <canvas ref={canvasRef} className="h-full w-full" />

      {started && !over && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-slate-300 backdrop-blur">
          <span className="text-cyan-300">Space / W</span> Jump (×2)
          <span className="text-white/20">|</span>
          <span className="text-cyan-300">X / Click</span> Katana Slash
        </div>
      )}

      {started && !over && (
        <button
          onClick={() => slash()}
          className="absolute bottom-12 right-4 grid h-14 w-14 place-items-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 backdrop-blur active:scale-95 sm:hidden"
          aria-label="Slash"
        >
          <Swords size={20} />
        </button>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-rose-950/80 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-300">
              🌃 Endless Runner
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Shadow Katana Runner</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Sprint across neon Tokyo rooftops under a blood moon. Double-jump the skyscraper gaps and cut security
              drones out of the sky.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-teal-400 px-7 py-3 text-sm font-black text-white shadow-xl shadow-rose-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Draw the Katana
            </button>
            <div className="mt-3 flex justify-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Heart size={10} className="text-rose-400" /> 3 integrity
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={10} className="text-amber-400" /> Distance score
              </span>
            </div>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🥷</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Run Ended</h3>
            <p className="mt-1 text-xs text-slate-300">
              {hud.dist} m · {hud.kills} drones sliced · {hud.score.toLocaleString()} pts
            </p>
            <button
              onClick={buildWorld}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-teal-400 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Run Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
