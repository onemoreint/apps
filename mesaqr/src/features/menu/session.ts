import type { CustomerInfo, OrderType } from '@/shared/types/menu';

/**
 * Datos del cliente recordados en este teléfono para el próximo pedido
 * (nombre, teléfono, dirección y preferencias). Nunca salen del dispositivo
 * salvo dentro de un pedido que el cliente confirma.
 */
const CUSTOMER_KEY = 'mesaqr-customer';

export function loadCustomer(): Partial<CustomerInfo> {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return {};
    const c = JSON.parse(raw) as Partial<CustomerInfo>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
    const type = (['pickup', 'delivery', 'dine_in'] as OrderType[]).includes(c.type as OrderType) ? c.type : undefined;
    return { name: str(c.name, 60), phone: str(c.phone, 30), address: str(c.address, 200), payment: str(c.payment, 40), type };
  } catch {
    return {};
  }
}

export function saveCustomer(c: CustomerInfo): void {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  } catch {
    /* modo privado: no pasa nada */
  }
}

/** Último pedido enviado (para mostrar la confirmación al volver de WhatsApp). */
export interface SentOrder {
  code: string;
  link: string;
  totalUsd: number;
  totalBs: number | null;
  priceChanged: boolean;
  at: number;
}
const SENT_KEY = 'mesaqr-sent';

export function saveSent(order: SentOrder): void {
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify(order));
  } catch {
    /* sin almacenamiento */
  }
}
export function loadSent(): SentOrder | null {
  try {
    const raw = sessionStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as SentOrder) : null;
  } catch {
    return null;
  }
}
export function clearSent(): void {
  try {
    sessionStorage.removeItem(SENT_KEY);
  } catch {
    /* sin almacenamiento */
  }
}
