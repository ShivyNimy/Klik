import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Crosshair, Heart, Coins, Zap, Snowflake } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI } from './engine';

const W = 960;
const H = 540;

const PATH: { x: number; y: number }[] = [
  { x: -40, y: 120 },
  { x: 190, y: 120 },
  { x: 190, y: 300 },
  { x: 430, y: 300 },
  { x: 430, y: 150 },
  { x: 660, y: 150 },
  { x: 660, y: 400 },
  { x: 880, y: 400 },
];

const PADS = [
  { x: 120, y: 220 },
  { x: 260, y: 200 },
  { x: 330, y: 380 },
  { x: 520, y: 230 },
  { x: 520, y: 400 },
  { x: 600, y: 300 },
  { x: 760, y: 250 },
  { x: 760, y: 470 },
  { x: 250, y: 470 },
  { x: 880, y: 300 },
];

type TowerKind = 'pulse' | 'frost' | 'rail';

interface Tower {
  pad: number;
  kind: TowerKind;
  level: number;
  cd: number;
  angle: number;
}
interface Zombie {
  t: number; // distance along path
  hp: number;
  maxHp: number;
  speed: number;
  slow: number;
  x: number;
  y: number;
  boss?: boolean;
  hue: number;
}
interface Shot {
  x: number;
  y: number;
  tx: number;
  ty: number;
  life: number;
  color: string;
}

const TOWER_INFO: Record<TowerKind, { name: string; cost: number; icon: string; color: string; desc: string }> = {
  pulse: { name: 'Pulse Turret', cost: 60, icon: '🔫', color: '#38bdf8', desc: 'Fast single-target shots' },
  frost: { name: 'Cryo Coil', cost: 90, icon: '❄️', color: '#67e8f9', desc: 'Slows the whole wave' },
  rail: { name: 'Rail Cannon', cost: 150, icon: '💥', color: '#f472b6', desc: 'Heavy splash damage' },
};

const PATH_LEN = (() => {
  let len = 0;
  for (let i = 1; i < PATH.length; i++) len += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
  return len;
})();

function posAt(t: number) {
  let d = clamp(t, 0, PATH_LEN);
  for (let i = 1; i < PATH.length; i++) {
    const seg = Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
    if (d <= seg) {
      const r = d / seg;
      return {
        x: PATH[i - 1].x + (PATH[i].x - PATH[i - 1].x) * r,
        y: PATH[i - 1].y + (PATH[i].y - PATH[i - 1].y) * r,
      };
    }
    d -= seg;
  }
  return PATH[PATH.length - 1];
}

