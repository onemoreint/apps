// Dinero como enteros en la unidad mínima de la moneda (centavos, o pesos si no hay decimales).

export const MONEDAS = {
  COP: { codigo: 'COP', nombre: 'Peso colombiano', decimales: 0, locale: 'es-CO', simbolo: '$' },
  USD: { codigo: 'USD', nombre: 'Dólar estadounidense', decimales: 2, locale: 'en-US', simbolo: 'US$' },
  EUR: { codigo: 'EUR', nombre: 'Euro', decimales: 2, locale: 'es-ES', simbolo: '€' },
  VES: { codigo: 'VES', nombre: 'Bolívar venezolano', decimales: 2, locale: 'es-VE', simbolo: 'Bs.' },
  MXN: { codigo: 'MXN', nombre: 'Peso mexicano', decimales: 2, locale: 'es-MX', simbolo: '$' },
  PEN: { codigo: 'PEN', nombre: 'Sol peruano', decimales: 2, locale: 'es-PE', simbolo: 'S/' },
};

let moneda = MONEDAS.COP;
let ocultar = false;
const OCULTO = '••••••';

/** cfg: { codigo, simbolo?, decimales? } — 'OTRA' permite moneda personalizada. */
export function setMoneda(cfg = {}) {
  const base = MONEDAS[cfg.codigo];
  moneda = base
    ? { ...base }
    : { codigo: 'OTRA', nombre: 'Personalizada', locale: 'es-CO',
        simbolo: cfg.simbolo || '$', decimales: Number.isInteger(cfg.decimales) ? cfg.decimales : 2 };
}

export function getMoneda() {
  return moneda;
}

export function setOcultar(valor) {
  ocultar = !!valor;
}

export function estaOculto() {
  return ocultar;
}

export const factor = () => 10 ** moneda.decimales;

/**
 * Convierte texto escrito por el usuario a unidad mínima.
 * Acepta "1.000.000", "1,000,000", "1500,50", "1.500,50", "1,500.50".
 * Devuelve NaN si no es un número.
 */
export function aMinimo(entrada) {
  if (typeof entrada === 'number') return Math.round(entrada * factor());
  let s = String(entrada ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!s || !/\d/.test(s)) return NaN;
  const negativo = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (moneda.decimales === 0) {
    s = s.replace(/[.,]/g, '');
  } else {
    const ultimo = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    const decimales = ultimo >= 0 ? s.length - ultimo - 1 : 0;
    if (ultimo >= 0 && decimales > 0 && decimales <= moneda.decimales) {
      s = s.slice(0, ultimo).replace(/[.,]/g, '') + '.' + s.slice(ultimo + 1);
    } else {
      s = s.replace(/[.,]/g, '');
    }
  }
  const n = Math.round(parseFloat(s) * factor());
  return negativo ? -n : n;
}

function numero(minimo, decimales = moneda.decimales) {
  return new Intl.NumberFormat(moneda.locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(minimo / factor());
}

/** "$ 1.000.000" — respeta "ocultar valores" salvo que se pida lo contrario. */
export function formatear(minimo, { ocultable = true, compacto = false } = {}) {
  if (ocultable && ocultar) return OCULTO;
  if (!Number.isFinite(minimo)) return '—';
  if (compacto && Math.abs(minimo / factor()) >= 1e6) {
    const valor = new Intl.NumberFormat(moneda.locale, { maximumFractionDigits: 1 })
      .format(minimo / factor() / 1e6);
    return `${moneda.simbolo}${valor} M`;
  }
  const dec = Number.isInteger(minimo / factor()) && moneda.decimales > 0 && compacto ? 0 : moneda.decimales;
  return `${moneda.simbolo} ${numero(minimo, dec)}`.replace(/^(\S+)\s/, '$1 ');
}

/** Valor para precargar en un input editable (sin símbolo). */
export function aTextoInput(minimo) {
  if (!Number.isFinite(minimo)) return '';
  return numero(minimo);
}

export function porcentaje(fraccion, decimales = 1) {
  if (!Number.isFinite(fraccion)) return '—';
  return `${(fraccion * 100).toLocaleString('es-CO', { maximumFractionDigits: decimales })}%`;
}
