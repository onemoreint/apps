/**
 * Recuerda la mesa escaneada para que el cliente pueda volver al menú
 * (por ejemplo, al regresar de WhatsApp) sin escanear otra vez.
 * Caduca a las 4 horas: la próxima visita requiere escanear de nuevo.
 */
const KEY = 'mesaqr-table';
const TTL_MS = 4 * 60 * 60 * 1000;
const TOKEN_RE = /^[a-z0-9]{8,32}$/;

export function isValidTokenFormat(token: string | null | undefined): token is string {
  return !!token && TOKEN_RE.test(token);
}

export function saveTable(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    /* modo privado: no pasa nada */
  }
}

export function loadTable(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
    if (!isValidTokenFormat(token) || !at || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function forgetTable(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
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
