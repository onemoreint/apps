import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, seccion } from '../ui/componentes.js';
import { confirmar, toast } from '../ui/dialogos.js';
import * as backup from '../services/backup.js';
import * as config from '../services/config.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { aCsv, numeroCsv, descargar } from '../services/exportar.js';
import { TIPOS_INTERES } from '../domain/interes.js';
import { FRECUENCIAS } from '../domain/cuotas.js';
import { ESTADOS } from '../domain/estados.js';
import { saldoCuota } from '../domain/pagos.js';
import { getMoneda } from '../core/money.js';
import { hoy as fechaHoy, diferenciaDias, formatear as fecha, deDate } from '../core/dates.js';
import { recargar } from '../core/router.js';
import { intentar, mensajeAmigable } from '../core/errors.js';

const nf = n => n.toLocaleString('es-CO');

function resumenHtml(r) {
  return html`<ul class="resumen-copia">
    <li><strong>${nf(r.clientes)}</strong> clientes</li><li><strong>${nf(r.creditos)}</strong> créditos</li>
    <li><strong>${nf(r.cuotas)}</strong> cuotas</li><li><strong>${nf(r.pagos)}</strong> pagos</li></ul>`;
}

/** Comparte el archivo con apps del teléfono (Drive, WhatsApp, correo) o lo descarga. */
async function entregar(nombre, blob) {
  const archivo = new File([blob], nombre, { type: blob.type });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return 'compartido';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado';
    }
  }
  descargar(nombre, blob);
  return 'descargado';
}

