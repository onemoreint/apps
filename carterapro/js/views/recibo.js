import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, botonWhatsApp } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as config from '../services/config.js';
import * as wa from '../services/whatsapp.js';
import { formatoNumero } from '../services/creditos.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';
import { ir } from '../core/router.js';

const d = v => dinero(v, { ocultable: false });

/** Versión en texto plano, para compartir por cualquier app. */
export function textoRecibo({ pago, cliente, credito }, cfg) {
  const cuotas = pago.aplicaciones.map(a => a.numeroCuota).join(', ');
  return [
    cfg.nombreNegocio && cfg.nombreNegocio.toUpperCase(),
    `RECIBO DE PAGO ${pago.numeroRecibo}${pago.anulado ? ' (ANULADO)' : ''}`,
    `Fecha: ${fecha(pago.fecha)}`,
    `Cliente: ${cliente?.nombreCompleto || ''}`,
    `Crédito: ${formatoNumero(credito.numero)} · Cuota(s): ${cuotas}`,
    `Valor pagado: ${d(pago.monto)}`,
    `Método: ${pago.metodoPago}`,
    pago.observacion && `Observación: ${pago.observacion}`,
    `Saldo pendiente: ${d(pago.saldoDespues ?? 0)}`,
  ].filter(Boolean).join('\n');
}

export async function render(el, { id }) {
  const { datos, analisis } = await obtener();
  const pago = datos.pagos.find(p => p.id === id);
  if (!pago) { ir('/pagos', { reemplazar: true }); return; }
  const info = analisis.creditos.get(pago.creditoId);
  const { credito, cliente } = info;
  const cfg = config.get();
  const mensaje = wa.generar('confirmacion', { cliente, valor: pago.monto, fecha: pago.fecha, recibo: pago.numeroRecibo, saldo: pago.saldoDespues ?? 0 });

  montar(el, html`
    <div class="no-imprimir">${encabezado(`Recibo ${pago.numeroRecibo}`, { atras: `#/creditos/${credito.id}` })}</div>
    <article class="recibo ${pago.anulado ? 'recibo-anulado' : ''}" aria-label="Recibo de pago">
      <header class="recibo-cabeza">
        ${cfg.logo ? html`<img class="recibo-logo" src="${cfg.logo}" alt="">` : ''}
        <div>
          <strong class="recibo-negocio">${cfg.nombreNegocio || 'Mi negocio'}</strong>
          ${[cfg.telefono, cfg.direccion].filter(Boolean).length ? html`<small>${[cfg.telefono, cfg.direccion].filter(Boolean).join(' · ')}</small>` : ''}
        </div>
        <div class="recibo-numero"><small>Recibo de pago</small><strong>${pago.numeroRecibo}</strong></div>
      </header>
      ${pago.anulado ? html`<p class="recibo-sello">Anulado${pago.motivoAnulacion ? ` · ${pago.motivoAnulacion}` : ''}</p>` : ''}
      <div class="recibo-monto"><small>Valor recibido</small><strong class="dinero">${d(pago.monto)}</strong></div>
      <dl class="recibo-datos">
        <div><dt>Fecha</dt><dd>${fecha(pago.fecha)}</dd></div>
        <div><dt>Cliente</dt><dd>${cliente?.nombreCompleto || '—'}${cliente?.documento ? html`<br><small>Doc. ${cliente.documento}</small>` : ''}</dd></div>
        <div><dt>Crédito</dt><dd>${formatoNumero(credito.numero)}</dd></div>
        <div><dt>Método de pago</dt><dd>${pago.metodoPago}</dd></div>
        ${pago.observacion ? html`<div><dt>Observación</dt><dd>${pago.observacion}</dd></div>` : ''}
      </dl>
      <table class="recibo-tabla">
        <thead><tr><th scope="col">Cuota</th><th scope="col">Capital</th><th scope="col">Interés</th><th scope="col">Aplicado</th></tr></thead>
        <tbody>${pago.aplicaciones.map(a => html`<tr>
          <td>${a.numeroCuota}${a.liquida ? '' : html` <small>(abono)</small>`}</td>
          <td class="dinero">${d(a.capital)}</td><td class="dinero">${d(a.interes)}</td><td class="dinero">${d(a.monto)}</td></tr>`)}</tbody>
      </table>
      <div class="recibo-saldo"><span>Saldo pendiente del crédito</span><strong class="dinero">${d(pago.saldoDespues ?? 0)}</strong></div>
      <footer class="recibo-pie">Comprobante generado con CarteraPro · ${new Date(pago.creadoEn || Date.now()).toLocaleString('es-CO')}</footer>
    </article>

    <div class="recibo-acciones no-imprimir">
      ${!pago.anulado ? botonWhatsApp(cliente, mensaje, 'Enviar por WhatsApp') : ''}
      <button type="button" class="btn btn-sec" data-accion="compartir">${icono('copia')}<span>Compartir</span></button>
      <button type="button" class="btn btn-sec" data-accion="imprimir">${icono('recibo')}<span>Imprimir o guardar PDF</span></button>
    </div>
    <p class="nota-pdf no-imprimir">Para PDF, elige "Guardar como PDF" en la ventana de impresión.</p>`);

  return acciones(el, {
    async compartir() {
      const texto = textoRecibo({ pago, cliente, credito }, cfg);
      try {
        if (navigator.share) { await navigator.share({ title: `Recibo ${pago.numeroRecibo}`, text: texto }); return; }
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
      try {
        await navigator.clipboard.writeText(texto);
        toast('Recibo copiado. Pégalo donde quieras enviarlo.');
      } catch {
        toast('No se pudo copiar automáticamente en este navegador.', 'info');
      }
    },
    imprimir() {
      window.print();
    },
  });
}
