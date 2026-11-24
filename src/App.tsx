import { useEffect, useMemo, useState } from 'react';
import { Flame, Gamepad2, Heart, Zap, Smartphone, ShieldCheck, Sparkles, Trophy, Clock, ChevronRight } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GameCard from './components/GameCard';
import GamePlayer from './components/GamePlayer';
import { SectionHeading } from './components/ui';
import { GAMES, type GameCategory, type GameItem } from './data/games';
import { useLocalStorage } from './hooks/useLocal';
import { assetUrl } from './utils/assets';
import { sfx } from './utils/sound';

const CATEGORIES: GameCategory[] = [
  'All',
  'Featured',
  'Horror & Survival',
  'Action',
  'Racing & Sports',
  'Arcade & .io',
  'Puzzle & Merge',
  'Strategy & Idle',
  '2 Player',
];

const CATEGORY_ICONS: Record<string, string> = {
  All: '🎮',
  Featured: '🔥',
  'Horror & Survival': '🌲',
  Action: '⚔️',
  'Racing & Sports': '🏎️',
  'Arcade & .io': '🕹️',
  'Puzzle & Merge': '🧩',
  'Strategy & Idle': '🏰',
  '2 Player': '👥',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GameCategory>('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalStorage<string[]>('klik:favorites', ['99-nights-in-the-forest']);
  const [recents, setRecents] = useLocalStorage<string[]>('klik:recents', []);
  const [muted, setMuted] = useLocalStorage<boolean>('klik:muted', false);

  useEffect(() => {
    sfx.muted = muted;
  }, [muted]);

  // deep link support: #game-id
  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace('#', '');
      if (id && GAMES.some((g) => g.id === id)) setActiveId(id);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const openGame = (id: string) => {
    setActiveId(id);
    setRecents((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8));
    window.history.replaceState(null, '', `#${id}`);
    sfx.click();
  };

  const closeGame = () => {
    setActiveId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    sfx.click();
  };

  const filtered = useMemo(() => {
    let list = GAMES;
    if (category !== 'All') list = list.filter((g) => g.categories.includes(category));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.subtitle.toLowerCase().includes(q) ||
          g.categories.some((c) => c.toLowerCase().includes(q))
      );
    }
    return list;
  }, [category, query]);

  const featured = GAMES.filter((g) => g.featured);
  const activeGame: GameItem | undefined = GAMES.find((g) => g.id === activeId);

  const recentsGames = recents.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as GameItem[];

  const surprise = () => {
    const pool = GAMES.filter((g) => g.id !== activeId);
    openGame(pool[Math.floor(Math.random() * pool.length)].id);
  };

  return (
    <div id="top" className="min-h-screen bg-[#0b0e17]">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-violet-700/20 blur-[100px]" />
        <div className="absolute -right-32 top-40 h-[360px] w-[360px] rounded-full bg-fuchsia-700/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[500px] rounded-full bg-cyan-700/10 blur-[110px]" />
      </div>

      <div className="relative z-10">
        <Navbar
          query={query}
          onQuery={setQuery}
          games={GAMES}
          onPlay={openGame}
          muted={muted}
          onToggleMute={() => {
            setMuted((m) => !m);
            if (muted) setTimeout(() => sfx.click(), 30);
          }}
          favorites={favorites}
          onSurprise={surprise}
        />

        <Hero featured={featured} onPlay={openGame} />

        {/* Category chips */}
        <div className="sticky top-16 z-30 mt-5 border-y border-white/5 bg-[#0b0e17]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] gap-1.5 overflow-x-auto px-4 py-2.5 no-scrollbar">
            {CATEGORIES.map((c) => {
              const count = c === 'All' ? GAMES.length : GAMES.filter((g) => g.categories.includes(c)).length;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-bold transition-all ${
                    category === c
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{CATEGORY_ICONS[c]}</span>
                  {c}
                  <span
                    className={`rounded px-1 text-[9px] ${
                      category === c ? 'bg-black/25 text-white' : 'bg-black/30 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <main className="mx-auto max-w-[1400px] px-4 py-6">
          {/* 99 Nights spotlight strip */}
          {!query && category === 'All' && (
            <div className="mb-8 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-950/50 via-[#1a1220] to-[#101423] p-1">
              <div className="flex flex-col items-start gap-4 rounded-[22px] p-4 sm:flex-row sm:items-center sm:p-5">
                <img
                  src={assetUrl('images/99-nights.jpg')}
                  alt="99 Nights in the Forest"
                  className="h-28 w-full rounded-xl object-cover ring-1 ring-white/10 sm:h-24 sm:w-44"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-gradient-to-r from-amber-400 to-orange-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-black">
                      <Flame size={10} /> Klik Original
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                      Survival Horror
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-xl font-black text-white sm:text-2xl">
                    99 Nights in the Forest — playable right here
                  </h2>
                  <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-slate-400">
                    Keep the campfire alive, craft spike traps, burn the Wendigo with your flashlight and rescue all
                    four lost children to survive to Night 99.
                  </p>
                </div>
                <button
                  onClick={() => openGame('99-nights-in-the-forest')}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-rose-900/30 transition-transform hover:scale-105"
                >
                  <Gamepad2 size={16} /> Play Free
                </button>
              </div>
            </div>
          )}

          {/* Continue playing */}
          {recentsGames.length > 0 && !query && category === 'All' && (
            <section className="mb-8">
              <SectionHeading
                title="Jump back in"
                subtitle="Recently played on this device"
                action={
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <Clock size={12} /> {recentsGames.length} recent
                  </span>
                }
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {recentsGames.slice(0, 5).map((g, i) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    onPlay={openGame}
                    favorite={favorites.includes(g.id)}
                    onToggleFavorite={toggleFavorite}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Game grid */}
          <section>
            <SectionHeading
              title={
                query
                  ? `Search results for “${query}”`
                  : category === 'All'
                  ? 'All Games — play free in your browser'
                  : `${category} games`
              }
              subtitle={`${filtered.length} game${filtered.length === 1 ? '' : 's'} ready to play`}
              action={
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                    <Zap size={11} /> No downloads
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-300">
                    <Trophy size={11} /> 15 originals
                  </span>
                </div>
              }
            />

            {filtered.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
                <div>
                  <div className="text-4xl">🕹️</div>
                  <p className="mt-3 font-display text-lg font-bold text-white">No games matched that search</p>
                  <p className="mt-1 text-xs text-slate-400">Try “forest”, “racing”, “puzzle” or “2 player”.</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setCategory('All');
                    }}
                    className="mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((g, i) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    onPlay={openGame}
                    favorite={favorites.includes(g.id)}
                    onToggleFavorite={toggleFavorite}
                    index={i}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Favorites */}
          {favorites.length > 0 && (
            <section className="mt-10">
              <SectionHeading title="Your favorites" subtitle="Saved on this device" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {GAMES.filter((g) => favorites.includes(g.id)).map((g, i) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    onPlay={openGame}
                    favorite
                    onToggleFavorite={toggleFavorite}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Feature band */}
          <section className="mt-12 grid gap-3 rounded-3xl border border-white/10 bg-[#101423] p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Zap size={18} />, title: 'Instant play', desc: 'Every game loads in seconds — no installs, no launchers.', color: 'text-amber-400' },
              { icon: <Smartphone size={18} />, title: 'Responsive', desc: 'Browse on desktop, tablet, or phone; controls vary by game.', color: 'text-cyan-400' },
              { icon: <ShieldCheck size={18} />, title: 'No accounts', desc: 'No sign-up, chat, or tracking required.', color: 'text-emerald-400' },
              { icon: <Sparkles size={18} />, title: 'Hand-built originals', desc: 'All 15 games coded from scratch with love.', color: 'text-fuchsia-400' },
            ].map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 ${f.color}`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">{f.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Category cards */}
          <section className="mt-10">
            <SectionHeading title="Browse by genre" subtitle="Find exactly the kind of game you want" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.filter((c) => c !== 'All' && c !== 'Featured').map((c) => {
                const games = GAMES.filter((g) => g.categories.includes(c));
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#12162a] text-left transition-all hover:-translate-y-1 hover:border-violet-400/40"
                  >
                    <img
                      src={games[0]?.thumbnail}
                      alt=""
                      className="h-20 w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <span>{CATEGORY_ICONS[c]}</span> {c}
                      </div>
                      <div className="text-[10px] text-slate-400">{games.length} games</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* More games from the collection */}
          <section className="mt-10 mb-4">
            <SectionHeading
              title="More to explore"
              subtitle="A few more games from the Klik collection"
              action={
                <span className="flex items-center gap-1 text-[11px] font-bold text-violet-300">
                  <Sparkles size={12} /> Made for instant play
                </span>
              }
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {GAMES.slice(4, 10).map((g) => (
                <button
                  key={g.id}
                  onClick={() => openGame(g.id)}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-[#101423] p-2 text-left transition-all hover:border-violet-400/40 hover:bg-[#151a2e]"
                >
                  <img src={g.thumbnail} alt="" className="h-12 w-20 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-white">{g.title}</span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {g.categories.filter((c) => c !== 'Featured').join(' · ')}
                    </span>
                  </span>
                  <ChevronRight size={15} className="mr-1 shrink-0 text-slate-600 group-hover:text-white" />
                </button>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-[#080a12]">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500">
                  <Gamepad2 size={16} className="text-white" />
                </div>
                <span className="font-display text-lg font-black text-white">
                  KLIK<span className="text-fuchsia-500">.</span>
                </span>
              </div>
              <p className="mt-3 max-w-xs text-[11.5px] leading-relaxed text-slate-500">
                Klik is a free browser gaming arcade with 15 hand-built HTML5 originals — survival horror, racers,
                roguelites, puzzle classics and local multiplayer.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <Heart size={11} className="fill-rose-500 text-rose-500" /> Zero ads · Zero installs
              </div>
            </div>

            <div>
              <h4 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-slate-300">Quick Play</h4>
              <ul className="space-y-1.5 text-[11.5px] text-slate-500">
                {GAMES.slice(0, 5).map((g) => (
                  <li key={g.id}>
                    <button onClick={() => openGame(g.id)} className="transition-colors hover:text-white">
                      {g.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-slate-300">Genres</h4>
              <ul className="space-y-1.5 text-[11.5px] text-slate-500">
                {CATEGORIES.filter((c) => c !== 'All' && c !== 'Featured').map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => {
                        setCategory(c);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="transition-colors hover:text-white"
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-slate-300">About Klik</h4>
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                Games run in your browser. Favorites, recently played games, and sound settings stay on this device;
                game sessions reset when you close them. Nothing is uploaded.
              </p>
              <p className="mt-3 text-[10.5px] leading-relaxed text-slate-600">
                99 Nights in the Forest is an original Klik production inspired by the survival-horror genre. All
                art, code and audio are built from scratch.
              </p>
            </div>
          </div>
          <div className="border-t border-white/5 px-4 py-4">
            <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-[10.5px] text-slate-600 sm:flex-row">
              <span>© {new Date().getFullYear()} Klik Games. Made for players, not for ads.</span>
              <span className="flex items-center gap-3">
                <span>No sign-up</span>
                <span>No game-data uploads</span>
                <span>Progress is local to this device</span>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {activeGame && (
        <GamePlayer
          game={activeGame}
          allGames={GAMES}
          onClose={closeGame}
          onPlay={openGame}
          favorite={favorites.includes(activeGame.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
