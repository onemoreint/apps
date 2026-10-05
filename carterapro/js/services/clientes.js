import { todos, uno, porIndice, transaccion, uid } from '../data/db.js';
import { validarCliente, buscarDuplicados, soloDigitos } from '../domain/validaciones.js';
import { ErrorNegocio } from '../domain/errores.js';
import { hoy } from '../core/dates.js';
import { cambio } from './datos.js';

function limpiar(d) {
  const t = v => String(v ?? '').trim();
  return {
    nombreCompleto: t(d.nombreCompleto).replace(/\s+/g, ' '),
    documento: t(d.documento),
    telefono: t(d.telefono),
    whatsapp: t(d.whatsapp) || t(d.telefono),
    direccion: t(d.direccion),
    ciudad: t(d.ciudad),
    referencia: t(d.referencia),
    notas: t(d.notas),
    foto: d.foto || null,
  };
}

/** Valida y detecta posibles duplicados sin guardar. */
export async function revisar(datos, id) {
  const cliente = { ...limpiar(datos), id };
  const errores = validarCliente(cliente);
  const duplicados = Object.keys(errores).length ? [] : buscarDuplicados(cliente, await todos('clientes'));
  return { cliente, errores, duplicados };
}

export async function guardar(datos, id) {
  const { cliente, errores } = await revisar(datos, id);
  if (Object.keys(errores).length) throw new ErrorNegocio('VALIDACION', 'Revisa los campos marcados.', errores);
  const ahora = new Date().toISOString();
  const previo = id ? await uno('clientes', id) : null;
  if (id && !previo) throw new ErrorNegocio('NO_EXISTE', 'Este cliente ya no existe.');
  const registro = previo
    ? { ...previo, ...cliente, actualizadoEn: ahora }
    : { ...cliente, id: uid(), fechaRegistro: hoy(), activo: true, esDemo: !!datos.esDemo, creadoEn: ahora, actualizadoEn: ahora };
  await transaccion(['clientes'], api => api.put('clientes', registro));
  cambio(previo ? 'cliente:actualizado' : 'cliente:creado', registro);
  return registro;
}

export const obtener = id => uno('clientes', id);

/** Solo se elimina un cliente sin créditos; con historial se conserva para no perder trazabilidad. */
export async function eliminar(id) {
  const creditos = await porIndice('creditos', 'clienteId', id);
  if (creditos.length) {
    throw new ErrorNegocio('TIENE_CREDITOS', 'No se puede eliminar un cliente con créditos registrados.');
  }
  await transaccion(['clientes'], api => api.delete('clientes', id));
  cambio('cliente:eliminado', { id });
}

export const numeroWhatsApp = c => soloDigitos(c?.whatsapp || c?.telefono);
