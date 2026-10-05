import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, filaLista, avatar, badge, seccion } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { normalizarTexto, soloDigitos } from '../domain/validaciones.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';

const LIMITE = 20;

/** Búsqueda en clientes (nombre, teléfono, documento), créditos (#12) y recibos (R-000012). */
export function buscar({ analisis, datos }, texto) {
  const q = normalizarTexto(texto);
  const dig = soloDigitos(texto);
  if (!q) return { clientes: [], creditos: [], recibos: [] };

  const clientes = [...analisis.clientes.values()].filter(ic => {
    const c = ic.cliente;
    return normalizarTexto(c.nombreCompleto).includes(q)
      || (dig.length >= 3 && (soloDigitos(c.telefono).includes(dig) || soloDigitos(c.whatsapp).includes(dig) || soloDigitos(c.documento).includes(dig)))
      || (c.documento && normalizarTexto(c.documento).includes(q));
  });

  const numCredito = /^#?\s*0*(\d{1,6})$/.exec(q)?.[1];
  const creditos = numCredito ? [...analisis.creditos.values()].filter(i => String(i.credito.numero) === numCredito) : [];

  const numRecibo = /^r-?\s*0*(\d{1,7})$/.exec(q)?.[1];
  const recibos = datos.pagos.filter(p => numRecibo
    ? p.numeroRecibo === 'R-' + numRecibo.padStart(6, '0')
    : q.startsWith('r-') && normalizarTexto(p.numeroRecibo).includes(q));

  return { clientes: clientes.slice(0, LIMITE), creditos: creditos.slice(0, LIMITE), recibos: recibos.slice(0, LIMITE) };
}

export async function render(el, _p, query) {
  const fuente = await obtener();
  montar(el, html`
    ${encabezado('Buscar', { atras: '#/' })}
    <div class="buscador buscador-grande">${icono('buscar')}
      <input type="search" class="input" id="q" value="${query.q || ''}" placeholder="Nombre, teléfono, documento, #crédito o recibo" aria-label="Buscar en CarteraPro" autocomplete="off" autofocus>
    </div>
    <p class="campo-ayuda">Ejemplos: <em>Carlos</em> · <em>3001234567</em> · <em>#12</em> · <em>R-000045</em></p>
    <div id="resultados" aria-live="polite"></div>`);

  const input = $('#q', el);
  const pintar = () => {
    const r = buscar(fuente, input.value);
    const total = r.clientes.length + r.creditos.length + r.recibos.length;
    if (!input.value.trim()) { montar($('#resultados', el), ''); return; }
    if (!total) { montar($('#resultados', el), html`<p class="vacio-mini">No encontramos nada con "${input.value}".</p>`); return; }
    montar($('#resultados', el), html`
      ${r.clientes.length ? seccion('Clientes', html`<div class="lista">${r.clientes.map(ic => filaLista({
        href: `#/clientes/${ic.cliente.id}`, izquierda: avatar(ic.cliente), titulo: ic.cliente.nombreCompleto,
        sub: [ic.cliente.telefono, ic.cliente.documento && `Doc. ${ic.cliente.documento}`].filter(Boolean).join(' · '),
        derecha: ic.saldo > 0 ? html`<strong class="dinero">${dinero(ic.saldo)}</strong>` : '', derechaSub: badge(ic.visual),
      }))}</div>`, { contador: r.clientes.length }) : ''}
      ${r.creditos.length ? seccion('Créditos', html`<div class="lista">${r.creditos.map(i => filaLista({
        href: `#/creditos/${i.credito.id}`, izquierda: html`<span class="num-credito">${formatoNumero(i.credito.numero)}</span>`,
        titulo: i.cliente?.nombreCompleto || 'Cliente', sub: `Prestado ${dinero(i.credito.montoPrestado)} · ${fecha(i.credito.fechaInicio)}`,
        derecha: html`<strong class="dinero">${dinero(i.resumen.saldoTotal)}</strong>`, derechaSub: badge(i.resumen.visual),
      }))}</div>`) : ''}
      ${r.recibos.length ? seccion('Recibos', html`<div class="lista">${r.recibos.map(p => {
        const i = fuente.analisis.creditos.get(p.creditoId);
        return filaLista({ href: `#/recibos/${p.id}`, izquierda: html`<span class="fila-ico">${icono('recibo')}</span>`,
          titulo: `${p.numeroRecibo} · ${i?.cliente?.nombreCompleto || ''}`, sub: `${fecha(p.fecha)} · ${p.metodoPago}${p.anulado ? ' · ANULADO' : ''}`,
          derecha: html`<strong class="dinero">${dinero(p.monto)}</strong>` });
      })}</div>`) : ''}`);
  };
  input.addEventListener('input', () => {
    pintar();
    history.replaceState(null, '', `#/buscar?q=${encodeURIComponent(input.value)}`);
  });
  pintar();
}
