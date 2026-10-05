import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, badge, progreso, seccion, avatar, botonWhatsApp } from '../ui/componentes.js';
import { confirmar, pedirTexto, toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as creditos from '../services/creditos.js';
import * as pagosSrv from '../services/pagos.js';
import * as wa from '../services/whatsapp.js';
import { TIPOS_INTERES, bpATexto } from '../domain/interes.js';
import { FRECUENCIAS } from '../domain/cuotas.js';
import { estadoVisualCuota, estadoCuota, diasAtraso } from '../domain/estados.js';
import { saldoCuota } from '../domain/pagos.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha, diferenciaDias } from '../core/dates.js';
import { ir, recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el, { id }) {
  const { analisis, datos, hoy } = await obtener();
  const info = analisis.creditos.get(id);
  if (!info) { ir('/creditos', { reemplazar: true }); return; }
  const { credito: k, cliente, cuotas, resumen: r } = info;
  const pagos = datos.pagos.filter(p => p.creditoId === id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numeroRecibo.localeCompare(a.numeroRecibo));
  const t = TIPOS_INTERES[k.tipoInteres];
  const activo = !k.cancelado && r.saldoTotal > 0;
  const textoInteres = t.usaTasa ? `${bpATexto(k.tasaBp)}% ${k.tipoInteres === 'PCT_PERIODO' ? `por ${FRECUENCIAS[k.frecuencia].unidad}` : 'sobre capital'}` : t.nombre;

  montar(el, html`
    ${encabezado(`Crédito ${creditos.formatoNumero(k.numero)}`, { atras: cliente ? `#/clientes/${cliente.id}` : '#/creditos',
      subtitulo: `${FRECUENCIAS[k.frecuencia].nombre} · ${textoInteres}` })}

    <section class="tarjeta credito-cabeza">
      <a class="credito-cliente" href="#/clientes/${cliente?.id}">${avatar(cliente)}<span><strong>${cliente?.nombreCompleto || 'Cliente eliminado'}</strong><small>${cliente?.telefono || ''}</small></span></a>
      ${badge(r.visual)}
      <div class="credito-saldo">
        <small>${k.cancelado ? 'Crédito cancelado' : 'Saldo pendiente'}</small>
        <strong class="dinero">${dinero(k.cancelado ? 0 : r.saldoTotal)}</strong>
        ${progreso(r.progreso, r.visual === 'VENCIDO' ? 'rojo' : 'verde')}
        <small>${r.cuotasPagadas} de ${r.totalCuotas} cuotas pagadas · ${Math.round(r.progreso * 100)}%</small>
      </div>
      ${activo ? html`<div class="credito-acciones">
        <a class="btn btn-pri btn-lg" href="#/pagos/nuevo?credito=${k.id}">${icono('dinero')}<span>Registrar pago</span></a>
        ${r.proxima ? botonWhatsApp(cliente, wa.generar(r.vencidas ? 'vencido' : 'recordatorio', { cliente, valor: r.vencidas ? r.montoVencido : saldoCuota(r.proxima), fecha: r.proxima.fechaVencimiento, cuota: r.proxima.numero }), 'Recordar') : ''}
      </div>` : ''}
      ${k.cancelado ? html`<p class="aviso aviso-gris">Cancelado${k.motivoCancelacion ? `: ${k.motivoCancelacion}` : ''}. No cuenta en la cartera.</p>` : ''}
      ${r.vencidas && !k.cancelado ? html`<p class="aviso aviso-rojo">${icono('alerta')} ${r.vencidas} ${r.vencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'} por ${dinero(r.montoVencido)} · ${r.maxAtraso} días de atraso máximo.</p>` : ''}
    </section>

    <section class="kpis kpis-cifras">
      <div class="cifra"><small>Prestado</small><strong class="dinero">${dinero(k.montoPrestado)}</strong></div>
      <div class="cifra"><small>Interés</small><strong class="dinero">${dinero(k.interesTotal)}</strong></div>
      <div class="cifra"><small>Total a pagar</small><strong class="dinero">${dinero(k.totalAPagar)}</strong></div>
      <div class="cifra"><small>Pagado</small><strong class="dinero verde">${dinero(r.totalPagado)}</strong></div>
      <div class="cifra"><small>Capital pendiente</small><strong class="dinero">${dinero(k.cancelado ? 0 : r.saldoCapital)}</strong></div>
      <div class="cifra"><small>Fechas</small><strong>${fecha(k.fechaInicio)} → ${fecha(r.fechaUltimoVencimiento)}</strong></div>
    </section>

    <div class="columnas">
      <div>${seccion('Cuotas', html`<ol class="cuotas">${cuotas.map(c => filaCuota(c, k, hoy, activo, c.numero === r.proxima?.numero))}</ol>`, { contador: cuotas.length })}</div>
      <div>
        ${seccion('Pagos recibidos', pagos.length ? html`<ul class="pagos-lista">${pagos.map(p => filaPago(p))}</ul>` : html`<p class="vacio-mini">Aún no hay pagos registrados.</p>`, { contador: pagos.filter(p => !p.anulado).length })}
        ${k.notas ? seccion('Notas', html`<p class="tarjeta pre">${k.notas}</p>`) : ''}
        ${!k.cancelado && r.saldoTotal > 0 ? html`<button type="button" class="btn btn-texto-peligro" data-accion="cancelar">${icono('anular')}<span>Cancelar crédito</span></button>` : ''}
      </div>
    </div>`);

  return acciones(el, {
    async cancelar() {
      const motivo = await pedirTexto({
        titulo: '¿Cancelar este crédito?',
        mensaje: 'Dejará de contar en la cartera y no recibirá más pagos. El historial se conserva. Úsalo para créditos registrados por error o condonados.',
        etiqueta: 'Motivo (opcional)', aceptar: 'Cancelar crédito', peligro: true,
      });
      if (motivo === null) return;
      await intentar(() => creditos.cancelar(id, motivo), 'cancelar el crédito');
      toast('Crédito cancelado.');
      recargar();
    },
    async anular(btn) {
      const pago = pagos.find(p => p.id === btn.dataset.id);
      const motivo = await pedirTexto({
        titulo: `¿Anular el recibo ${pago.numeroRecibo}?`,
        mensaje: `El pago de ${dinero(pago.monto, { ocultable: false })} se descontará de las cuotas. El recibo queda en el historial marcado como anulado.`,
        etiqueta: 'Motivo', aceptar: 'Anular pago', peligro: true, obligatorio: true,
      });
      if (motivo === null) return;
      await intentar(() => pagosSrv.anular(pago.id, motivo), 'anular el pago');
      toast('Pago anulado.');
      recargar();
    },
  });
}

function filaCuota(c, k, hoy, activo, esProxima) {
  const gracia = k.diasGracia || 0;
  const visual = k.cancelado && saldoCuota(c) > 0 ? 'CANCELADO' : estadoVisualCuota(c, hoy, gracia);
  const estado = estadoCuota(c, hoy, gracia);
  const saldo = saldoCuota(c);
  const atraso = diasAtraso(c, hoy);
  let detalle = fecha(c.fechaVencimiento);
  if (saldo <= 0 && c.fechaPagoCompleto) {
    const tarde = diferenciaDias(c.fechaVencimiento, c.fechaPagoCompleto);
    detalle += ` · pagada ${fecha(c.fechaPagoCompleto)}${tarde > gracia ? ` (${tarde} días tarde)` : ''}`;
  } else if (atraso > 0 && !k.cancelado) {
    detalle += ` · ${atraso} ${atraso === 1 ? 'día' : 'días'} de atraso`;
  }
  return html`<li class="cuota cuota-${visual.toLowerCase()}">
    <span class="cuota-num">${c.numero}</span>
    <span class="cuota-texto"><strong class="dinero">${dinero(c.valorProgramado)}</strong><small>${detalle}</small>
      ${estado === 'PARCIAL' || (c.valorPagado > 0 && saldo > 0) ? html`<small>Abonado ${dinero(c.valorPagado)} · falta ${dinero(saldo)}</small>` : ''}</span>
    <span class="cuota-fin">${badge(visual, estado === 'PARCIAL' && visual !== 'VENCIDO' ? 'Parcial' : undefined)}
      ${activo && saldo > 0 && (esProxima || estado === 'VENCIDA') ? html`<a class="btn btn-sec btn-xs" href="#/pagos/nuevo?credito=${k.id}&cuota=${c.numero}" aria-label="Pagar cuota ${c.numero}">Pagar</a>` : ''}</span>
  </li>`;
}

function filaPago(p) {
  const cuotas = p.aplicaciones.map(a => a.numeroCuota);
  const rango = cuotas.length > 1 ? `Cuotas ${cuotas[0]}–${cuotas.at(-1)}` : `Cuota ${cuotas[0]}`;
  return html`<li class="pago ${p.anulado ? 'anulado' : ''}">
    <span class="pago-ico">${icono(p.anulado ? 'anular' : 'recibo')}</span>
    <a class="pago-texto" href="#/recibos/${p.id}"><strong>${p.numeroRecibo} · ${fecha(p.fecha)}</strong>
      <small>${rango} · ${p.metodoPago}${p.anulado ? ` · ANULADO${p.motivoAnulacion ? ': ' + p.motivoAnulacion : ''}` : ''}</small>
      ${p.observacion ? html`<small>${p.observacion}</small>` : ''}</a>
    <span class="pago-fin"><strong class="dinero">${dinero(p.monto)}</strong>
      ${!p.anulado ? html`<button type="button" class="btn-link" data-accion="anular" data-id="${p.id}">Anular</button>` : ''}</span>
  </li>`;
}
