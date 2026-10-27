// Instantánea de todos los datos + análisis de cartera, con caché que se invalida al guardar.
import { todos } from '../data/db.js';
import { analizarCartera } from '../domain/metricas.js';
import { hoy } from '../core/dates.js';
import { emit } from '../core/events.js';

/** Todas las tablas del negocio que se leen juntas para analizar. */
export const TABLAS_DATOS = ['clientes', 'creditos', 'cuotas', 'pagos', 'gastos', 'caja', 'cierres', 'visitas', 'cargos'];

let cache = null;

export function cambio(tipo, detalle) {
  cache = null;
  emit('datos:cambiaron', { tipo, detalle });
}

/** { datos, analisis, hoy } — se recalcula solo cuando algo cambió o cambió el día. */
export function obtener() {
  const fecha = hoy();
  if (cache && cache.hoy === fecha) return cache.promesa;
  const promesa = Promise.all(TABLAS_DATOS.map(todos))
    .then(lista => {
      const datos = Object.fromEntries(TABLAS_DATOS.map((t, i) => [t, lista[i]]));
      return { datos, analisis: analizarCartera(datos, fecha), hoy: fecha };
    });
  cache = { hoy: fecha, promesa };
  promesa.catch(() => { cache = null; });
  return promesa;
}
