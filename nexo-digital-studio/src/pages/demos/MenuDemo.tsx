import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, ShoppingBag, X, Trash2, ArrowLeft, Search, Bike, Store, CheckCircle2, Clock, MapPin, Info } from "lucide-react";
import { DemoShell } from "../../components/DemoShell";
import { SafeImage } from "../../components/SafeImage";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { menuBusiness, menuCategories, menuProducts, type MenuProduct } from "../../data/menuDemo";
import { isValidPhone, money, waLink } from "../../services/whatsapp";
import { useCountUp } from "../../hooks/useCountUp";
import { useLockBody } from "../../hooks/useLockBody";

/* ─────────────── Estado del carrito ─────────────── */
type Cart = Record<string, number>;
type CartAction = { type: "add" | "remove"; id: string } | { type: "set"; id: string; qty: number } | { type: "clear" };

const STORAGE_KEY = "nexo-demo-menu-cart";

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "add": return { ...state, [action.id]: Math.min(99, (state[action.id] ?? 0) + 1) };
    case "remove": {
      const qty = (state[action.id] ?? 0) - 1;
      const next = { ...state };
      if (qty <= 0) delete next[action.id]; else next[action.id] = qty;
      return next;
    }
    case "set": {
      const next = { ...state };
      if (action.qty <= 0) delete next[action.id]; else next[action.id] = Math.min(99, action.qty);
      return next;
    }
    case "clear": return {};
  }
}

function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Cart) : {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, q]) => menuProducts.some((p) => p.id === id) && q > 0));
  } catch { return {}; }
}

/* ─────────────── Pedido ─────────────── */
interface Checkout {
  name: string;
  phone: string;
  mode: "domicilio" | "recoger";
  address: string;
  payment: string;
  notes: string;
}
type CheckoutErrors = Partial<Record<keyof Checkout, string>>;

const EMPTY_CHECKOUT: Checkout = { name: "", phone: "", mode: "domicilio", address: "", payment: "", notes: "" };

function buildOrderMessage(lines: { p: MenuProduct; qty: number }[], c: Checkout, subtotal: number, fee: number) {
  const items = lines.map(({ p, qty }) => `• ${qty} x ${p.name} — ${money(p.price * qty)}`);
  return [
    `🧾 *NUEVO PEDIDO · ${menuBusiness.name.toUpperCase()}*`,
    "",
    `👤 *Cliente:* ${c.name.trim()}`,
    `📱 *Teléfono:* ${c.phone.trim()}`,
    c.mode === "domicilio" ? `🛵 *Entrega:* Domicilio\n📍 *Dirección:* ${c.address.trim()}` : "🏪 *Entrega:* Recoger en el local",
    `💳 *Pago:* ${c.payment}`,
    "",
    "*Productos:*",
    ...items,
    "",
    `Subtotal: ${money(subtotal)}`,
    c.mode === "domicilio" ? `Domicilio: ${money(fee)}` : null,
    `💰 *TOTAL: ${money(subtotal + fee)}*`,
    c.notes.trim() ? `\n📝 *Observaciones:* ${c.notes.trim()}` : null,
    "",
    "_Pedido de demostración generado con el menú digital de NEXO DIGITAL STUDIO._",
  ].filter((l) => l !== null).join("\n");
}

