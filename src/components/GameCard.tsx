import { Play, Heart } from 'lucide-react';
import type { GameItem } from '../data/games';
import { GameBadge } from './ui';

interface Props {
  game: GameItem;
  onPlay: (id: string) => void;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  index?: number;
}

export default function GameCard({ game, onPlay, favorite, onToggleFavorite, index = 0 }: Props) {
  const category = game.categories.find((item) => item !== 'Featured') ?? game.categories[0];

  return (
    <article
      className="group relative animate-fade-up overflow-hidden rounded-2xl border border-white/5 bg-[#12162a] transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-400/40 hover:shadow-2xl hover:shadow-violet-900/30"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <GameBadge badge={game.badge} />
        <img
          src={game.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/10 to-transparent opacity-80" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-fuchsia-900/40">
            <Play size={16} className="fill-white" />
            Play Now
          </span>
        </div>

        <button
          type="button"
          onClick={() => onPlay(game.id)}
          aria-label={`Play ${game.title}`}
          className="absolute inset-0 z-[1] rounded-t-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-violet-300"
        />

        <button
          type="button"
          onClick={() => onToggleFavorite(game.id)}
          aria-label={`${favorite ? 'Remove' : 'Add'} ${game.title} ${favorite ? 'from' : 'to'} favorites`}
          aria-pressed={favorite}
          className={`absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition-all ${
            favorite
              ? 'bg-rose-500/90 text-white'
              : 'bg-black/60 text-slate-300 opacity-100 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
          }`}
        >
          <Heart size={14} className={favorite ? 'fill-white' : ''} />
        </button>
      </div>

      <div className="p-3">
        <h3 className="truncate font-display text-sm font-bold text-white transition-colors group-hover:text-violet-300">
          <button
            type="button"
            onClick={() => onPlay(game.id)}
            className="max-w-full truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
          >
            {game.title}
          </button>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{game.subtitle}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500">Instant play</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            {category}
          </span>
        </div>
      </div>
    </article>
  );
}
