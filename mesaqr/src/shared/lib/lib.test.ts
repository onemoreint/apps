import { describe, expect, it } from 'vitest';
import { bsLabel, formatBs, formatUsd, toCents, usdToBs } from './money';
import { displayPhone, isValidE164, normalizePhone, waDigits } from './phone';
import { buildOrderMessage, formatTime, waLink } from './whatsapp';
import { toApiError } from './errors';
import { readableOn } from './color';
import type { CreatedOrder } from '@/shared/types/menu';

describe('Moneda', () => {
  it('formatea USD', () => {
    expect(formatUsd(7)).toBe('$7.00');
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });
  it('formatea Bs. al estilo venezolano', () => {
    expect(formatBs(2800)).toBe('Bs. 2.800,00');
    expect(formatBs(9125.5)).toBe('Bs. 9.125,50');
  });
  it('convierte con la tasa y redondea a céntimos', () => {
    expect(usdToBs(7, 400)).toBe(2800);
    expect(usdToBs(0.1 + 0.2, 3)).toBe(0.9);
    expect(usdToBs(1.005, 36.123)).toBe(36.3);
  });
  it('cambio de tasa cambia el monto en Bs., nunca el USD', () => {
    expect(bsLabel(7, 100, true)).toBe('≈ Bs. 700,00');
    expect(bsLabel(7, 120, true)).toBe('≈ Bs. 840,00');
  });
  it('no muestra Bs. si está desactivado o la tasa es inválida', () => {
    expect(bsLabel(7, 100, false)).toBeNull();
    expect(bsLabel(7, 0, true)).toBeNull();
    expect(bsLabel(7, Number.NaN, true)).toBeNull();
  });
  it('centavos enteros evitan errores de coma flotante', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
    expect(toCents('7.25')).toBe(725);
  });
});

describe('Teléfono', () => {
  it('muestra el número venezolano en formato local', () => {
    expect(displayPhone('+584243230113')).toBe('0424-3230113');
    expect(displayPhone('+573001234567')).toBe('+573001234567');
  });

  it('normaliza y valida formato internacional', () => {
    expect(normalizePhone('+58 (412) 123-4567')).toBe('+584121234567');
    expect(normalizePhone('0058 412 1234567')).toBe('+584121234567');
    expect(isValidE164('+584121234567')).toBe(true);
    expect(isValidE164('04121234567')).toBe(false);
    expect(isValidE164('+0412')).toBe(false);
    expect(waDigits('+584121234567')).toBe('584121234567');
  });
});

const order: CreatedOrder = {
  code: '0042',
  order_number: 42,
  created_at: '2026-10-08T00:42:00Z', // 8:42 PM en Caracas (UTC-4)
  customer: { name: 'María Pérez', phone: '0414 555 1234', type: 'delivery', address: 'Urb. La Esmeralda, calle 3', payment: 'Pago móvil' },
  subtotal_usd: 23,
  extras_usd: 2,
  total_usd: 25,
  exchange_rate: 365,
  show_bs: true,
  total_bs: 9125,
  notes: 'Una hamburguesa sin cebolla & bebida sin hielo #2',
  items: [
    {
      product_name: 'Hamburguesa Especial',
      quantity: 2,
      unit_price_usd: 8,
      line_total_usd: 16,
      notes: 'bien cocida',
      options: [
        { group_name: 'Quitar ingredientes', option_name: 'Sin cebolla', price_delta_usd: 0 },
        { group_name: 'Extras', option_name: 'Extra queso', price_delta_usd: 1 },
      ],
    },
    { product_name: 'Pepito Mixto', quantity: 1, unit_price_usd: 8, line_total_usd: 8, options: [] },
  ],
};

describe('WhatsApp', () => {
  it('hora del restaurante (Caracas), sin importar la zona del teléfono', () => {
    expect(formatTime(new Date('2026-10-08T00:42:00Z'))).toBe('8:42 PM');
  });

  it('mensaje del pedido legible, con datos de entrega y pago', () => {
    expect(buildOrderMessage(order)).toBe(
      [
        'Hola 👋',
        'Quiero realizar este pedido:',
        '',
        '🧾 Pedido #0042',
        '👤 María Pérez',
        '📞 0414 555 1234',
        '🛵 Delivery',
        '📍 Urb. La Esmeralda, calle 3',
        '💳 Pago móvil',
        '',
        '2x Hamburguesa Especial — $16.00',
        '   • Sin cebolla',
        '   + Extra queso',
        '   ✏️ bien cocida',
        '1x Pepito Mixto — $8.00',
        '',
        '💰 Total: $25.00 (≈ Bs. 9.125,00)',
        '',
        '📝 Observaciones:',
        'Una hamburguesa sin cebolla & bebida sin hielo #2',
        '',
        '⏰ 8:42 PM',
      ].join('\n'),
    );
  });

  it('para llevar: sin dirección ni teléfono; sin Bs. ni notas cuando no aplican', () => {
    const msg = buildOrderMessage({
      ...order,
      show_bs: false,
      notes: null,
      customer: { name: 'Ana', phone: null, type: 'pickup', address: null, payment: 'Efectivo (USD)' },
    });
    expect(msg).toContain('🥡 Para llevar');
    expect(msg).toContain('💳 Efectivo (USD)');
    expect(msg).not.toContain('📞');
    expect(msg).not.toContain('📍');
    expect(msg).not.toContain('📝');
    expect(msg).not.toContain('✏️ null');
    expect(msg).not.toContain('Bs.');
  });

  it('enlace wa.me codificado: acentos, ñ, emojis, saltos de línea, & y #', () => {
    const text = 'Señor, ¿añade más? 🍔\nMesa #7 & listo';
    const link = waLink('+584121234567', text);
    expect(link.startsWith('https://wa.me/584121234567?text=')).toBe(true);
    const encoded = link.split('?text=')[1]!;
    expect(encoded).not.toMatch(/[\s#&?]/);
    expect(decodeURIComponent(encoded)).toBe(text);
  });

  it('mensaje completo sobrevive la codificación', () => {
    const msg = buildOrderMessage(order);
    expect(decodeURIComponent(waLink('+584121234567', msg).split('?text=')[1]!)).toBe(msg);
  });

});

describe('Errores', () => {
  it('reconoce códigos del servidor y oculta detalles técnicos', () => {
    expect(toApiError({ message: 'ITEMS_UNAVAILABLE', details: 'a,b' })).toMatchObject({ code: 'ITEMS_UNAVAILABLE', detail: 'a,b' });
    expect(toApiError({ message: 'INVALID_CUSTOMER' }).code).toBe('INVALID_CUSTOMER');
    const original = console.error;
    console.error = () => undefined;
    expect(toApiError({ message: 'duplicate key value violates unique constraint' }).code).toBe('UNKNOWN');
    console.error = original;
  });
});

describe('Color de marca', () => {
  it('elige texto legible', () => {
    expect(readableOn('#D62828')).toBe('#FFFFFF');
    expect(readableOn('#FFC530')).toBe('#1A1714');
  });
});
