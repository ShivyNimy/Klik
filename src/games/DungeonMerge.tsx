import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Swords, Trophy, Coins, Play } from 'lucide-react';
import { sfx } from '../utils/sound';

const TIERS = [
  { name: 'Rusty Dagger', icon: '🗡️', color: 'from-stone-600 to-stone-800', text: 'text-stone-200' },
  { name: 'Iron Sword', icon: '⚔️', color: 'from-slate-500 to-slate-700', text: 'text-white' },
  { name: 'Steel Axe', icon: '🪓', color: 'from-emerald-600 to-emerald-800', text: 'text-emerald-100' },
  { name: 'Runic Blade', icon: '🔷', color: 'from-sky-600 to-blue-800', text: 'text-sky-100' },
  { name: 'Frost Spear', icon: '🌊', color: 'from-cyan-500 to-teal-700', text: 'text-cyan-50' },
  { name: 'Flame Bow', icon: '🔥', color: 'from-orange-500 to-red-700', text: 'text-orange-50' },
  { name: 'Void Scythe', icon: '🌌', color: 'from-violet-600 to-purple-900', text: 'text-violet-100' },
  { name: 'Dragon Fang', icon: '🐉', color: 'from-amber-400 to-orange-700', text: 'text-amber-50' },
  { name: 'Mythic Excalibur', icon: '👑', color: 'from-fuchsia-500 to-rose-700', text: 'text-white' },
];

interface Tile {
  id: number;
  tier: number;
  isNew?: boolean;
  merged?: boolean;
}

const BOSSES = [
  { name: 'Goblin Warlord', icon: '👺', hp: 260 },
  { name: 'Skeleton King', icon: '💀', hp: 620 },
  { name: 'Cave Troll', icon: '🧟', hp: 1300 },
  { name: 'Crimson Wyvern', icon: '🐲', hp: 2600 },
  { name: 'Lich Archmage', icon: '🧙‍♂️', hp: 5000 },
  { name: 'Shadow Titan', icon: '👹', hp: 9200 },
];

let uid = 1;

