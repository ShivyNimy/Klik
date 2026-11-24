import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Heart, Sparkles, Crosshair, Timer } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;

interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  r: number;
  hue: number;
  hit: number;
  boss?: boolean;
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  pierce: number;
  hitSet: Set<Enemy>;
}
interface Gem {
  x: number;
  y: number;
  v: number;
  big: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
  s: number;
}

type UpgradeId =
  | 'rate'
  | 'damage'
  | 'speed'
  | 'multishot'
  | 'orbs'
  | 'hp'
  | 'magnet'
  | 'pierce'
  | 'crit';

interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
}

const UPGRADES: Upgrade[] = [
  { id: 'rate', name: 'Overclocked Coils', desc: '+22% fire rate', icon: '⚡' },
  { id: 'damage', name: 'Plasma Overcharge', desc: '+30% projectile damage', icon: '💥' },
  { id: 'speed', name: 'Ion Thrusters', desc: '+12% movement speed', icon: '🚀' },
  { id: 'multishot', name: 'Split Barrels', desc: '+1 projectile per shot', icon: '🔱' },
  { id: 'orbs', name: 'Orbital Blades', desc: '+1 orbiting energy blade', icon: '🌀' },
  { id: 'hp', name: 'Nano Plating', desc: '+20 max integrity & heal 20', icon: '🛡️' },
  { id: 'magnet', name: 'Tractor Field', desc: '+40% XP pickup radius', icon: '🧲' },
  { id: 'pierce', name: 'Railgun Rounds', desc: 'Projectiles pierce +1 enemy', icon: '🎯' },
  { id: 'crit', name: 'Targeting AI', desc: '+12% critical chance (x3 dmg)', icon: '🔎' },
];

function createGameState() {
  return {
  px: 0,
  py: 0,
  hp: 100,
  maxHp: 100,
  speed: 215,
  fireRate: 1.6,
  damage: 12,
  bulletSpeed: 560,
  shots: 1,
  pierce: 0,
  crit: 0.05,
  orbs: 0,
  magnet: 90,
  level: 1,
  xp: 0,
  need: 8,
  time: 0,
  kills: 0,
  fireCd: 0,
  enemies: [] as Enemy[],
  bullets: [] as Bullet[],
  gems: [] as Gem[],
  particles: [] as Particle[],
  spawnCd: 0,
  orbsAngle: 0,
  orbCd: 0,
  shake: 0,
  dead: false,
  bossCd: 22,
  t: 0,
};
}

type AstroState = ReturnType<typeof createGameState>;

