import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Heart, Flame, Battery, Axe, Swords, Shield, Sparkles } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, randInt, useAnimationFrame, useKeys } from './engine';

const W = 960;
const H = 540;
const WORLD = { w: 2200, h: 1600 };

type NodeType = 'tree' | 'bush' | 'rock' | 'crate';
interface ResNode {
  x: number;
  y: number;
  type: NodeType;
  hp: number;
  alive: boolean;
  respawn: number;
  scale: number;
}

interface Monster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  kind: 'stalker' | 'wendigo';
  hitCd: number;
  flash: number;
  stun: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Child {
  x: number;
  y: number;
  rescued: boolean;
}

interface Torch {
  x: number;
  y: number;
  life: number;
}

interface Trap {
  x: number;
  y: number;
  life: number;
}

interface Hud {
  hp: number;
  hunger: number;
  battery: number;
  wood: number;
  food: number;
  scrap: number;
  night: number;
  fuel: number;
  phase: 'day' | 'night';
  phaseTime: number;
  rescued: number;
  torch: boolean;
  lightOn: boolean;
}

const CHILD_COUNT = 4;

function createState() {
  return {
  px: WORLD.w / 2,
  py: WORLD.h / 2,
  pvx: 0,
  pvy: 0,
  aim: 0,
  hp: 100,
  hunger: 100,
  battery: 100,
  wood: 0,
  food: 2,
  scrap: 0,
  night: 1,
  fuel: 100,
  phase: 'day' as 'day' | 'night',
  phaseTime: 22,
  rescued: 0,
  attackCd: 0,
  attackAnim: 0,
  hurtFlash: 0,
  shake: 0,
  lightOn: false,
  monsters: [] as Monster[],
  nodes: [] as ResNode[],
  children: [] as Child[],
  particles: [] as Particle[],
  torches: [] as Torch[],
  traps: [] as Trap[],
  campX: WORLD.w / 2,
  campY: WORLD.h / 2,
  time: 0,
  spawnTimer: 0,
  dead: false,
  won: false,
  nightFlash: 0,
  dawnFlash: 0,
};
}

type N99State = ReturnType<typeof createState>;

