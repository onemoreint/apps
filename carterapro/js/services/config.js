// Configuración del negocio (un solo registro).
import { uno, transaccion } from '../data/db.js';
import { setMoneda, setOcultar } from '../core/money.js';
import { setFormato } from '../core/dates.js';
import { emit } from '../core/events.js';
import { setIdioma } from '../core/i18n.js';

export const PAISES = {
  CO: { nombre: 'Colombia', moneda: 'COP', prefijo: '57', metodos: ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Bancolombia', 'Otro'] },
  VE: { nombre: 'Venezuela', moneda: 'USD', prefijo: '58', metodos: ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zelle', 'Binance', 'Otro'] },
  MX: { nombre: 'México', moneda: 'MXN', prefijo: '52', metodos: ['Efectivo', 'Transferencia SPEI', 'Depósito OXXO', 'Mercado Pago', 'Otro'] },
  PE: { nombre: 'Perú', moneda: 'PEN', prefijo: '51', metodos: ['Efectivo', 'Transferencia', 'Yape', 'Plin', 'Otro'] },
  EC: { nombre: 'Ecuador', moneda: 'USD', prefijo: '593', metodos: ['Efectivo', 'Transferencia', 'Deuna', 'Otro'] },
  US: { nombre: 'Estados Unidos', moneda: 'USD', prefijo: '1', metodos: ['Efectivo', 'Zelle', 'Transferencia', 'Otro'] },
  ES: { nombre: 'España', moneda: 'EUR', prefijo: '34', metodos: ['Efectivo', 'Transferencia', 'Bizum', 'Otro'] },
  OTRO: { nombre: 'Otro país', moneda: 'USD', prefijo: '', metodos: ['Efectivo', 'Transferencia', 'Otro'] },
};

export const DEFECTO = {
  clave: 'principal',
  configurado: false,
  nombreNegocio: '',
  telefono: '',
  email: '',
  direccion: '',
  pais: 'CO',
  moneda: { codigo: 'COP' },
  formatoFecha: 'DD/MM/YYYY',
  tema: 'auto',
  colorPrincipal: '#0E7C66',
  diasGracia: 0,
  metodosPago: PAISES.CO.metodos,
  ocultarValores: false,
  idioma: 'es',
  logo: null,
  pinActivo: false,
  bloqueoMinutos: 5,
  ultimoBackup: null,
};

let actual = { ...DEFECTO };

function aplicar(cfg) {
  setMoneda(cfg.moneda);
  setOcultar(cfg.ocultarValores);
  setFormato(cfg.formatoFecha);
  setIdioma(cfg.idioma);
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--primario', cfg.colorPrincipal || DEFECTO.colorPrincipal);
    document.documentElement.dataset.tema = cfg.tema || 'auto';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cfg.colorPrincipal || DEFECTO.colorPrincipal);
  }
}

export async function cargar() {
  const guardada = await uno('config', 'principal');
  actual = { ...DEFECTO, ...(guardada || {}) };
  aplicar(actual);
  emit('config:cambio', actual);
  return actual;
}

export const get = () => actual;

export async function guardar(cambios) {
  const nueva = { ...actual, ...cambios, clave: 'principal', actualizadoEn: new Date().toISOString() };
  await transaccion(['config'], api => api.put('config', nueva));
  actual = nueva;
  aplicar(actual);
  emit('config:cambio', actual);
  return actual;
}

export const prefijoPais = () => PAISES[actual.pais]?.prefijo || '';
