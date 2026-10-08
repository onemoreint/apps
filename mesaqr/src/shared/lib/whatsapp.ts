import { ORDER_TYPE_EMOJI, ORDER_TYPE_LABEL, type CreatedOrder } from '@/shared/types/menu';
import { formatBs, formatUsd } from './money';
import { waDigits } from './phone';

const TIME_ZONE = 'America/Caracas';

/** "8:42 PM" en la hora del restaurante, sin importar la zona del teléfono. */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(date);
}

/**
 * Mensaje del pedido, construido SOLO con los datos que devolvió el servidor
 * (precios recalculados allí). Formato pensado para leerse rápido en la cocina.
 */
export function buildOrderMessage(order: CreatedOrder): string {
  const c = order.customer;
  const lines: string[] = ['Hola 👋', 'Quiero realizar este pedido:', '', `🧾 Pedido #${order.code}`, `👤 ${c.name}`];
  if (c.phone) lines.push(`📞 ${c.phone}`);
  lines.push(`${ORDER_TYPE_EMOJI[c.type]} ${ORDER_TYPE_LABEL[c.type]}`);
  if (c.type === 'delivery' && c.address) lines.push(`📍 ${c.address}`);
  if (c.payment) lines.push(`💳 ${c.payment}`);
  lines.push('');

  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.product_name} — ${formatUsd(Number(item.line_total_usd))}`);
    for (const opt of item.options) {
      lines.push(`   ${opt.price_delta_usd > 0 ? '+' : '•'} ${opt.option_name}`);
    }
    if (item.notes) lines.push(`   ✏️ ${item.notes}`);
  }

  lines.push('');
  const total = `💰 Total: ${formatUsd(Number(order.total_usd))}`;
  lines.push(order.show_bs ? `${total} (≈ ${formatBs(Number(order.total_bs))})` : total);

  if (order.notes) lines.push('', '📝 Observaciones:', order.notes);

  lines.push('', `⏰ ${formatTime(new Date(order.created_at))}`);
  return lines.join('\n');
}

/** https://wa.me/584XXXXXXXXX?text=… con el texto codificado (acentos, emojis, saltos de línea). */
export function waLink(phoneE164: string, text: string): string {
  return `https://wa.me/${waDigits(phoneE164)}?text=${encodeURIComponent(text)}`;
}
