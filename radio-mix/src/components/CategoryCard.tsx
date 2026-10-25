import { Clock, Radio } from 'lucide-react';
import type { Category } from '@/lib/types';
import { go } from '@/state/router';
import { Cover } from './Cover';

export function CategoryCard({ category, live, count, compact = false }: { category: Category; live: boolean; count: number; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => go(`/categoria/${category.id}`)}
      className={`fade-in group relative w-full overflow-hidden rounded-2xl text-left transition hover:-translate-y-0.5 ${compact ? 'h-28' : 'h-40 sm:h-44'}`}
      aria-label={`${category.name}${live ? '' : ' (pendiente de configuración)'}`}
    >
      <Cover category={category} className={`absolute inset-0 ${live ? '' : 'opacity-45 grayscale-[0.5]'}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className={`font-display font-bold leading-tight ${compact ? 'text-[15px]' : 'text-lg'}`}>{category.name}</h3>
        {!compact && <p className="mt-0.5 line-clamp-1 text-xs text-white/75">{category.description}</p>}
        <span
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${live ? 'bg-accent-3/20 text-accent-3' : 'bg-white/10 text-white/70'}`}
        >
          {live ? <Radio size={12} /> : <Clock size={12} />}
          {live ? `${count} ${count === 1 ? 'emisora' : 'emisoras'} en vivo` : 'Pendiente de configuración'}
        </span>
      </div>
    </button>
  );
}
