// Componentes visuales reutilizables. Devuelven Html (no tocan el DOM).
import { html, raw, iniciales } from './html.js';
import { icono } from './icons.js';
import { ESTADOS } from '../domain/estados.js';
import { NIVELES_RIESGO } from '../domain/riesgo.js';
import { formatear as dinero } from '../core/money.js';
import * as fechas from '../core/dates.js';
import { formatoNumero } from '../services/creditos.js';
import * as wa from '../services/whatsapp.js';

export function badge(visual, texto) {
  const e = ESTADOS[visual] || ESTADOS.AL_DIA;
  return html`<span class="badge badge-${e.tono}"><i class="punto"></i>${texto || e.nombre}</span>`;
}

export function badgeRiesgo(nivel) {
  const r = NIVELES_RIESGO[nivel] || NIVELES_RIESGO.SIN_HISTORIAL;
  return html`<span class="badge badge-${r.tono}"><i class="punto"></i>${r.nombre}</span>`;
}

export function avatar(cliente, grande = false) {
  if (cliente?.foto) return html`<img class="avatar ${grande ? 'avatar-xl' : ''}" src="${cliente.foto}" alt="">`;
  return html`<span class="avatar ${grande ? 'avatar-xl' : ''}" aria-hidden="true">${iniciales(cliente?.nombreCompleto)}</span>`;
}

export function kpi(etiqueta, valor, { ico, tono = '', nota, href } = {}) {
  const cuerpo = html`
    <span class="kpi-cabeza">${ico ? html`<span class="kpi-ico ${tono}">${icono(ico)}</span>` : ''}<span class="kpi-etiqueta">${etiqueta}</span></span>
    <strong class="kpi-valor">${valor}</strong>
    ${nota ? html`<span class="kpi-nota">${nota}</span>` : ''}`;
  return href ? html`<a class="kpi" href="${href}">${cuerpo}</a>` : html`<div class="kpi">${cuerpo}</div>`;
}

export function progreso(fraccion, tono = '') {
  const pct = Math.max(0, Math.min(100, Math.round((fraccion || 0) * 100)));
  return html`<div class="progreso ${tono}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
}

export function vacio({ ico = 'info', titulo, texto, accion }) {
  return html`<div class="vacio">
    <span class="vacio-ico">${icono(ico)}</span>
    <h3>${titulo}</h3>
    ${texto ? html`<p>${texto}</p>` : ''}
    ${accion ? html`<a class="btn btn-pri" href="${accion.href}">${accion.texto}</a>` : ''}
  </div>`;
}

export function encabezado(titulo, { atras, subtitulo, extra } = {}) {
  return html`<header class="pagina-cabeza">
    ${atras ? html`<a class="btn-icono" href="${atras}" aria-label="Volver">${icono('atras')}</a>` : ''}
    <div class="pagina-titulos"><h1>${titulo}</h1>${subtitulo ? html`<p>${subtitulo}</p>` : ''}</div>
    ${extra || ''}
  </header>`;
}

export function seccion(titulo, contenido, { enlace, contador } = {}) {
  return html`<section class="seccion">
    <div class="seccion-cabeza"><h2>${titulo}${contador != null ? html` <span class="contador">${contador}</span>` : ''}</h2>
      ${enlace ? html`<a href="${enlace.href}" class="enlace">${enlace.texto}</a>` : ''}</div>
    ${contenido}
  </section>`;
}

export function botonWhatsApp(cliente, mensaje, texto = 'WhatsApp', clase = 'btn btn-wa') {
  if (!cliente?.telefono && !cliente?.whatsapp) return '';
  return html`<a class="${clase}" href="${wa.enlace(cliente, mensaje)}" target="_blank" rel="noopener" aria-label="Enviar WhatsApp a ${cliente.nombreCompleto}">${icono('whatsapp')}${texto ? html`<span>${texto}</span>` : ''}</a>`;
}

/** Tarjeta de cuota por cobrar (dashboard, cobranzas, calendario). */
export function tarjetaCobro(item, hoy) {
  const { cuota, credito, cliente, saldo, visual, estado, diasAtraso } = item;
  const diasHasta = fechas.diferenciaDias(hoy, cuota.fechaVencimiento);
  let cuando = fechas.relativa(cuota.fechaVencimiento, hoy);
  if (diasAtraso > 0) cuando = `${diasAtraso} ${diasAtraso === 1 ? 'día' : 'días'} de atraso`;
  const tipo = wa.tipoSegunEstado(estado, diasHasta);
  const mensaje = wa.generar(tipo, { cliente, valor: saldo, fecha: cuota.fechaVencimiento, cuota: cuota.numero });
  return html`<article class="cobro">
    <a class="cobro-info" href="#/creditos/${credito.id}">
      ${avatar(cliente)}
      <span class="cobro-texto">
        <strong>${cliente?.nombreCompleto || 'Cliente'}</strong>
        <small>Cuota ${cuota.numero}/${credito.numeroCuotas} · ${formatoNumero(credito.numero)} · ${cuando}</small>
      </span>
      <span class="cobro-monto"><strong class="dinero">${dinero(saldo)}</strong>${badge(visual)}</span>
    </a>
    <div class="cobro-acciones">
      <a class="btn btn-pri btn-sm" href="#/pagos/nuevo?credito=${credito.id}&cuota=${cuota.numero}">${icono('dinero')}<span>Registrar pago</span></a>
      ${botonWhatsApp(cliente, mensaje, 'WhatsApp', 'btn btn-wa btn-sm')}
    </div>
  </article>`;
}

/** Fila de lista con avatar (clientes, créditos, pagos). */
export function filaLista({ href, izquierda, titulo, sub, derecha, derechaSub }) {
  return html`<a class="fila" href="${href}">
    ${izquierda}
    <span class="fila-texto"><strong>${titulo}</strong>${sub ? html`<small>${sub}</small>` : ''}</span>
    <span class="fila-derecha">${derecha}${derechaSub || ''}</span>
  </a>`;
}

export function campo({ etiqueta, nombre, valor = '', tipo = 'text', ayuda, requerido, attrs = '', opciones, ancho }) {
  const id = `f-${nombre}`;
  let control;
  if (opciones) {
    control = html`<select id="${id}" name="${nombre}" class="input" ${requerido ? 'required' : ''}>
      ${opciones.map(o => html`<option value="${o.valor}" ${String(o.valor) === String(valor) ? 'selected' : ''}>${o.texto}</option>`)}
    </select>`;
  } else if (tipo === 'textarea') {
    control = html`<textarea id="${id}" name="${nombre}" class="input" rows="3">${valor}</textarea>`;
  } else {
    control = html`<input id="${id}" name="${nombre}" type="${tipo}" class="input" value="${valor}" ${requerido ? 'required' : ''} ${raw(attrs)}>`;
  }
  return html`<div class="campo ${ancho || ''}" data-campo="${nombre}">
    <label class="campo-etiqueta" for="${id}">${etiqueta}${requerido ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>
    ${control}
    ${ayuda ? html`<small class="campo-ayuda">${ayuda}</small>` : ''}
    <small class="campo-error" id="${id}-error" role="alert"></small>
  </div>`;
}

/** Pinta errores de validación en un formulario: { campo: mensaje }. */
export function mostrarErrores(form, errores = {}) {
  form.querySelectorAll('.campo').forEach(c => {
    const msg = errores[c.dataset.campo];
    c.classList.toggle('con-error', !!msg);
    const el = c.querySelector('.campo-error');
    if (el) el.textContent = msg || '';
    c.querySelector('.input')?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
  const primero = form.querySelector('.con-error .input');
  if (primero) primero.focus();
}
