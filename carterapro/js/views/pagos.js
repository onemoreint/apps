import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, vacio } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha, corta, inicioMes, inicioSemana } from '../core/dates.js';
import { normalizarTexto } from '../domain/validaciones.js';

const PERIODOS = [['HOY', 'Hoy'], ['SEMANA', 'Esta semana'], ['MES', 'Este mes'], ['TODOS', 'Todos']];

export async function render(el, _p, query) {
  const { datos, analisis, hoy } = await obtener();
  const todos = [...datos.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numeroRecibo.localeCompare(a.numeroRecibo));
  let periodo = query.periodo || 'MES';
  const desde = { HOY: hoy, SEMANA: inicioSemana(hoy), MES: inicioMes(hoy), TODOS: '0000-00-00' };

  montar(el, html`
    ${encabezado('Pagos', { subtitulo: 'Historial de pagos recibidos',
      extra: html`<a class="btn btn-pri" href="#/pagos/nuevo">${icono('mas_circulo')}<span>Registrar pago</span></a>` })}
    ${todos.length ? html`
      <div class="buscador">${icono('buscar')}<input type="search" class="input" id="buscar" placeholder="Buscar por cliente o recibo (R-000012)" aria-label="Buscar pagos" autocomplete="off"></div>
      <div class="chips" role="tablist" aria-label="Periodo">
        ${PERIODOS.map(([k, t]) => html`<button type="button" class="chip" role="tab" data-periodo="${k}" aria-selected="${k === periodo}">${t}</button>`)}
      </div>
      <div class="tarjeta total-periodo" id="total"></div>
      <div id="lista"></div>`
    : vacio({ ico: 'pagos', titulo: 'Aún no hay pagos', texto: 'Los pagos que registres aparecerán aquí con su número de recibo.', accion: { href: '#/pagos/nuevo', texto: 'Registrar pago' } })}`);
  if (!todos.length) return;

  const input = $('#buscar', el);
  const pintar = () => {
    const q = normalizarTexto(input.value);
    const lista = todos.filter(p => p.fecha >= desde[periodo]).filter(p => {
      if (!q) return true;
      const info = analisis.creditos.get(p.creditoId);
      return normalizarTexto(info?.cliente?.nombreCompleto).includes(q) || normalizarTexto(p.numeroRecibo).includes(q);
    });
    const validos = lista.filter(p => !p.anulado);
    montar($('#total', el), html`<span>${validos.length} ${validos.length === 1 ? 'pago' : 'pagos'}</span><strong class="dinero">${dinero(validos.reduce((s, p) => s + p.monto, 0))}</strong>`);
    if (!lista.length) { montar($('#lista', el), html`<p class="vacio-mini">No hay pagos en este periodo.</p>`); return; }
    const grupos = new Map();
    for (const p of lista) { if (!grupos.has(p.fecha)) grupos.set(p.fecha, []); grupos.get(p.fecha).push(p); }
    montar($('#lista', el), html`${[...grupos].map(([f, ps]) => html`<section class="grupo-fecha">
      <h2 class="grupo-titulo">${f === hoy ? 'Hoy' : corta(f)} <span>${fecha(f)}</span></h2>
      <ul class="pagos-lista tarjeta">${ps.map(p => {
        const info = analisis.creditos.get(p.creditoId);
        return html`<li class="pago ${p.anulado ? 'anulado' : ''}"><a href="#/recibos/${p.id}">
          <span class="pago-ico">${icono(p.anulado ? 'anular' : 'recibo')}</span>
          <span class="pago-texto"><strong>${info?.cliente?.nombreCompleto || 'Cliente'}</strong>
            <small>${p.numeroRecibo} · ${formatoNumero(info?.credito.numero || 0)} · ${p.metodoPago}${p.anulado ? ' · ANULADO' : ''}</small></span>
          <span class="pago-fin"><strong class="dinero">${dinero(p.monto)}</strong></span></a></li>`;
      })}</ul></section>`)}`);
  };
  input.addEventListener('input', pintar);
  el.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => {
    periodo = b.dataset.periodo;
    el.querySelectorAll('[data-periodo]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    pintar();
  }));
  pintar();
}
