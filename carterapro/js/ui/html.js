// Plantillas HTML seguras: todo valor interpolado se escapa salvo que sea Html.
export class Html {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

function valor(v) {
  if (v == null || v === false) return '';
  if (v instanceof Html) return v.s;
  if (Array.isArray(v)) return v.map(valor).join('');
  return esc(v);
}

export function html(partes, ...valores) {
  let s = partes[0];
  for (let i = 0; i < valores.length; i++) s += valor(valores[i]) + partes[i + 1];
  return new Html(s);
}

export const raw = s => new Html(String(s));

export function montar(contenedor, contenido) {
  contenedor.innerHTML = String(contenido);
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Delegación de eventos: data-accion="nombre" → manejadores[nombre](elemento, evento). */
export function acciones(raiz, manejadores, tipo = 'click') {
  const fn = e => {
    const el = e.target.closest('[data-accion]');
    if (!el || !raiz.contains(el)) return;
    const h = manejadores[el.dataset.accion];
    if (h) { e.preventDefault(); h(el, e); }
  };
  raiz.addEventListener(tipo, fn);
  return () => raiz.removeEventListener(tipo, fn);
}

export function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