export default function NinetyNineNights({ onExit }: { onExit?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState<'none' | 'dead' | 'won'>('none');
  const [hud, setHud] = useState<Hud>({
    hp: 100,
    hunger: 100,
    battery: 100,
    wood: 0,
    food: 2,
    scrap: 0,
    night: 1,
    fuel: 100,
    phase: 'day',
    phaseTime: 22,
    rescued: 0,
    torch: false,
    lightOn: false,
  });
  const [toast, setToast] = useState<string>('');
  const toastTimer = useRef<number>(0);

  const state = useRef(createState());

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const reset = useCallback(() => {
    const s = state.current;
    s.px = WORLD.w / 2 + 40;
    s.py = WORLD.h / 2 + 60;
    s.hp = 100;
    s.hunger = 100;
    s.battery = 100;
    s.wood = 8;
    s.food = 2;
    s.scrap = 4;
    s.night = 1;
    s.fuel = 100;
    s.phase = 'day';
    s.phaseTime = 24;
    s.rescued = 0;
    s.attackCd = 0;
    s.attackAnim = 0;
    s.hurtFlash = 0;
    s.shake = 0;
    s.lightOn = false;
    s.monsters = [];
    s.particles = [];
    s.torches = [];
    s.traps = [];
    s.time = 0;
    s.spawnTimer = 0;
    s.dead = false;
    s.won = false;
    s.nightFlash = 0;
    s.dawnFlash = 0;

    const nodes: ResNode[] = [];
    const campX = s.campX;
    const campY = s.campY;
    for (let i = 0; i < 150; i++) {
      const x = rand(60, WORLD.w - 60);
      const y = rand(60, WORLD.h - 60);
      if (Math.hypot(x - campX, y - campY) < 170) continue;
      const r = Math.random();
      const type: NodeType = r < 0.56 ? 'tree' : r < 0.78 ? 'bush' : r < 0.9 ? 'rock' : 'crate';
      nodes.push({ x, y, type, hp: type === 'tree' ? 3 : 1, alive: true, respawn: 0, scale: rand(0.85, 1.2) });
    }
    s.nodes = nodes;

    s.children = Array.from({ length: CHILD_COUNT }, (_, i) => {
      const ang = (i / CHILD_COUNT) * Math.PI * 2 + rand(-0.4, 0.4);
      const radius = rand(560, 860);
      return {
        x: clamp(campX + Math.cos(ang) * radius, 120, WORLD.w - 120),
        y: clamp(campY + Math.sin(ang) * radius, 120, WORLD.h - 120),
        rescued: false,
      };
    });

    setOver('none');
  }, []);

  useEffect(() => {
    if (started) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // ------- actions -------
  const doAttack = useCallback(() => {
    const s = state.current;
    if (s.attackCd > 0 || s.dead) return;
    s.attackCd = 0.4;
    s.attackAnim = 0.28;
    sfx.chop();
    // harvest nodes
    for (const n of s.nodes) {
      if (!n.alive) continue;
      if (Math.hypot(n.x - s.px, n.y - s.py) < 62) {
        if (Math.abs(Math.atan2(n.y - s.py, n.x - s.px) - s.aim) > 1.25) continue;
        n.hp -= 1;
        for (let i = 0; i < 7; i++) {
          s.particles.push({
            x: n.x,
            y: n.y - 10,
            vx: rand(-70, 70),
            vy: rand(-110, 10),
            life: rand(0.3, 0.7),
            maxLife: 0.7,
            color: n.type === 'tree' ? '#8b5e34' : n.type === 'bush' ? '#4ade80' : n.type === 'rock' ? '#94a3b8' : '#facc15',
            size: rand(2, 4),
          });
        }
        if (n.hp <= 0) {
          n.alive = false;
          n.respawn = 45 + rand(0, 30);
          if (n.type === 'tree') s.wood += 3;
          else if (n.type === 'bush') s.food += 1;
          else if (n.type === 'rock') {
            s.scrap += 1;
            s.wood += 1;
          } else {
            s.scrap += 2;
            s.battery = clamp(s.battery + 18, 0, 100);
            showToast('📦 Crate looted: +2 Scrap, +Battery');
          }
          sfx.coin();
        }
        break;
      }
    }
    // damage monsters
    for (const m of s.monsters) {
      const d = Math.hypot(m.x - s.px, m.y - s.py);
      if (d < 78 + m.size) {
        const ang = Math.atan2(m.y - s.py, m.x - s.px);
        if (Math.abs(ang - s.aim) < 1.3) {
          m.hp -= m.kind === 'wendigo' ? 20 : 34;
          m.flash = 0.25;
          m.vx += Math.cos(ang) * 260;
          m.vy += Math.sin(ang) * 260;
          for (let i = 0; i < 10; i++) {
            s.particles.push({
              x: m.x,
              y: m.y,
              vx: rand(-160, 160),
              vy: rand(-160, 160),
              life: rand(0.25, 0.5),
              maxLife: 0.5,
              color: '#f87171',
              size: rand(2, 5),
            });
          }
          sfx.hit();
        }
      }
    }
  }, [showToast]);

  const feedFire = useCallback(() => {
    const s = state.current;
    if (Math.hypot(s.px - s.campX, s.py - s.campY) > 130) {
      showToast('🔥 Get closer to the campfire to feed it');
      return;
    }
    if (s.wood <= 0) {
      showToast('🪵 No wood! Chop trees with Left Click');
      return;
    }
    s.wood -= 1;
    s.fuel = clamp(s.fuel + 14, 0, 100);
    sfx.powerup();
    for (let i = 0; i < 14; i++) {
      s.particles.push({
        x: s.campX + rand(-16, 16),
        y: s.campY + rand(-10, 10),
        vx: rand(-30, 30),
        vy: rand(-130, -40),
        life: rand(0.4, 0.8),
        maxLife: 0.8,
        color: Math.random() > 0.5 ? '#fb923c' : '#fbbf24',
        size: rand(2, 5),
      });
    }
  }, [showToast]);

  const eat = useCallback(() => {
    const s = state.current;
    if (s.food <= 0) return showToast('🍓 No food! Forage bushes or pick berries');
    s.food -= 1;
    s.hunger = clamp(s.hunger + 26, 0, 100);
    s.hp = clamp(s.hp + 10, 0, 100);
    showToast('🍓 Ate cooked berries (+Hunger, +HP)');
    sfx.coin();
  }, [showToast]);

  const craft = useCallback(
    (kind: number) => {
      const s = state.current;
      if (kind === 1) {
        if (s.wood < 8) return showToast('🪵 Need 8 Wood for Spike Trap');
        s.wood -= 8;
        s.traps.push({ x: s.px, y: s.py, life: 60 });
        showToast('⚔️ Spike Trap placed!');
      } else if (kind === 2) {
        if (s.wood < 5 || s.scrap < 2) return showToast('Need 5 Wood + 2 Scrap for Torch');
        s.wood -= 5;
        s.scrap -= 2;
        s.torches.push({ x: s.px, y: s.py, life: 55 });
        showToast('🔥 Camp Torch lit! Spooks nearby monsters');
      } else if (kind === 3) {
        if (s.food < 2 || s.scrap < 2) return showToast('Need 2 Berries + 2 Scrap for Medkit');
        s.food -= 2;
        s.scrap -= 2;
        s.hp = clamp(s.hp + 45, 0, 100);
        showToast('❤️ Medkit used (+45 HP)');
      } else if (kind === 4) {
        if (s.scrap < 3) return showToast('Need 3 Scrap for Battery Pack');
        s.scrap -= 3;
        s.battery = clamp(s.battery + 55, 0, 100);
        showToast('🔋 Battery Pack (+55% Flashlight)');
      }
      sfx.click();
    },
    [showToast]
  );

  const interact = useCallback(() => {
    const s = state.current;
    for (const c of s.children) {
      if (!c.rescued && Math.hypot(c.x - s.px, c.y - s.py) < 70) {
        c.rescued = true;
        s.rescued += 1;
        s.hp = clamp(s.hp + 20, 0, 100);
        s.wood += 6;
        s.food += 3;
        s.scrap += 4;
        sfx.powerup();
        showToast(`👧 Child rescued ${s.rescued}/4! Dawn advances +${2} extra nights`);
        for (let i = 0; i < 40; i++) {
          s.particles.push({
            x: c.x,
            y: c.y,
            vx: rand(-140, 140),
            vy: rand(-200, 20),
            life: rand(0.6, 1.3),
            maxLife: 1.3,
            color: ['#fbbf24', '#f472b6', '#a78bfa', '#34d399'][randInt(0, 3)],
            size: rand(2, 5),
          });
        }
        return;
      }
    }
    if (Math.hypot(s.px - s.campX, s.py - s.campY) < 130) feedFire();
  }, [feedFire, showToast]);

  // global key triggers for actions
  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'e') interact();
      if (k === 'r') eat();
      if (k === 'f') doAttack();
      if (k === '1') craft(1);
      if (k === '2') craft(2);
      if (k === '3') craft(3);
      if (k === '4') craft(4);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [started, interact, eat, doAttack, craft]);

  // pointer aim + flashlight
  const pointer = useRef({ x: W / 2, y: H / 2, down: false });
  const touchMove = useRef({ x: 0, y: 0 });
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia?.('(pointer: coarse)')?.matches ?? false);
  }, []);
  const getLocal = (e: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      const p = getLocal(e);
      pointer.current = { x: p.x, y: p.y, down: true };
      if (e.button === 2) state.current.lightOn = true;
      else doAttack();
    };
    const onUp = () => {
      pointer.current.down = false;
      state.current.lightOn = false;
    };
    const onMove = (e: PointerEvent) => {
      const p = getLocal(e);
      pointer.current.x = p.x;
      pointer.current.y = p.y;
    };
    const onCtx = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('contextmenu', onCtx);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('contextmenu', onCtx);
    };
  }, [doAttack]);

  // Space toggles flashlight
  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        state.current.lightOn = !state.current.lightOn;
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [started]);

  // ------- main loop -------
  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;
    s.time += dt;

    if (!started) {
      drawScene(ctx, s, true);
      return;
    }

    if (!s.dead && !s.won) {
      // ---- input ----
      const k = keys.current;
      let ix = 0;
      let iy = 0;
      if (k['a'] || k['arrowleft']) ix -= 1;
      if (k['d'] || k['arrowright']) ix += 1;
      if (k['w'] || k['arrowup']) iy -= 1;
      if (k['s'] || k['arrowdown']) iy += 1;
      if (touchMove.current.x || touchMove.current.y) {
        ix = touchMove.current.x;
        iy = touchMove.current.y;
      }
      if (ix && iy) {
        ix *= 0.707;
        iy *= 0.707;
      }
      const speed = 235;
      s.pvx += (ix * speed - s.pvx) * Math.min(1, dt * 14);
      s.pvy += (iy * speed - s.pvy) * Math.min(1, dt * 14);
      s.px = clamp(s.px + s.pvx * dt, 30, WORLD.w - 30);
      s.py = clamp(s.py + s.pvy * dt, 30, WORLD.h - 30);

      // aim toward pointer (world coords)
      const camX = clamp(s.px - W / 2, 0, WORLD.w - W);
      const camY = clamp(s.py - H / 2, 0, WORLD.h - H);
      if (isTouch) {
        // auto-aim: nearest threat, else nearest resource, else movement direction
        let bestA: number | null = null;
        let bestD = 260;
        for (const m of s.monsters) {
          const d = Math.hypot(m.x - s.px, m.y - s.py);
          if (d < bestD) {
            bestD = d;
            bestA = Math.atan2(m.y - s.py, m.x - s.px);
          }
        }
        if (bestA === null) {
          for (const n of s.nodes) {
            if (!n.alive) continue;
            const d = Math.hypot(n.x - s.px, n.y - s.py);
            if (d < 110 && d < bestD) {
              bestD = d;
              bestA = Math.atan2(n.y - s.py, n.x - s.px);
            }
          }
        }
        if (bestA === null) {
          bestA = ix || iy ? Math.atan2(iy, ix) : s.aim;
        }
        s.aim = bestA;
      } else {
        const worldPx = pointer.current.x + camX;
        const worldPy = pointer.current.y + camY;
        s.aim = Math.atan2(worldPy - s.py, worldPx - s.px);
      }

      s.attackCd = Math.max(0, s.attackCd - dt);
      s.attackAnim = Math.max(0, s.attackAnim - dt);
      s.hurtFlash = Math.max(0, s.hurtFlash - dt);
      s.shake = Math.max(0, s.shake - dt);
      s.nightFlash = Math.max(0, s.nightFlash - dt);
      s.dawnFlash = Math.max(0, s.dawnFlash - dt);

      // flashlight drain
      if (s.lightOn && s.battery > 0) {
        s.battery = clamp(s.battery - dt * 5.5, 0, 100);
        if (s.battery <= 0) s.lightOn = false;
      } else if (!s.lightOn) {
        s.battery = clamp(s.battery + dt * 0.7, 0, 100);
      }

      // hunger + hp regen near fire
      s.hunger = clamp(s.hunger - dt * 0.95, 0, 100);
      if (s.hunger <= 0) s.hp -= dt * 3.2;
      const nearFire = Math.hypot(s.px - s.campX, s.py - s.campY) < 150;
      if (nearFire && s.fuel > 0) s.hp = clamp(s.hp + dt * 2.4, 0, 100);

      // campfire fuel
      s.fuel = clamp(s.fuel - dt * (s.phase === 'night' ? 2.6 : 0.7), 0, 100);

      // phase switch
      s.phaseTime -= dt;
      if (s.phaseTime <= 0) {
        if (s.phase === 'day') {
          s.phase = 'night';
          s.phaseTime = 26;
          s.nightFlash = 1;
          sfx.monsterGrowl();
          spawnNight(s);
        } else {
          s.phase = 'day';
          s.phaseTime = 20;
          s.dawnFlash = 1;
          s.hp = clamp(s.hp + 6, 0, 100);
          const adv = 1 + s.rescued * 2;
          s.night += adv;
          if (s.night >= 99) {
            s.won = true;
            setOver('won');
            sfx.powerup();
          }
          s.monsters = [];
          showToast(`🌅 Sunrise! You survived to Night ${Math.min(99, s.night)} (+${adv})`);
          sfx.powerup();
        }
      }

      // respawn nodes
      for (const n of s.nodes) {
        if (!n.alive) {
          n.respawn -= dt;
          if (n.respawn <= 0) n.alive = true;
        }
      }

      // torches / traps
      s.torches.forEach((t) => (t.life -= dt));
      s.torches = s.torches.filter((t) => t.life > 0);
      s.traps.forEach((t) => (t.life -= dt));
      s.traps = s.traps.filter((t) => t.life > 0);

      // ---- monsters ----
      if (s.phase === 'night') {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0 && s.monsters.length < 3 + Math.min(5, Math.floor(s.night / 12))) {
          spawnStalker(s);
          s.spawnTimer = Math.max(2.4, 7 - s.night * 0.03);
        }
      }

      const lightRadius = 92;
      const coneAngle = 0.5;
      for (const m of s.monsters) {
        const dx = s.px - m.x;
        const dy = s.py - m.y;
        const d = Math.hypot(dx, dy) || 1;
        let mvx = (dx / d) * m.speed;
        let mvy = (dy / d) * m.speed;

        // fire avoidance / attraction: monsters orbit fire but hate light
        const fireD = Math.hypot(m.x - s.campX, m.y - s.campY);
        if (s.fuel > 0 && fireD < 210) {
          const a = Math.atan2(m.y - s.campY, m.x - s.campX);
          mvx += Math.cos(a) * (210 - fireD) * 1.9;
          mvy += Math.sin(a) * (210 - fireD) * 1.9;
          m.hp -= dt * 7;
        }
        for (const t of s.torches) {
          const td = Math.hypot(m.x - t.x, m.y - t.y);
          if (td < 150) {
            const a = Math.atan2(m.y - t.y, m.x - t.x);
            mvx += Math.cos(a) * (150 - td) * 3;
            mvy += Math.sin(a) * (150 - td) * 3;
            m.hp -= dt * 5;
          }
        }

        // flashlight beam
        const inBeam =
          s.lightOn &&
          s.battery > 0 &&
          d < 330 &&
          Math.abs(Math.atan2(m.y - s.py, m.x - s.px) + Math.PI - s.aim) < coneAngle;
        if (inBeam) {
          m.hp -= dt * (m.kind === 'wendigo' ? 16 : 30);
          m.stun = Math.max(m.stun, 0.35);
          const a = Math.atan2(m.y - s.py, m.x - s.px);
          mvx -= Math.cos(a) * 150;
          mvy -= Math.sin(a) * 150;
          if (Math.random() < dt * 22) {
            s.particles.push({
              x: m.x + rand(-m.size, m.size),
              y: m.y + rand(-m.size, m.size),
              vx: rand(-40, 40),
              vy: rand(-90, -20),
              life: 0.35,
              maxLife: 0.35,
              color: '#e0f2fe',
              size: rand(2, 4),
            });
          }
        }
        if (m.stun > 0) {
          m.stun -= dt;
          mvx *= 0.15;
          mvy *= 0.15;
        }

        // traps
        for (const t of s.traps) {
          if (Math.hypot(m.x - t.x, m.y - t.y) < 48) {
            m.hp -= dt * 18;
            m.stun = 0.4;
          }
        }

        m.vx += (mvx - m.vx) * Math.min(1, dt * 4);
        m.vy += (mvy - m.vy) * Math.min(1, dt * 4);
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.x = clamp(m.x, 20, WORLD.w - 20);
        m.y = clamp(m.y, 20, WORLD.h - 20);
        m.flash = Math.max(0, m.flash - dt);
        m.phase += dt * (m.kind === 'wendigo' ? 3 : 6);
        m.hitCd = Math.max(0, m.hitCd - dt);

        if (d < 34 + m.size && m.hitCd <= 0) {
          m.hitCd = m.kind === 'wendigo' ? 1.1 : 0.85;
          const dmg = m.kind === 'wendigo' ? 26 : 9;
          s.hp -= dmg;
          s.hurtFlash = 0.4;
          s.shake = 0.35;
          sfx.hit();
        }

        if (m.hp <= 0) {
          for (let i = 0; i < 18; i++) {
            s.particles.push({
              x: m.x,
              y: m.y,
              vx: rand(-150, 150),
              vy: rand(-150, 150),
              life: rand(0.3, 0.8),
              maxLife: 0.8,
              color: m.kind === 'wendigo' ? '#fb7185' : '#6b7280',
              size: rand(2, 6),
            });
          }
          if (m.kind === 'wendigo') {
            s.scrap += 6;
            s.battery = clamp(s.battery + 25, 0, 100);
            showToast('💀 The Wendigo retreats… for now. +6 Scrap');
          }
        }
      }
      s.monsters = s.monsters.filter((m) => m.hp > 0);

      // particles
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // children beacon particles
      if (Math.random() < dt * 6) {
        for (const c of s.children) {
          if (c.rescued) continue;
          s.particles.push({
            x: c.x + rand(-18, 18),
            y: c.y + rand(-10, 10),
            vx: rand(-10, 10),
            vy: rand(-55, -20),
            life: rand(0.6, 1.2),
            maxLife: 1.2,
            color: '#fcd34d',
            size: rand(1.5, 3),
          });
        }
      }

      if (s.hp <= 0 && !s.dead) {
        s.dead = true;
        s.hp = 0;
        setOver('dead');
        sfx.gameOver();
      }
    }

    // HUD throttle
    if (started && !s.dead && !s.won && Math.floor(s.time * 8) % 2 === 0) {
      setHud({
        hp: Math.max(0, Math.round(s.hp)),
        hunger: Math.round(s.hunger),
        battery: Math.round(s.battery),
        wood: s.wood,
        food: s.food,
        scrap: s.scrap,
        night: Math.min(99, s.night),
        fuel: Math.round(s.fuel),
        phase: s.phase,
        phaseTime: Math.ceil(s.phaseTime),
        rescued: s.rescued,
        torch: s.torches.length > 0,
        lightOn: s.lightOn && s.battery > 0,
      });
    }

    drawScene(ctx, s, false);
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070f]">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="h-full w-full cursor-crosshair"
        style={{ imageRendering: 'auto' }}
      />

      {/* HUD */}
      {started && over === 'none' && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 w-[178px] space-y-1.5 sm:w-[220px]">
            <Bar
              icon={<Heart size={11} />}
              label="Health"
              value={hud.hp}
              color="from-rose-500 to-red-600"
              text={`${hud.hp}`}
            />
            <Bar
              icon={<span className="text-[10px]">🍓</span>}
              label="Hunger"
              value={hud.hunger}
              color="from-emerald-400 to-green-600"
              text={`${hud.hunger}`}
            />
            <Bar
              icon={<Battery size={11} />}
              label="Battery"
              value={hud.battery}
              color="from-cyan-400 to-blue-600"
              text={`${hud.battery}%`}
            />
            <Bar
              icon={<Flame size={11} />}
              label="Campfire"
              value={hud.fuel}
              color="from-amber-400 to-orange-600"
              text={`${hud.fuel}%`}
            />
          </div>

          {/* top center night counter */}
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest backdrop-blur-md ${
                hud.phase === 'night'
                  ? 'border-rose-500/40 bg-rose-950/70 text-rose-200'
                  : 'border-amber-400/40 bg-amber-950/60 text-amber-200'
              }`}
            >
              {hud.phase === 'night' ? '🌙 Night' : '☀️ Day'} {hud.phaseTime}s
            </div>
            <div className="mt-1 font-display text-lg font-black text-white drop-shadow-lg">
              Night <span className="text-amber-400">{hud.night}</span>
              <span className="text-xs font-semibold text-slate-400"> / 99</span>
            </div>
            <div className="mx-auto mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-500"
                style={{ width: `${(hud.night / 99) * 100}%` }}
              />
            </div>
          </div>

          {/* resources */}
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1.5 text-[11px] font-bold">
            <Chip emoji="🪵" value={hud.wood} label="Wood" />
            <Chip emoji="🍓" value={hud.food} label="Food" />
            <Chip emoji="⚙️" value={hud.scrap} label="Scrap" />
            <Chip emoji="👧" value={`${hud.rescued}/4`} label="Kids" highlight />
          </div>

          {/* crafting bar */}
          <div
            className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-white/10 bg-black/55 p-1.5 backdrop-blur-md sm:gap-2 sm:p-2 ${
              isTouch ? 'bottom-[150px]' : 'bottom-2.5'
            }`}
          >
            <CraftBtn hotkey="1" icon={<Swords size={14} />} label="Spike Trap" cost="8🪵" onClick={() => craft(1)} />
            <CraftBtn hotkey="2" icon={<Flame size={14} />} label="Torch" cost="5🪵 2⚙️" onClick={() => craft(2)} />
            <CraftBtn hotkey="3" icon={<Shield size={14} />} label="Medkit" cost="2🍓 2⚙️" onClick={() => craft(3)} />
            <CraftBtn hotkey="4" icon={<Battery size={14} />} label="Battery" cost="3⚙️" onClick={() => craft(4)} />
            <div className="mx-1 h-8 w-px bg-white/10" />
            <CraftBtn hotkey="E" icon={<Flame size={14} />} label="Feed Fire" cost="" onClick={feedFire} />
            <CraftBtn hotkey="R" icon={<span className="text-[12px]">🍓</span>} label="Eat" cost="" onClick={eat} />
          </div>

          {/* touch controls */}
          {isTouch && (
            <>
              <div
                className="absolute bottom-16 left-3 h-28 w-28 touch-none rounded-full border border-white/20 bg-black/35 backdrop-blur-sm"
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const cx = r.left + r.width / 2;
                  const cy = r.top + r.height / 2;
                  const dx = (e.clientX - cx) / (r.width / 2);
                  const dy = (e.clientY - cy) / (r.height / 2);
                  const len = Math.hypot(dx, dy) || 1;
                  const cl = Math.min(1, len);
                  touchMove.current = { x: (dx / len) * cl, y: (dy / len) * cl };
                }}
                onPointerMove={(e) => {
                  if (!e.buttons && e.pointerType !== 'touch') return;
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const cx = r.left + r.width / 2;
                  const cy = r.top + r.height / 2;
                  const dx = (e.clientX - cx) / (r.width / 2);
                  const dy = (e.clientY - cy) / (r.height / 2);
                  const len = Math.hypot(dx, dy) || 1;
                  const cl = Math.min(1, len);
                  touchMove.current = { x: (dx / len) * cl, y: (dy / len) * cl };
                }}
                onPointerUp={() => (touchMove.current = { x: 0, y: 0 })}
                onPointerCancel={() => (touchMove.current = { x: 0, y: 0 })}
                onPointerLeave={() => (touchMove.current = { x: 0, y: 0 })}
              >
                <div className="grid h-full w-full place-items-center">
                  <div className="h-10 w-10 rounded-full border border-white/25 bg-white/10" />
                </div>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-white/50">
                  Move
                </span>
              </div>

              <div className="absolute bottom-16 right-3 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <TouchBtn label="🔥" onClick={feedFire} />
                  <TouchBtn label="🍓" onClick={eat} />
                </div>
                <div className="flex gap-2">
                  <TouchBtn
                    label="🔦"
                    active={hud.lightOn}
                    onClick={() => (state.current.lightOn = !state.current.lightOn)}
                  />
                  <TouchBtn label="🪓" big onClick={doAttack} />
                </div>
              </div>
            </>
          )}

          {/* flashlight indicator */}
          <div className={`pointer-events-none absolute bottom-3 right-3 items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-bold text-slate-300 backdrop-blur ${isTouch ? 'hidden' : 'flex'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${hud.lightOn ? 'bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.8)]' : 'bg-slate-600'}`} />
            FLASHLIGHT {hud.lightOn ? 'ON' : 'OFF'} · Hold Space / RMB
          </div>
        </>
      )}

      {toast && started && (
        <div className="pointer-events-none absolute left-1/2 top-[86px] -translate-x-1/2 rounded-lg border border-white/15 bg-black/75 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl backdrop-blur animate-pop-in">
          {toast}
        </div>
      )}

      {/* Start screen */}
      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-black/70 via-black/60 to-black/85 p-6 text-center">
          <div className="max-w-md animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              ⭐ Klik Original · Survival Horror
            </div>
            <h2 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl">
              99 Nights in the Forest
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-300">
              Keep the campfire alive, shine your flashlight at the Wendigo, and rescue all 4 missing children to
              reach Night 99.
            </p>
            <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-1.5 text-left text-[10px] text-slate-300">
              {[
                ['WASD', 'Move'],
                ['Left Click', 'Chop / Attack'],
                ['Space / RMB', 'Flashlight'],
                ['E', 'Feed fire / Rescue'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
                  <kbd className="rounded bg-white/10 px-1 text-[9px] font-black text-white">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-rose-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Enter the Forest
            </button>
          </div>
        </div>
      )}

      {over !== 'none' && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">{over === 'won' ? '🏆🌅' : '💀'}</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">
              {over === 'won' ? 'You Survived 99 Nights!' : 'The Forest Took You'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {over === 'won'
                ? 'All 4 children are safe and the Wendigo has retreated into legend.'
                : `You reached Night ${hud.night} of 99 · ${hud.rescued}/4 children rescued.`}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-lg"
              >
                <RotateCcw size={15} /> Try Again
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200"
                >
                  More Games
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!started && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600">
          <Sparkles size={10} className="mr-1 inline" /> Original Klik production — all art & code built from scratch
        </div>
      )}
    </div>
  );
}

