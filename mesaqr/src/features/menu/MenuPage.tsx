import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, MapPin, MessageCircle } from 'lucide-react';
import { ORDER_TYPE_EMOJI, ORDER_TYPE_LABEL, type CustomerInfo, type MenuProduct } from '@/shared/types/menu';
import { fetchMenu } from '@/shared/lib/rpc';
import { ApiError, CUSTOMER_MESSAGES, toApiError } from '@/shared/lib/errors';
import { applyBrand } from '@/shared/lib/color';
import { BUSINESS_SLUG, DEMO_MODE, isConfigured } from '@/shared/lib/env';
import { asset } from '@/shared/lib/asset';
import { waLink } from '@/shared/lib/whatsapp';
import { toast } from '@/shared/ui/Toast';
import { useCart } from '@/features/cart/cartStore';
import { cartTotals, type CartLine } from '@/features/cart/cartMath';
import { CartBar } from '@/features/cart/CartBar';
import { CartSheet } from '@/features/cart/CartSheet';
import { CheckoutSheet } from '@/features/checkout/CheckoutSheet';
import { SentView } from '@/features/checkout/SentView';
import { sendOrder } from '@/features/checkout/sendOrder';
import { indexMenu, groupsFor, needsChoice, unavailableIn, type MenuIndex } from './menuIndex';
import { CategoryTabs } from './CategoryTabs';
import { ProductRow } from './ProductRow';
import { ProductSheet, type ProductChoice } from './ProductSheet';
import { UpsellSheet } from './UpsellSheet';
import { MenuSkeleton } from './MenuSkeleton';
import { NoticeScreen } from './NoticeScreen';
import { clearSent, loadSent, saveCustomer, saveSent, type SentOrder } from './session';

type Status = 'loading' | 'ready' | 'unavailable' | 'offline';
type SheetState =
  | { kind: 'product'; product: MenuProduct; editing?: CartLine }
  | { kind: 'upsell' }
  | { kind: 'cart' }
  | { kind: 'checkout' }
  | null;

const UPSELL_KEY = 'mesaqr-upsell-shown';

export default function MenuPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [idx, setIdx] = useState<MenuIndex | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sent, setSent] = useState<SentOrder | null>(() => {
    const s = loadSent();
    return s && Date.now() - s.at < 30 * 60 * 1000 ? s : null;
  });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);

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

  // ---------- Pestañas que siguen el desplazamiento ----------
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
  const scrollingTo = useRef(false);
  useEffect(() => {
    if (status !== 'ready') return;
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
  }, [status, idx]);

  const goToCategory = (id: string) => {
    setActiveCat(id);
    scrollingTo.current = true;
    sectionsRef.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => (scrollingTo.current = false), 700);
  };

  // ---------- Carrito ----------
  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart.lines) m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity);
    return m;
  }, [cart.lines]);

  const upsellCandidates = useMemo(
    () => (idx ? idx.menu.products.filter((p) => p.upsell && p.available && !qtyInCart.has(p.id)).slice(0, 4) : []),
    [idx, qtyInCart],
  );

  const addChoice = (choice: ProductChoice, product: MenuProduct, editing?: CartLine) => {
    if (editing) {
      cart.replace(editing.key, choice);
      setSheet({ kind: 'cart' });
      return;
    }
    if (!cart.add(choice)) {
      toast('Tu pedido ya tiene muchos productos distintos. Envíalo y haz otro.', 'warn');
      setSheet(null);
      return;
    }
    toast(`Agregado: ${choice.quantity > 1 ? `${choice.quantity} × ` : ''}${choice.name}`);
    let shown = false;
    try {
      shown = sessionStorage.getItem(UPSELL_KEY) === '1';
    } catch {
      /* sin almacenamiento */
    }
    const candidates = upsellCandidates.filter((p) => p.id !== product.id);
    if (!shown && !product.upsell && candidates.length > 0) {
      try {
        sessionStorage.setItem(UPSELL_KEY, '1');
      } catch {
        /* sin almacenamiento */
      }
      setSheet({ kind: 'upsell' });
    } else {
      setSheet(null);
    }
  };

  const quickAdd = (p: MenuProduct) => {
    if (!idx) return;
    if (needsChoice(idx, p)) {
      setSheet({ kind: 'product', product: p });
      return;
    }
    cart.add({ productId: p.id, name: p.name, baseCents: Math.round(p.price_usd * 100), options: [], quantity: 1 });
    toast(`Agregado: ${p.name}`);
    setSheet(null);
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

  return (
    <>
      <div className={`mx-auto max-w-3xl ${totals.count > 0 ? 'pb-28' : 'pb-10'}`}>
        <header className="px-4 pt-6 pb-1">
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
        </header>

        <div className="sticky top-0 z-20 mt-3 border-b border-line bg-paper/95 backdrop-blur">
          <CategoryTabs categories={categories} active={activeCat} onSelect={goToCategory} />
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
                      onOpen={(prod) => setSheet({ kind: 'product', product: prod })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </main>

        <footer className="mt-10 space-y-2 px-4 text-sm text-ink-2">
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

      {!sheet && <CartBar totals={totals} onOpen={() => setSheet({ kind: 'cart' })} />}

      {sheet?.kind === 'product' && (
        <ProductSheet
          key={sheet.product.id + (sheet.editing?.key ?? '')}
          idx={idx}
          product={sheet.product}
          editing={sheet.editing}
          onClose={() => setSheet(sheet.editing ? { kind: 'cart' } : null)}
          onConfirm={(choice) => addChoice(choice, sheet.product, sheet.editing)}
        />
      )}
      {sheet?.kind === 'upsell' && <UpsellSheet products={upsellCandidates} onPick={quickAdd} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'cart' && (
        <CartSheet
          rate={business.exchange_rate}
          showBs={business.show_bs}
          canEdit={(l) => {
            const p = idx.productById.get(l.productId);
            return !!p && groupsFor(idx, p).length > 0;
          }}
          onEdit={(l) => {
            const p = idx.productById.get(l.productId);
            if (p) setSheet({ kind: 'product', product: p, editing: l });
          }}
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
