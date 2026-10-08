import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, MapPin, MessageCircle } from 'lucide-react';
import { waLink } from '@/shared/lib/whatsapp';
import { displayPhone } from '@/shared/lib/phone';
import type { CustomerInfo, MenuProduct } from '@/shared/types/menu';
import { fetchMenu } from '@/shared/lib/rpc';
import { ApiError, CUSTOMER_MESSAGES, toApiError } from '@/shared/lib/errors';
import { applyBrand } from '@/shared/lib/color';
import { BUSINESS_SLUG, DEMO_MODE, isConfigured } from '@/shared/lib/env';
import { toCents } from '@/shared/lib/money';
import { toast } from '@/shared/ui/Toast';
import { useCart, type AddInput } from '@/features/cart/cartStore';
import { cartTotals, lineKey, type CartLine } from '@/features/cart/cartMath';
import { CartSheet } from '@/features/cart/CartSheet';
import { CheckoutSheet } from '@/features/checkout/CheckoutSheet';
import { SentView } from '@/features/checkout/SentView';
import { sendOrder } from '@/features/checkout/sendOrder';
import { indexMenu, needsChoice, unavailableIn, type MenuIndex } from './menuIndex';
import { comboFor, offers as offersOf, suggestions } from './catalog';
import { CategoryTabs } from './CategoryTabs';
import { ProductRow } from './ProductRow';
import { ProductSheet } from './ProductSheet';
import { UpsellSheet } from './UpsellSheet';
import { ComboSheet } from './ComboSheet';
import { CravingSheet } from './CravingSheet';
import { HomeView } from './HomeView';
import { OffersView } from './OffersView';
import { BottomNav, type View } from './BottomNav';
import { MenuSkeleton } from './MenuSkeleton';
import { NoticeScreen } from './NoticeScreen';
import { clearSent, loadSent, saveCustomer, saveSent, type SentOrder } from './session';

type Status = 'loading' | 'ready' | 'unavailable' | 'offline';
type SheetState =
  /** followUp: tras agregar, ofrecer combo/sugerencias. replaceKey: reemplaza esa línea (convertir en combo). */
  | { kind: 'product'; product: MenuProduct; editing?: CartLine; followUp?: boolean; note?: string }
  | { kind: 'upsell'; products: MenuProduct[] }
  | { kind: 'combo'; base: MenuProduct; combo: MenuProduct; key: string; qty: number; note: string }
  | { kind: 'craving' }
  | { kind: 'cart' }
  | { kind: 'checkout' }
  | null;

const UPSELL_KEY = 'mesaqr-upsell-shown';
const VIEW_PARAM = 'vista';

function viewFromUrl(): View {
  const v = new URLSearchParams(window.location.search).get(VIEW_PARAM);
  return v === 'menu' || v === 'ofertas' ? v : 'inicio';
}

function sessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function setSessionFlag(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* sin almacenamiento */
  }
}