function spawnNight(s: N99State) {
  // Wendigo every night from night 2 onwards
  if (s.night >= 2) {
    const a = rand(0, Math.PI * 2);
    const r = rand(560, 720);
    const hp = 80 + s.night * 3.6;
    s.monsters.push({
      x: clamp(s.px + Math.cos(a) * r, 40, WORLD.w - 40),
      y: clamp(s.py + Math.sin(a) * r, 40, WORLD.h - 40),
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      speed: 74 + Math.min(52, s.night * 0.65),
      size: 26,
      kind: 'wendigo',
      hitCd: 2,
      flash: 0,
      stun: 0,
      phase: 0,
    });
  }
  const stalkers = 1 + Math.floor(s.night / 14);
  for (let i = 0; i < stalkers; i++) spawnStalker(s);
}

function spawnStalker(s: N99State) {
  const a = rand(0, Math.PI * 2);
  const r = rand(420, 660);
  const hp = 34 + s.night * 1.6;
  s.monsters.push({
    x: clamp(s.px + Math.cos(a) * r, 30, WORLD.w - 30),
    y: clamp(s.py + Math.sin(a) * r, 30, WORLD.h - 30),
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: 96 + Math.min(46, s.night * 0.6),
    size: 15,
    kind: 'stalker',
    hitCd: 1,
    flash: 0,
    stun: 0,
    phase: 0,
  });
}