/* ─────────────── Componentes ─────────────── */
function Stepper({ qty, onAdd, onRemove, name, size = "md" }: { qty: number; onAdd: () => void; onRemove: () => void; name: string; size?: "md" | "sm" }) {
  const h = size === "sm" ? "h-9" : "h-10";
  if (qty === 0) {
    return (
      <button type="button" onClick={onAdd} aria-label={`Agregar ${name}`} className={`inline-flex ${h} items-center gap-1.5 rounded-full bg-[#e8590c] px-4 text-[13.5px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(232,89,12,0.8)] transition active:scale-95 hover:bg-[#d24f08]`}>
        <Plus className="h-4 w-4" /> Agregar
      </button>
    );
  }
  return (
    <div className={`inline-flex ${h} items-center rounded-full bg-[#1f1611] text-white`} role="group" aria-label={`Cantidad de ${name}`}>
      <button type="button" onClick={onRemove} aria-label={`Quitar una unidad de ${name}`} className={`grid ${h} w-10 place-items-center rounded-full transition active:scale-90 hover:bg-white/10`}>
        {qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="min-w-[1.6rem] text-center text-[15px] font-bold tabular-nums" aria-live="polite">{qty}</span>
      <button type="button" onClick={onAdd} aria-label={`Agregar una unidad de ${name}`} className={`grid ${h} w-10 place-items-center rounded-full transition active:scale-90 hover:bg-white/10`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Total({ value, className = "" }: { value: number; className?: string }) {
  const v = useCountUp(value);
  return <span className={`tabular-nums ${className}`}>{money(v)}</span>;
}

export default function MenuDemo() {
  const reduced = useReducedMotion();
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [category, setCategory] = useState<string>("todo");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<null | "cart" | "checkout" | "done">(null);
  const [checkout, setCheckout] = useState<Checkout>(EMPTY_CHECKOUT);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [orderLink, setOrderLink] = useState("");
  const [bump, setBump] = useState(0);
  const listTop = useRef<HTMLDivElement>(null);
  useLockBody(panel !== null);

  useEffect(() => {
    document.title = `${menuBusiness.name} · Demo menú digital · NEXO DIGITAL STUDIO`;
    return () => { document.title = "NEXO DIGITAL STUDIO · Landing pages, páginas web, menús QR e IA para negocios"; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* almacenamiento no disponible */ }
  }, [cart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lines = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ p: menuProducts.find((x) => x.id === id)!, qty })).filter((l) => l.p),
    [cart]
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const fee = checkout.mode === "domicilio" && subtotal > 0 ? menuBusiness.deliveryFee : 0;
  const total = subtotal + fee;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return menuProducts.filter((p) => {
      const inCat = category === "todo" || p.category === category;
      const hay = `${p.name} ${p.description}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return inCat && (!q || hay.includes(q));
    });
  }, [category, query]);

  const add = (id: string) => { dispatch({ type: "add", id }); setBump((b) => b + 1); };
  const remove = (id: string) => dispatch({ type: "remove", id });

  const selectCategory = (id: string) => {
    setCategory(id);
    const top = (listTop.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 130;
    if (window.scrollY > top) window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  const setField = <K extends keyof Checkout>(k: K, v: Checkout[K]) => {
    setCheckout((c) => ({ ...c, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submitOrder = (e: FormEvent) => {
    e.preventDefault();
    const er: CheckoutErrors = {};
    if (checkout.name.trim().length < 2) er.name = "Escribe tu nombre.";
    if (!isValidPhone(checkout.phone)) er.phone = "Escribe un teléfono válido.";
    if (checkout.mode === "domicilio" && checkout.address.trim().length < 6) er.address = "Escribe la dirección de entrega.";
    if (!checkout.payment) er.payment = "Elige un método de pago.";
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) { document.getElementById(`co-${first}`)?.focus(); return; }
    const link = waLink(buildOrderMessage(lines, checkout, subtotal, fee));
    setOrderLink(link);
    setPanel("done");
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const finish = () => { dispatch({ type: "clear" }); setCheckout(EMPTY_CHECKOUT); setPanel(null); };

  return (
    <DemoShell label="Menú digital" quoteMessage="Hola, probé el demo de menú digital y quiero uno para mi negocio.">
      <div className="min-h-screen bg-[#fbf6f0] pb-32 font-sans text-[#1f1611]">
        {/* Portada del restaurante */}
        <header className="relative overflow-hidden bg-[#1f1611] text-white">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(232,89,12,0.55),transparent_55%),radial-gradient(circle_at_10%_100%,rgba(255,180,84,0.25),transparent_50%)]" />
          <div className="relative mx-auto max-w-3xl px-5 pb-9 pt-8 sm:pt-12">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#e8590c] text-3xl shadow-lg sm:h-20 sm:w-20 sm:text-4xl" aria-hidden>🔥</span>
              <div>
                <h1 className="font-display text-[28px] font-extrabold leading-tight sm:text-4xl">{menuBusiness.name}</h1>
                <p className="text-[15px] text-white/75">{menuBusiness.slogan}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Abierto ahora</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Clock className="h-3.5 w-3.5" /> 11:00 a. m. – 10:00 p. m.</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><MapPin className="h-3.5 w-3.5" /> Domicilio o recogida</span>
            </div>
          </div>
        </header>

        {/* Buscador + categorías (fijos al hacer scroll) */}
        <div className="sticky top-[57px] z-30 border-b border-[#1f1611]/10 bg-[#fbf6f0]/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 pt-3">
            <label className="relative block">
              <span className="sr-only">Buscar en el menú</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1f1611]/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar un plato o bebida…"
                className="h-11 w-full rounded-full border border-[#1f1611]/10 bg-white pl-10 pr-10 text-[16px] outline-none transition focus:border-[#e8590c] focus:ring-2 focus:ring-[#e8590c]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#1f1611]/50 hover:bg-[#1f1611]/5"><X className="h-4 w-4" /></button>
              )}
            </label>
            <nav aria-label="Categorías" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
              {[{ id: "todo", name: "Todo", emoji: "✨" }, ...menuCategories].map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    aria-pressed={active}
                    className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition ${active ? "text-white" : "bg-white text-[#1f1611]/80 ring-1 ring-[#1f1611]/10 hover:ring-[#1f1611]/25"}`}
                  >
                    {active && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-[#1f1611]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <span className="relative" aria-hidden>{c.emoji}</span>
                    <span className="relative">{c.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Productos */}
        <main ref={listTop} className="mx-auto max-w-3xl px-4 pt-5">
          <p className="mb-4 flex items-start gap-2 rounded-2xl bg-[#e8590c]/[0.08] p-3 text-[13.5px] text-[#7a3206]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Negocio y productos ficticios. Al confirmar, el pedido se envía al WhatsApp de NEXO para que veas cómo llegaría a tu negocio.
          </p>
          {visible.length === 0 ? (
            <div className="py-16 text-center text-[#1f1611]/60">
              <p className="text-4xl" aria-hidden>🔍</p>
              <p className="mt-3 font-semibold">No encontramos productos con «{query}».</p>
              <button type="button" onClick={() => { setQuery(""); setCategory("todo"); }} className="mt-4 rounded-full bg-[#1f1611] px-5 py-2.5 text-sm font-bold text-white">Ver todo el menú</button>
            </div>
          ) : (
            <motion.ul layout={!reduced} className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((p) => {
                  const qty = cart[p.id] ?? 0;
                  return (
                    <motion.li
                      key={p.id}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.22 }}
                      className={`flex overflow-hidden rounded-3xl bg-white shadow-[0_1px_0_rgba(31,22,17,0.06),0_10px_30px_-18px_rgba(31,22,17,0.35)] ring-1 transition sm:flex-col ${qty ? "ring-[#e8590c]/50" : "ring-[#1f1611]/[0.06]"}`}
                    >
                      <div className="relative w-[118px] shrink-0 sm:w-full">
                        <SafeImage src={p.image} alt={p.name} fallback={p.emoji} className="h-full min-h-[132px] w-full sm:h-44" />
                        {p.tag && <span className="absolute left-2 top-2 rounded-full bg-[#1f1611]/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{p.tag}</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                        <h3 className="font-display text-[16.5px] font-bold leading-snug">{p.name}</h3>
                        <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-[#1f1611]/65">{p.description}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                          <span className="font-display text-[17px] font-extrabold">{money(p.price)}</span>
                          <Stepper qty={qty} name={p.name} onAdd={() => add(p.id)} onRemove={() => remove(p.id)} size="sm" />
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </main>

        {/* Barra del carrito */}
        <AnimatePresence>
          {count > 0 && panel === null && (
            <motion.div
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              exit={{ y: 120 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-40 px-4 pb-safe pt-3"
            >
              <button
                type="button"
                onClick={() => setPanel("cart")}
                className="mx-auto flex min-h-[60px] w-full max-w-3xl items-center justify-between rounded-2xl bg-[#1f1611] px-4 text-white shadow-[0_20px_40px_-12px_rgba(31,22,17,0.7)] transition active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <motion.span key={bump} initial={reduced ? false : { scale: 1.35 }} animate={{ scale: 1 }} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#e8590c]">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#1f1611]">{count}</span>
                  </motion.span>
                  <span className="text-[15px] font-bold">Ver pedido</span>
                </span>
                <Total value={subtotal} className="font-display text-[17px] font-extrabold" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel: carrito / datos / confirmación */}
        <AnimatePresence>
          {panel && (
            <>
              <motion.div key="overlay" className="fixed inset-0 z-[60] bg-[#1f1611]/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanel(null)} />
              <motion.aside
                key="sheet"
                role="dialog"
                aria-modal="true"
                aria-label={panel === "cart" ? "Tu pedido" : panel === "checkout" ? "Datos de entrega" : "Pedido enviado"}
                initial={reduced ? { opacity: 0 } : { y: "100%" }}
                animate={reduced ? { opacity: 1 } : { y: 0 }}
                exit={reduced ? { opacity: 0 } : { y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[92vh] max-w-xl flex-col rounded-t-[28px] bg-[#fbf6f0] text-[#1f1611] shadow-2xl sm:bottom-4 sm:rounded-[28px]"
              >
                <div className="flex items-center justify-between border-b border-[#1f1611]/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    {panel === "checkout" && (
                      <button type="button" onClick={() => setPanel("cart")} aria-label="Volver al carrito" className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#1f1611]/5"><ArrowLeft className="h-5 w-5" /></button>
                    )}
                    <h2 className="font-display text-[20px] font-extrabold">
                      {panel === "cart" ? "Tu pedido" : panel === "checkout" ? "Datos de entrega" : "¡Pedido listo!"}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setPanel(null)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-[#1f1611]/5 hover:bg-[#1f1611]/10"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  {panel === "cart" && (
                    lines.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-5xl" aria-hidden>🛒</p>
                        <p className="mt-3 font-semibold text-[#1f1611]/70">Tu carrito está vacío.</p>
                        <button type="button" onClick={() => setPanel(null)} className="mt-5 rounded-full bg-[#1f1611] px-5 py-2.5 text-sm font-bold text-white">Ver el menú</button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#1f1611]/10">
                        {lines.map(({ p, qty }) => (
                          <li key={p.id} className="flex items-center gap-3 py-3">
                            <SafeImage src={p.image} alt="" fallback={p.emoji} className="h-14 w-14 shrink-0 rounded-xl" width={112} height={112} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">{p.name}</p>
                              <p className="text-[13.5px] text-[#1f1611]/60">{money(p.price)} c/u · <span className="font-bold text-[#1f1611]">{money(p.price * qty)}</span></p>
                            </div>
                            <Stepper qty={qty} name={p.name} onAdd={() => add(p.id)} onRemove={() => remove(p.id)} size="sm" />
                          </li>
                        ))}
                      </ul>
                    )
                  )}

                  {panel === "checkout" && (
                    <form id="checkout-form" onSubmit={submitOrder} noValidate className="space-y-4">
                      <div>
                        <label htmlFor="co-name" className="mb-1.5 block text-[14px] font-bold">Nombre *</label>
                        <input id="co-name" value={checkout.name} onChange={(e) => setField("name", e.target.value)} autoComplete="name" maxLength={60} placeholder="¿A nombre de quién?" aria-invalid={!!errors.name} className={`h-12 w-full rounded-xl border bg-white px-4 text-[16px] outline-none focus:ring-2 focus:ring-[#e8590c]/25 ${errors.name ? "border-red-500" : "border-[#1f1611]/15 focus:border-[#e8590c]"}`} />
                        {errors.name && <p role="alert" className="mt-1 text-[13px] font-semibold text-red-600">{errors.name}</p>}
                      </div>
                      <div>
                        <label htmlFor="co-phone" className="mb-1.5 block text-[14px] font-bold">Teléfono *</label>
                        <input id="co-phone" type="tel" inputMode="tel" value={checkout.phone} onChange={(e) => setField("phone", e.target.value)} autoComplete="tel" maxLength={20} placeholder="300 000 0000" aria-invalid={!!errors.phone} className={`h-12 w-full rounded-xl border bg-white px-4 text-[16px] outline-none focus:ring-2 focus:ring-[#e8590c]/25 ${errors.phone ? "border-red-500" : "border-[#1f1611]/15 focus:border-[#e8590c]"}`} />
                        {errors.phone && <p role="alert" className="mt-1 text-[13px] font-semibold text-red-600">{errors.phone}</p>}
                      </div>

                      <fieldset>
                        <legend className="mb-1.5 text-[14px] font-bold">¿Cómo recibes tu pedido? *</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {([["domicilio", "Domicilio", Bike], ["recoger", "Recoger", Store]] as const).map(([val, label, Icon]) => (
                            <label key={val} className={`flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-[15px] font-bold transition ${checkout.mode === val ? "border-[#e8590c] bg-[#e8590c]/10 text-[#b5420a]" : "border-[#1f1611]/10 bg-white"}`}>
                              <input type="radio" name="mode" value={val} checked={checkout.mode === val} onChange={() => setField("mode", val)} className="sr-only" />
                              <Icon className="h-5 w-5" /> {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <AnimatePresence initial={false}>
                        {checkout.mode === "domicilio" && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <label htmlFor="co-address" className="mb-1.5 block text-[14px] font-bold">Dirección de entrega *</label>
                            <input id="co-address" value={checkout.address} onChange={(e) => setField("address", e.target.value)} autoComplete="street-address" maxLength={140} placeholder="Calle, número, barrio y referencia" aria-invalid={!!errors.address} className={`h-12 w-full rounded-xl border bg-white px-4 text-[16px] outline-none focus:ring-2 focus:ring-[#e8590c]/25 ${errors.address ? "border-red-500" : "border-[#1f1611]/15 focus:border-[#e8590c]"}`} />
                            {errors.address && <p role="alert" className="mt-1 text-[13px] font-semibold text-red-600">{errors.address}</p>}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <fieldset>
                        <legend className="mb-1.5 text-[14px] font-bold">Método de pago *</legend>
                        <div id="co-payment" tabIndex={-1} className="grid grid-cols-2 gap-2">
                          {menuBusiness.paymentMethods.map((m) => (
                            <label key={m} className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-center text-[13.5px] font-bold transition ${checkout.payment === m ? "border-[#e8590c] bg-[#e8590c]/10 text-[#b5420a]" : "border-[#1f1611]/10 bg-white"}`}>
                              <input type="radio" name="payment" value={m} checked={checkout.payment === m} onChange={() => setField("payment", m)} className="sr-only" />
                              {m}
                            </label>
                          ))}
                        </div>
                        {errors.payment && <p role="alert" className="mt-1 text-[13px] font-semibold text-red-600">{errors.payment}</p>}
                      </fieldset>

                      <div>
                        <label htmlFor="co-notes" className="mb-1.5 block text-[14px] font-bold">Observaciones <span className="font-normal text-[#1f1611]/50">(opcional)</span></label>
                        <textarea id="co-notes" rows={2} value={checkout.notes} onChange={(e) => setField("notes", e.target.value)} maxLength={240} placeholder="Ej.: sin cebolla, timbre dañado, pago con billete grande…" className="w-full resize-none rounded-xl border border-[#1f1611]/15 bg-white px-4 py-3 text-[16px] outline-none focus:border-[#e8590c] focus:ring-2 focus:ring-[#e8590c]/25" />
                      </div>
                    </form>
                  )}

                  {panel === "done" && (
                    <div className="py-6 text-center" role="status">
                      <motion.span initial={reduced ? false : { scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#25D366]/15 text-[#16a34a]">
                        <CheckCircle2 className="h-10 w-10" />
                      </motion.span>
                      <h3 className="mt-4 font-display text-2xl font-extrabold">Pedido generado</h3>
                      <p className="mx-auto mt-2 max-w-sm text-[15px] text-[#1f1611]/70">Abrimos WhatsApp con tu pedido organizado. Así lo recibiría el negocio, listo para preparar.</p>
                      <a href={orderLink} target="_blank" rel="noopener noreferrer" className="mx-auto mt-6 flex min-h-[52px] max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-bold text-[#04210f]">
                        <WhatsAppIcon /> Abrir WhatsApp de nuevo
                      </a>
                      <button type="button" onClick={finish} className="mt-3 text-[14px] font-bold text-[#1f1611]/70 underline-offset-2 hover:underline">Hacer un pedido nuevo</button>
                    </div>
                  )}
                </div>

                {/* Totales y acción */}
                {panel !== "done" && lines.length > 0 && (
                  <div className="border-t border-[#1f1611]/10 px-5 pb-safe pt-4">
                    <dl className="space-y-1 text-[14.5px]">
                      <div className="flex justify-between"><dt className="text-[#1f1611]/65">Subtotal ({count} {count === 1 ? "producto" : "productos"})</dt><dd className="font-semibold"><Total value={subtotal} /></dd></div>
                      <div className="flex justify-between"><dt className="text-[#1f1611]/65">{checkout.mode === "domicilio" ? "Domicilio" : "Recoger en el local"}</dt><dd className="font-semibold">{fee ? money(fee) : "Gratis"}</dd></div>
                      <div className="flex justify-between pt-1 font-display text-[19px] font-extrabold"><dt>Total</dt><dd><Total value={total} /></dd></div>
                    </dl>
                    {panel === "cart" ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => dispatch({ type: "clear" })} aria-label="Vaciar carrito" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-[#1f1611]/15 text-[#1f1611]/70 hover:bg-[#1f1611]/5"><Trash2 className="h-5 w-5" /></button>
                        <button type="button" onClick={() => setPanel("checkout")} className="min-h-[52px] flex-1 rounded-2xl bg-[#e8590c] text-[15.5px] font-bold text-white transition hover:bg-[#d24f08]">Continuar con mis datos</button>
                      </div>
                    ) : (
                      <button type="submit" form="checkout-form" className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[15.5px] font-bold text-[#04210f] transition hover:bg-[#3be07a]">
                        <WhatsAppIcon /> Enviar pedido por WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </DemoShell>
  );
}
