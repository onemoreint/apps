import { CheckCircle2 } from 'lucide-react';
import { formatBs, formatUsd } from '@/shared/lib/money';
import type { SentOrder } from '@/features/menu/session';
import { WhatsAppGlyph } from './CheckoutSheet';

interface Props {
  order: SentOrder;
  onContinue: () => void;
}

/**
 * wa.me solo abre el chat con el texto escrito: no podemos saber si el cliente
 * pulsó Enviar. Por eso esta pantalla lo dice claramente y ofrece reabrir WhatsApp.
 */
export function SentView({ order, onContinue }: Props) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-labelledby="sent-title">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pt-16 pb-8">
        <CheckCircle2 size={56} className="text-send" aria-hidden />
        <h1 id="sent-title" className="mt-4 font-display text-3xl leading-tight font-extrabold">
          Tu pedido está listo para enviarse por WhatsApp
        </h1>
        <p className="mt-3 text-lg text-ink-2">
          Pedido <strong className="font-display text-ink">#{order.code}</strong> por{' '}
          <strong className="font-display text-ink">{formatUsd(order.totalUsd)}</strong>
          {order.totalBs !== null && <span className="text-ink-3"> (≈ {formatBs(order.totalBs)})</span>}.
        </p>
        {order.priceChanged && (
          <p role="alert" className="mt-4 rounded-2xl bg-mustard/40 px-4 py-3 text-sm font-medium">
            Algunos precios cambiaron mientras elegías. El total de arriba es el actualizado.
          </p>
        )}
        <p className="mt-6 rounded-2xl bg-shelf px-4 py-3">
          En WhatsApp, pulsa <strong>Enviar</strong> para que el restaurante reciba tu pedido.
        </p>

        <div className="mt-auto space-y-3 pt-10">
          <a
            href={order.link}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-send font-display text-lg font-bold text-white"
          >
            <WhatsAppGlyph /> {order.priceChanged ? 'Abrir WhatsApp' : 'Abrir WhatsApp otra vez'}
          </a>
          <button type="button" onClick={onContinue} className="h-12 w-full rounded-full bg-shelf font-display font-bold">
            Agregar otro pedido
          </button>
        </div>
      </div>
    </div>
  );
}
