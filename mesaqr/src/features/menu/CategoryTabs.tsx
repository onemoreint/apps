import { useEffect, useRef } from 'react';
import type { MenuCategory } from '@/shared/types/menu';

interface Props {
  categories: MenuCategory[];
  active: string | null;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, active, onSelect }: Props) {
  const navRef = useRef<HTMLElement>(null);

  // Mantiene visible la pestaña activa al desplazarse por el menú
  useEffect(() => {
    if (!active) return;
    const el = navRef.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <nav ref={navRef} aria-label="Categorías" className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
      {categories.map((c) => {
        const on = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            data-cat={c.id}
            onClick={() => onSelect(c.id)}
            aria-current={on ? 'true' : undefined}
            className={`h-10 shrink-0 rounded-full px-4 font-display font-semibold whitespace-nowrap transition-colors ${
              on ? 'bg-ink text-white' : 'bg-shelf text-ink'
            }`}
          >
            {c.emoji && (
              <span className="mr-1.5" aria-hidden>
                {c.emoji}
              </span>
            )}
            {c.name}
          </button>
        );
      })}
    </nav>
  );
}