export async function render(el) {
  const { datos, analisis } = await obtener();
  const cfg = config.get();
  const deshacer = await backup.infoDeshacer();
  const dias = cfg.ultimoBackup ? diferenciaDias(deDate(new Date(cfg.ultimoBackup)), fechaHoy()) : null;
  const actual = { clientes: datos.clientes.length, creditos: datos.creditos.length, cuotas: datos.cuotas.length, pagos: datos.pagos.length };

  montar(el, html`
    ${encabezado('Copia de seguridad', { atras: '#/mas', subtitulo: 'Exporta, restaura e importa tus datos' })}
    <div class="formulario">
      <p class="aviso ${dias == null || dias > 7 ? 'aviso-amarillo' : 'aviso-azul'}">${icono(dias == null || dias > 7 ? 'alerta' : 'check')}
        ${dias == null ? 'Aún no has hecho ninguna copia de seguridad.' : dias === 0 ? 'Hiciste una copia hoy.' : `Tu última copia fue hace ${dias} ${dias === 1 ? 'día' : 'días'}.`}
        Tus datos viven solo en este dispositivo: si se pierde o se borra el navegador, la copia es la única forma de recuperarlos.</p>

      ${seccion('Exportar copia completa', html`<div class="tarjeta">
        <p>Genera un archivo <strong>.json</strong> con todos tus clientes, créditos, cuotas, pagos y la configuración. Guárdalo en Google Drive, envíatelo por correo o pásalo a otro equipo.</p>
        ${resumenHtml(actual)}
        <button type="button" class="btn btn-pri btn-lg" data-accion="exportar">${icono('copia')}<span>Exportar copia completa</span></button>
      </div>`)}

      ${seccion('Restaurar copia', html`<div class="tarjeta">
        <p>Reemplaza los datos de este dispositivo por los de un archivo de copia. Antes de reemplazar, CarteraPro guarda automáticamente lo que tienes ahora para que puedas deshacerlo.</p>
        <label class="btn btn-sec btn-lg">${icono('copia')}<span>Elegir archivo de copia…</span>
          <input type="file" id="archivo-copia" accept=".json,application/json" class="oculto-visual"></label>
        ${deshacer ? html`<p class="aviso aviso-gris">Restauraste una copia el ${fecha(deDate(new Date(deshacer.fecha)))}. Puedes volver a los datos anteriores (${nf(deshacer.resumen.clientes)} clientes, ${nf(deshacer.resumen.pagos)} pagos).</p>
          <button type="button" class="btn btn-texto" data-accion="deshacer">Deshacer la última restauración</button>` : ''}
      </div>`)}

      ${seccion('Exportar a Excel (CSV)', html`<div class="tarjeta">
        <p>Archivos que abren directamente en Excel o Google Sheets. Sirven para revisar o hacer tus propios cálculos; para respaldar usa la copia completa.</p>
        <div class="botones-grid">
          <button type="button" class="btn btn-sec" data-accion="csv" data-tabla="clientes">Clientes</button>
          <button type="button" class="btn btn-sec" data-accion="csv" data-tabla="creditos">Créditos</button>
          <button type="button" class="btn btn-sec" data-accion="csv" data-tabla="cuotas">Cuotas</button>
          <button type="button" class="btn btn-sec" data-accion="csv" data-tabla="pagos">Pagos</button>
        </div>
      </div>`)}

      ${seccion('Importar clientes', html`<div class="tarjeta">
        <p>¿Tienes tus clientes en Excel, Google Sheets o una agenda? Guarda la hoja como <strong>CSV</strong> con una primera fila de títulos. Columnas reconocidas: <em>Nombre, Teléfono, Documento, WhatsApp, Dirección, Ciudad, Referencia, Notas</em> (Nombre y Teléfono son obligatorias).</p>
        <label class="btn btn-sec">${icono('clientes')}<span>Elegir archivo CSV…</span>
          <input type="file" id="archivo-csv" accept=".csv,.txt,text/csv" class="oculto-visual"></label>
      </div>`)}
    </div>`);

  el.querySelector('#archivo-copia').addEventListener('change', async e => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    let leido;
    try { leido = await backup.leerArchivo(archivo); } catch (err) { toast(mensajeAmigable(err), 'error'); return; }
    const { copia, validacion: v } = leido;
    if (!v.ok) {
      await confirmar({ titulo: 'No se puede restaurar esta copia', detalle: html`<ul class="lista-errores">${v.errores.slice(0, 6).map(x => html`<li>${x}</li>`)}</ul>`, aceptar: 'Entendido', cancelar: 'Cerrar' });
      return;
    }
    const ok = await confirmar({
      titulo: 'Esta copia contiene:',
      detalle: html`${resumenHtml(v.resumen)}${v.creadoEn ? html`<p class="dialogo-texto">Creada el ${fecha(deDate(new Date(v.creadoEn)))} a las ${new Date(v.creadoEn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.</p>` : ''}
        <p class="aviso aviso-rojo">${icono('alerta')} Se reemplazarán los ${nf(actual.clientes)} clientes y ${nf(actual.pagos)} pagos que tienes ahora. Podrás deshacerlo desde esta pantalla.</p>`,
      aceptar: 'Restaurar', peligro: true,
    });
    if (!ok) return;
    await intentar(() => backup.restaurar(copia), 'restaurar la copia');
    toast('Copia restaurada correctamente.');
    recargar();
  });

  el.querySelector('#archivo-csv').addEventListener('change', async e => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    let r;
    try { r = await backup.analizarImportacion(archivo); } catch (err) { toast(mensajeAmigable(err), 'error'); return; }
    if (!r.aceptados.length) {
      await confirmar({ titulo: 'No hay clientes para importar', detalle: html`<ul class="lista-errores">${r.rechazados.slice(0, 8).map(x => html`<li>Fila ${x.fila}${x.nombre ? ` (${x.nombre})` : ''}: ${x.motivo}</li>`)}</ul>`, aceptar: 'Entendido', cancelar: 'Cerrar' });
      return;
    }
    const ok = await confirmar({
      titulo: `¿Importar ${r.aceptados.length} ${r.aceptados.length === 1 ? 'cliente' : 'clientes'}?`,
      detalle: html`<ul class="lista-ejemplo">${r.aceptados.slice(0, 5).map(c => html`<li><strong>${c.nombreCompleto}</strong> · ${c.telefono}</li>`)}${r.aceptados.length > 5 ? html`<li>y ${r.aceptados.length - 5} más…</li>` : ''}</ul>
        ${r.rechazados.length ? html`<p class="dialogo-texto">Se omitirán ${r.rechazados.length} filas:</p><ul class="lista-errores">${r.rechazados.slice(0, 5).map(x => html`<li>Fila ${x.fila}: ${x.motivo}</li>`)}</ul>` : ''}`,
      aceptar: 'Importar',
    });
    if (!ok) return;
    const n = await intentar(() => backup.importarClientes(r.aceptados), 'importar los clientes');
    toast(`${n} clientes importados.`);
  });

  const dec = getMoneda().decimales;
  const m = v => numeroCsv(v || 0, dec);
  const cli = id => analisis.clientes.get(id)?.cliente;
  const TABLAS_CSV = {
    clientes: () => aCsv([
      { titulo: 'Nombre', valor: c => c.nombreCompleto }, { titulo: 'Documento', valor: c => c.documento },
      { titulo: 'Teléfono', valor: c => c.telefono }, { titulo: 'WhatsApp', valor: c => c.whatsapp },
      { titulo: 'Dirección', valor: c => c.direccion }, { titulo: 'Ciudad', valor: c => c.ciudad },
      { titulo: 'Referencia', valor: c => c.referencia }, { titulo: 'Notas', valor: c => c.notas },
      { titulo: 'Fecha registro', valor: c => c.fechaRegistro },
      { titulo: 'Saldo', valor: c => m(analisis.clientes.get(c.id)?.saldo) },
      { titulo: 'Estado', valor: c => ESTADOS[analisis.clientes.get(c.id)?.visual]?.nombre },
    ], datos.clientes),
    creditos: () => aCsv([
      { titulo: 'Crédito', valor: k => formatoNumero(k.numero) }, { titulo: 'Cliente', valor: k => cli(k.clienteId)?.nombreCompleto },
      { titulo: 'Fecha', valor: k => k.fechaInicio }, { titulo: 'Prestado', valor: k => m(k.montoPrestado) },
      { titulo: 'Tipo de interés', valor: k => TIPOS_INTERES[k.tipoInteres]?.nombre }, { titulo: 'Tasa %', valor: k => (k.tasaBp / 100).toString().replace('.', ',') },
      { titulo: 'Interés', valor: k => m(k.interesTotal) }, { titulo: 'Total a pagar', valor: k => m(k.totalAPagar) },
      { titulo: 'Cuotas', valor: k => k.numeroCuotas }, { titulo: 'Frecuencia', valor: k => FRECUENCIAS[k.frecuencia]?.nombre },
      { titulo: 'Pagado', valor: k => m(analisis.creditos.get(k.id)?.resumen.totalPagado) },
      { titulo: 'Saldo', valor: k => m(k.cancelado ? 0 : analisis.creditos.get(k.id)?.resumen.saldoTotal) },
      { titulo: 'Estado', valor: k => ESTADOS[analisis.creditos.get(k.id)?.resumen.visual]?.nombre },
    ], [...datos.creditos].sort((a, b) => a.numero - b.numero)),
    cuotas: () => aCsv([
      { titulo: 'Crédito', valor: c => formatoNumero(analisis.creditos.get(c.creditoId)?.credito.numero || 0) },
      { titulo: 'Cliente', valor: c => analisis.creditos.get(c.creditoId)?.cliente?.nombreCompleto },
      { titulo: 'Cuota', valor: c => c.numero }, { titulo: 'Vence', valor: c => c.fechaVencimiento },
      { titulo: 'Capital', valor: c => m(c.capital) }, { titulo: 'Interés', valor: c => m(c.interes) },
      { titulo: 'Valor', valor: c => m(c.valorProgramado) }, { titulo: 'Pagado', valor: c => m(c.valorPagado) },
      { titulo: 'Saldo', valor: c => m(saldoCuota(c)) }, { titulo: 'Fecha de pago', valor: c => c.fechaPagoCompleto || '' },
    ], [...datos.cuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))),
    pagos: () => aCsv([
      { titulo: 'Recibo', valor: p => p.numeroRecibo }, { titulo: 'Fecha', valor: p => p.fecha },
      { titulo: 'Cliente', valor: p => cli(p.clienteId)?.nombreCompleto },
      { titulo: 'Crédito', valor: p => formatoNumero(analisis.creditos.get(p.creditoId)?.credito.numero || 0) },
      { titulo: 'Cuotas', valor: p => p.aplicaciones.map(a => a.numeroCuota).join(' ') },
      { titulo: 'Método', valor: p => p.metodoPago }, { titulo: 'Valor', valor: p => m(p.monto) },
      { titulo: 'Anulado', valor: p => (p.anulado ? 'Sí' : 'No') }, { titulo: 'Observación', valor: p => p.observacion },
    ], [...datos.pagos].sort((a, b) => a.numeroRecibo.localeCompare(b.numeroRecibo))),
  };

  return acciones(el, {
    async exportar(btn) {
      btn.disabled = true;
      try {
        const { nombre, blob } = await intentar(() => backup.archivoCopia(), 'crear la copia');
        const r = await entregar(nombre, blob);
        if (r !== 'cancelado') toast(r === 'compartido' ? 'Copia compartida.' : `Copia guardada: ${nombre}`);
        recargar();
      } catch { /* ya se mostró el error */ } finally { btn.disabled = false; }
    },
    async deshacer() {
      if (!(await confirmar({ titulo: '¿Deshacer la restauración?', mensaje: 'Volverás a los datos que tenías justo antes de restaurar la copia.', aceptar: 'Deshacer' }))) return;
      await intentar(() => backup.deshacerRestauracion(), 'deshacer la restauración');
      toast('Se recuperaron los datos anteriores.');
      recargar();
    },
    csv(btn) {
      const tabla = btn.dataset.tabla;
      descargar(`carterapro-${tabla}-${fechaHoy()}.csv`, TABLAS_CSV[tabla]());
      toast(`Archivo de ${tabla} descargado.`);
    },
  });
}

