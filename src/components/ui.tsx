import { Star } from 'lucide-react';

export function Rating({ rating, plays }: { rating: number; plays?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
      <span className="flex items-center gap-0.5 text-amber-400">
        <Star size={12} className="fill-amber-400" />
        {rating.toFixed(1)}
      </span>
      {plays && (
        <>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{plays} plays</span>
        </>
      )}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  HOT: 'bg-gradient-to-r from-orange-500 to-rose-600 text-white',
  'TOP #1': 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black',
  NEW: 'bg-gradient-to-r from-emerald-400 to-teal-600 text-black',
  POPULAR: 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white',
  '2P': 'bg-gradient-to-r from-cyan-400 to-blue-600 text-black',
};

export function GameBadge({ badge }: { badge?: string }) {
  if (!badge) return null;
  return (
    <span
      className={`absolute left-2.5 top-2.5 z-10 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-black/40 ${
        badgeStyles[badge] ?? 'bg-white text-black'
      }`}
    >
      {badge}
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
