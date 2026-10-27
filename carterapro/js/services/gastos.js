// Gastos de la operación (gasolina, almuerzo del cobrador, papelería…). Se anulan, no se borran.
import { transaccion, uid } from '../data/db.js';
import { esValida, hoy, diferenciaDias } from '../core/dates.js';
import { ErrorNegocio } from '../domain/errores.js';
import { CATEGORIAS_GASTO } from '../domain/caja.js';
import { cambio } from './datos.js';

export function validar(g) {
  const e = {};
  if (!Number.isInteger(g.monto) || g.monto <= 0) e.monto = 'Escribe un valor mayor que cero.';
  if (!esValida(g.fecha)) e.fecha = 'Escribe una fecha válida.';
  else if (diferenciaDias(hoy(), g.fecha) > 0) e.fecha = 'La fecha no puede ser futura.';
  if (!CATEGORIAS_GASTO.includes(g.categoria)) e.categoria = 'Selecciona una categoría.';
  return e;
}

export async function registrar(datos) {
  const e = validar(datos);
  if (Object.keys(e).length) throw new ErrorNegocio('VALIDACION', Object.values(e)[0], e);
  const ahora = new Date().toISOString();
  const gasto = {
    id: uid(), fecha: datos.fecha, categoria: datos.categoria, monto: datos.monto,
    descripcion: String(datos.descripcion || '').trim(), cobradorId: datos.cobradorId || null,
    anulado: false, esDemo: !!datos.esDemo, creadoEn: ahora, actualizadoEn: ahora,
  };
  await transaccion(['gastos'], api => api.put('gastos', gasto));
  cambio('gasto:registrado', gasto);
  return gasto;
}

export async function anular(id, motivo) {
  const r = await transaccion(['gastos'], async api => {
    const g = await api.get('gastos', id);
    if (!g) throw new ErrorNegocio('NO_EXISTE', 'Este gasto ya no existe.');
    const a = { ...g, anulado: true, motivoAnulacion: String(motivo || '').trim(), actualizadoEn: new Date().toISOString() };
    await api.put('gastos', a);
    return a;
  });
  cambio('gasto:anulado', r);
  return r;
}