export default function MenuPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [idx, setIdx] = useState<MenuIndex | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [view, setViewState] = useState<View>(viewFromUrl);
  const [sent, setSent] = useState<SentOrder | null>(() => {
    const s = loadSent();
    return s && Date.now() - s.at < 30 * 60 * 1000 ? s : null;
  });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [pendingCat, setPendingCat] = useState<string | null>(null);
  const comboOffered = useRef(new Set<string>());

  const cart = useCart();
  const totals = cartTotals(cart.lines);

  // ---------- Carga del menú ----------
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const menu = await fetchMenu(BUSINESS_SLUG, signal);
      const index = indexMenu(menu);
      applyBrand(menu.business.primary_color);
      document.title = `${menu.business.name} · Menú`;
      const store = useCart.getState();
      store.bindToken(BUSINESS_SLUG);
      // Si algo del carrito se agotó desde la última visita, se quita y se avisa
      const bad = unavailableIn(index, store.lines.map((l) => l.productId), store.lines.flatMap((l) => l.options.map((o) => o.id)));
      if (bad.size > 0) {
        const removed = store.purge(bad);
        if (removed.length) toast(`Ya no está disponible: ${removed.join(', ')}. Lo quitamos de tu pedido.`, 'warn');
      }
      setIdx(index);
      setActiveCat((c) => c ?? index.menu.categories[0]?.id ?? null);
      setStatus('ready');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setStatus(toApiError(e).code === 'BUSINESS_NOT_FOUND' ? 'unavailable' : 'offline');
    }
  }, []);

  useEffect(() => {
    if (!isConfigured && !DEMO_MODE) return;
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // ---------- Vistas (Inicio / Menú / Ofertas) con el botón Atrás del teléfono ----------
  useEffect(() => {
    const onPop = () => setViewState(viewFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setView = (v: View, keepScroll = false) => {
    if (v !== view) {
      const url = new URL(window.location.href);
      if (v === 'inicio') url.searchParams.delete(VIEW_PARAM);
      else url.searchParams.set(VIEW_PARAM, v);
      window.history.pushState({ view: v }, '', url);
      setViewState(v);
    }
    if (!keepScroll) window.scrollTo({ top: 0 });
  };

  // ---------- Pestañas que siguen el desplazamiento (vista Menú) ----------
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
  const scrollingTo = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || view !== 'menu') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (scrollingTo.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.getAttribute('data-section');
        if (id) setActiveCat(id);
      },
      { rootMargin: '-120px 0px -65% 0px' },
    );
    sectionsRef.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [status, idx, view]);

  const scrollToCategory = (id: string, smooth: boolean) => {
    setActiveCat(id);
    scrollingTo.current = true;
    sectionsRef.current.get(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    window.setTimeout(() => (scrollingTo.current = false), 700);
  };

  // Desde Inicio: cambiar a Menú y bajar hasta la categoría elegida
  useEffect(() => {
    if (view !== 'menu' || !pendingCat) return;
    scrollToCategory(pendingCat, false);
    setPendingCat(null);
  }, [view, pendingCat]);

  // ---------- Carrito ----------
  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart.lines) m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
    return m;
  }, [cart.lines]);
  const inCartIds = useMemo(() => new Set(qtyInCart.keys()), [qtyInCart]);
  const offerList = useMemo(() => (idx ? offersOf(idx) : []), [idx]);
  const cartSuggestions = useMemo(() => (idx ? suggestions(idx, inCartIds) : []), [idx, inCartIds]);

  /** Qué ofrecer después de agregar: primero el combo configurado; si no, sugerencias una vez por visita. */
  const followUp = (product: MenuProduct, key: string, qty: number, note: string) => {
    if (!idx) return setSheet(null);
    const combo = comboFor(idx, product);
    if (combo && !comboOffered.current.has(product.id)) {
      comboOffered.current.add(product.id);
      return setSheet({ kind: 'combo', base: product, combo, key, qty, note });
    }
    const ids = new Set(useCart.getState().lines.map((l) => l.productId));
    const list = suggestions(idx, ids, product);
    if (!product.upsell && list.length > 0 && !sessionFlag(UPSELL_KEY)) {
      setSessionFlag(UPSELL_KEY);
      return setSheet({ kind: 'upsell', products: list });
    }
    setSheet(null);
  };

  const commitAdd = (input: AddInput, product: MenuProduct, after: 'followUp' | 'close' | 'cart'): boolean => {
    if (!cart.add(input)) {
      toast('Tu pedido ya tiene muchos productos distintos. Envíalo y haz otro.', 'warn');
      setSheet(null);
      return false;
    }
    toast(`Agregado: ${input.quantity > 1 ? `${input.quantity} × ` : ''}${input.name}`);
    if (after === 'followUp') followUp(product, lineKey(input.productId, input.options.map((o) => o.id), input.note ?? ''), input.quantity, input.note ?? '');
    else if (after === 'cart') setSheet({ kind: 'cart' });
    else setSheet(null);
    return true;
  };

  /** "+ Agregar" sin entrar al detalle. Si el producto exige elegir algo, abre el detalle. */
  const quickAdd = (p: MenuProduct, after: 'followUp' | 'close' | 'cart' = 'followUp') => {
    if (!idx || !p.available) return;
    if (needsChoice(idx, p)) return setSheet({ kind: 'product', product: p, followUp: after === 'followUp' });
    commitAdd({ productId: p.id, name: p.name, baseCents: toCents(p.price_usd), options: [], quantity: 1, note: '' }, p, after);
  };

  const acceptCombo = (s: Extract<SheetState, { kind: 'combo' }>) => {
    if (!idx) return;
    // Quita del pedido el producto que se convierte en combo
    const line = useCart.getState().lines.find((l) => l.key === s.key);
    if (line) {
      if (line.quantity > s.qty) cart.setQty(line.key, line.quantity - s.qty);
      else cart.remove(line.key);
    }
    if (needsChoice(idx, s.combo)) return setSheet({ kind: 'product', product: s.combo, followUp: false, note: s.note });
    commitAdd(
      { productId: s.combo.id, name: s.combo.name, baseCents: toCents(s.combo.price_usd), options: [], quantity: s.qty, note: s.note },
      s.combo,
      'close',
    );
  };

  // ---------- Envío ----------
  const send = async (customer: CustomerInfo) => {
    if (!idx || sending) return;
    setSendError(null);
    const lines = useCart.getState().lines;
    const bad = unavailableIn(idx, lines.map((l) => l.productId), lines.flatMap((l) => l.options.map((o) => o.id)));
    if (bad.size > 0) {
      cart.purge(bad);
      toast(CUSTOMER_MESSAGES.ITEMS_UNAVAILABLE, 'warn');
      setSheet({ kind: 'cart' });
      return;
    }
    setSending(true);
    try {
      const result = await sendOrder({
        slug: BUSINESS_SLUG,
        lines,
        customer,
        notes: useCart.getState().notes,
        expectedTotalCents: cartTotals(lines).totalCents,
        whatsapp: idx.menu.business.whatsapp,
      });
      saveCustomer(customer);
      saveSent(result);
      useCart.getState().clear();
      setSheet(null);
      setSent(result);
      // Navegación directa (no popup): Safari en iPhone bloquea window.open tras una espera de red.
      if (!result.priceChanged) window.location.href = result.link;
    } catch (e) {
      const err = e instanceof ApiError ? e : toApiError(e);
      if (err.code === 'ITEMS_UNAVAILABLE') {
        const ids = new Set((err.detail ?? '').split(',').filter(Boolean));
        const removed = useCart.getState().purge(ids);
        toast(removed.length ? `Ya no está disponible: ${removed.join(', ')}. Lo quitamos de tu pedido.` : CUSTOMER_MESSAGES.ITEMS_UNAVAILABLE, 'warn');
        setSheet({ kind: 'cart' });
        void load();
      } else {
        setSendError(CUSTOMER_MESSAGES[err.code]);
      }
    } finally {
      setSending(false);
    }
  };

  // ---------- Pantallas ----------
  if (!isConfigured && !DEMO_MODE) {
    return (
      <NoticeScreen icon="🛠️" title="Falta configurar la conexión">
        Copia <code>.env.example</code> como <code>.env.local</code> con los datos de tu proyecto Supabase y reinicia. Ver README.
      </NoticeScreen>
    );
  }
  if (status === 'loading') return <MenuSkeleton />;
  if (status === 'unavailable') {
    return (
      <NoticeScreen icon="🕐" title="El menú no está disponible">
        Este enlace no está activo en este momento. Intenta más tarde o escríbele directamente al restaurante.
      </NoticeScreen>
    );
  }
  if (status === 'offline' || !idx) {
    return (
      <NoticeScreen
        icon="📶"
        title="No pudimos cargar el menú"
        action={
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              void load();
            }}
            className="h-12 rounded-full bg-ink px-6 font-display font-bold text-white"
          >
            Intentar de nuevo
          </button>
        }
      >
        {CUSTOMER_MESSAGES.NETWORK}
      </NoticeScreen>
    );
  }

  const { business, categories } = idx.menu;
  const current: View = view === 'ofertas' && offerList.length === 0 ? 'inicio' : view;
  const open = (p: MenuProduct) => setSheet({ kind: 'product', product: p, followUp: true });

  return (
    <>
      <div className="mx-auto max-w-3xl pb-28">
        {current === 'inicio' && (
          <HomeView
            idx={idx}
            qtyInCart={qtyInCart}
            onOpen={open}
            onQuickAdd={(p) => quickAdd(p)}
            onCategory={(id) => {
              setPendingCat(id);
              setView('menu', true);
            }}
            onCraving={() => setSheet({ kind: 'craving' })}
            onAllMenu={() => setView('menu')}
          />
        )}

        {current === 'menu' && (
          <>
            <div className="px-4 pt-6 pb-1">
              <h1 className="font-display text-[1.875rem] leading-tight font-extrabold tracking-tight">Menú</h1>
              <p className="text-ink-2">{business.name}</p>
            </div>
            <div className="sticky top-0 z-20 mt-2 border-b border-line bg-paper/95 backdrop-blur">
              <CategoryTabs categories={categories} active={activeCat} onSelect={(id) => scrollToCategory(id, true)} />
            </div>
            <main>
              {categories.map((c, ci) => {
                const products = idx.byCategory.get(c.id) ?? [];
                if (products.length === 0) return null;
                return (
                  <section
                    key={c.id}
                    data-section={c.id}
                    ref={(el) => {
                      if (el) sectionsRef.current.set(c.id, el);
                      else sectionsRef.current.delete(c.id);
                    }}
                    className="scroll-mt-16 px-4 pt-6"
                    aria-labelledby={`cat-${c.id}`}
                  >
                    <h2 id={`cat-${c.id}`} className="font-display text-2xl font-extrabold tracking-tight">
                      {c.name}
                    </h2>
                    <div className="divide-y divide-line">
                      {products.map((p, pi) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          rate={business.exchange_rate}
                          showBs={business.show_bs}
                          inCart={qtyInCart.get(p.id) ?? 0}
                          eager={ci === 0 && pi < 3}
                          onOpen={open}
                          onQuickAdd={(prod) => quickAdd(prod)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </main>
          </>
        )}

        {current === 'ofertas' && <OffersView idx={idx} products={offerList} qtyInCart={qtyInCart} onOpen={open} onQuickAdd={(p) => quickAdd(p)} />}

        <footer className="mt-10 space-y-2 px-4 text-sm text-ink-2">
          <a href={waLink(business.whatsapp, `Hola ${business.name}, tengo una consulta.`)} className="flex items-center gap-2 font-semibold text-send">
            <MessageCircle size={16} aria-hidden /> WhatsApp {displayPhone(business.whatsapp)}
          </a>
          {business.address && (
            <p className="flex items-center gap-2">
              <MapPin size={16} aria-hidden /> {business.address}
            </p>
          )}
          {business.instagram && (
            <a
              href={`https://instagram.com/${business.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline-offset-2 hover:underline"
            >
              <AtSign size={16} aria-hidden /> @{business.instagram.replace(/^@/, '')}
            </a>
          )}
          {business.show_bs && <p className="text-ink-3">Precios en dólares. Montos en Bs. referenciales a la tasa del día.</p>}
          <p className="text-ink-3">Fotos referenciales.</p>
          {DEMO_MODE && <p className="text-ink-3">Modo demostración: los pedidos se envían por WhatsApp pero no se guardan en el sistema.</p>}
        </footer>
      </div>

      <BottomNav view={current} showOffers={offerList.length > 0} totals={totals} onView={(v) => setView(v)} onCart={() => setSheet({ kind: 'cart' })} />

      {sheet?.kind === 'product' && (
        <ProductSheet
          key={sheet.product.id + (sheet.editing?.key ?? '')}
          idx={idx}
          product={sheet.product}
          editing={sheet.editing}
          initialNote={sheet.note}
          onClose={() => setSheet(sheet.editing ? { kind: 'cart' } : null)}
          onConfirm={(choice) => {
            if (sheet.editing) {
              cart.replace(sheet.editing.key, choice);
              setSheet({ kind: 'cart' });
            } else {
              commitAdd(choice, sheet.product, sheet.followUp ? 'followUp' : 'close');
            }
          }}
        />
      )}
      {sheet?.kind === 'upsell' && <UpsellSheet products={sheet.products} onPick={(p) => quickAdd(p, 'close')} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'combo' && (
        <ComboSheet
          base={sheet.base}
          combo={sheet.combo}
          rate={business.exchange_rate}
          showBs={business.show_bs}
          onAccept={() => acceptCombo(sheet)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'craving' && (
        <CravingSheet
          idx={idx}
          qtyInCart={qtyInCart}
          onOpen={(p) => setSheet({ kind: 'product', product: p, followUp: false })}
          onQuickAdd={(p) => quickAdd(p, 'close')}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'cart' && (
        <CartSheet
          rate={business.exchange_rate}
          showBs={business.show_bs}
          canEdit={(l) => idx.productById.has(l.productId)}
          onEdit={(l) => {
            const p = idx.productById.get(l.productId);
            if (p) setSheet({ kind: 'product', product: p, editing: l });
          }}
          suggested={cartSuggestions}
          onSuggest={(p) => quickAdd(p, 'cart')}
          onReview={() => {
            setSendError(null);
            setSheet({ kind: 'checkout' });
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'checkout' && (
        <CheckoutSheet business={business} sending={sending} error={sendError} onSend={send} onBack={() => setSheet({ kind: 'cart' })} />
      )}
      {sent && (
        <SentView
          order={sent}
          onContinue={() => {
            clearSent();
            setSent(null);
          }}
        />
      )}
    </>
  );
}
