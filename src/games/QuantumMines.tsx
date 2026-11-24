import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, Bomb, Timer, RotateCcw, Play, Trophy } from 'lucide-react';
import { sfx } from '../utils/sound';

type Cell = {
  mine: boolean;
  open: boolean;
  flag: boolean;
  adj: number;
  boom?: boolean;
};

const LEVELS = [
  { id: 'easy', name: 'Cadet', cols: 9, rows: 9, mines: 10, color: 'from-emerald-500 to-teal-600' },
  { id: 'medium', name: 'Agent', cols: 12, rows: 12, mines: 24, color: 'from-sky-500 to-indigo-600' },
  { id: 'hard', name: 'Quantum', cols: 16, rows: 14, mines: 42, color: 'from-fuchsia-500 to-rose-600' },
];

const NUM_COLORS = [
  '',
  'text-sky-400',
  'text-emerald-400',
  'text-amber-400',
  'text-orange-400',
  'text-rose-400',
  'text-cyan-300',
  'text-violet-300',
  'text-slate-300',
];

export default function QuantumMines() {
  const [started, setStarted] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [status, setStatus] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [best, setBest] = useState<Record<string, number>>({});
  const [seed, setSeed] = useState(0);
  const timerRef = useRef<number | null>(null);

  const level = LEVELS[levelIdx];

  const build = useCallback(
    (li: number) => {
      const lv = LEVELS[li];
      setGrid(
        Array.from({ length: lv.rows }, () =>
          Array.from({ length: lv.cols }, () => ({ mine: false, open: false, flag: false, adj: 0 }))
        )
      );
      setStatus('ready');
      setTime(0);
      if (timerRef.current) window.clearInterval(timerRef.current);
      setSeed((s) => s + 1);
    },
    []
  );

  useEffect(() => {
    if (started) build(levelIdx);
  }, [started, levelIdx, build]);

  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(() => setTime((t) => t + 1), 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
  }, [status]);

  const plantMines = (g: Cell[][], safeR: number, safeC: number) => {
    let placed = 0;
    const safeZone = new Set<string>();
    for (let r = safeR - 1; r <= safeR + 1; r++) {
      for (let c = safeC - 1; c <= safeC + 1; c++) safeZone.add(`${r},${c}`);
    }
    while (placed < level.mines) {
      const r = Math.floor(Math.random() * level.rows);
      const c = Math.floor(Math.random() * level.cols);
      if (g[r][c].mine || safeZone.has(`${r},${c}`)) continue;
      if (placed >= level.rows * level.cols - safeZone.size) break;
      g[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && rr < level.rows && cc >= 0 && cc < level.cols && g[rr][cc].mine) n++;
          }
        g[r][c].adj = n;
      }
    }
    return g;
  };

  const floodReveal = (g: Cell[][], r: number, c: number) => {
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const cell = g[cr]?.[cc];
      if (!cell || cell.open || cell.flag) continue;
      cell.open = true;
      if (cell.adj === 0 && !cell.mine) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (dr || dc) {
              const rr = cr + dr;
              const cc2 = cc + dc;
              if (rr >= 0 && rr < level.rows && cc2 >= 0 && cc2 < level.cols && !g[rr][cc2].open) {
                stack.push([rr, cc2]);
              }
            }
          }
      }
    }
  };

  const checkWin = (g: Cell[][]) => {
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        if (!g[r][c].mine && !g[r][c].open) return false;
      }
    }
    return true;
  };

  const reveal = (r: number, c: number) => {
    let g = grid.map((row) => row.map((cell) => ({ ...cell })));
    if (status === 'ready') {
      g = plantMines(
        g.map((row) => row.map((cell) => ({ ...cell }))),
        r,
        c
      );
      setStatus('playing');
    }
    if (status === 'won' || status === 'lost') return;
    const cell = g[r][c];
    if (cell.flag || cell.open) return;

    if (cell.mine) {
      g.forEach((row) =>
        row.forEach((cl) => {
          if (cl.mine) cl.open = true;
        })
      );
      g[r][c].boom = true;
      setGrid(g);
      setStatus('lost');
      sfx.gameOver();
      return;
    }

    floodReveal(g, r, c);
    setGrid(g);
    sfx.click();
    if (checkWin(g)) {
      setStatus('won');
      sfx.powerup();
      setBest((b) => {
        const key = level.id;
        return { ...b, [key]: Math.min(b[key] ?? 9999, time) };
      });
    }
  };

  const toggleFlag = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    const g = grid.map((row) => row.map((cell) => ({ ...cell })));
    if (g[r][c].open) return;
    g[r][c].flag = !g[r][c].flag;
    setGrid(g);
    sfx.playTone(360, 0.07, 'triangle', 0.08);
  };

  const flags = grid.flat().filter((c) => c.flag).length;

  const cellSize = Math.min(38, Math.floor(430 / level.cols));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-[#04121a] p-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-0 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            {LEVELS.map((l, i) => (
              <button
                key={l.id}
                onClick={() => setLevelIdx(i)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all ${
                  i === levelIdx
                    ? `bg-gradient-to-r ${l.color} text-white shadow`
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-white">
            <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5">
              <Bomb size={12} className="text-rose-400" /> {level.mines - flags}
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5">
              <Timer size={12} className="text-sky-400" /> {time}s
            </span>
            <button
              onClick={() => build(levelIdx)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Restart"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto rounded-2xl border border-teal-900/40 bg-gradient-to-br from-[#07202b] to-[#03101a] p-2.5 shadow-2xl shadow-black/60">
          <div
            className="relative grid gap-1"
            style={{ gridTemplateColumns: `repeat(${level.cols}, ${cellSize}px)` }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const base = 'flex items-center justify-center rounded-md font-black transition-all duration-100 select-none';
                if (cell.open) {
                  return (
                    <div
                      key={`${r}-${c}-${seed}`}
                      style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.5 }}
                      className={`${base} ${
                        cell.mine
                          ? cell.boom
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-900'
                            : 'bg-rose-900/60 text-rose-200'
                          : 'bg-[#0b1d29] ring-1 ring-white/5'
                      } ${NUM_COLORS[cell.adj]}`}
                    >
                      {cell.mine ? '💥' : cell.adj > 0 ? cell.adj : ''}
                    </div>
                  );
                }
                return (
                  <button
                    key={`${r}-${c}-${seed}`}
                    style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.45 }}
                    onClick={() => (flagMode ? toggleFlag(r, c) : reveal(r, c))}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleFlag(r, c);
                    }}
                    className={`${base} ${
                      cell.flag
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40'
                        : 'bg-gradient-to-b from-[#1b3a4a] to-[#102733] text-teal-200 hover:from-[#244a5e] hover:to-[#16323f] active:scale-95'
                    }`}
                  >
                    {cell.flag ? '🚩' : ''}
                  </button>
                );
              })
            )}

            {(status === 'won' || status === 'lost') && (
              <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/80 backdrop-blur-sm">
                <div className="text-center animate-pop-in">
                  <div className="text-3xl">{status === 'won' ? '🏆' : '💥'}</div>
                  <h4 className="mt-1 font-display text-lg font-black text-white">
                    {status === 'won' ? 'Grid Secured!' : 'Plasma Mine Detonated'}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {status === 'won' ? `Cleared in ${time}s` : 'Try a new scan pattern'}
                  </p>
                  <button
                    onClick={() => build(levelIdx)}
                    className="mt-2 rounded-lg bg-gradient-to-r from-teal-400 to-sky-600 px-4 py-2 text-xs font-black text-black"
                  >
                    Scan Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setFlagMode((f) => !f)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              flagMode ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40' : 'bg-white/5 text-slate-400'
            }`}
          >
            <Flag size={11} /> Flag Mode {flagMode ? 'ON' : 'OFF'}
          </button>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <Trophy size={11} className="text-amber-500" />
            {best[level.id] ? `Best ${best[level.id]}s` : 'No record yet'}
          </span>
        </div>
      </div>

      {!started && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-teal-950/90 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-300">
              💣 Logic Puzzle
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Quantum Minesweeper</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Scan the grid without detonating a plasma mine. Numbers count adjacent hazards — your first click is
              always safe.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-sky-600 px-7 py-3 text-sm font-black text-black shadow-xl shadow-teal-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-black" /> Start Scanning
            </button>
            <p className="mt-3 text-[10px] text-slate-400">Left click reveals · Right click / F flag</p>
          </div>
        </div>
      )}
    </div>
  );
}
