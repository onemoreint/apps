import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ORDER_TYPE_EMOJI, ORDER_TYPE_LABEL, type CustomerInfo, type OrderType, type PublicBusiness } from '@/shared/types/menu';
import { Sheet } from '@/shared/ui/Sheet';
import { useCart } from '@/features/cart/cartStore';
import { cartTotals } from '@/features/cart/cartMath';
import { CartSummary } from '@/features/cart/CartSummary';
import { loadCustomer } from '@/features/menu/session';

interface Props {
  business: PublicBusiness;
  sending: boolean;
  error: string | null;
  onSend: (customer: CustomerInfo) => void;
  onBack: () => void;
}

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'payment', string>>;

function validate(c: CustomerInfo, b: PublicBusiness): Errors {
  const e: Errors = {};
  if (!c.name.trim()) e.name = 'Escribe tu nombre.';
  if (c.phone.trim() && !/^[0-9+() -]{7,30}$/.test(c.phone.trim())) e.phone = 'Escribe solo números, por ejemplo 0412 1234567.';
  if (c.type === 'delivery' && c.address.trim().length < 5) e.address = 'Escribe la dirección de entrega.';
  if (b.payment_methods.length > 0 && !b.payment_methods.includes(c.payment)) e.payment = 'Elige cómo vas a pagar.';
  return e;
}

const chip = (on: boolean) =>
  `min-h-11 rounded-full border-2 px-4 font-semibold transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink'}`;

export function CheckoutSheet({ business, sending, error, onSend, onBack }: Props) {
  const { lines, notes } = useCart();
  const totals = cartTotals(lines);
  const types = business.order_types;
  const [c, setC] = useState<CustomerInfo>(() => {
    const saved = loadCustomer();
    return {
      name: saved.name ?? '',
      phone: saved.phone ?? '',
      address: saved.address ?? '',
      type: saved.type && types.includes(saved.type) ? saved.type : (types[0] ?? 'pickup'),
      payment: saved.payment && business.payment_methods.includes(saved.payment) ? saved.payment : '',
    };
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof CustomerInfo>(k: K, v: CustomerInfo[K]) => {
    setC((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const e = validate(c, business);
    setErrors(e);
    if (Object.keys(e).length === 0) onSend(c);
  };

  const input = (invalid: boolean) =>
    `w-full rounded-2xl border bg-shelf px-4 text-base outline-none focus:border-ink ${invalid ? 'border-danger' : 'border-line'}`;

  return (
    <Sheet
      open
      onClose={sending ? () => undefined : onBack}
      title="Completa tu pedido"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              ⚠️ {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={sending || lines.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-send font-display text-lg font-bold text-white disabled:opacity-60"
          >
            {sending ? <Loader2 className="animate-spin" size={22} aria-hidden /> : <WhatsAppGlyph />}
            {sending ? 'Preparando tu pedido…' : 'Enviar pedido por WhatsApp'}
          </button>
          <button type="button" onClick={onBack} disabled={sending} className="h-11 w-full rounded-full font-display font-bold text-ink-2">
            Volver a editar
          </button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5 pb-2"
      >
        {types.length > 1 && (
          <fieldset>
            <legend className="mb-2 font-display font-bold">¿Cómo lo quieres?</legend>
            <div className="flex flex-wrap gap-2">
              {types.map((t: OrderType) => (
                <button key={t} type="button" aria-pressed={c.type === t} onClick={() => set('type', t)} className={chip(c.type === t)}>
                  <span aria-hidden>{ORDER_TYPE_EMOJI[t]}</span> {ORDER_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="c-name" className="mb-1.5 block font-display font-bold">
            Tu nombre
          </label>
          <input
            id="c-name"
            autoComplete="name"
            value={c.name}
            maxLength={60}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={!!errors.name}
            className={`h-12 ${input(!!errors.name)}`}
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="c-phone" className="mb-1.5 block font-display font-bold">
            Teléfono <span className="font-sans text-sm font-normal text-ink-3">(opcional)</span>
          </label>
          <input
            id="c-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={c.phone}
            maxLength={30}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            className={`h-12 ${input(!!errors.phone)}`}
          />
          {errors.phone && <p className="mt-1 text-sm text-danger">{errors.phone}</p>}
        </div>

        {c.type === 'delivery' && (
          <div>
            <label htmlFor="c-address" className="mb-1.5 block font-display font-bold">
              Dirección de entrega
            </label>
            <textarea
              id="c-address"
              autoComplete="street-address"
              rows={2}
              value={c.address}
              maxLength={200}
              placeholder="Urbanización, calle, casa o edificio y un punto de referencia"
              onChange={(e) => set('address', e.target.value)}
              aria-invalid={!!errors.address}
              className={`resize-none py-3 ${input(!!errors.address)}`}
            />
            {errors.address && <p className="mt-1 text-sm text-danger">{errors.address}</p>}
          </div>
        )}

        {business.payment_methods.length > 0 && (
          <fieldset>
            <legend className="mb-2 font-display font-bold">¿Cómo vas a pagar?</legend>
            <div className="flex flex-wrap gap-2">
              {business.payment_methods.map((m) => (
                <button key={m} type="button" aria-pressed={c.payment === m} onClick={() => set('payment', m)} className={chip(c.payment === m)}>
                  {m}
                </button>
              ))}
            </div>
            {errors.payment && <p className="mt-1 text-sm text-danger">{errors.payment}</p>}
          </fieldset>
        )}

        <div className="rounded-2xl bg-shelf p-4">
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3">
                <span className="font-display font-extrabold tabular-nums">{l.quantity}×</span>
                <div>
                  <p className="font-medium">{l.name}</p>
                  {l.options.length > 0 && <p className="text-sm text-ink-2">{l.options.map((o) => o.name).join(', ')}</p>}
                </div>
              </li>
            ))}
          </ul>
          {notes.trim() && <p className="mt-3 text-sm">📝 {notes.trim()}</p>}
          <div className="mt-3">
            <CartSummary totals={totals} rate={business.exchange_rate} showBs={business.show_bs} />
          </div>
        </div>
        <p className="text-sm text-ink-2">Se abrirá WhatsApp con tu pedido escrito. Solo tienes que pulsar Enviar.</p>
      </form>
    </Sheet>
  );
}

export function WhatsAppGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z" />
    </svg>
  );
}
