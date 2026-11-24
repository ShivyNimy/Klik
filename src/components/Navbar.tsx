import { useEffect, useRef, useState } from 'react';
import { Search, Volume2, VolumeX, Gamepad2, Menu, X, Heart, Shuffle } from 'lucide-react';
import type { GameItem } from '../data/games';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  games: GameItem[];
  onPlay: (id: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  favorites: string[];
  onSurprise: () => void;
}

export default function Navbar({
  query,
  onQuery,
  games,
  onPlay,
  muted,
  onToggleMute,
  favorites,
  onSurprise,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = query.trim()
    ? games
        .filter(
          (g) =>
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.categories.some((c) => c.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#0b0e17]/90 backdrop-blur-xl'
          : 'border-b border-transparent bg-[#0b0e17]/40 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
        {/* Logo */}
        <a href="#top" className="flex shrink-0 items-center gap-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500 shadow-lg shadow-fuchsia-900/40">
            <Gamepad2 size={19} className="text-white" strokeWidth={2.6} />
          </div>
          <span className="font-display text-xl font-black tracking-tight text-white">
            KLIK<span className="text-fuchsia-500">.</span>
          </span>
        </a>

        {/* Search */}
        <div ref={boxRef} className="relative ml-auto w-full max-w-md lg:ml-4">
          <div
            className={`flex items-center gap-2 rounded-xl border bg-[#151a2c] px-3 py-2 transition-colors ${
              showResults && results.length
                ? 'border-violet-500/60'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(e) => {
                onQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search games, genres…"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {query && (
              <button onClick={() => onQuery('')} aria-label="Clear search">
                <X size={14} className="text-slate-500 hover:text-white" />
              </button>
            )}
          </div>

          {showResults && results.length > 0 && (
            <div className="absolute mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#12162a] p-1.5 shadow-2xl shadow-black/60 animate-pop-in">
              {results.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    onPlay(g.id);
                    setShowResults(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-white/5"
                >
                  <img src={g.thumbnail} alt="" className="h-9 w-14 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">{g.title}</span>
                    <span className="block truncate text-[10px] text-slate-400">
                      {g.categories.find((c) => c !== 'Featured')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={() => onPlay('99-nights-in-the-forest')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-rose-900/30 transition-transform hover:scale-105"
          >
            <span className="text-[13px] leading-none">🌲</span>
            <span className="hidden md:inline">99 Nights</span>
          </button>
          <button
            onClick={onSurprise}
            title="Surprise me!"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Shuffle size={15} />
            <span className="hidden md:inline">Random</span>
          </button>
          <div
            title={`${favorites.length} favorites`}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300"
          >
            <Heart size={15} className={favorites.length ? 'fill-rose-500 text-rose-500' : ''} />
            {favorites.length}
          </div>
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <button
          onClick={onToggleMute}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 sm:hidden"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          aria-pressed={muted}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 sm:hidden"
          aria-label="Menu"
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0b0e17] p-4 sm:hidden">
          <button
            onClick={() => {
              onSurprise();
              setOpen(false);
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-2.5 text-sm font-bold text-white"
          >
            <Shuffle size={15} /> Surprise Me
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            {games.slice(0, 8).map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onPlay(g.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg bg-white/5 p-1.5 text-left"
              >
                <img src={g.thumbnail} alt="" className="h-8 w-11 rounded object-cover" />
                <span className="truncate text-[11px] font-semibold text-slate-200">{g.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
