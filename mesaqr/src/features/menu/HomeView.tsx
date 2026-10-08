import { useMemo, useState } from 'react';
import { MessageCircle, Plus, Search, X } from 'lucide-react';
import { ORDER_TYPE_EMOJI, ORDER_TYPE_LABEL, type MenuProduct } from '@/shared/types/menu';
import { EXPERIENCE } from '@/shared/config/experience';
import { asset } from '@/shared/lib/asset';
import { formatUsd } from '@/shared/lib/money';
import { waLink } from '@/shared/lib/whatsapp';
import { ProductImage } from '@/shared/ui/ProductImage';
import { BadgeChip } from './BadgeChip';
import { favorites, searchProducts, topBadge } from './catalog';
import type { MenuIndex } from './menuIndex';
import { ProductRow } from './ProductRow';

interface Props {
  idx: MenuIndex;
  qtyInCart: Map<string, number>;
  onOpen: (p: MenuProduct) => void;
  onQuickAdd: (p: MenuProduct) => void;
  onCategory: (categoryId: string) => void;
  onCraving: () => void;
  onAllMenu: () => void;
}

/** Inicio: bienvenida, buscador, favoritos de la casa y categorías visuales. */
export function HomeView({ idx, qtyInCart, onOpen, onQuickAdd, onCategory, onCraving, onAllMenu }: Props) {
  const { business, categories } = idx.menu;
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchProducts(idx, query), [idx, query]);
  const favs = useMemo(() => favorites(idx), [idx]);
  const searching = query.trim().length > 0;

  return (
    <>
      <header className="px-4 pt-6">
        <div className="flex items-start gap-4">
          {business.logo_url && <img src={asset(business.logo_url)!} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.875rem] leading-[1.05] font-extrabold tracking-tight">{business.name}</h1>
            {business.description && <p className="mt-1 text-ink-2">{business.description}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {business.order_types.map((t) => (
            <span key={t} className="ticket rounded-lg px-3 py-1 text-sm font-semibold">
              <span aria-hidden>{ORDER_TYPE_EMOJI[t]}</span> {ORDER_TYPE_LABEL[t]}
            </span>
          ))}
          <a
            href={waLink(business.whatsapp, `Hola ${business.name}, tengo una consulta.`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold"
          >
            <MessageCircle size={16} aria-hidden /> Escríbenos
          </a>
        </div>

        <p className="mt-7 font-display text-2xl leading-tight font-extrabold tracking-tight">{EXPERIENCE.welcome}</p>

        <div className="relative mt-3">
          <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={EXPERIENCE.searchPlaceholder}
            aria-label="Buscar en el menú"
            enterKeyHint="search"
            className="h-13 w-full rounded-full border border-line bg-shelf pr-12 pl-12 text-base outline-none focus:border-ink [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {searching ? (
        <section className="px-4 pt-4" aria-live="polite" aria-label="Resultados">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-ink-3">
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <div className="divide-y divide-line">
                {results.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    rate={business.exchange_rate}
                    showBs={business.show_bs}
                    inCart={qtyInCart.get(p.id) ?? 0}
                    onOpen={onOpen}
                    onQuickAdd={onQuickAdd}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="text-4xl" aria-hidden>
                🔎
              </p>
              <p className="mt-2 font-display text-xl font-bold">No encontramos “{query.trim()}”</p>
              <p className="mt-1 text-ink-2">Prueba con otra palabra o mira el menú completo.</p>
              <button type="button" onClick={onAllMenu} className="mt-4 h-11 rounded-full bg-ink px-5 font-display font-bold text-white">
                Ver el menú completo
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={onCraving}
              className="flex w-full items-center gap-3 rounded-2xl bg-mustard/35 px-4 py-3 text-left"
            >
              <span className="text-3xl" aria-hidden>
                🤔
              </span>
              <span className="flex-1">
                <span className="block font-display text-lg leading-tight font-bold">¿No sabes qué pedir?</span>
                <span className="block text-sm text-ink-2">Dinos qué se te antoja y te mostramos opciones.</span>
              </span>
            </button>
          </div>

          {favs.length > 0 && (
            <section className="pt-7" aria-labelledby="favs-title">
              <h2 id="favs-title" className="px-4 font-display text-2xl font-extrabold tracking-tight">
                {EXPERIENCE.favoritesTitle}
              </h2>
              <ul className="no-scrollbar mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:grid sm:grid-cols-4 sm:overflow-visible">
                {favs.map((p, i) => {
                  const badge = topBadge(p);
                  return (
                    <li key={p.id} className="w-[46%] max-w-56 min-w-40 shrink-0 snap-start sm:w-auto sm:max-w-none sm:min-w-0">
                      <div className="relative">
                        <button type="button" tabIndex={-1} aria-hidden onClick={() => onOpen(p)} className="block w-full">
                          <ProductImage src={p.image_url} alt="" eager={i < 2} className="aspect-[4/3] w-full rounded-2xl" />
                        </button>
                        {badge && <BadgeChip badge={badge} className="pointer-events-none absolute top-2 left-2" />}
                        <button
                          type="button"
                          onClick={() => onQuickAdd(p)}
                          aria-label={`Agregar ${p.name}`}
                          className="absolute right-2 bottom-2 grid size-10 place-items-center rounded-full border-[3px] border-paper bg-brand text-brand-ink shadow-sm active:scale-90"
                        >
                          <Plus size={20} strokeWidth={3} aria-hidden />
                        </button>
                      </div>
                      <button type="button" onClick={() => onOpen(p)} className="mt-2 block w-full text-left" aria-label={`Ver ${p.name}, ${formatUsd(p.price_usd)}`}>
                        <span className="line-clamp-2 block leading-snug font-display font-bold">{p.name}</span>
                        <span className="mt-0.5 block font-display font-bold text-ink-2 tabular-nums">{formatUsd(p.price_usd)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="px-4 pt-3" aria-labelledby="cats-title">
            <h2 id="cats-title" className="font-display text-2xl font-extrabold tracking-tight">
              {EXPERIENCE.categoriesTitle}
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => {
                const products = idx.byCategory.get(c.id) ?? [];
                if (products.length === 0) return null;
                const cover = c.image_url ?? products.find((p) => p.image_url)?.image_url ?? null;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onCategory(c.id)}
                      className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-shelf text-left"
                    >
                      <ProductImage src={cover} alt="" className="absolute inset-0 size-full" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" aria-hidden />
                      <span className="absolute inset-x-3 bottom-2.5 text-white">
                        <span className="block font-display text-lg leading-tight font-bold">
                          {c.emoji && (
                            <span className="mr-1" aria-hidden>
                              {c.emoji}
                            </span>
                          )}
                          {c.name}
                        </span>
                        <span className="block text-xs text-white/80">
                          {products.length} {products.length === 1 ? 'opción' : 'opciones'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
