import { useEffect, useRef, useState } from 'react';
import { Play, Sparkles, Coins, Zap, RotateCcw, Star } from 'lucide-react';
import { sfx } from '../utils/sound';
import { formatNum } from './engine';

interface Gen {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  rate: number;
  desc: string;
  count: number;
}

interface ClickUp {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  power: number;
  level: number;
}

const GEN_DEFS: Gen[] = [
  { id: 'pick', name: 'Goblin Driller', icon: '⛏️', baseCost: 25, rate: 1, desc: 'A tiny goblin with a pickaxe', count: 0 },
  { id: 'cart', name: 'Mine Cart Crew', icon: '🛒', baseCost: 140, rate: 6, desc: 'Rolling ore out of the cavern', count: 0 },
  { id: 'golem', name: 'Arcane Golem', icon: '🗿', baseCost: 900, rate: 30, desc: 'Punches crystal veins for you', count: 0 },
  { id: 'drill', name: 'Quantum Drill', icon: '🛠️', baseCost: 5600, rate: 160, desc: 'Bores through reality itself', count: 0 },
  { id: 'portal', name: 'Portal Refinery', icon: '🌀', baseCost: 32000, rate: 900, desc: 'Imports crystals from other realms', count: 0 },
  { id: 'star', name: 'Star Forge', icon: '🌟', baseCost: 180000, rate: 5200, desc: 'Condenses starlight into gems', count: 0 },
];

const CLICK_DEFS: ClickUp[] = [
  { id: 'glove', name: 'Enchanted Gloves', icon: '🧤', baseCost: 20, power: 2, level: 0 },
  { id: 'chisel', name: 'Runic Chisel', icon: '🔨', baseCost: 260, power: 12, level: 0 },
  { id: 'gauntlet', name: 'Golem Gauntlet', icon: '🦾', baseCost: 3200, power: 90, level: 0 },
  { id: 'cosmic', name: 'Cosmic Touch', icon: '✨', baseCost: 42000, power: 700, level: 0 },
];

