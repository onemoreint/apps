// Formato y validación de copias de seguridad, e importación de clientes desde CSV.
// Funciones puras: no tocan la base de datos.
import { esValida } from '../core/dates.js';

export const FORMATO = 'carterapro-backup';
export const VERSION_FORMATO = 1;
export const TABLAS = ['clientes', 'creditos', 'cuotas', 'pagos'];

/** Campos de configuración que NO viajan en la copia (seguridad propia de cada dispositivo). */
export const CONFIG_LOCAL = ['pinHash', 'pinSalt', 'pinIteraciones', 'pinActivo', 'bloqueoMinutos', 'ultimoBackup'];

export function construirCopia({ clientes, creditos, cuotas, pagos, config, contadores }, creadoEn = new Date().toISOString()) {
  const cfg = { ...(config || {}) };
  for (const k of CONFIG_LOCAL) delete cfg[k];
  return {
    formato: FORMATO,
    version: VERSION_FORMATO,
    app: 'CarteraPro',
    creadoEn,
    resumen: resumir({ clientes, creditos, cuotas, pagos }),
    datos: { clientes, creditos, cuotas, pagos, config: cfg, contadores: contadores || [] },
  };
}

export function resumir({ clientes = [], creditos = [], cuotas = [], pagos = [] }) {
  return { clientes: clientes.length, creditos: creditos.length, cuotas: cuotas.length, pagos: pagos.length };
}

const esEntero = n => Number.isInteger(n);

/**
 * Revisa estructura e integridad referencial.
 * @returns {{ok:boolean, errores:string[], resumen?:object, creadoEn?:string}}
 */
export function validarCopia(obj) {
  const errores = [];
  if (!obj || typeof obj !== 'object') return { ok: false, errores: ['El archivo no es una copia de CarteraPro.'] };
  if (obj.formato !== FORMATO) return { ok: false, errores: ['El archivo no es una copia de seguridad de CarteraPro.'] };
  if (!esEntero(obj.version) || obj.version > VERSION_FORMATO) {
    return { ok: false, errores: ['Esta copia se creó con una versión más nueva de CarteraPro. Actualiza la app e inténtalo de nuevo.'] };
  }
  const d = obj.datos;
  if (!d || TABLAS.some(t => !Array.isArray(d[t]))) return { ok: false, errores: ['La copia está incompleta o dañada.'] };

  const ids = t => new Set(d[t].map(r => r?.id));
  for (const t of TABLAS) {
    if (d[t].some(r => !r || typeof r.id !== 'string' || !r.id)) errores.push(`Hay registros de ${t} sin identificador.`);
    if (ids(t).size !== d[t].length) errores.push(`Hay registros de ${t} repetidos.`);
  }
  const clientes = ids('clientes');
  const creditos = ids('creditos');
  const cuotas = ids('cuotas');

  const malos = (lista, prueba) => lista.filter(r => !prueba(r)).length;
  let n;
  if ((n = malos(d.clientes, c => typeof c.nombreCompleto === 'string' && c.nombreCompleto.trim()))) errores.push(`${n} clientes no tienen nombre.`);
  if ((n = malos(d.creditos, k => clientes.has(k.clienteId)))) errores.push(`${n} créditos pertenecen a clientes que no están en la copia.`);
  if ((n = malos(d.creditos, k => esEntero(k.montoPrestado) && k.montoPrestado > 0 && esEntero(k.totalAPagar) && esValida(k.fechaInicio)))) errores.push(`${n} créditos tienen montos o fechas inválidos.`);
  if ((n = malos(d.cuotas, c => creditos.has(c.creditoId)))) errores.push(`${n} cuotas pertenecen a créditos que no están en la copia.`);
  if ((n = malos(d.cuotas, c => esEntero(c.valorProgramado) && esEntero(c.capital) && esEntero(c.interes) && esValida(c.fechaVencimiento)))) errores.push(`${n} cuotas tienen valores o fechas inválidos.`);
  if ((n = malos(d.pagos, p => creditos.has(p.creditoId)))) errores.push(`${n} pagos pertenecen a créditos que no están en la copia.`);
  if ((n = malos(d.pagos, p => esEntero(p.monto) && p.monto > 0 && esValida(p.fecha) && Array.isArray(p.aplicaciones) && p.aplicaciones.every(a => cuotas.has(a.cuotaId))))) errores.push(`${n} pagos tienen datos inválidos.`);

  return { ok: errores.length === 0, errores, resumen: resumir(d), creadoEn: obj.creadoEn };
}

/* ---------- Importación de clientes desde CSV (migrar desde Excel o Google Sheets) ---------- */

/** Lector CSV tolerante: detecta ; , o tabulador, admite comillas y saltos de línea dentro de comillas. */
export function leerCsv(texto) {
  const t = String(texto || '').replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].map(s => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(c => c.trim()));
}

const SINONIMOS = {
  nombreCompleto: ['nombre', 'nombres', 'nombre completo', 'cliente', 'deudor', 'name'],
  telefono: ['telefono', 'teléfono', 'celular', 'movil', 'móvil', 'tel', 'phone'],
  whatsapp: ['whatsapp', 'wa'],
  documento: ['documento', 'cedula', 'cédula', 'cc', 'dni', 'ci', 'identificacion', 'identificación', 'id'],
  direccion: ['direccion', 'dirección', 'domicilio', 'address'],
  ciudad: ['ciudad', 'municipio', 'city'],
  referencia: ['referencia', 'referido', 'recomendado'],
  notas: ['notas', 'nota', 'observaciones', 'observacion', 'observación', 'comentarios'],
};

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Convierte filas CSV en clientes. Requiere encabezados reconocibles (al menos nombre y teléfono). */
export function clientesDesdeCsv(filas) {
  if (filas.length < 2) return { clientes: [], errores: ['El archivo no tiene filas de datos.'] };
  const encabezados = filas[0].map(norm);
  const indice = {};
  for (const [campo, nombres] of Object.entries(SINONIMOS)) {
    const i = encabezados.findIndex(h => nombres.map(norm).includes(h));
    if (i >= 0) indice[campo] = i;
  }
  if (indice.nombreCompleto == null || indice.telefono == null) {
    return { clientes: [], errores: ['No encontramos las columnas "Nombre" y "Teléfono" en la primera fila.'] };
  }
  const clientes = filas.slice(1).map((f, n) => {
    const c = { fila: n + 2 };
    for (const [campo, i] of Object.entries(indice)) c[campo] = (f[i] || '').trim();
    return c;
  });
  return { clientes, errores: [], columnas: Object.keys(indice) };
}