export default function ZombieSiege() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [money, setMoney] = useState(220);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(0);
  const [selected, setSelected] = useState<TowerKind>('pulse');
  const [phase, setPhase] = useState<'prep' | 'wave' | 'over'>('prep');
  const [nextIn, setNextIn] = useState(8);

  const g = useRef({
    towers: [] as Tower[],
    zombies: [] as Zombie[],
    shots: [] as Shot[],
    money: 220,
    lives: 20,
    wave: 0,
    prep: 8,
    inWave: false,
    spawnQueue: [] as { hp: number; delay: number; speed: number; boss?: boolean }[],
    spawnTimer: 0,
    time: 0,
    hoverPad: -1,
    selected: 'pulse' as TowerKind,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    basePulse: 0,
  });

  const reset = useCallback(() => {
    const s = g.current;
    s.towers = [];
    s.zombies = [];
    s.shots = [];
    s.money = 220;
    s.lives = 20;
    s.wave = 0;
    s.prep = 8;
    s.inWave = false;
    s.spawnQueue = [];
    s.spawnTimer = 0;
    s.particles = [];
    setMoney(220);
    setLives(20);
    setWave(0);
    setPhase('prep');
    setNextIn(8);
    setDead(false);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useEffect(() => {
    g.current.selected = selected;
  }, [selected]);

  useEffect(() => {
    if (!started || dead) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const kind: Record<string, TowerKind> = { '1': 'pulse', '2': 'frost', '3': 'rail' };
      const next = kind[e.key];
      if (!next) return;
      e.preventDefault();
      setSelected(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, dead]);

  useHiDPI(canvasRef, W, H);

  const startWave = useCallback(() => {
    const s = g.current;
    s.inWave = true;
    s.wave += 1;
    const w = s.wave;
    const count = 6 + Math.floor(w * 2.2);
    s.spawnQueue = Array.from({ length: count }, (_, i) => ({
      hp: 38 * Math.pow(1.24, w - 1) * (1 + i * 0.02),
      delay: 0.55,
      speed: 42 + Math.min(34, w * 1.6) + rand(-6, 6),
      boss: w % 5 === 0 && i === count - 1,
    }));
    s.spawnTimer = 0;
    setPhase('wave');
    setWave(w);
    sfx.monsterGrowl();
  }, []);

  const canvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const handleClick = (e: React.PointerEvent) => {
    if (!started || dead) return;
    const p = canvasPoint(e);
    const s = g.current;
    let clicked = -1;
    PADS.forEach((pad, i) => {
      if (Math.hypot(pad.x - p.x, pad.y - p.y) < 32) clicked = i;
    });
    if (clicked < 0) return;
    const existing = s.towers.find((t) => t.pad === clicked);
    if (existing) {
      const cost = Math.floor(TOWER_INFO[existing.kind].cost * 0.8 * existing.level);
      if (existing.level >= 4) {
        sfx.playTone(200, 0.08, 'triangle', 0.06);
        return;
      }
      if (s.money < cost) {
        sfx.playTone(180, 0.1, 'triangle', 0.07);
        return;
      }
      s.money -= cost;
      existing.level += 1;
      setMoney(Math.floor(s.money));
      sfx.powerup();
      return;
    }
    const cost = TOWER_INFO[s.selected].cost;
    if (s.money < cost) {
      sfx.playTone(180, 0.1, 'triangle', 0.07);
      return;
    }
    s.money -= cost;
    s.towers.push({ pad: clicked, kind: s.selected, level: 1, cd: 0, angle: 0 });
    setMoney(Math.floor(s.money));
    sfx.coin();
  };

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !dead) {
      s.time += dt;
      s.basePulse = Math.max(0, s.basePulse - dt);

      // prep timer
      if (!s.inWave) {
        s.prep -= dt;
        const nv = Math.max(0, Math.ceil(s.prep));
        setNextIn((v) => (v === nv ? v : nv));
        if (s.prep <= 0) startWave();
      } else {
        // spawn
        if (s.spawnQueue.length) {
          s.spawnTimer -= dt;
          if (s.spawnTimer <= 0) {
            const z = s.spawnQueue.shift()!;
            s.spawnTimer = z.delay;
            const p = posAt(0);
            s.zombies.push({
              t: 0,
              hp: z.hp * (z.boss ? 8 : 1),
              maxHp: z.hp * (z.boss ? 8 : 1),
              speed: z.speed * (z.boss ? 0.7 : 1),
              slow: 0,
              x: p.x,
              y: p.y,
              boss: z.boss,
              hue: rand(70, 130),
            });
          }
        } else if (s.zombies.length === 0) {
          // wave complete
          s.inWave = false;
          s.prep = s.wave === 0 ? 8 : 6;
          s.money += 40 + s.wave * 12;
          setMoney(Math.floor(s.money));
          setPhase('prep');
          sfx.powerup();
        }
      }

      // move zombies
      for (const z of s.zombies) {
        z.slow = Math.max(0, z.slow - dt);
        const slowFactor = z.slow > 0 ? 0.42 : 1;
        z.t += z.speed * slowFactor * dt;
        const p = posAt(z.t);
        z.x = p.x;
        z.y = p.y;
        if (z.t >= PATH_LEN - 2) {
          z.hp = -1;
          s.lives -= z.boss ? 5 : 1;
          s.basePulse = 1;
          setLives(Math.max(0, s.lives));
          sfx.hit();
          if (s.lives <= 0 && !dead) {
            setDead(true);
            setPhase('over');
            sfx.gameOver();
          }
        }
      }

      // towers shoot
      for (const tw of s.towers) {
        const pad = PADS[tw.pad];
        tw.cd -= dt;
        const stats =
          tw.kind === 'pulse'
            ? { range: 130 + tw.level * 12, rate: 1.1 + tw.level * 0.25, dmg: 9 + tw.level * 7 }
            : tw.kind === 'frost'
            ? { range: 100 + tw.level * 10, rate: 2.4, dmg: 2 + tw.level * 3 }
            : { range: 165 + tw.level * 16, rate: 0.55 + tw.level * 0.08, dmg: 26 + tw.level * 22 };

        let target: Zombie | null = null;
        let bestT = -1;
        for (const z of s.zombies) {
          if (z.hp <= 0) continue;
          if (Math.hypot(z.x - pad.x, z.y - pad.y) < stats.range && z.t > bestT) {
            bestT = z.t;
            target = z;
          }
        }
        if (target) {
          tw.angle = Math.atan2(target.y - pad.y, target.x - pad.x);
          if (tw.cd <= 0) {
            tw.cd = 1 / stats.rate;
            s.shots.push({
              x: pad.x,
              y: pad.y,
              tx: target.x,
              ty: target.y,
              life: 0.14,
              color: TOWER_INFO[tw.kind].color,
            });
            if (tw.kind === 'rail') {
              for (const z of s.zombies) {
                if (Math.hypot(z.x - target.x, z.y - target.y) < 52) z.hp -= stats.dmg;
              }
            } else {
              target.hp -= stats.dmg;
              if (tw.kind === 'frost') {
                for (const z of s.zombies) {
                  if (Math.hypot(z.x - pad.x, z.y - pad.y) < stats.range) z.slow = 1.1;
                }
              }
            }
            sfx.playTone(tw.kind === 'rail' ? 220 : 620, 0.05, 'square', 0.035, tw.kind === 'rail' ? 120 : 480);
          }
        }
      }

      // clean zombies
      s.zombies = s.zombies.filter((z) => {
        if (z.hp > 0) return true;
        if (z.hp < 0) return false;
        s.money += z.boss ? 120 : 9 + Math.floor(s.wave * 1.2);
        setMoney(Math.floor(s.money));
        for (let i = 0; i < 8; i++) {
          s.particles.push({
            x: z.x,
            y: z.y,
            vx: rand(-100, 100),
            vy: rand(-100, 60),
            life: rand(0.2, 0.5),
            c: z.boss ? '#fbbf24' : '#84cc16',
          });
        }
        sfx.playNoise(0.08, 0.05, 700);
        return false;
      });

      s.shots.forEach((sh) => (sh.life -= dt));
      s.shots = s.shots.filter((sh) => sh.life > 0);
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
    }

    // ---------------- RENDER ----------------
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(0, 0, W, H);

    // ground
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#13261a');
    gr.addColorStop(1, '#0b1712');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 60, W, H - 60);

    // grass noise
    for (let i = 0; i < 160; i++) {
      const x = (i * 131) % W;
      const y = 80 + ((i * 217) % (H - 90));
      ctx.fillStyle = i % 3 === 0 ? 'rgba(74,222,128,0.12)' : 'rgba(20,83,45,0.5)';
      ctx.fillRect(x, y, 3, 6);
    }

    // road path
    ctx.strokeStyle = '#3b2a1e';
    ctx.lineWidth = 54;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#55402c';
    ctx.lineWidth = 44;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250,204,21,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 16]);
    ctx.stroke();
    ctx.setLineDash([]);

    // base bunker
    const base = PATH[PATH.length - 1];
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(base.x - 30, base.y - 46, 76, 92, 10);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(base.x - 24, base.y - 40, 64, 16);
    ctx.fillStyle = s.basePulse > 0 ? '#f87171' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(base.x + 10, base.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUNKER', base.x + 10, base.y + 70);

    // pads
    PADS.forEach((pad, i) => {
      const tw = s.towers.find((t) => t.pad === i);
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
      ctx.fillStyle = tw ? 'rgba(15,23,42,0.9)' : 'rgba(56,189,248,0.09)';
      ctx.fill();
      ctx.strokeStyle = tw ? TOWER_INFO[tw.kind].color : 'rgba(56,189,248,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash(tw ? [] : [5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (tw) {
        const info = TOWER_INFO[tw.kind];
        // range circle
        const range = tw.kind === 'pulse' ? 130 + tw.level * 12 : tw.kind === 'frost' ? 100 + tw.level * 10 : 165 + tw.level * 16;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.04)';
        ctx.fill();
        // base
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(pad.x - 16, pad.y - 16, 32, 32, 8);
        ctx.fill();
        // barrel
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.rotate(tw.angle);
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.roundRect(0, -4, 26 + tw.level * 3, 8, 4);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv${tw.level}`, pad.x, pad.y + 34);
      } else {
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', pad.x, pad.y + 6);
      }
    });

    // shots
    for (const sh of s.shots) {
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = clamp(sh.life / 0.14, 0, 1);
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.tx, sh.ty);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // zombies
    for (const z of s.zombies) {
      const r = z.boss ? 22 : 12;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(z.x, z.y + r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = z.slow > 0 ? '#67e8f9' : z.boss ? '#a3e635' : `hsl(${z.hue}, 55%, 42%)`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a2e05';
      ctx.beginPath();
      ctx.arc(z.x, z.y, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ecfccb';
      ctx.beginPath();
      ctx.arc(z.x - r * 0.25, z.y - r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx.arc(z.x + r * 0.25, z.y - r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // arms
      ctx.strokeStyle = z.slow > 0 ? '#a5f3fc' : `hsl(${z.hue}, 55%, 38%)`;
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(z.x - r * 0.6, z.y + r * 0.2);
      ctx.lineTo(z.x - r * 1.3, z.y - r * 0.2);
      ctx.moveTo(z.x + r * 0.6, z.y + r * 0.2);
      ctx.lineTo(z.x + r * 1.3, z.y - r * 0.2);
      ctx.stroke();
      // hp bar
      if (z.hp < z.maxHp) {
        const w = z.boss ? 60 : 28;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(z.x - w / 2, z.y - r - 10, w, 4);
        ctx.fillStyle = z.boss ? '#fbbf24' : '#84cc16';
        ctx.fillRect(z.x - w / 2, z.y - r - 10, w * clamp(z.hp / z.maxHp, 0, 1), 4);
      }
    }

    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // top bar
    ctx.fillStyle = 'rgba(5,10,18,0.82)';
    ctx.fillRect(0, 0, W, 56);
    ctx.fillStyle = '#a3e635';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WAVE', 20, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`${s.wave}`, 20, 44);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('CREDITS', 120, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`${Math.floor(s.money)}`, 120, 44);

    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('BUNKER', 250, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`${s.lives}`, 250, 44);

    ctx.textAlign = 'right';
    if (!s.inWave) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(`Next wave in ${Math.max(0, Math.ceil(s.prep))}s — build now!`, W - 20, 34);
    } else {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(`⚔️ Wave ${s.wave} — ${s.zombies.length} zombies`, W - 20, 34);
    }

    if (s.basePulse > 0) {
      ctx.fillStyle = `rgba(220,38,38,${s.basePulse * 0.28})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a1220]">
      <canvas ref={canvasRef} className="h-full w-full cursor-pointer" onPointerDown={handleClick} />

      {started && !dead && (
        <>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-white/10 bg-black/60 p-1.5 backdrop-blur">
            {(Object.keys(TOWER_INFO) as TowerKind[]).map((k) => {
              const info = TOWER_INFO[k];
              const active = selected === k;
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    active ? 'bg-white/15 text-white ring-1 ring-white/30' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm">{info.icon}</span>
                  <span className="flex flex-col items-start leading-tight">
                    <span>{info.name}</span>
                    <span className="text-[9px] font-black text-amber-300">💰{info.cost}</span>
                  </span>
                </button>
              );
            })}
            <div className="mx-1 w-px bg-white/10" />
            <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-slate-300">
              <span className="flex items-center gap-1">
                <Heart size={11} className="text-rose-400" />
                {lives}
              </span>
              <span className="flex items-center gap-1">
                <Coins size={11} className="text-amber-400" />
                {money}
              </span>
              <span className="flex items-center gap-1">
                <Crosshair size={11} className="text-lime-400" />
                {wave}
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-400">
            1–3 selects a turret · click a pad to build · click a turret to upgrade
          </div>

          {!g.current.inWave && nextIn > 0 && (
            <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 animate-pulse rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
              <Zap size={10} className="mr-1 inline" /> Prep phase · {nextIn}s
            </div>
          )}
        </>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-emerald-950/85 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-lime-300">
              🧟 Tower Defense
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Zombie Siege Defense</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Hold the highway bunker. Place pulse turrets, cryo coils and rail cannons on the tactical pads and stop
              every wave of the undead.
            </p>
            <div className="mt-3 flex justify-center gap-2 text-[10px] text-slate-300">
              {Object.values(TOWER_INFO).map((t) => (
                <span key={t.name} className="rounded-md bg-white/10 px-2 py-1">
                  {t.icon} {t.name}
                </span>
              ))}
            </div>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-700 px-7 py-3 text-sm font-black text-white shadow-xl shadow-emerald-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Defend the Bunker
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Snowflake size={10} /> Tip: cryo coils make every other turret stronger
            </p>
          </div>
        </div>
      )}

      {dead && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🧟‍♂️💥</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Bunker Overrun</h3>
            <p className="mt-1 text-xs text-slate-300">
              Survived <b className="text-lime-300">{wave} waves</b>
            </p>
            <button
              onClick={reset}
              className="mt-4 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-700 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              Rebuild Defenses
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
