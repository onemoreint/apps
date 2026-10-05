// Avisos (toasts) y diálogos de confirmación accesibles basados en <dialog>.
import { html, montar } from './html.js';
import { icono } from './icons.js';

function zonaToasts() {
  let z = document.getElementById('toasts');
  if (!z) {
    z = document.createElement('div');
    z.id = 'toasts';
    z.className = 'toasts';
    z.setAttribute('role', 'status');
    z.setAttribute('aria-live', 'polite');
    document.body.append(z);
  }
  return z;
}

/** tono: 'exito' | 'error' | 'info'. accion: { texto, fn } opcional (p. ej. "Reintentar"). */
export function toast(mensaje, tono = 'exito', { accion, duracion = 4000 } = {}) {
  const t = document.createElement('div');
  t.className = `toast toast-${tono}`;
  const ico = { exito: 'check', error: 'alerta', info: 'info' }[tono];
  montar(t, html`${icono(ico)}<span>${mensaje}</span>${accion ? html`<button type="button" class="toast-btn">${accion.texto}</button>` : ''}`);
  if (accion) t.querySelector('button').onclick = () => { t.remove(); accion.fn(); };
  zonaToasts().append(t);
  setTimeout(() => t.classList.add('saliendo'), duracion);
  setTimeout(() => t.remove(), duracion + 300);
}

function abrirDialogo(contenido, alCerrar) {
  const d = document.createElement('dialog');
  d.className = 'dialogo';
  montar(d, contenido);
  document.body.append(d);
  d.addEventListener('close', () => { alCerrar(d.returnValue, d); d.remove(); });
  d.addEventListener('click', e => { if (e.target === d) d.close('cancelar'); });
  d.showModal();
  return d;
}

/** @returns {Promise<boolean>} */
export function confirmar({ titulo, mensaje, detalle, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise(resolve => {
    abrirDialogo(html`
      <form method="dialog" class="dialogo-cuerpo">
        <h2 class="dialogo-titulo">${titulo}</h2>
        ${mensaje ? html`<p class="dialogo-texto">${mensaje}</p>` : ''}
        ${detalle || ''}
        <div class="dialogo-botones">
          <button value="cancelar" class="btn btn-sec">${cancelar}</button>
          <button value="ok" class="btn ${peligro ? 'btn-peligro' : 'btn-pri'}" autofocus>${aceptar}</button>
        </div>
      </form>`, v => resolve(v === 'ok'));
  });
}

/** Pide un texto corto (p. ej. motivo de anulación). @returns {Promise<string|null>} */
export function pedirTexto({ titulo, mensaje, etiqueta, aceptar = 'Aceptar', peligro = false, obligatorio = false }) {
  return new Promise(resolve => {
    const d = abrirDialogo(html`
      <form method="dialog" class="dialogo-cuerpo">
        <h2 class="dialogo-titulo">${titulo}</h2>
        ${mensaje ? html`<p class="dialogo-texto">${mensaje}</p>` : ''}
        <label class="campo"><span class="campo-etiqueta">${etiqueta}</span>
          <input name="texto" class="input" maxlength="200" autocomplete="off" ${obligatorio ? 'required' : ''}></label>
        <div class="dialogo-botones">
          <button value="cancelar" formnovalidate class="btn btn-sec">Cancelar</button>
          <button value="ok" class="btn ${peligro ? 'btn-peligro' : 'btn-pri'}">${aceptar}</button>
        </div>
      </form>`, (v, dlg) => resolve(v === 'ok' ? dlg.querySelector('input').value.trim() : null));
    d.querySelector('input').focus();
  });
}
