import type { Badge } from '@/shared/types/menu';
import { BADGES } from '@/shared/config/experience';

const TONE = {
  brand: 'bg-brand text-brand-ink',
  mustard: 'bg-mustard text-ink',
  ink: 'bg-ink text-white',
  send: 'bg-send text-white',
} as const;

export function BadgeChip({ badge, className = '' }: { badge: Badge; className?: string }) {
  const b = BADGES[badge];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs leading-none font-bold whitespace-nowrap ${TONE[b.tone]} ${className}`}>
      <span aria-hidden>{b.emoji}</span>
      {b.label}
    </span>
  );
}
