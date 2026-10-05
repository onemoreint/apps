import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, filaLista, avatar, badge, vacio } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatear as dinero } from '../core/money.js';
import { normalizarTexto, soloDigitos } from '../domain/validaciones.js';

const FILTROS = [
  ['TODOS', 'Todos'],
  ['DEUDA', 'Con saldo'],
  ['VENCIDO', 'Atrasados'],
  ['AL_DIA', 'Al día'],
  ['SIN', 'Sin créditos'],
];

function coincide(ic, filtro) {
  switch (filtro) {
    case 'DEUDA': return ic.saldo > 0;
    case 'VENCIDO': return ic.visual === 'VENCIDO';
    case 'AL_DIA': return ic.saldo > 0 && ic.visual !== 'VENCIDO';
    case 'SIN': return ic.creditos.length === 0;
    default: return true;
  }
}

export async function render(el, _p, query) {
  const { analisis } = await obtener();
  const todos = [...analisis.clientes.values()]
    .sort((a, b) => a.cliente.nombreCompleto.localeCompare(b.cliente.nombreCompleto, 'es'));
  let filtro = query.filtro || 'TODOS';

  montar(el, html`
    ${encabezado('Clientes', { subtitulo: `${todos.length} registrados`,
      extra: html`<a class="btn btn-pri" href="#/clientes/nuevo">${icono('mas_circulo')}<span>Nuevo cliente</span></a>` })}
    ${todos.length ? html`
      <div class="buscador">${icono('buscar')}
        <input type="search" class="input" id="buscar" placeholder="Buscar por nombre, teléfono o documento" aria-label="Buscar clientes" autocomplete="off">
      </div>
      <div class="chips" role="tablist" aria-label="Filtrar clientes">
        ${FILTROS.map(([k, t]) => html`<button type="button" class="chip" role="tab" data-filtro="${k}" aria-selected="${k === filtro}">${t}</button>`)}
      </div>
      <div class="lista" id="lista"></div>`
    : vacio({ ico: 'clientes', titulo: 'Aún no tienes clientes', texto: 'Registra a las personas a las que les prestas dinero.', accion: { href: '#/clientes/nuevo', texto: 'Crear primer cliente' } })}`);

  if (!todos.length) return;
  const input = $('#buscar', el);
  const pintar = () => {
    const q = normalizarTexto(input.value);
    const qDig = soloDigitos(input.value);
    const lista = todos.filter(ic => coincide(ic, filtro) && (!q
      || normalizarTexto(ic.cliente.nombreCompleto).includes(q)
      || (qDig.length >= 3 && (soloDigitos(ic.cliente.telefono).includes(qDig) || soloDigitos(ic.cliente.documento).includes(qDig)))
      || normalizarTexto(ic.cliente.documento).includes(q)));
    montar($('#lista', el), lista.length ? html`${lista.map(ic => filaLista({
      href: `#/clientes/${ic.cliente.id}`,
      izquierda: avatar(ic.cliente),
      titulo: ic.cliente.nombreCompleto,
      sub: `${ic.cliente.telefono}${ic.activos ? ` · ${ic.activos} ${ic.activos === 1 ? 'crédito activo' : 'créditos activos'}` : ''}`,
      derecha: ic.saldo > 0 ? html`<strong class="dinero">${dinero(ic.saldo)}</strong>` : '',
      derechaSub: badge(ic.visual),
    }))}` : html`<p class="vacio-mini">No hay clientes que coincidan.</p>`);
  };
  input.addEventListener('input', pintar);
  el.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    el.querySelectorAll('[data-filtro]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    pintar();
  }));
  pintar();
}
