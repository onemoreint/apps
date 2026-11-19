import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { MenuProduct } from '@/shared/types/menu';
import { BADGES } from '@/shared/config/experience';
import { bsLabel, formatUsd } from '@/shared/lib/money';
import { ProductImage } from '@/shared/ui/ProductImage';
import { topBadge, vitrinaProducts } from './catalog';
import type { MenuIndex } from './menuIndex';

interface Props {
  idx: MenuIndex;
  qtyInCart: Map<string, number>;
  onOpen: (p: MenuProduct) => void;
  onQuickAdd: (p: MenuProduct) => void;
  onClose: () => void;
}

/**
 * Vitrina: un plato a la vez, grande y "flotando", que se pasa deslizando el
 * dedo de lado a lado. Usa el desplazamiento nativo con snap (sin librerías):
 * el gesto se siente como el del teléfono y funciona también con flechas.
 */
export function VitrinaView({ idx, qtyInCart, onOpen, onQuickAdd, onClose }: Props) {
  const { business, categories } = idx.menu;
  const [cat, setCat] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const products = useMemo(() => vitrinaProducts(idx, cat), [idx, cat]);
  const usedCats = useMemo(() => categories.filter((c) => (idx.byCategory.get(c.id) ?? []).some((p) => p.available)), [categories, idx]);
  const current = products[Math.min(active, products.length - 1)];
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Al cambiar de categoría se vuelve al primer plato
  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [cat]);

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const i = Math.round(el.scrollLeft / first.offsetWidth);
    setActive((prev) => (prev === i ? prev : Math.max(0, i)));
  }, []);

  const goTo = (i: number) => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const clamped = Math.max(0, Math.min(products.length - 1, i));
    el.scrollTo({ left: clamped * first.offsetWidth, behavior: 'smooth' });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  const badge = current ? topBadge(current) : null;
  const bs = current ? bsLabel(current.price_usd, business.exchange_rate, business.show_bs) : null;
  const inCart = current ? (qtyInCart.get(current.id) ?? 0) : 0;

  return (
    <div className="vitrina relative isolate flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden text-white">
      {/* Fondo: degradado oscuro con el color del restaurante encendido abajo */}
      <div className="vitrina-bg fixed inset-0 -z-10" aria-hidden />

      <header className="flex items-center gap-3 px-4 pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Vitrina</p>
          <h1 className="truncate font-display text-2xl leading-tight font-extrabold tracking-tight">{business.name}</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Salir de la vitrina"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur active:scale-90"
        >
          <X size={22} aria-hidden />
        </button>
      </header>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Categorías">
        {[{ id: null as string | null, name: 'Todo', emoji: '✨' }, ...usedCats].map((c) => {
          const on = cat === c.id;
          return (
            <button
              key={c.id ?? 'todo'}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setCat(c.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                on ? 'bg-white text-ink' : 'bg-white/10 text-white/85 backdrop-blur'
              }`}
            >
              {c.emoji && <span aria-hidden>{c.emoji} </span>}
              {c.name}
            </button>
          );
        })}
      </div>

      {products.length === 0 ? (
        <p className="px-4 py-24 text-center text-white/75">No hay platos disponibles en esta categoría ahora mismo.</p>
      ) : (
        <>
          <section className="relative mt-2" aria-roledescription="carrusel" aria-label="Platos">
            <div
              ref={trackRef}
              onScroll={onScroll}
              onKeyDown={onKey}
              tabIndex={0}
              aria-label="Desliza para ver más platos"
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-[19%] outline-none sm:px-[31%]"
            >
              {products.map((p, i) => {
                const on = i === active;
                return (
                  <div
                    key={p.id}
                    className="flex shrink-0 basis-full snap-center justify-center pt-3 pb-6"
                    aria-hidden={!on}
                  >
                    <button
                      type="button"
                      tabIndex={on ? 0 : -1}
                      onClick={() => (on ? onOpen(p) : goTo(i))}
                      aria-label={on ? `Ver detalle de ${p.name}` : `Ir a ${p.name}`}
                      className={`plate-slot relative aspect-square w-full max-w-[min(18rem,30dvh)] transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        on ? 'scale-100 opacity-100' : 'scale-[0.62] opacity-45 blur-[1px]'
                      }`}
                    >
                      {/* Sombra en el "piso": hace que el plato parezca flotar */}
                      <span className="plate-shadow absolute inset-x-[12%] -bottom-5 h-6 rounded-[50%] bg-black/55 blur-md" aria-hidden />
                      <span key={on ? `on-${p.id}` : p.id} className={`block size-full ${on ? 'plate-in' : ''}`}>
                        <ProductImage
                          src={p.image_url}
                          alt=""
                          eager={i < 3}
                          className="size-full rounded-full ring-[6px] ring-white/90 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.75)]"
                        />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Plato anterior"
              className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur disabled:opacity-0 sm:grid"
            >
              <ChevronLeft size={24} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active >= products.length - 1}
              aria-label="Plato siguiente"
              className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur disabled:opacity-0 sm:grid"
            >
              <ChevronRight size={24} aria-hidden />
            </button>
          </section>

          {current && (
            <div key={current.id} className="rise px-6 text-center" aria-live="polite">
              {badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-bold backdrop-blur">
                  <span aria-hidden>{BADGES[badge].emoji}</span> {BADGES[badge].label}
                </span>
              )}
              <h2 className="mt-1.5 line-clamp-2 font-display text-[1.75rem] leading-[1.05] font-extrabold tracking-tight text-balance">{current.name}</h2>
              <p className="mt-0.5 text-sm text-white/65">{catName.get(current.category_id)}</p>
              {current.description && <p className="mx-auto mt-1.5 line-clamp-2 max-w-sm text-sm text-white/80 [@media(max-height:740px)]:hidden">{current.description}</p>}
              <p className="mt-2 font-display text-[2.25rem] leading-none font-extrabold tabular-nums">{formatUsd(current.price_usd)}</p>
              {bs && <p className="mt-1 text-sm text-white/60 tabular-nums">{bs}</p>}
            </div>
          )}

          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {products.length <= 12 ? (
              products.map((p, i) => (
                <span key={p.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/35'}`} />
              ))
            ) : (
              <span className="text-sm font-semibold text-white/70 tabular-nums">
                {active + 1} / {products.length}
              </span>
            )}
          </div>

          {current && (
            <div className="mx-auto mt-auto flex w-full max-w-sm gap-3 px-6 pt-4 pb-3">
              <button
                type="button"
                onClick={() => onOpen(current)}
                className="h-14 flex-1 rounded-full bg-white/12 font-display font-bold backdrop-blur active:scale-95"
              >
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => onQuickAdd(current)}
                aria-label={`Agregar ${current.name}, ${formatUsd(current.price_usd)}`}
                className="flex h-14 flex-[1.6] items-center justify-center gap-2 rounded-full bg-brand font-display text-lg font-bold text-brand-ink shadow-[0_12px_30px_-10px_var(--brand)] active:scale-95"
              >
                <Plus size={22} strokeWidth={3} aria-hidden />
                Agregar
                {inCart > 0 && (
                  <span key={inCart} className="bump grid min-w-6 place-items-center rounded-full bg-white px-1.5 text-sm leading-6 font-extrabold text-brand tabular-nums">
                    {inCart}
                  </span>
                )}
              </button>
            </div>
          )}

          <p className="pb-4 text-center text-xs text-white/50">Desliza de lado a lado para ver más platos · Fotos referenciales</p>
        </>
      )}
    </div>
  );
}
