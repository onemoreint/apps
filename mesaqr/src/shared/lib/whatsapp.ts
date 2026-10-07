import type { CreatedOrder } from '@/shared/types/menu';
import { formatBs, formatUsd } from './money';
import { waDigits } from './phone';

const RULE = '────────────';
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

function tableLine(tableNumber: number, label?: string | null): string {
  return label ? `📍 MESA ${tableNumber} (${label})` : `📍 MESA ${tableNumber}`;
}

/** Mensaje del pedido, construido SOLO con los datos que devolvió el servidor. */
export function buildOrderMessage(order: CreatedOrder, tableLabel?: string | null): string {
  const lines: string[] = [`🍔 NUEVO PEDIDO #${order.code}`, tableLine(order.table_number, tableLabel), RULE];

  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.product_name}`);
    for (const opt of item.options) {
      lines.push(`   ${opt.price_delta_usd > 0 ? '+' : '•'} ${opt.option_name}`);
    }
  }

  if (order.notes) {
    lines.push(RULE, `📝 ${order.notes}`);
  }

  lines.push(RULE);
  const total = `💰 TOTAL: ${formatUsd(Number(order.total_usd))}`;
  lines.push(order.show_bs ? `${total} (≈ ${formatBs(Number(order.total_bs))})` : total);
  lines.push(`⏰ ${formatTime(new Date(order.created_at))}`);

  return lines.join('\n');
}

export type HelpKind = 'waiter' | 'bill' | 'more' | 'other';

const HELP_TITLES: Record<HelpKind, [string, string]> = {
  waiter: ['🔔 LLAMAR AL MESERO', 'El cliente necesita atención.'],
  bill: ['💳 SOLICITUD DE CUENTA', 'El cliente solicita la cuenta.'],
  more: ['🥤 NECESITO ALGO MÁS', 'El cliente necesita algo más.'],
  other: ['❓ AYUDA', 'El cliente necesita ayuda.'],
};

export function buildHelpMessage(
  kind: HelpKind,
  tableNumber: number,
  tableLabel: string | null,
  date: Date,
  detail?: string,
): string {
  const [title, body] = HELP_TITLES[kind];
  const text = detail?.trim();
  return [title, tableLine(tableNumber, tableLabel), '', text ? text.slice(0, 200) : body, '', `⏰ ${formatTime(date)}`].join(
    '\n',
  );
}

/** https://wa.me/584XXXXXXXXX?text=… con el texto codificado (acentos, emojis, saltos de línea). */
export function waLink(phoneE164: string, text: string): string {
  return `https://wa.me/${waDigits(phoneE164)}?text=${encodeURIComponent(text)}`;
}
