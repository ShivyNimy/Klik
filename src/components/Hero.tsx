import { useEffect, useState } from 'react';
import { Play, Star, Users, ChevronRight, Flame, Sparkles } from 'lucide-react';
import type { GameItem } from '../data/games';

interface Props {
  featured: GameItem[];
  onPlay: (id: string) => void;
}

export default function Hero({ featured, onPlay }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % featured.length), 7000);
    return () => clearInterval(t);
  }, [featured.length]);

  return (
    <section className="relative">
      <div className="relative mx-auto grid max-w-[1400px] gap-4 px-4 pt-4 lg:grid-cols-[1fr_320px]">
        {/* Spotlight carousel */}
        <div className="relative h-[380px] overflow-hidden rounded-3xl border border-white/10 bg-[#101423] sm:h-[440px]">
          {featured.map((game, i) => (
            <div
              key={game.id}
              className={`absolute inset-0 transition-all duration-700 ${
                i === active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <img
                src={game.thumbnail}
                alt={game.title}
                className={`h-full w-full object-cover transition-transform duration-[8000ms] ${
                  i === active ? 'scale-105' : 'scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-[#080a12]/70 to-transparent lg:bg-gradient-to-r lg:from-[#080a12] lg:via-[#080a12]/85 lg:to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-end gap-3 p-5 sm:p-7 lg:max-w-[62%] lg:justify-center">
                <div className="flex flex-wrap items-center gap-2">
                  {game.badge && (
                    <span className="flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-orange-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-lg">
                      {game.badge === 'TOP #1' ? <Flame size={11} /> : <Sparkles size={11} />}
                      {game.badge}
                    </span>
                  )}
                  <span className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur">
                    {game.categories.find((c) => c !== 'Featured')}
                  </span>
                </div>

                <h1 className="font-display text-3xl font-black leading-[1.05] text-white drop-shadow-2xl sm:text-4xl lg:text-5xl">
                  {game.title}
                </h1>
                <p className="max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm line-clamp-2 lg:line-clamp-3">
                  {game.subtitle}
                </p>

                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={13} className="fill-amber-400" /> {game.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {game.plays} plays
                  </span>
                  <span className="hidden sm:inline">by {game.developer}</span>
                </div>

                <div className="mt-1 flex items-center gap-2.5">
                  <button
                    onClick={() => onPlay(game.id)}
                    className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-fuchsia-900/40 transition-all hover:scale-[1.03] hover:shadow-fuchsia-700/50 sm:px-7"
                  >
                    <Play size={17} className="fill-white transition-transform group-hover:scale-110" />
                    Play Now
                  </button>
                  <button
                    onClick={() => onPlay(game.id)}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
                  >
                    How to Play
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Dots */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-2 backdrop-blur">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Trending list */}
        <aside className="hidden rounded-3xl border border-white/10 bg-[#101423] p-3 lg:block">
          <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-black uppercase tracking-wide text-white">
              <Flame size={15} className="text-orange-500" /> Trending Now
            </h2>
            <ChevronRight size={16} className="text-slate-600" />
          </div>
          <div className="space-y-0.5">
            {featured.concat(featured).slice(0, 6).map((g, idx) => (
              <TrendingMini key={`${g.id}-${idx}`} game={g} rank={idx + 1} onPlay={onPlay} />
            ))}
          </div>
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-violet-600/25 to-fuchsia-600/10 p-3 ring-1 ring-violet-400/20">
            <p className="font-display text-[13px] font-bold text-white">🎮 15 games. Zero downloads.</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
              Everything runs instantly in your browser — no installs, no accounts.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TrendingMini({
  game,
  rank,
  onPlay,
}: {
  game: GameItem;
  rank: number;
  onPlay: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onPlay(game.id)}
      className="group flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/5"
    >
      <span className="w-4 shrink-0 font-display text-xs font-black text-slate-600 group-hover:text-violet-400">
        {rank}
      </span>
      <img
        src={game.thumbnail}
        alt=""
        className="h-10 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-bold text-slate-200 group-hover:text-white">
          {game.title}
        </span>
        <span className="block truncate text-[10px] text-slate-500">
          {game.rating.toFixed(1)} ★ · {game.plays}
        </span>
      </span>
    </button>
  );
}
