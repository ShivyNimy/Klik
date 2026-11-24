import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Timer, Flame, Trophy } from 'lucide-react';
import { sfx } from '../utils/sound';

const GLYPHS = ['⚡', '🌙', '🔮', '🚀', '🎧', '💎', '🪐', '🧿', '🔥', '❄️', '🌈', '🦾'];

interface Card {
  id: number;
  glyph: string;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryMatrix() {
  const [started, setStarted] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [time, setTime] = useState(0);
  const [won, setWon] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [pairs, setPairs] = useState(8);
  const lock = useRef(false);

  const build = useCallback((pairCount: number) => {
    const picked = [...GLYPHS].sort(() => Math.random() - 0.5).slice(0, pairCount);
    const deck = [...picked, ...picked]
      .map((glyph, i) => ({ id: i, glyph, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
      .map((c, i) => ({ ...c, id: i }));
    setCards(deck);
    setFlipped([]);
    setMoves(0);
    setCombo(0);
    setBestCombo(0);
    setTime(0);
    setWon(false);
    lock.current = false;
  }, []);

  useEffect(() => {
    if (started) build(pairs);
  }, [started, pairs, build]);

  useEffect(() => {
    if (!started || won) return;
    const t = window.setInterval(() => setTime((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, [started, won]);

  const flip = (index: number) => {
    if (lock.current || won) return;
    const card = cards[index];
    if (card.matched || card.flipped) return;

    const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    const nextFlipped = [...flipped, index];
    setCards(next);
    setFlipped(nextFlipped);
    sfx.playTone(520, 0.06, 'triangle', 0.09);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextFlipped;
      if (next[a].glyph === next[b].glyph) {
        setTimeout(() => {
          setCards((cur) => cur.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setFlipped([]);
          setCombo((c) => {
            const nc = c + 1;
            setBestCombo((bc) => Math.max(bc, nc));
            return nc;
          });
          sfx.coin();
          setCards((cur) => {
            const allMatched = cur.every((c, i) => c.matched || i === a || i === b);
            if (allMatched) {
              setWon(true);
              setBestTime((bt) => (bt === null ? time : Math.min(bt, time)));
              sfx.powerup();
            }
            return cur;
          });
        }, 260);
      } else {
        lock.current = true;
        setCombo(0);
        setTimeout(() => {
          setCards((cur) => cur.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setFlipped([]);
          lock.current = false;
        }, 700);
      }
    }
  };

  const cols = pairs === 8 ? 4 : pairs === 6 ? 4 : 5;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-[#0a0a1f] p-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="absolute bottom-4 right-8 h-52 w-52 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            {[6, 8, 10].map((p) => (
              <button
                key={p}
                onClick={() => setPairs(p)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase transition-all ${
                  pairs === p
                    ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p} pairs
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white">
              <Timer size={11} className="text-sky-400" /> {time}s
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white">
              {moves} moves
            </span>
            <button
              onClick={() => build(pairs)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {combo > 1 && (
          <div className="mb-1.5 flex items-center justify-center gap-1 text-[11px] font-black text-orange-300 animate-pop-in">
            <Flame size={12} /> COMBO ×{combo}
          </div>
        )}

        <div
          className="mx-auto grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => flip(card.id)}
              className="relative aspect-[3/4] [perspective:800px]"
              aria-label="memory card"
            >
              <div
                className={`relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d] ${
                  card.flipped || card.matched ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                {/* back */}
                <div className="absolute inset-0 grid place-items-center rounded-xl border border-indigo-400/25 bg-gradient-to-br from-indigo-700/70 to-violet-900/80 shadow-lg shadow-black/40 [backface-visibility:hidden]">
                  <div className="grid h-7 w-7 place-items-center rounded-full border border-white/25 text-[10px] font-black text-white/70">
                    K
                  </div>
                </div>
                {/* front */}
                <div
                  className={`absolute inset-0 grid place-items-center rounded-xl border text-2xl shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-3xl ${
                    card.matched
                      ? 'border-emerald-400/50 bg-gradient-to-br from-emerald-600/40 to-teal-800/60 shadow-emerald-900/40'
                      : 'border-white/20 bg-gradient-to-br from-indigo-500/40 to-fuchsia-600/40'
                  }`}
                >
                  {card.glyph}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <Trophy size={11} className="text-amber-500" />
            {bestTime !== null ? `Fastest ${bestTime}s` : 'No record yet'}
          </span>
          <span>Chain matches for combos</span>
        </div>
      </div>

      {won && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🧠✨</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Matrix Solved!</h3>
            <p className="mt-1 text-xs text-slate-300">
              {moves} moves · {time}s · best combo ×{bestCombo}
            </p>
            <button
              onClick={() => build(pairs)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Play Again
            </button>
          </div>
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-gradient-to-b from-indigo-950/90 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
              🧠 Memory Puzzle
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Holo Memory Matrix</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Flip holographic glyph cards and pair them up. Consecutive matches build combo multipliers — how fast
              can you clear the grid?
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-7 py-3 text-sm font-black text-white shadow-xl shadow-fuchsia-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Sync Matrix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
