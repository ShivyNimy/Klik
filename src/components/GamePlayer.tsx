import { useEffect, useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Heart,
  Star,
  Users,
  Play,
  ChevronRight,
  ArrowLeft,
  Gamepad2,
  Info,
  Keyboard,
  Sparkles,
  Share2,
} from 'lucide-react';
import type { GameItem } from '../data/games';
import { GAME_COMPONENTS } from '../games/registry';
import { Rating } from './ui';

interface Props {
  game: GameItem;
  allGames: GameItem[];
  onClose: () => void;
  onPlay: (id: string) => void;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function GamePlayer({
  game,
  allGames,
  onClose,
  onPlay,
  favorite,
  onToggleFavorite,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [tab, setTab] = useState<'how' | 'about'>('how');
  const [instanceKey, setInstanceKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const Comp = GAME_COMPONENTS[game.id];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setTab('how');
    setFullscreen(false);
    setInstanceKey((k) => k + 1);
  }, [game.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, fullscreen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [game.id]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}#${game.id}`);
    } catch {
      /* clipboard may be blocked */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const related = allGames
    .filter((g) => g.id !== game.id && g.categories.some((c) => game.categories.includes(c)))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080a12] animate-fade-up">
      <div className={fullscreen ? 'fixed inset-0 z-[60] flex flex-col bg-black' : ''}>
        {/* Top bar */}
        <div
          className={`sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-[#0b0e17]/95 px-3 py-2.5 backdrop-blur-xl ${
            fullscreen ? 'relative' : ''
          }`}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={14} /> <span className="hidden sm:inline">All Games</span>
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <img src={game.thumbnail} alt="" className="hidden h-8 w-12 rounded object-cover sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-sm font-black text-white sm:text-base">{game.title}</h1>
              <p className="hidden truncate text-[10px] text-slate-500 sm:block">{game.developer}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Rating rating={game.rating} plays={game.plays} />
            <button
              onClick={() => onToggleFavorite(game.id)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
                favorite
                  ? 'border-rose-500/40 bg-rose-500/20 text-rose-400'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Favorite"
            >
              <Heart size={14} className={favorite ? 'fill-rose-400' : ''} />
            </button>
            <button
              onClick={share}
              className="hidden h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[10px] font-bold text-slate-400 hover:text-white sm:flex"
            >
              <Share2 size={13} /> {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
              title="Fullscreen"
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className={fullscreen ? 'flex flex-1 items-center justify-center bg-black p-0' : 'mx-auto max-w-[1400px] px-3 pt-3 sm:px-4'}>
          <div
            className={`${fullscreen ? 'h-full w-full' : 'overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60'}`}
            style={
              fullscreen
                ? {}
                : {
                    aspectRatio: '16 / 9',
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: 'calc((100vh - 200px) * 1.7778)',
                  }
            }
          >
            {Comp ? (
              <GameFrame key={instanceKey}>
                <Comp onExit={onClose} />
              </GameFrame>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">Game coming soon</div>
            )}
          </div>
        </div>

        {!fullscreen && (
          <div className="mx-auto grid max-w-[1400px] gap-4 px-3 pb-12 pt-5 sm:px-4 lg:grid-cols-[1fr_320px]">
            {/* Info */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-black text-white">{game.title}</h2>
                {game.badge && (
                  <span className="rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    {game.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">{game.subtitle}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-amber-400">
                  <Star size={11} className="fill-amber-400" /> {game.rating.toFixed(1)} / 5
                </span>
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                  <Users size={11} /> {game.plays} plays
                </span>
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                  <Gamepad2 size={11} /> {game.categories.filter((c) => c !== 'Featured').join(' · ')}
                </span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">✔ Instant play, no install</span>
              </div>

              {/* Tabs */}
              <div className="mt-5 flex gap-1.5">
                <button
                  onClick={() => setTab('how')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    tab === 'how' ? 'bg-violet-500/25 text-violet-200' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <Keyboard size={12} /> How to Play
                </button>
                <button
                  onClick={() => setTab('about')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    tab === 'about' ? 'bg-violet-500/25 text-violet-200' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <Info size={12} /> About
                </button>
              </div>

              <div className="mt-2 rounded-2xl border border-white/10 bg-[#101423] p-4">
                {tab === 'how' ? (
                  <>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-300">
                      <Keyboard size={13} /> Controls
                    </h3>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {game.controls.map((c) => (
                        <div
                          key={c.keys}
                          className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5"
                        >
                          <kbd className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] font-black text-white">
                            {c.keys}
                          </kbd>
                          <span className="text-[11px] text-slate-300">{c.action}</span>
                        </div>
                      ))}
                    </div>
                    <h3 className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-300">
                      <Sparkles size={13} /> Strategy
                    </h3>
                    <ol className="space-y-1.5">
                      {game.howToPlay.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-slate-300">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-violet-500/25 text-[9px] font-black text-violet-200">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-slate-300">{game.description}</p>
                )}
              </div>
            </div>

            {/* Sidebar related */}
            <aside>
              <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-black text-white">
                <Gamepad2 size={15} className="text-violet-400" /> Play Next
              </h3>
              <div className="space-y-1.5">
                {related.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onPlay(g.id)}
                    className="group flex w-full items-center gap-2.5 rounded-xl border border-white/5 bg-[#101423] p-2 text-left transition-colors hover:border-violet-500/40 hover:bg-[#151a2e]"
                  >
                    <img src={g.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-white">{g.title}</span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {g.rating.toFixed(1)} ★ · {g.plays}
                      </span>
                    </span>
                    <Play size={13} className="mr-1 shrink-0 text-slate-500 group-hover:text-white" />
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
              >
                Browse all 15 games <ChevronRight size={14} />
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function GameFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}
