import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, badge, progreso, vacio } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha, relativa } from '../core/dates.js';
import { normalizarTexto } from '../domain/validaciones.js';
import { FRECUENCIAS } from '../domain/cuotas.js';

const FILTROS = [
  ['ACTIVOS', 'Activos'],
  ['VENCIDO', 'Con atraso'],
  ['PAGADO', 'Pagados'],
  ['CANCELADO', 'Cancelados'],
  ['TODOS', 'Todos'],
];

const pasa = (estado, f) => f === 'TODOS' || (f === 'ACTIVOS' ? ['ACTIVO', 'VENCIDO'].includes(estado) : estado === f);

export async function render(el, _p, query) {
  const { analisis, hoy } = await obtener();
  const todos = [...analisis.creditos.values()].sort((a, b) => b.credito.numero - a.credito.numero);
  let filtro = query.filtro || 'ACTIVOS';

  montar(el, html`
    ${encabezado('Créditos', { subtitulo: `${todos.length} en total`,
      extra: html`<a class="btn btn-pri" href="#/creditos/nuevo">${icono('mas_circulo')}<span>Nuevo crédito</span></a>` })}
    ${todos.length ? html`
      <div class="buscador">${icono('buscar')}
        <input type="search" class="input" id="buscar" placeholder="Buscar por cliente o número (#0012)" aria-label="Buscar créditos" autocomplete="off">
      </div>
      <div class="chips" role="tablist" aria-label="Filtrar créditos">
        ${FILTROS.map(([k, t]) => html`<button type="button" class="chip" role="tab" data-filtro="${k}" aria-selected="${k === filtro}">${t}
          <span class="chip-n">${todos.filter(i => pasa(i.resumen.estado, k)).length}</span></button>`)}
      </div>
      <div class="rejilla-tarjetas" id="lista"></div>`
    : vacio({ ico: 'creditos', titulo: 'Aún no hay créditos', texto: 'Crea un crédito y las cuotas se generan automáticamente.', accion: { href: '#/creditos/nuevo', texto: 'Crear primer crédito' } })}`);

  if (!todos.length) return;
  const input = $('#buscar', el);
  const pintar = () => {
    const q = normalizarTexto(input.value).replace('#', '');
    const lista = todos.filter(i => pasa(i.resumen.estado, filtro) && (!q
      || normalizarTexto(i.cliente?.nombreCompleto).includes(q)
      || String(i.credito.numero) === q.replace(/^0+/, '')));
    montar($('#lista', el), lista.length ? html`${lista.map(i => tarjeta(i, hoy))}` : html`<p class="vacio-mini">No hay créditos en esta categoría.</p>`);
  };
  input.addEventListener('input', pintar);
  el.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    el.querySelectorAll('[data-filtro]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    pintar();
  }));
  pintar();
}

function tarjeta({ credito: k, cliente, resumen: r }, hoy) {
  const prox = r.proxima;
  return html`<a class="tarjeta tarjeta-credito" href="#/creditos/${k.id}">
    <div class="tc-cabeza">
      <span class="num-credito">${formatoNumero(k.numero)}</span>
      ${badge(r.visual)}
    </div>
    <strong class="tc-cliente">${cliente?.nombreCompleto || 'Cliente eliminado'}</strong>
    <div class="tc-montos">
      <span><small>Prestado</small><b class="dinero">${dinero(k.montoPrestado)}</b></span>
      <span><small>Saldo</small><b class="dinero">${dinero(k.cancelado ? 0 : r.saldoTotal)}</b></span>
    </div>
    ${progreso(r.progreso, r.visual === 'VENCIDO' ? 'rojo' : 'verde')}
    <small class="tc-pie">${r.cuotasPagadas}/${r.totalCuotas} cuotas · ${FRECUENCIAS[k.frecuencia].nombre}
      ${prox && !k.cancelado ? html` · ${r.vencidas ? `${r.vencidas} vencida${r.vencidas > 1 ? 's' : ''}` : `próxima ${relativa(prox.fechaVencimiento, hoy)}`}` : ''}
      ${!prox ? ` · desde ${fecha(k.fechaInicio)}` : ''}</small>
  </a>`;
}
