const badgeStyles: Record<string, string> = {
  ORIGINAL: 'bg-gradient-to-r from-amber-400 to-orange-600 text-black',
  'EDITOR PICK': 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white',
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
        <h2 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
