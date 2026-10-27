import { html, montar, acciones, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, avatar, progreso, vacio, botonWhatsApp, campo } from '../ui/componentes.js';
import { formularioDialogo, toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as cobradores from '../services/cobradores.js';
import * as visitas from '../services/visitas.js';
import * as clientesSrv from '../services/clientes.js';
import * as wa from '../services/whatsapp.js';
import { construirRuta, ESTADOS_PARADA, RESULTADOS_VISITA, enlaceMapa } from '../domain/ruta.js';
import { SIN_COBRADOR } from '../domain/caja.js';
import { soloDigitos } from '../domain/validaciones.js';
import { formatear as dinero } from '../core/money.js';
import { larga, sumarDias, formatear as fecha } from '../core/dates.js';
import { ir, recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el, _p, query) {
  const { analisis, datos, hoy } = await obtener();
  const equipo = cobradores.lista({ soloActivos: true });
  const filtro = query.cobrador || '';
  const ordenando = query.ordenar === '1';
  const { paradas, totales } = construirRuta(analisis.creditos, datos, hoy, filtro);
  const pendientes = paradas.filter(p => p.estado === 'PENDIENTE');
  const hechas = paradas.filter(p => p.estado !== 'PENDIENTE');
  const qs = extra => '#/ruta?' + new URLSearchParams({ ...(filtro ? { cobrador: filtro } : {}), ...extra });

  const chipsCobrador = equipo.length ? html`<nav class="chips" aria-label="Filtrar por cobrador">
    <a class="chip" href="#/ruta" ${!filtro ? html`aria-current="page"` : ''}>Todos</a>
    ${equipo.map(c => html`<a class="chip" href="#/ruta?cobrador=${c.id}" ${filtro === c.id ? html`aria-current="page"` : ''}>${c.nombre}</a>`)}
    <a class="chip" href="#/ruta?cobrador=${SIN_COBRADOR}" ${filtro === SIN_COBRADOR ? html`aria-current="page"` : ''}>Sin asignar</a>
  </nav>` : '';

  if (!paradas.length) {
    montar(el, html`${encabezado('Ruta de cobro', { subtitulo: larga(hoy) })}${chipsCobrador}
      ${vacio({ ico: 'check', titulo: 'No hay cobros para hoy', texto: 'Aquí aparecen los clientes con cuotas que vencen hoy o están atrasadas, en el orden en que los visitas.', accion: { href: '#/cobranzas?tab=PROXIMOS', texto: 'Ver próximos cobros' } })}`);
    return;
  }

  const n = { i: 0 };
  const parada = (p, numero) => {
    const k = p.creditos.find(c => c.exigible > 0) || p.creditos[0];
    const pagarHref = p.creditos.filter(c => c.exigible > 0).length > 1
      ? `#/pagos/nuevo?cliente=${p.cliente.id}&volver=ruta`
      : `#/pagos/nuevo?credito=${k.credito.id}&volver=ruta`;
    const mapa = enlaceMapa(p.cliente);
    const tel = soloDigitos(p.cliente.telefono);
    const e = ESTADOS_PARADA[p.estado];
    const mensaje = wa.generar(p.maxAtraso > 0 ? 'vencido' : 'recordatorio', { cliente: p.cliente, valor: p.exigible, fecha: hoy, cuota: '' });
    return html`<li class="parada parada-${p.estado.toLowerCase()}" data-id="${p.cliente.id}">
      <div class="parada-cabeza">
        <span class="parada-num" aria-label="Parada ${numero}">${numero}</span>
        <a class="parada-cliente" href="#/clientes/${p.cliente.id}">${avatar(p.cliente)}
          <span><strong>${p.cliente.nombreCompleto}</strong>
            <small>${[p.cliente.sector, p.cliente.direccion].filter(Boolean).join(' · ') || p.cliente.telefono}</small></span></a>
        ${ordenando ? html`<span class="parada-orden">
          <button type="button" class="btn-icono" data-accion="subir" aria-label="Subir">${icono('subir')}</button>
          <button type="button" class="btn-icono" data-accion="bajar" aria-label="Bajar">${icono('bajar')}</button></span>` : ''}
      </div>
      <div class="parada-cifras">
        <span><small>${p.estado === 'PAGADO' ? 'Cobrado hoy' : 'Por cobrar'}</small>
          <strong class="dinero ${p.maxAtraso > 0 && p.exigible ? 'rojo' : ''}">${dinero(p.estado === 'PAGADO' ? p.pagadoHoy : p.exigible)}</strong></span>
        <span class="parada-etiquetas">
          <span class="badge badge-${e.tono}"><i class="punto"></i>${e.nombre}</span>
          ${p.maxAtraso > 0 && p.exigible ? html`<span class="etiqueta etiqueta-rojo">${p.maxAtraso} ${p.maxAtraso === 1 ? 'día' : 'días'} de atraso</span>` : ''}
          ${p.estado === 'ABONO' ? html`<span class="etiqueta etiqueta-verde">Abonó ${dinero(p.pagadoHoy)}</span>` : ''}
          ${p.promesaHoy ? html`<span class="etiqueta etiqueta-azul">Prometió pagar hoy</span>` : ''}
          ${p.multas ? html`<span class="etiqueta etiqueta-naranja">Multa ${dinero(p.multas)}</span>` : ''}
          ${p.visitaHoy && p.estado === 'VISITADO' ? html`<span class="etiqueta">${RESULTADOS_VISITA[p.visitaHoy.resultado]}${p.visitaHoy.promesaFecha ? ` · ${fecha(p.visitaHoy.promesaFecha)}` : ''}</span>` : ''}
        </span>
      </div>
      ${ordenando ? '' : html`<div class="parada-acciones">
        ${p.exigible > 0 ? html`<a class="btn btn-pri btn-sm" href="${pagarHref}">${icono('dinero')}<span>Cobrar</span></a>` : ''}
        ${p.exigible > 0 && p.estado !== 'ABONO' ? html`<button type="button" class="btn btn-sec btn-sm" data-accion="noPago" data-credito="${k.credito.id}">${icono('anular')}<span>No pagó</span></button>` : ''}
        ${mapa ? html`<a class="btn btn-sec btn-sm" href="${mapa}" target="_blank" rel="noopener">${icono('mapa')}<span>Mapa</span></a>` : ''}
        ${tel ? html`<a class="btn btn-sec btn-sm btn-solo-ico" href="tel:${tel}" aria-label="Llamar a ${p.cliente.nombreCompleto}">${icono('telefono')}</a>` : ''}
        ${p.exigible > 0 ? botonWhatsApp(p.cliente, mensaje, '', 'btn btn-wa btn-sm btn-solo-ico') : ''}
      </div>`}
    </li>`;
  };

  const avance = totales.meta ? totales.recaudado / totales.meta : 0;
  montar(el, html`
    ${encabezado('Ruta de cobro', { subtitulo: larga(hoy), extra: html`<a class="btn btn-sec btn-sm" href="${ordenando ? qs({}) : qs({ ordenar: '1' })}">${icono(ordenando ? 'cerrar' : 'ordenar')}<span>${ordenando ? 'Salir' : 'Ordenar'}</span></a>` })}
    ${chipsCobrador}
    <section class="tarjeta ruta-avance" aria-label="Avance de la ruta">
      <div class="ruta-avance-fila">
        <span><small>Paradas</small><strong>${totales.visitadas} de ${totales.paradas}</strong></span>
        <span><small>Recaudado</small><strong class="dinero verde">${dinero(totales.recaudado)}</strong></span>
        <span><small>Falta</small><strong class="dinero">${dinero(totales.porCobrar)}</strong></span>
      </div>
      ${progreso(avance, 'verde')}
      <div class="ruta-avance-pie">
        <small>${Math.round(avance * 100)}% de la meta del día (${dinero(totales.meta)})</small>
        <a class="enlace" href="#/caja${filtro && filtro !== SIN_COBRADOR ? `?cobrador=${filtro}` : ''}">${icono('caja')} Caja del día</a>
      </div>
    </section>
    ${ordenando ? html`<p class="aviso aviso-azul">${icono('info')} Mueve a cada cliente con las flechas en el orden en que lo visitas y guarda. El orden se mantiene para los próximos días.</p>` : ''}
    <ol class="ruta" id="ruta">${(ordenando ? paradas : pendientes).map(p => parada(p, ++n.i))}</ol>
    ${ordenando ? html`<div class="barra-acciones"><button type="button" class="btn btn-pri btn-lg btn-bloque" data-accion="guardarOrden">${icono('check')}<span>Guardar orden</span></button></div>`
      : hechas.length ? html`<h2 class="ruta-subtitulo">Ya visitados <span class="contador">${hechas.length}</span></h2>
        <ol class="ruta ruta-hechas">${hechas.map(p => parada(p, ++n.i))}</ol>` : ''}`);

  return acciones(el, {
    subir: btn => mover(btn, -1),
    bajar: btn => mover(btn, 1),
    async guardarOrden() {
      const ids = [...el.querySelectorAll('#ruta > .parada')].map(li => li.dataset.id);
      await intentar(() => clientesSrv.ordenarRuta(ids), 'guardar el orden');
      toast('Orden de la ruta guardado.');
      ir(qs({}).slice(1));
    },
    async noPago(btn) {
      const li = btn.closest('.parada');
      const p = paradas.find(x => x.cliente.id === li.dataset.id);
      const k = p.creditos.find(c => c.credito.id === btn.dataset.credito)?.credito;
      const r = await formularioDialogo({
        titulo: `Visita a ${p.cliente.nombreCompleto}`,
        mensaje: 'Registra qué pasó. Queda en el historial del cliente y en la ruta de hoy.',
        aceptar: 'Guardar visita',
        cuerpo: html`<div class="opciones-lista" role="radiogroup" aria-label="Resultado">
            ${Object.entries(RESULTADOS_VISITA).map(([v, t], i) => html`<label class="opcion-fila"><input type="radio" name="resultado" value="${v}" ${i === 0 ? 'checked' : ''}><span>${t}</span></label>`)}
          </div>
          ${campo({ etiqueta: 'Fecha de la promesa', nombre: 'promesaFecha', tipo: 'date', valor: sumarDias(hoy, 1), attrs: `min="${hoy}"`, ayuda: 'Solo si prometió pagar.' })}
          ${campo({ etiqueta: 'Nota', nombre: 'nota', attrs: 'maxlength="160" placeholder="Opcional"' })}`,
        validar: d => (d.resultado === 'PROMESA' && !d.promesaFecha ? { promesaFecha: 'Escribe la fecha.' } : {}),
      });
      if (!r) return;
      await intentar(() => visitas.registrar({
        clienteId: p.cliente.id, creditoId: k?.id, cobradorId: k?.cobradorId, fecha: hoy,
        resultado: r.resultado, promesaFecha: r.promesaFecha, nota: r.nota,
      }), 'guardar la visita');
      toast('Visita registrada.');
      recargar();
    },
  });

  function mover(btn, paso) {
    const li = btn.closest('.parada');
    const otro = paso < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!otro) return;
    if (paso < 0) otro.before(li); else otro.after(li);
    [...el.querySelectorAll('#ruta > .parada')].forEach((x, i) => { x.querySelector('.parada-num').textContent = i + 1; });
    btn.focus();
  }
}
