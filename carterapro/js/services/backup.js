// Copias de seguridad completas, restauración (con copia automática previa) e importación de clientes.
import { todos, uno, transaccion, uid } from '../data/db.js';
import { construirCopia, validarCopia, TABLAS, CONFIG_LOCAL, clientesDesdeCsv, leerCsv } from '../domain/copia.js';
import { validarCliente, buscarDuplicados } from '../domain/validaciones.js';
import { ErrorNegocio } from '../domain/errores.js';
import { hoy } from '../core/dates.js';
import * as config from './config.js';
import { cambio } from './datos.js';

async function leerTodo() {
  const [clientes, creditos, cuotas, pagos, contadores] = await Promise.all([...TABLAS, 'contadores'].map(todos));
  return { clientes, creditos, cuotas, pagos, contadores, config: await uno('config', 'principal') };
}

export async function generarCopia() {
  return construirCopia(await leerTodo());
}

/** Crea el archivo de copia y registra la fecha del último respaldo. */
export async function archivoCopia() {
  const copia = await generarCopia();
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
  const nombre = `carterapro-copia-${hoy()}-${hora}.json`;
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
  await config.guardar({ ultimoBackup: ahora.toISOString() });
  return { nombre, blob, copia };
}

/** Lee y valida un archivo elegido por el usuario. */
export async function leerArchivo(archivo) {
  if (!archivo) throw new ErrorNegocio('SIN_ARCHIVO', 'Selecciona un archivo de copia.');
  if (archivo.size > 200 * 1024 * 1024) throw new ErrorNegocio('GRANDE', 'El archivo es demasiado grande para ser una copia de CarteraPro.');
  let obj;
  try {
    obj = JSON.parse(await archivo.text());
  } catch {
    throw new ErrorNegocio('NO_JSON', 'El archivo no se puede leer. Asegúrate de elegir el archivo .json que exportó CarteraPro.');
  }
  return { copia: obj, validacion: validarCopia(obj) };
}

/** Siguiente consecutivo seguro aunque los contadores de la copia estén desactualizados. */
function contadoresSeguros(datos) {
  const maxCredito = Math.max(0, ...datos.creditos.map(k => k.numero || 0));
  const maxRecibo = Math.max(0, ...datos.pagos.map(p => Number(String(p.numeroRecibo || '').replace(/\D/g, '')) || 0));
  const previos = Object.fromEntries((datos.contadores || []).map(c => [c.clave, c.valor]));
  return [
    { clave: 'credito', valor: Math.max(maxCredito, previos.credito || 0) },
    { clave: 'recibo', valor: Math.max(maxRecibo, previos.recibo || 0) },
  ];
}

async function reemplazarTodo(datos, { guardarPrevio }) {
  const previo = guardarPrevio ? construirCopia(await leerTodo()) : null;
  const cfgActual = config.get();
  const local = Object.fromEntries(CONFIG_LOCAL.map(k => [k, cfgActual[k]]).filter(([, v]) => v !== undefined));
  const nuevaConfig = { ...config.DEFECTO, ...(datos.config || {}), ...local, clave: 'principal', configurado: true };

  await transaccion([...TABLAS, 'config', 'contadores', 'meta'], async api => {
    for (const t of [...TABLAS, 'contadores']) await api.clear(t);
    for (const t of TABLAS) for (const r of datos[t]) await api.put(t, r);
    for (const c of contadoresSeguros(datos)) await api.put('contadores', c);
    await api.put('config', nuevaConfig);
    if (previo) await api.put('meta', { clave: 'antesDeRestaurar', fecha: new Date().toISOString(), copia: previo });
  });
  await config.cargar();
  cambio('datos:restaurados');
}

/** Restaura una copia validada. Antes guarda automáticamente los datos actuales para poder deshacer. */
export async function restaurar(copia) {
  const v = validarCopia(copia);
  if (!v.ok) throw new ErrorNegocio('COPIA_INVALIDA', v.errores[0]);
  await reemplazarTodo(copia.datos, { guardarPrevio: true });
  return v.resumen;
}

export async function infoDeshacer() {
  const m = await uno('meta', 'antesDeRestaurar');
  return m ? { fecha: m.fecha, resumen: m.copia.resumen } : null;
}

/** Vuelve a los datos que había antes de la última restauración. */
export async function deshacerRestauracion() {
  const m = await uno('meta', 'antesDeRestaurar');
  if (!m) throw new ErrorNegocio('SIN_PREVIO', 'No hay una restauración que deshacer.');
  await reemplazarTodo(m.copia.datos, { guardarPrevio: false });
  await transaccion(['meta'], api => api.delete('meta', 'antesDeRestaurar'));
}

/** Borra todos los datos del negocio en este dispositivo (se usa al olvidar el PIN). */
export async function borrarTodo() {
  await transaccion([...TABLAS, 'config', 'contadores', 'meta'], async api => {
    for (const t of [...TABLAS, 'config', 'contadores', 'meta']) await api.clear(t);
  });
  await config.cargar();
  cambio('datos:borrados');
}

/* ---------- Importar clientes desde CSV ---------- */

/** Analiza el archivo sin guardar: qué filas se importarán y cuáles no (con el motivo). */
export async function analizarImportacion(archivo) {
  const { clientes, errores } = clientesDesdeCsv(leerCsv(await archivo.text()));
  if (errores.length) throw new ErrorNegocio('CSV', errores[0]);
  const existentes = await todos('clientes');
  const aceptados = [], rechazados = [];
  for (const c of clientes) {
    const e = validarCliente(c);
    if (Object.keys(e).length) { rechazados.push({ fila: c.fila, nombre: c.nombreCompleto, motivo: Object.values(e)[0] }); continue; }
    const dup = buscarDuplicados(c, [...existentes, ...aceptados]).find(d => d.motivos.includes('documento') || d.motivos.includes('teléfono'));
    if (dup) { rechazados.push({ fila: c.fila, nombre: c.nombreCompleto, motivo: `Ya existe (${dup.motivos.join(' y ')} de ${dup.cliente.nombreCompleto})` }); continue; }
    aceptados.push({ ...c, id: `tmp-${c.fila}` });
  }
  return { aceptados, rechazados };
}

export async function importarClientes(aceptados) {
  const ahora = new Date().toISOString();
  await transaccion(['clientes'], async api => {
    for (const c of aceptados) {
      const { fila, id, ...datos } = c;
      await api.put('clientes', {
        nombreCompleto: datos.nombreCompleto.replace(/\s+/g, ' '), documento: datos.documento || '', telefono: datos.telefono,
        whatsapp: datos.whatsapp || datos.telefono, direccion: datos.direccion || '', ciudad: datos.ciudad || '',
        referencia: datos.referencia || '', notas: datos.notas || '', foto: null,
        id: uid(), fechaRegistro: hoy(), activo: true, esDemo: false, creadoEn: ahora, actualizadoEn: ahora,
      });
    }
  });
  cambio('clientes:importados', { n: aceptados.length });
  return aceptados.length;
}
