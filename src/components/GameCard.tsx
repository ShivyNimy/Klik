import { Play, Heart, Flame } from 'lucide-react';
import type { GameItem } from '../data/games';
import { GameBadge, Rating } from './ui';

interface Props {
  game: GameItem;
  onPlay: (id: string) => void;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  index?: number;
}

export default function GameCard({ game, onPlay, favorite, onToggleFavorite, index = 0 }: Props) {
  return (
    <div
      className="group relative animate-fade-up cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#12162a] transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-400/40 hover:shadow-2xl hover:shadow-violet-900/30"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={() => onPlay(game.id)}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <GameBadge badge={game.badge} />
        <img
          src={game.thumbnail}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/10 to-transparent opacity-80" />

        {/* Play overlay */}
        <div className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <button
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-fuchsia-900/40 transition-transform duration-300 group-hover:scale-105"
            aria-label={`Play ${game.title}`}
          >
            <Play size={16} className="fill-white" />
            Play Now
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          aria-label="Favorite game"
          className={`absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition-all ${
            favorite
              ? 'bg-rose-500/90 text-white'
              : 'bg-black/45 text-slate-300 opacity-0 hover:text-rose-400 group-hover:opacity-100'
          }`}
        >
          <Heart size={14} className={favorite ? 'fill-white' : ''} />
        </button>
      </div>

      <div className="p-3">
        <h3 className="truncate font-display text-sm font-bold text-white transition-colors group-hover:text-violet-300">
          {game.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{game.subtitle}</p>
        <div className="mt-2 flex items-center justify-between">
          <Rating rating={game.rating} />
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            {game.categories.find((c) => c !== 'Featured') ?? game.categories[0]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TrendingRow({
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
      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
    >
      <span className="w-5 shrink-0 font-display text-sm font-black text-slate-600 group-hover:text-violet-400">
        {rank}
      </span>
      <img
        src={game.thumbnail}
        alt=""
        className="h-11 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-slate-200 group-hover:text-white">
          {game.title}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Flame size={10} className="text-orange-500" />
          {game.plays} plays
        </span>
      </span>
      <Play size={14} className="shrink-0 text-slate-500 group-hover:text-white" />
    </button>
  );
}