export default function DungeonMerge() {
  const [started, setStarted] = useState(false);
  const [grid, setGrid] = useState<(Tile | null)[][]>([]);
  const [score, setScore] = useState(0);
  const [gold, setGold] = useState(0);
  const [bestTier, setBestTier] = useState(0);
  const [bossIdx, setBossIdx] = useState(0);
  const [bossHp, setBossHp] = useState(260);
  const [bossMaxHp, setBossMaxHp] = useState(260);
  const [over, setOver] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<number>(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const showBanner = (msg: string) => {
    setBanner(msg);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 1500);
  };

  const empty = (): (Tile | null)[][] => Array.from({ length: 4 }, () => Array(4).fill(null));

  const addTile = (g: (Tile | null)[][], tier?: number) => {
    const spots: [number, number][] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g[r][c]) spots.push([r, c]);
    if (!spots.length) return;
    const [r, c] = spots[Math.floor(Math.random() * spots.length)];
    g[r][c] = { id: uid++, tier: tier ?? (Math.random() < 0.86 ? 0 : 1), isNew: true };
  };

  const reset = useCallback(() => {
    const g = empty();
    addTile(g);
    addTile(g);
    setGrid(g);
    setScore(0);
    setGold(0);
    setBestTier(0);
    setBossIdx(0);
    setBossHp(BOSSES[0].hp);
    setBossMaxHp(BOSSES[0].hp);
    setOver(false);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  const handleBoss = (dmg: number) => {
    const nextHp = bossHp - dmg;
    if (nextHp <= 0) {
      const nextIdx = Math.min(bossIdx + 1, BOSSES.length - 1);
      const newHp = BOSSES[nextIdx].hp;
      const reward = Math.round(BOSSES[bossIdx].hp / 10);
      setBossIdx(nextIdx);
      setBossMaxHp(newHp);
      setBossHp(newHp);
      setGold((gg) => gg + reward);
      showBanner(`${BOSSES[bossIdx].icon} ${BOSSES[bossIdx].name} slain! +${reward} gold`);
      sfx.powerup();
    } else {
      setBossHp(nextHp);
    }
  };

  const move = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (!grid.length || over) return;
      const size = 4;
      let moved = false;
      let gained = 0;
      let mergeDmg = 0;
      let highest = bestTier;

      const next: (Tile | null)[][] = grid.map((row) => row.map((t) => (t ? { ...t, isNew: false, merged: false } : null)));

      const line = (idx: number) => {
        const cells: (Tile | null)[] = [];
        for (let i = 0; i < size; i++) {
          if (dir === 'left' || dir === 'right') cells.push(next[idx][i]);
          else cells.push(next[i][idx]);
        }
        if (dir === 'right' || dir === 'down') cells.reverse();
        const compact = cells.filter(Boolean) as Tile[];
        const result: Tile[] = [];
        for (let i = 0; i < compact.length; i++) {
          if (i + 1 < compact.length && compact[i].tier === compact[i + 1].tier) {
            const newTier = Math.min(TIERS.length - 1, compact[i].tier + 1);
            result.push({ id: uid++, tier: newTier, merged: true });
            gained += Math.pow(2, newTier);
            mergeDmg += Math.pow(1.9, newTier) * 1.6;
            highest = Math.max(highest, newTier);
            i++;
            moved = true;
          } else {
            result.push({ ...compact[i], merged: false });
          }
        }
        while (result.length < size) result.push(null as unknown as Tile);
        if (dir === 'right' || dir === 'down') result.reverse();
        for (let i = 0; i < size; i++) {
          const before = dir === 'left' || dir === 'right' ? next[idx][i] : next[i][idx];
          const after = result[i];
          if (before && after && before.id !== after.id) moved = true;
          if (!before && after) moved = true;
          if (dir === 'left' || dir === 'right') next[idx][i] = after;
          else next[i][idx] = after;
        }
      };

      for (let i = 0; i < size; i++) line(i);

      if (!moved) {
        sfx.playTone(180, 0.08, 'triangle', 0.06);
        return;
      }

      addTile(next);
      setGrid(next);
      if (gained) {
        setScore((s) => s + gained);
        setBestTier(highest);
        handleBoss(Math.round(mergeDmg));
        sfx.coin();
      } else {
        sfx.click();
      }

      // game over check
      const full = next.every((row) => row.every(Boolean));
      if (full) {
        let canMove = false;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const t = next[r][c];
            if (!t) canMove = true;
            else if (c < 3 && next[r][c + 1] && next[r][c + 1]!.tier === t.tier) canMove = true;
            else if (r < 3 && next[r + 1][c] && next[r + 1][c]!.tier === t.tier) canMove = true;
          }
        }
        if (!canMove) {
          setOver(true);
          sfx.gameOver();
        }
      }
    },
    [grid, over, bestTier, bossIdx, bossHp]
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        arrowup: 'up',
        arrowdown: 'down',
        arrowleft: 'left',
        arrowright: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };
      const dir = map[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, started]);

  const boss = BOSSES[bossIdx];
  const hpPct = Math.max(0, (bossHp / bossMaxHp) * 100);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-[#140b1f] p-3"
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
        touchStart.current = null;
      }}
    >
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-52 w-52 rounded-full bg-amber-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[520px]">
        {/* boss bar */}
        <div className="mb-2 rounded-xl border border-white/10 bg-black/40 p-2.5 backdrop-blur">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-300">
            <span className="flex items-center gap-1.5">
              <Swords size={12} /> Boss {bossIdx + 1}
            </span>
            <span className="text-slate-400">
              {Math.max(0, Math.ceil(bossHp))} / {bossMaxHp} HP
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg">{boss.icon}</span>
            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-1 text-center text-[10px] font-bold text-slate-400">{boss.name}</div>
        </div>

        {/* stats */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white">
            <Trophy size={12} className="text-amber-400" /> {score.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white">
            <Coins size={12} className="text-yellow-400" /> {Math.round(gold)}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white">
            {TIERS[bestTier].icon} {TIERS[bestTier].name}
          </div>
          <button
            onClick={reset}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            title="New dungeon"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* grid */}
        <div className="relative rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#2a1d13] to-[#160e0b] p-2 shadow-2xl shadow-black/60">
          <div className="grid grid-cols-4 gap-1.5">
            {grid.flatMap((row, r) =>
              row.map((tile, c) => {
                const t = tile ? TIERS[tile.tier] : null;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative flex aspect-square items-center justify-center rounded-xl transition-all duration-150 ${
                      tile
                        ? `bg-gradient-to-br ${t!.color} shadow-lg shadow-black/40 ${
                            tile.merged ? 'ring-2 ring-amber-300' : 'ring-1 ring-white/10'
                          }`
                        : 'bg-black/35 ring-1 ring-white/5'
                    } ${tile?.isNew ? 'animate-pop-in' : ''}`}
                  >
                    {tile && t && (
                      <div className="flex flex-col items-center">
                        <span className="text-xl leading-none sm:text-2xl">{t.icon}</span>
                        <span className={`mt-0.5 text-[7.5px] font-black uppercase leading-tight ${t.text} opacity-90`}>
                          {t.name.split(' ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {over && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/80 backdrop-blur-sm">
              <div className="text-center animate-pop-in">
                <div className="text-3xl">⚒️</div>
                <h4 className="mt-1 font-display text-lg font-black text-white">Forge Overloaded</h4>
                <p className="text-[11px] text-slate-300">Score {score.toLocaleString()}</p>
                <button
                  onClick={reset}
                  className="mt-2 rounded-lg bg-gradient-to-r from-amber-500 to-purple-600 px-4 py-2 text-xs font-black text-white"
                >
                  Forge Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>Swipe or use arrow keys / WASD</span>
          <span>Merge matching weapons to strike the boss</span>
        </div>
      </div>

      {banner && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-[11px] font-black text-amber-200 backdrop-blur animate-pop-in">
          {banner}
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-purple-950/85 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              ⚒️ Merge RPG Puzzle
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Dungeon Forge Merge</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Slide and merge enchanted weapons from Rusty Daggers up to Mythic Excalibur. Every merge lands a hit on
              the dungeon boss!
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-purple-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Enter the Forge
            </button>
            <p className="mt-3 text-[10px] text-slate-400">Arrow keys / WASD / swipe to slide</p>
          </div>
        </div>
      )}
    </div>
  );
}
