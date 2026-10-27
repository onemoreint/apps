// Cobradores del negocio (se guardan en la configuración). Cada crédito, pago y gasto puede tener uno.
import { uid } from '../data/db.js';
import { ErrorNegocio } from '../domain/errores.js';
import * as config from './config.js';

export const lista = ({ soloActivos = false } = {}) =>
  (config.get().cobradores || []).filter(c => !soloActivos || c.activo !== false);

export const porId = id => lista().find(c => c.id === id) || null;

/** Nombre para mostrar ("Sin asignar" si no tiene). */
export const nombre = id => (id ? porId(id)?.nombre || 'Cobrador eliminado' : 'Sin asignar');

/** Opciones para un <select>: incluye "Sin asignar" y conserva el actual aunque esté inactivo. */
export function opciones(actual = '', { textoVacio = 'Sin asignar' } = {}) {
  const activos = lista({ soloActivos: true });
  const extra = actual && !activos.some(c => c.id === actual) && porId(actual) ? [porId(actual)] : [];
  return [{ valor: '', texto: textoVacio }, ...[...activos, ...extra].map(c => ({ valor: c.id, texto: c.nombre }))];
}

export async function guardar({ id, nombre: n, telefono = '' }) {
  const limpio = String(n || '').trim().replace(/\s+/g, ' ');
  if (limpio.length < 2) throw new ErrorNegocio('VALIDACION', 'Escribe el nombre del cobrador.', { nombre: 'Escribe el nombre del cobrador.' });
  const todos = lista();
  if (todos.some(c => c.id !== id && c.nombre.toLowerCase() === limpio.toLowerCase())) {
    throw new ErrorNegocio('VALIDACION', 'Ya existe un cobrador con ese nombre.', { nombre: 'Ya existe un cobrador con ese nombre.' });
  }
  const nuevo = id
    ? todos.map(c => (c.id === id ? { ...c, nombre: limpio, telefono: String(telefono).trim() } : c))
    : [...todos, { id: uid(), nombre: limpio, telefono: String(telefono).trim(), activo: true }];
  await config.guardar({ cobradores: nuevo });
}

export async function cambiarActivo(id, activo) {
  await config.guardar({ cobradores: lista().map(c => (c.id === id ? { ...c, activo } : c)) });
}