export default function CrystalTycoon() {
  const [started, setStarted] = useState(false);
  const [gems, setGems] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [gens, setGens] = useState<Gen[]>(GEN_DEFS.map((g) => ({ ...g })));
  const [clicks, setClicks] = useState<ClickUp[]>(CLICK_DEFS.map((c) => ({ ...c })));
  const [meteor, setMeteor] = useState<{ x: number; y: number } | null>(null);
  const [frenzy, setFrenzy] = useState(0);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; v: number }[]>([]);
  const areaRef = useRef<HTMLDivElement>(null);
  const popId = useRef(0);

  const clickPower = 1 + clicks.reduce((sum, c) => sum + c.power * c.level, 0);
  const perSec = gens.reduce((sum, g) => sum + g.rate * g.count, 0) * (1 + frenzy * 0.5);

  // passive income tick
  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => {
      if (perSec <= 0) return;
      setGems((g) => g + perSec / 5);
      setLifetime((l) => l + perSec / 5);
    }, 200);
    return () => window.clearInterval(t);
  }, [perSec, started]);

  useEffect(() => {
    if (frenzy <= 0) return;
    const t = window.setTimeout(() => setFrenzy((f) => f - 1), 1000);
    return () => window.clearTimeout(t);
  }, [frenzy]);

  // random golden meteor
  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => {
      if (Math.random() < 0.55) {
        setMeteor({ x: 15 + Math.random() * 70, y: 15 + Math.random() * 60 });
      }
    }, 9000);
    return () => window.clearInterval(t);
  }, [started]);

  const addPop = (x: number, y: number, v: number) => {
    const id = popId.current++;
    setPops((p) => [...p, { id, x, y, v }]);
    window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 900);
  };

  const mine = (e: React.MouseEvent) => {
    if (!started) return;
    const rect = areaRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : 100;
    const y = rect ? e.clientY - rect.top : 100;
    let amount = clickPower * (1 + frenzy * 0.5);
    if (Math.random() < 0.18) {
      amount *= 5;
      addPop(x, y - 14, amount);
      sfx.powerup();
    } else {
      addPop(x, y, amount);
      sfx.click();
    }
    setGems((g) => g + amount);
    setLifetime((l) => l + amount);
  };

  const buyGen = (id: string) => {
    const gen = gens.find((g) => g.id === id);
    if (!gen) return;
    const cost = Math.floor(gen.baseCost * Math.pow(1.16, gen.count));
    if (gems < cost) {
      sfx.playTone(180, 0.1, 'triangle', 0.07);
      return;
    }
    setGems((g) => g - cost);
    setGens((gs) => gs.map((g) => (g.id === id ? { ...g, count: g.count + 1 } : g)));
    sfx.coin();
  };

  const buyClick = (id: string) => {
    const up = clicks.find((c) => c.id === id);
    if (!up) return;
    const cost = Math.floor(up.baseCost * Math.pow(1.55, up.level));
    if (gems < cost) {
      sfx.playTone(180, 0.1, 'triangle', 0.07);
      return;
    }
    setGems((g) => g - cost);
    setClicks((cs) => cs.map((c) => (c.id === id ? { ...c, level: c.level + 1 } : c)));
    sfx.powerup();
  };

  const grabMeteor = () => {
    const bonus = Math.max(clickPower * 30, perSec * 45, 50);
    setGems((g) => g + bonus);
    setLifetime((l) => l + bonus);
    setMeteor(null);
    setFrenzy(8);
    sfx.powerup();
  };

  const reset = () => {
    setGems(0);
    setLifetime(0);
    setGens(GEN_DEFS.map((g) => ({ ...g })));
    setClicks(CLICK_DEFS.map((c) => ({ ...c })));
    setFrenzy(0);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-[#120a22] p-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-amber-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[920px] flex-1 gap-3 md:grid-cols-[1fr_340px]">
        {/* left: mine area */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-black text-white">
                {formatNum(gems)} <span className="text-sm text-purple-300">gems</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-400">+{formatNum(perSec)} / sec</div>
            </div>
            <div className="flex items-center gap-1.5">
              {frenzy > 0 && (
                <span className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-black text-amber-300 ring-1 ring-amber-400/40">
                  <Zap size={11} /> FRENZY ×{frenzy}
                </span>
              )}
              <button
                onClick={reset}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                title="Reset mines"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          <div
            ref={areaRef}
            onClick={mine}
            className="relative flex flex-1 cursor-pointer select-none items-center justify-center overflow-hidden rounded-2xl border border-purple-800/40 bg-gradient-to-b from-[#241441] via-[#160d2c] to-[#0c0718] shadow-2xl shadow-black/60"
            style={{ minHeight: 260 }}
          >
            {/* cavern decorations */}
            <div className="pointer-events-none absolute inset-0 opacity-60">
              {Array.from({ length: 22 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300/70"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 100}%`,
                    boxShadow: '0 0 8px 2px rgba(103,232,249,0.55)',
                  }}
                />
              ))}
            </div>

            <div className={`relative text-center ${started ? 'active:scale-95' : ''} transition-transform`}>
              <div
                className={`text-[100px] leading-none drop-shadow-[0_0_40px_rgba(168,85,247,0.85)] ${
                  frenzy > 0 ? 'animate-pulse' : 'animate-float'
                }`}
              >
                💎
              </div>
              <div className="mt-1 font-display text-sm font-black uppercase tracking-widest text-purple-200">
                Enchanted Crystal Vein
              </div>
              <div className="text-[11px] font-bold text-purple-400">
                Tap to mine · +{formatNum(clickPower)} per strike
              </div>
            </div>

            {meteor && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  grabMeteor();
                }}
                className="absolute z-20 animate-bounce text-3xl drop-shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                style={{ left: `${meteor.x}%`, top: `${meteor.y}%` }}
                title="Golden meteor!"
              >
                🌟
              </button>
            )}

            {pops.map((p) => (
              <span
                key={p.id}
                className="pointer-events-none absolute z-20 text-sm font-black text-amber-300 drop-shadow"
                style={{ left: p.x, top: p.y, animation: 'fadeUp 0.9s ease-out forwards' }}
              >
                +{formatNum(p.v)}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {clicks.map((c) => {
              const cost = Math.floor(c.baseCost * Math.pow(1.55, c.level));
              const afford = gems >= cost;
              return (
                <button
                  key={c.id}
                  onClick={() => buyClick(c.id)}
                  disabled={!afford}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    afford
                      ? 'border-amber-400/30 bg-amber-500/10 hover:scale-[1.02] hover:border-amber-400/60'
                      : 'cursor-not-allowed border-white/5 bg-white/[0.03] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{c.icon}</span>
                    <span className="rounded bg-black/40 px-1 text-[9px] font-black text-slate-300">Lv {c.level}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-bold text-white">{c.name}</div>
                  <div className="text-[9px] font-semibold text-amber-300">💎 {formatNum(cost)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: generators */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-2.5 backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
            <Sparkles size={12} /> Automation
          </div>
          <div className="space-y-1.5">
            {gens.map((g) => {
              const cost = Math.floor(g.baseCost * Math.pow(1.16, g.count));
              const afford = gems >= cost;
              return (
                <button
                  key={g.id}
                  onClick={() => buyGen(g.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                    afford
                      ? 'border-purple-400/25 bg-purple-500/10 hover:border-purple-400/60 hover:bg-purple-500/20'
                      : 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-55'
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/40 text-base">
                    {g.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-bold text-white">{g.name}</span>
                      <span className="shrink-0 rounded bg-black/40 px-1 text-[9px] font-black text-purple-200">
                        ×{g.count}
                      </span>
                    </span>
                    <span className="block truncate text-[9px] text-slate-400">{g.desc}</span>
                    <span className="mt-0.5 flex items-center justify-between text-[9.5px] font-bold">
                      <span className={afford ? 'text-amber-300' : 'text-slate-500'}>💎 {formatNum(cost)}</span>
                      <span className="text-emerald-400">+{formatNum(g.rate * (1 + frenzy * 0.5))}/s</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-xl bg-gradient-to-br from-purple-600/25 to-amber-500/10 p-2 text-center ring-1 ring-purple-400/20">
            <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-purple-200">
              <Star size={10} /> Lifetime
            </div>
            <div className="font-display text-sm font-black text-white">{formatNum(lifetime)} gems</div>
          </div>
        </div>
      </div>

      {!started && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-purple-950/90 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
              💎 Idle Tycoon
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Crystal Mine Tycoon</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Tap the enchanted crystal, hire goblin drillers and arcane golems, and turn a single pickaxe into a
              trans-dimensional mining empire.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-amber-500 px-7 py-3 text-sm font-black text-white shadow-xl shadow-purple-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Start Mining
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Coins size={11} /> Click the crystal · buy upgrades · grab golden meteors
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