export default function AstroSurvivors() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [choices, setChoices] = useState<Upgrade[] | null>(null);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, need: 8, time: 0, kills: 0 });

  const paused = useRef(false);
  const g = useRef(createGameState());

  const reset = useCallback(() => {
    const s = g.current;
    Object.assign(s, {
      px: 0,
      py: 0,
      hp: 100,
      maxHp: 100,
      speed: 215,
      fireRate: 1.6,
      damage: 12,
      bulletSpeed: 560,
      shots: 1,
      pierce: 0,
      crit: 0.05,
      orbs: 0,
      magnet: 90,
      level: 1,
      xp: 0,
      need: 8,
      time: 0,
      kills: 0,
      fireCd: 0,
      enemies: [],
      bullets: [],
      gems: [],
      particles: [],
      spawnCd: 0,
      orbsAngle: 0,
      orbCd: 0,
      shake: 0,
      dead: false,
      bossCd: 22,
      t: 0,
    });
    paused.current = false;
    setChoices(null);
    setDead(false);
    setHud({ hp: 100, maxHp: 100, level: 1, xp: 0, need: 8, time: 0, kills: 0 });
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const applyUpgrade = (u: Upgrade) => {
    const s = g.current;
    switch (u.id) {
      case 'rate':
        s.fireRate *= 1.22;
        break;
      case 'damage':
        s.damage *= 1.3;
        break;
      case 'speed':
        s.speed *= 1.12;
        break;
      case 'multishot':
        s.shots += 1;
        break;
      case 'orbs':
        s.orbs += 1;
        break;
      case 'hp':
        s.maxHp += 20;
        s.hp = clamp(s.hp + 20, 0, s.maxHp);
        break;
      case 'magnet':
        s.magnet *= 1.4;
        break;
      case 'pierce':
        s.pierce += 1;
        break;
      case 'crit':
        s.crit += 0.12;
        break;
    }
    paused.current = false;
    setChoices(null);
    sfx.powerup();
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !dead && !paused.current) {
      s.t += dt;
      s.time += dt;
      const k = keys.current;
      let ix = 0;
      let iy = 0;
      if (k['a'] || k['arrowleft']) ix -= 1;
      if (k['d'] || k['arrowright']) ix += 1;
      if (k['w'] || k['arrowup']) iy -= 1;
      if (k['s'] || k['arrowdown']) iy += 1;
      if (ix && iy) {
        ix *= 0.707;
        iy *= 0.707;
      }
      s.px += ix * s.speed * dt;
      s.py += iy * s.speed * dt;
      s.px = clamp(s.px, -W / 2 + 40, W / 2 - 40);
      s.py = clamp(s.py, -H / 2 + 40, H / 2 - 40);

      // spawn enemies
      s.spawnCd -= dt;
      const spawnInterval = clamp(0.95 - s.time * 0.006, 0.16, 0.95);
      if (s.spawnCd <= 0) {
        s.spawnCd = spawnInterval;
        const count = 1 + Math.floor(s.time / 24);
        for (let i = 0; i < count; i++) spawnEnemy(s);
      }
      s.bossCd -= dt;
      if (s.bossCd <= 0) {
        s.bossCd = rand(26, 36);
        spawnEnemy(s, true);
        sfx.monsterGrowl();
      }

      // auto fire
      s.fireCd -= dt;
      if (s.fireCd <= 0 && s.enemies.length > 0) {
        let nearest: Enemy | null = null;
        let best = Infinity;
        for (const e of s.enemies) {
          const d = Math.hypot(e.x - s.px, e.y - s.py);
          if (d < best) {
            best = d;
            nearest = e;
          }
        }
        if (nearest && best < 620) {
          s.fireCd = 1 / s.fireRate;
          const baseA = Math.atan2(nearest.y - s.py, nearest.x - s.px);
          const spread = 0.13;
          for (let i = 0; i < s.shots; i++) {
            const a = baseA + (i - (s.shots - 1) / 2) * spread;
            const crit = Math.random() < s.crit;
            s.bullets.push({
              x: s.px,
              y: s.py,
              vx: Math.cos(a) * s.bulletSpeed,
              vy: Math.sin(a) * s.bulletSpeed,
              life: 1.6,
              dmg: s.damage * (crit ? 3 : 1),
              pierce: s.pierce,
              hitSet: new Set(),
            });
          }
          sfx.laser();
        }
      }

      // orbiting blades
      s.orbsAngle += dt * 2.6;
      if (s.orbs > 0) {
        s.orbCd -= dt;
        if (s.orbCd <= 0) {
          s.orbCd = 0.22;
          for (let i = 0; i < s.orbs; i++) {
            const a = s.orbsAngle + (i / s.orbs) * Math.PI * 2;
            const ox = s.px + Math.cos(a) * 78;
            const oy = s.py + Math.sin(a) * 78;
            for (const e of s.enemies) {
              if (Math.hypot(e.x - ox, e.y - oy) < e.r + 16) {
                e.hp -= s.damage * 0.6;
                e.hit = 0.15;
              }
            }
          }
        }
      }

      // enemies
      for (const e of s.enemies) {
        const dx = s.px - e.x;
        const dy = s.py - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
        e.hit = Math.max(0, e.hit - dt);
        if (d < e.r + 16) {
          s.hp -= (e.boss ? 26 : 9) * dt;
          s.shake = Math.min(0.25, s.shake + dt * 0.8);
        }
        // separation for nice swarm feel
        if (Math.random() < 0.02) {
          e.x += rand(-1, 1);
          e.y += rand(-1, 1);
        }
      }

      // bullets
      for (const b of s.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        for (const e of s.enemies) {
          if (b.hitSet.has(e)) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 6) {
            e.hp -= b.dmg;
            e.hit = 0.12;
            b.hitSet.add(e);
            for (let i = 0; i < 4; i++) {
              s.particles.push({
                x: b.x,
                y: b.y,
                vx: rand(-90, 90),
                vy: rand(-90, 90),
                life: 0.22,
                c: '#7dd3fc',
                s: 2.4,
              });
            }
            if (b.pierce <= 0) {
              b.life = 0;
              break;
            }
            b.pierce -= 1;
          }
        }
      }
      s.bullets = s.bullets.filter((b) => b.life > 0);

      // deaths
      const before = s.enemies.length;
      s.enemies = s.enemies.filter((e) => {
        if (e.hp > 0) return true;
        s.kills += 1;
        sfx.hit();
        const gems = e.boss ? 8 : 1;
        for (let i = 0; i < gems; i++) {
          s.gems.push({ x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), v: e.boss ? 6 : 1, big: !!e.boss });
        }
        for (let i = 0; i < (e.boss ? 24 : 7); i++) {
          s.particles.push({
            x: e.x,
            y: e.y,
            vx: rand(-160, 160),
            vy: rand(-160, 160),
            life: rand(0.2, 0.55),
            c: e.boss ? '#fbbf24' : e.hue > 180 ? '#a78bfa' : '#f472b6',
            s: rand(2, 4),
          });
        }
        return false;
      });
      if (before !== s.enemies.length && s.enemies.length === 0) sfx.coin();

      // gems
      for (const gem of s.gems) {
        const d = Math.hypot(gem.x - s.px, gem.y - s.py);
        if (d < s.magnet) {
          gem.x += ((s.px - gem.x) / d) * 340 * dt;
          gem.y += ((s.py - gem.y) / d) * 340 * dt;
        }
        if (d < 22) {
          gem.v = 0;
          s.xp += gem.big ? 5 : 1;
        }
      }
      s.gems = s.gems.filter((gem) => gem.v > 0);
      if (s.xp >= s.need) {
        s.xp -= s.need;
        s.level += 1;
        s.need = Math.floor(s.need * 1.32 + 4);
        const pool = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
        paused.current = true;
        setChoices(pool);
        sfx.powerup();
      }

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      s.shake = Math.max(0, s.shake - dt);

      if (s.hp <= 0 && !s.dead) {
        s.dead = true;
        setDead(true);
        sfx.gameOver();
      }

      if (Math.floor(s.time * 8) % 2 === 0)
        setHud({
          hp: Math.max(0, Math.round(s.hp)),
          maxHp: Math.round(s.maxHp),
          level: s.level,
          xp: s.xp,
          need: s.need,
          time: s.time,
          kills: s.kills,
        });
    }

    // ---------------- render ----------------
    ctx.fillStyle = '#080b1a';
    ctx.fillRect(0, 0, W, H);

    const shx = s.shake > 0 ? rand(-6, 6) : 0;
    const shy = s.shake > 0 ? rand(-6, 6) : 0;
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy);

    // starfield parallax
    for (let i = 0; i < 120; i++) {
      const sx = (((i * 137) % 1900) - 950) * 0.9 - s.px * 0.06;
      const sy = (((i * 219) % 1100) - 550) * 0.9 - s.py * 0.06;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(s.t * 1.4 + i));
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.55})`;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }

    // planet ground
    const grad = ctx.createRadialGradient(0, 0, 60, 0, 0, 620);
    grad.addColorStop(0, '#12203a');
    grad.addColorStop(1, '#080b18');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 640, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.08)';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-900, i * 80 - (s.py % 80));
      ctx.lineTo(900, i * 80 - (s.py % 80));
      ctx.moveTo(i * 80 - (s.px % 80), -700);
      ctx.lineTo(i * 80 - (s.px % 80), 700);
      ctx.stroke();
    }

    // gems
    for (const gem of s.gems) {
      const x = gem.x - s.px;
      const y = gem.y - s.py;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.t * 2);
      ctx.shadowColor = gem.big ? '#fbbf24' : '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillStyle = gem.big ? '#fbbf24' : '#38bdf8';
      const sz = gem.big ? 7 : 3.6;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz, 0);
      ctx.lineTo(0, sz);
      ctx.lineTo(-sz, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // enemies
    for (const e of s.enemies) {
      const x = e.x - s.px;
      const y = e.y - s.py;
      if (Math.abs(x) > W / 2 + 80 || Math.abs(y) > H / 2 + 80) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(s.py - e.y, s.px - e.x) + Math.PI / 2);
      ctx.fillStyle = e.hit > 0 ? '#ffffff' : e.boss ? '#be123c' : `hsl(${e.hue}, 75%, 55%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r * 0.8, e.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.r * 0.5, Math.sin(a) * e.r * 0.5);
        ctx.lineTo(Math.cos(a) * e.r * 1.4, Math.sin(a) * e.r * 1.5);
        ctx.stroke();
      }
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-e.r * 0.3, e.r * 0.2, e.r * 0.16, 0, Math.PI * 2);
      ctx.arc(e.r * 0.3, e.r * 0.2, e.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      if (e.boss) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-24, -e.r - 14, 48, 5);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-24, -e.r - 14, 48 * clamp(e.hp / e.maxHp, 0, 1), 5);
      }
      ctx.restore();
    }

    // bullets
    for (const b of s.bullets) {
      const x = b.x - s.px;
      const y = b.y - s.py;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(-9, -2.4, 18, 4.8, 2.4);
      ctx.fill();
      ctx.restore();
    }

    // orbiting blades
    for (let i = 0; i < s.orbs; i++) {
      const a = s.orbsAngle + (i / Math.max(1, s.orbs)) * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(a) * 78, Math.sin(a) * 78);
      ctx.rotate(a * 3);
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ddd6fe';
      ctx.beginPath();
      ctx.roundRect(-12, -4, 24, 8, 4);
      ctx.fill();
      ctx.restore();
    }

    // particles
    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - s.px, p.y - s.py, p.s, p.s);
    }
    ctx.globalAlpha = 1;

    // player marine
    ctx.save();
    ctx.translate(0, 0);
    ctx.fillStyle = 'rgba(56,189,248,0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(0, 2, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-9, -9, 18, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-7, -7, 5, 3);
    ctx.fillRect(2, -7, 5, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(12, -3, 16, 5, 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080b1a]">
      <canvas ref={canvasRef} className="h-full w-full" />

      {started && !dead && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur">
              <Heart size={12} className="text-rose-400" />
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 transition-all"
                  style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-white">{hud.hp}</span>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              <span className="flex items-center gap-1 text-amber-300">
                <Timer size={12} /> {Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, '0')}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-sky-300">LVL {hud.level}</span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1 text-rose-300">
                <Crosshair size={12} /> {hud.kills}
              </span>
            </div>
            <div className="mx-auto mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all"
                style={{ width: `${(hud.xp / hud.need) * 100}%` }}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-bold text-slate-300 backdrop-blur">
            WASD Move · Weapons auto-fire · Collect XP crystals
          </div>
        </>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-indigo-950/80 via-slate-950/75 to-black/90 p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
              👾 Bullet-Heaven Roguelite
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Astro Survivors</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Your marine auto-blasts the xeno swarm. Kite the horde, hoover up XP and evolve your arsenal into a
              screen-clearing storm.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-violet-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Deploy Marine
            </button>
            <p className="mt-3 text-[10px] text-slate-400">WASD / Arrows to move · shooting is automatic</p>
          </div>
        </div>
      )}

      {choices && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-pop-in text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-300">
              <Sparkles size={12} /> Level {hud.level} — choose an evolution
            </div>
            <h3 className="font-display text-xl font-black text-white">Upgrade Your Arsenal</h3>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {choices.map((u) => (
                <button
                  key={u.id}
                  onClick={() => applyUpgrade(u)}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-b from-[#182042] to-[#0d1226] p-4 text-left transition-all hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-900/30"
                >
                  <div className="text-2xl">{u.icon}</div>
                  <div className="mt-2 font-display text-sm font-bold text-white">{u.name}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{u.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {dead && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">☠️</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Marine Down</h3>
            <p className="mt-1 text-xs text-slate-300">
              Survived <b className="text-sky-300">{Math.floor(hud.time)}s</b> · {hud.kills} xenos purged · Level{' '}
              {hud.level}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Redeploy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function spawnEnemy(s: AstroState, boss = false) {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  const margin = 70;
  if (edge === 0) {
    x = rand(-W / 2 - margin, W / 2 + margin);
    y = -H / 2 - margin;
  } else if (edge === 1) {
    x = rand(-W / 2 - margin, W / 2 + margin);
    y = H / 2 + margin;
  } else if (edge === 2) {
    x = -W / 2 - margin;
    y = rand(-H / 2 - margin, H / 2 + margin);
  } else {
    x = W / 2 + margin;
    y = rand(-H / 2 - margin, H / 2 + margin);
  }
  const t = s.time;
  const hp = boss ? 260 + t * 8 : 14 + t * 1.1;
  s.enemies.push({
    x: x + s.px,
    y: y + s.py,
    hp,
    maxHp: hp,
    speed: boss ? 42 + t * 0.12 : rand(52, 78) + t * 0.32,
    r: boss ? 30 : rand(10, 15),
    hue: boss ? 350 : rand(250, 330),
    hit: 0,
    boss,
  });
}