function Bar({
  icon,
  label,
  value,
  color,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  text: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-300">
        <span className="flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="text-white">{text}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-200`}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TouchBtn({
  label,
  onClick,
  big,
  active,
}: {
  label: string;
  onClick: () => void;
  big?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid place-items-center rounded-full border text-lg backdrop-blur-sm transition-transform active:scale-90 ${
        big ? 'h-16 w-16' : 'h-12 w-12'
      } ${
        active
          ? 'border-cyan-300/70 bg-cyan-400/35 shadow-[0_0_18px_rgba(103,232,249,0.5)]'
          : 'border-white/20 bg-black/40'
      }`}
    >
      {label}
    </button>
  );
}

function Chip({ emoji, value, label, highlight }: { emoji: string; value: number | string; label: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 backdrop-blur-md ${
        highlight ? 'border-amber-400/40 bg-amber-500/15' : 'border-white/10 bg-black/50'
      }`}
      title={label}
    >
      <span className="text-[12px]">{emoji}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function CraftBtn({
  hotkey,
  icon,
  label,
  cost,
  onClick,
}: {
  hotkey: string;
  icon: React.ReactNode;
  label: string;
  cost: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
      title={`${label} ${cost}`}
    >
      <span className="absolute -left-0.5 -top-0.5 rounded bg-white/15 px-1 text-[8px] font-black text-white">
        {hotkey}
      </span>
      <span className="text-slate-200 group-hover:text-amber-300">{icon}</span>
      <span className="hidden text-[8.5px] font-bold uppercase tracking-wide text-slate-400 group-hover:text-white sm:block">
        {label}
      </span>
    </button>
  );
}

// ------------------------- rendering -------------------------
const darkCanvas: HTMLCanvasElement | null = null;

let darkLayerCanvas: HTMLCanvasElement | null = null;
function getDarkLayer() {
  if (!darkLayerCanvas) {
    darkLayerCanvas = document.createElement('canvas');
    darkLayerCanvas.width = W;
    darkLayerCanvas.height = H;
  }
  return darkLayerCanvas;
}

function drawScene(ctx: CanvasRenderingContext2D, s: N99State, idle: boolean) {
  const camX = clamp(s.px - W / 2, 0, WORLD.w - W);
  const camY = clamp(s.py - H / 2, 0, WORLD.h - H);
  const shakeX = s.shake > 0 ? rand(-6, 6) * (s.shake / 0.35) : 0;
  const shakeY = s.shake > 0 ? rand(-6, 6) * (s.shake / 0.35) : 0;

  ctx.save();
  ctx.translate(-camX + shakeX, -camY + shakeY);

  // ---- ground ----
  ctx.fillStyle = '#12261a';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // ground detail (deterministic dots)
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  for (let x = 0; x < WORLD.w; x += 46) {
    for (let y = 0; y < WORLD.h; y += 46) {
      const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (Math.abs(n) > 0.6) ctx.fillRect(x + 10, y + 14, 3, 3);
    }
  }

  // paths
  ctx.strokeStyle = 'rgba(120,95,60,0.25)';
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.moveTo(s.campX - 900, s.campY + 200);
  ctx.quadraticCurveTo(s.campX, s.campY + 40, s.campX + 900, s.campY - 120);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0, 0, WORLD.w, 6);

  // water pond
  ctx.fillStyle = '#153044';
  ctx.beginPath();
  ctx.ellipse(380, 1240, 170, 110, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,200,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(380, 1240, 140, 88, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ---- child cages (behind) ----
  for (const c of s.children) {
    if (c.rescued) continue;
    const pulse = 0.6 + Math.sin(s.time * 3) * 0.4;
    const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 90);
    g.addColorStop(0, `rgba(252,211,77,${0.35 * pulse})`);
    g.addColorStop(1, 'rgba(252,211,77,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 90, 0, Math.PI * 2);
    ctx.fill();
    // cage
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    ctx.strokeRect(c.x - 18, c.y - 24, 36, 40);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x - 18 + i * 12, c.y - 24);
      ctx.lineTo(c.x - 18 + i * 12, c.y + 16);
      ctx.stroke();
    }
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(c.x, c.y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(252,211,77,0.9)';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RESCUE [E]', c.x, c.y - 36);
  }

  // ---- traps ----
  for (const t of s.traps) {
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14);
      ctx.lineTo(t.x + Math.cos(a + 0.35) * 30, t.y + Math.sin(a + 0.35) * 30);
      ctx.lineTo(t.x + Math.cos(a + 0.7) * 14, t.y + Math.sin(a + 0.7) * 14);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- resource nodes ----
  for (const n of s.nodes) {
    if (!n.alive) continue;
    drawNode(ctx, n, s.time);
  }

  // ---- campfire ----
  drawCampfire(ctx, s);

  // ---- torches ----
  for (const t of s.torches) {
    ctx.fillStyle = '#6b4b2a';
    ctx.fillRect(t.x - 2, t.y - 6, 4, 22);
    const f = 0.75 + Math.sin(s.time * 12 + t.x) * 0.25;
    const g = ctx.createRadialGradient(t.x, t.y - 10, 2, t.x, t.y - 10, 40 * f);
    g.addColorStop(0, 'rgba(255,220,120,0.95)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 10, 40 * f, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- monsters ----
  for (const m of s.monsters) drawMonster(ctx, m, s.time);

  // ---- particles ----
  for (const p of s.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // ---- player ----
  drawPlayer(ctx, s);

  ctx.restore();

  // ---- darkness overlay (rendered on an offscreen layer so lights punch through) ----
  const sx = (x: number) => x - camX;
  const sy = (y: number) => y - camY;
  const nightAmt = s.phase === 'night' ? 0.9 : 0.22;
  if (!idle) {
    const layer = getDarkLayer();
    const dctx = layer.getContext('2d')!;
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = `rgba(4,7,18,${nightAmt})`;
    dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'destination-out';

    const cut = (x: number, y: number, r: number, strength = 1) => {
      if (r <= 0) return;
      const g = dctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.5, `rgba(0,0,0,${strength * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
      dctx.fill();
    };

    cut(s.px, s.py, 150, 0.55);
    if (s.fuel > 0) cut(s.campX, s.campY, 130 + s.fuel * 2.6, 1);
    for (const t of s.torches) cut(t.x, t.y, 160, 0.9);
    for (const c of s.children) if (!c.rescued) cut(c.x, c.y, 120, 0.75);

    // flashlight cone
    if (s.lightOn && s.battery > 0) {
      const a = s.aim;
      dctx.beginPath();
      dctx.moveTo(sx(s.px), sy(s.py));
      dctx.arc(sx(s.px), sy(s.py), 350, a - 0.48, a + 0.48);
      dctx.closePath();
      const lg = dctx.createRadialGradient(sx(s.px), sy(s.py), 10, sx(s.px), sy(s.py), 350);
      lg.addColorStop(0, 'rgba(0,0,0,1)');
      lg.addColorStop(0.65, 'rgba(0,0,0,0.9)');
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = lg;
      dctx.fill();
    }
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer, 0, 0, W, H);

    // additive warm glow recoloring
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (s.fuel > 0) {
      const r = 130 + s.fuel * 2.6;
      const g = ctx.createRadialGradient(sx(s.campX), sy(s.campY), 0, sx(s.campX), sy(s.campY), r);
      g.addColorStop(0, 'rgba(255,150,50,0.20)');
      g.addColorStop(0.4, 'rgba(255,120,30,0.08)');
      g.addColorStop(1, 'rgba(255,100,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx(s.campX), sy(s.campY), r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of s.torches) {
      const g = ctx.createRadialGradient(sx(t.x), sy(t.y), 0, sx(t.x), sy(t.y), 160);
      g.addColorStop(0, 'rgba(255,160,60,0.16)');
      g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx(t.x), sy(t.y), 160, 0, Math.PI * 2);
      ctx.fill();
    }
    // flashlight beam glow
    if (s.lightOn && s.battery > 0) {
      const a = s.aim;
      ctx.beginPath();
      ctx.moveTo(sx(s.px), sy(s.py));
      ctx.arc(sx(s.px), sy(s.py), 340, a - 0.5, a + 0.5);
      ctx.closePath();
      const lg = ctx.createRadialGradient(sx(s.px), sy(s.py), 10, sx(s.px), sy(s.py), 340);
      lg.addColorStop(0, 'rgba(200,235,255,0.22)');
      lg.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = lg;
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- hurt flash ----
  if (s.hurtFlash > 0) {
    ctx.fillStyle = `rgba(220,38,38,${s.hurtFlash * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- night / dawn transitions ----
  if (s.nightFlash > 0) {
    ctx.fillStyle = `rgba(2,4,12,${s.nightFlash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.dawnFlash > 0) {
    ctx.fillStyle = `rgba(255,190,120,${s.dawnFlash * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- compass to nearest child ----
  if (!idle && !s.won && s.rescued < CHILD_COUNT) {
    let target = s.children.find((c) => !c.rescued);
    let best = Infinity;
    for (const c of s.children) {
      if (c.rescued) continue;
      const d = Math.hypot(c.x - s.px, c.y - s.py);
      if (d < best) {
        best = d;
        target = c;
      }
    }
    if (target) {
      const a = Math.atan2(target.y - s.py, target.x - s.px);
      const cx = W / 2 + Math.cos(a) * Math.min(200, best);
      const cy = H / 2 + Math.sin(a) * Math.min(200, best);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = 'rgba(252,211,77,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(252,211,77,0.8)';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(best / 10)}m`, cx, cy + 22);
    }
  }
}

function drawCampfire(ctx: CanvasRenderingContext2D, s: N99State) {
  const x = s.campX;
  const y = s.campY;
  // stones
  ctx.fillStyle = '#4b5563';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 36, y + Math.sin(a) * 30, 9, 7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // logs
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 10);
  ctx.lineTo(x + 18, y - 10);
  ctx.moveTo(x - 18, y - 10);
  ctx.lineTo(x + 18, y + 10);
  ctx.stroke();

  if (s.fuel > 0) {
    const f = (s.fuel / 100) * 0.5 + 0.5;
    for (let i = 0; i < 3; i++) {
      const fh = (36 + Math.sin(s.time * 14 + i * 2) * 9) * f;
      const fx = x + Math.sin(s.time * 9 + i * 1.7) * 5;
      const g = ctx.createLinearGradient(fx, y, fx, y - fh);
      g.addColorStop(0, '#fbbf24');
      g.addColorStop(0.6, '#f97316');
      g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - 12 + i * 2, y + 4);
      ctx.quadraticCurveTo(fx - 4, y - fh * 0.6, fx + Math.sin(s.time * 11 + i) * 6, y - fh);
      ctx.quadraticCurveTo(fx + 10, y - fh * 0.5, fx + 12 - i * 2, y + 4);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(120,120,130,0.5)';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE OUT — press E with wood', x, y - 20);
  }

  // tent
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(x - 120, y + 40);
  ctx.lineTo(x - 80, y - 40);
  ctx.lineTo(x - 40, y + 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x - 80, y - 40);
  ctx.lineTo(x - 68, y + 40);
  ctx.lineTo(x - 51, y + 40);
  ctx.closePath();
  ctx.fill();
}

function drawNode(ctx: CanvasRenderingContext2D, n: ResNode, t: number) {
  const sc = n.scale;
  if (n.type === 'tree') {
    const sway = Math.sin(t * 0.9 + n.x * 0.01) * 2;
    ctx.fillStyle = '#3f2d20';
    ctx.fillRect(n.x - 5 * sc, n.y - 10, 10 * sc, 26 * sc);
    const layers = [
      { y: -70, w: 34, c: '#14532d' },
      { y: -46, w: 44, c: '#166534' },
      { y: -20, w: 52, c: '#15803d' },
    ];
    for (const l of layers) {
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.moveTo(n.x + sway, n.y + l.y * sc);
      ctx.lineTo(n.x - l.w * sc + sway * 0.5, n.y + (l.y + 46) * sc);
      ctx.lineTo(n.x + l.w * sc + sway * 0.5, n.y + (l.y + 46) * sc);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(74,222,128,0.25)';
    ctx.beginPath();
    ctx.arc(n.x + 14 * sc, n.y - 40 * sc, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (n.type === 'bush') {
    ctx.fillStyle = '#166534';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(n.x + Math.cos(a) * 9 * sc, n.y + Math.sin(a) * 7 * sc, 11 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f43f5e';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(n.x - 7 + i * 7, n.y - 4 + (i % 2) * 6, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (n.type === 'rock') {
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.moveTo(n.x - 20, n.y + 12);
    ctx.lineTo(n.x - 10, n.y - 14);
    ctx.lineTo(n.x + 8, n.y - 18);
    ctx.lineTo(n.x + 21, n.y + 4);
    ctx.lineTo(n.x + 12, n.y + 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(n.x - 6, n.y - 12);
    ctx.lineTo(n.x + 7, n.y - 15);
    ctx.lineTo(n.x + 2, n.y - 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#7c5a34';
    ctx.fillRect(n.x - 16, n.y - 14, 32, 28);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(n.x - 16, n.y - 14, 32, 6);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(n.x - 16, n.y + 14);
    ctx.lineTo(n.x + 16, n.y + 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(250,204,21,0.75)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', n.x, n.y + 6);
  }
}

function drawMonster(ctx: CanvasRenderingContext2D, m: Monster, t: number) {
  ctx.save();
  ctx.translate(m.x, m.y);
  if (m.flash > 0) ctx.globalAlpha = 0.55 + Math.sin(t * 60) * 0.35;

  if (m.kind === 'wendigo') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, m.size + 8, m.size * 0.9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(0, 0, m.size * 0.62, m.size * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // long arms
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const swing = Math.sin(m.phase) * 0.35;
    ctx.beginPath();
    ctx.moveTo(-m.size * 0.5, -m.size * 0.4);
    ctx.lineTo(-m.size * 0.95, m.size * 0.7 + swing * 16);
    ctx.moveTo(m.size * 0.5, -m.size * 0.4);
    ctx.lineTo(m.size * 0.95, m.size * 0.7 - swing * 16);
    ctx.stroke();
    // legs
    ctx.beginPath();
    ctx.moveTo(-m.size * 0.25, m.size * 0.85);
    ctx.lineTo(-m.size * 0.38, m.size * 1.55);
    ctx.moveTo(m.size * 0.25, m.size * 0.85);
    ctx.lineTo(m.size * 0.38, m.size * 1.55);
    ctx.stroke();
    // antlers
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3.4;
    const ant = [
      [[-6, -m.size * 1.0], [-20, -m.size * 1.5], [-16, -m.size * 1.9]],
      [[-4, -m.size * 1.1], [-9, -m.size * 1.7], [-2, -m.size * 2.0]],
      [[6, -m.size * 1.0], [20, -m.size * 1.5], [16, -m.size * 1.9]],
      [[4, -m.size * 1.1], [9, -m.size * 1.7], [2, -m.size * 2.0]],
    ];
    for (const a of ant) {
      ctx.beginPath();
      ctx.moveTo(a[0][0], a[0][1]);
      ctx.lineTo(a[1][0], a[1][1]);
      ctx.lineTo(a[2][0], a[2][1]);
      ctx.stroke();
    }
    // deer skull head
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(0, -m.size * 0.85, m.size * 0.36, m.size * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    // glowing eyes
    const glow = 0.7 + Math.sin(t * 6) * 0.3;
    for (const ex of [-m.size * 0.15, m.size * 0.15]) {
      const g = ctx.createRadialGradient(ex, -m.size * 0.9, 0, ex, -m.size * 0.9, 14);
      g.addColorStop(0, `rgba(255,255,255,${glow})`);
      g.addColorStop(0.3, `rgba(190,242,255,${glow * 0.85})`);
      g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, -m.size * 0.9, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(ex, -m.size * 0.9, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, m.size + 3, m.size * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, m.size * 1.6);
    g.addColorStop(0, 'rgba(30,20,45,1)');
    g.addColorStop(1, 'rgba(10,5,20,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, m.size * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, m.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(244,63,94,${0.7 + Math.sin(m.phase) * 0.3})`;
    ctx.beginPath();
    ctx.arc(-4, -3, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -3, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // wispy tendrils
    ctx.strokeStyle = 'rgba(76,29,149,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, m.size + 4 + i * 4 + Math.sin(m.phase + i) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // hp bar
  if (m.hp < m.maxHp) {
    const w = m.kind === 'wendigo' ? 66 : 34;
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-w / 2, -m.size * 2.3, w, 4);
    ctx.fillStyle = m.kind === 'wendigo' ? '#f43f5e' : '#a78bfa';
    ctx.fillRect(-w / 2, -m.size * 2.3, (w * m.hp) / m.maxHp, 4);
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: N99State) {
  const x = s.px;
  const y = s.py;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // flashlight glow under player
  if (s.lightOn && s.battery > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.aim);
    const g = ctx.createLinearGradient(0, 0, 150, 0);
    g.addColorStop(0, 'rgba(224,242,254,0.28)');
    g.addColorStop(1, 'rgba(224,242,254,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(150, -45);
    ctx.lineTo(150, 45);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // body
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.roundRect(x - 11, y - 12, 22, 24, 7);
  ctx.fill();
  // backpack
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.ellipse(x - 9, y - 2, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = '#f5c99b';
  ctx.beginPath();
  ctx.arc(x, y - 18, 9, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = '#3b2415';
  ctx.beginPath();
  ctx.arc(x, y - 21, 9, Math.PI, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(x + 3, y - 17, 1.4, 0, Math.PI * 2);
  ctx.arc(x - 1, y - 17, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // axe / swing
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.rotate(s.aim);
  const swing = s.attackAnim > 0 ? (1 - s.attackAnim / 0.28) * 1.9 - 0.7 : 0;
  ctx.rotate(swing);
  ctx.strokeStyle = '#8b5e34';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(30, 2);
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(26, -6);
  ctx.lineTo(36, 2);
  ctx.lineTo(26, 10);
  ctx.closePath();
  ctx.fill();
  if (s.attackAnim > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${s.attackAnim / 0.28 * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}
