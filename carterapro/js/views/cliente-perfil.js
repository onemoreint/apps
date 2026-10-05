import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, avatar, badge, badgeRiesgo, kpi, seccion, filaLista, progreso, botonWhatsApp, vacio } from '../ui/componentes.js';
import { confirmar, toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as clientes from '../services/clientes.js';
import { formatoNumero } from '../services/creditos.js';
import * as wa from '../services/whatsapp.js';
import { AVISO_RIESGO } from '../domain/riesgo.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';
import { FRECUENCIAS } from '../domain/cuotas.js';

export async function render(el, { id }) {
  const { analisis } = await obtener();
  const ic = analisis.clientes.get(id);
  if (!ic) { ir('/clientes', { reemplazar: true }); return; }
  const { cliente: c, creditos } = ic;
  const r = ic.riesgo;

  const proxima = creditos.map(i => i.resumen.proxima && { ...i.resumen.proxima, credito: i.credito, estadoCredito: i.resumen.estado })
    .filter(Boolean).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];
  const msg = proxima
    ? wa.generar(proxima.estadoCredito === 'VENCIDO' ? 'vencido' : 'recordatorio', { cliente: c, valor: ic.vencido || (proxima.valorProgramado - (proxima.valorPagado || 0)), fecha: proxima.fechaVencimiento, cuota: proxima.numero })
    : `Hola ${c.nombreCompleto.split(' ')[0]} 👋`;

  montar(el, html`
    ${encabezado('Cliente', { atras: '#/clientes',
      extra: html`<a class="btn-icono" href="#/clientes/${id}/editar" aria-label="Editar cliente">${icono('editar')}</a>` })}

    <section class="tarjeta perfil">
      ${avatar(c, true)}
      <div class="perfil-datos">
        <h2>${c.nombreCompleto}</h2>
        <p>${c.documento ? `Doc. ${c.documento} · ` : ''}Cliente desde ${fecha(c.fechaRegistro)}</p>
        <div class="perfil-badges">${badge(ic.visual)} ${badgeRiesgo(r.nivel)}</div>
      </div>
      <div class="perfil-acciones">
        <a class="btn btn-pri" href="#/creditos/nuevo?cliente=${id}">${icono('mas_circulo')}<span>Nuevo crédito</span></a>
        ${ic.saldo > 0 ? html`<a class="btn btn-sec" href="#/pagos/nuevo?cliente=${id}">${icono('dinero')}<span>Registrar pago</span></a>` : ''}
        ${botonWhatsApp(c, msg)}
        <a class="btn btn-sec" href="tel:${c.telefono}">${icono('telefono')}<span>Llamar</span></a>
      </div>
    </section>

    <section class="kpis kpis-4">
      ${kpi('Total prestado', dinero(ic.totalPrestado))}
      ${kpi('Total pagado', dinero(ic.totalPagado), { tono: 'verde' })}
      ${kpi('Saldo actual', dinero(ic.saldo), { tono: ic.vencido ? 'rojo' : '' , nota: ic.vencido ? `${dinero(ic.vencido)} vencido` : '' })}
      ${kpi('Créditos', String(creditos.length), { nota: `${ic.activos} activos` })}
    </section>

    <div class="columnas">
      <div>
        ${seccion('Historial de créditos', creditos.length ? html`<div class="lista">${creditos.map(i => filaLista({
          href: `#/creditos/${i.credito.id}`,
          izquierda: html`<span class="num-credito">${formatoNumero(i.credito.numero)}</span>`,
          titulo: `${dinero(i.credito.montoPrestado)} · ${FRECUENCIAS[i.credito.frecuencia].nombre}`,
          sub: html`${fecha(i.credito.fechaInicio)} · ${i.resumen.cuotasPagadas}/${i.resumen.totalCuotas} cuotas ${progreso(i.resumen.progreso, i.resumen.visual === 'VENCIDO' ? 'rojo' : 'verde')}`,
          derecha: i.resumen.saldoTotal > 0 && !i.credito.cancelado ? html`<strong class="dinero">${dinero(i.resumen.saldoTotal)}</strong>` : '',
          derechaSub: badge(i.resumen.visual),
        }))}</div>` : vacio({ ico: 'creditos', titulo: 'Sin créditos', texto: 'Este cliente aún no tiene préstamos registrados.', accion: { href: `#/creditos/nuevo?cliente=${id}`, texto: 'Crear crédito' } }))}
      </div>
      <div>
        ${seccion('Datos de contacto', html`<dl class="tarjeta datos">
          <div><dt>Teléfono</dt><dd><a href="tel:${c.telefono}">${c.telefono}</a></dd></div>
          <div><dt>WhatsApp</dt><dd>${c.whatsapp || c.telefono}</dd></div>
          ${c.direccion || c.ciudad ? html`<div><dt>Dirección</dt><dd>${[c.direccion, c.ciudad].filter(Boolean).join(', ')}</dd></div>` : ''}
          ${c.referencia ? html`<div><dt>Referencia</dt><dd>${c.referencia}</dd></div>` : ''}
          ${c.notas ? html`<div><dt>Notas</dt><dd class="pre">${c.notas}</dd></div>` : ''}
        </dl>`)}
        ${seccion('Comportamiento de pago', html`<div class="tarjeta">
          <p class="riesgo-linea">${badgeRiesgo(r.nivel)}</p>
          ${r.exigibles ? html`<ul class="riesgo-datos">
            <li><span>Cuotas exigibles</span><strong>${r.exigibles}</strong></li>
            <li><span>Pagadas con atraso o vencidas</span><strong>${r.tarde}</strong></li>
            <li><span>Vencidas hoy</span><strong>${r.vencidasHoy}</strong></li>
            <li><span>Mayor atraso</span><strong>${r.maxAtraso} ${r.maxAtraso === 1 ? 'día' : 'días'}</strong></li>
          </ul>` : ''}
          <p class="nota-legal">${AVISO_RIESGO}</p>
        </div>`)}
        ${!creditos.length ? html`<button type="button" class="btn btn-texto-peligro" data-accion="eliminar">${icono('basura')}<span>Eliminar cliente</span></button>` : ''}
      </div>
    </div>`);

  return acciones(el, {
    async eliminar() {
      if (!(await confirmar({ titulo: '¿Eliminar este cliente?', mensaje: 'Esta acción no se puede deshacer.', aceptar: 'Eliminar', peligro: true }))) return;
      await intentar(() => clientes.eliminar(id), 'eliminar el cliente');
      toast('Cliente eliminado.');
      ir('/clientes');
    },
  });
}
