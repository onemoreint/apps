import { Loader2 } from 'lucide-react';
import { Sheet } from '@/shared/ui/Sheet';
import { useCart } from '@/features/cart/cartStore';
import { cartTotals } from '@/features/cart/cartMath';
import { CartSummary } from '@/features/cart/CartSummary';
import { TableTicket } from '@/features/menu/TableTicket';

interface Props {
  tableNumber: number;
  tableLabel: string | null;
  rate: number;
  showBs: boolean;
  sending: boolean;
  error: string | null;
  onSend: () => void;
  onBack: () => void;
}

export function ConfirmSheet({ tableNumber, tableLabel, rate, showBs, sending, error, onSend, onBack }: Props) {
  const { lines, notes } = useCart();
  const totals = cartTotals(lines);

  return (
    <Sheet
      open
      onClose={sending ? () => undefined : onBack}
      title="¿Todo correcto?"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              ⚠️ {error}
            </p>
          )}
          <button
            type="button"
            onClick={onSend}
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
      <TableTicket number={tableNumber} label={tableLabel} size="sm" />
      <ul className="mt-4 space-y-3">
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
      {notes.trim() && (
        <p className="mt-4 rounded-2xl bg-shelf px-4 py-3 text-sm">
          <span className="font-semibold">📝 </span>
          {notes.trim()}
        </p>
      )}
      <div className="mt-4">
        <CartSummary totals={totals} rate={rate} showBs={showBs} />
      </div>
      <p className="mt-4 text-sm text-ink-2">Se abrirá WhatsApp con tu pedido escrito. Solo tienes que pulsar Enviar.</p>
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
