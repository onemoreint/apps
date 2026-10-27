// Visitas de cobro sin pago (no estaba, no tenía dinero, prometió pagar…).
import { transaccion, uid } from '../data/db.js';
import { esValida } from '../core/dates.js';
import { ErrorNegocio } from '../domain/errores.js';
import { RESULTADOS_VISITA } from '../domain/ruta.js';
import { cambio } from './datos.js';

export async function registrar({ clienteId, creditoId, cobradorId, fecha, resultado, promesaFecha, nota = '', esDemo = false }) {
  if (!RESULTADOS_VISITA[resultado]) throw new ErrorNegocio('VALIDACION', 'Selecciona qué pasó en la visita.');
  if (resultado === 'PROMESA' && !esValida(promesaFecha)) throw new ErrorNegocio('VALIDACION', 'Escribe la fecha en que prometió pagar.');
  const visita = {
    id: uid(), clienteId, creditoId: creditoId || null, cobradorId: cobradorId || null, fecha, resultado,
    promesaFecha: resultado === 'PROMESA' ? promesaFecha : null, nota: String(nota).trim(), esDemo, creadoEn: new Date().toISOString(),
  };
  await transaccion(['visitas'], api => api.put('visitas', visita));
  cambio('visita:registrada', visita);
  return visita;
}
