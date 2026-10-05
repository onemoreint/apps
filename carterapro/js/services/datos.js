// Instantánea de todos los datos + análisis de cartera, con caché que se invalida al guardar.
import { todos } from '../data/db.js';
import { analizarCartera } from '../domain/metricas.js';
import { hoy } from '../core/dates.js';
import { emit } from '../core/events.js';

let cache = null;

export function cambio(tipo, detalle) {
  cache = null;
  emit('datos:cambiaron', { tipo, detalle });
}

/** { datos, analisis, hoy } — se recalcula solo cuando algo cambió o cambió el día. */
export function obtener() {
  const fecha = hoy();
  if (cache && cache.hoy === fecha) return cache.promesa;
  const promesa = Promise.all(['clientes', 'creditos', 'cuotas', 'pagos'].map(todos))
    .then(([clientes, creditos, cuotas, pagos]) => {
      const datos = { clientes, creditos, cuotas, pagos };
      return { datos, analisis: analizarCartera(datos, fecha), hoy: fecha };
    });
  cache = { hoy: fecha, promesa };
  promesa.catch(() => { cache = null; });
  return promesa;
}
