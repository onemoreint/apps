// Pantalla de bloqueo con PIN y bloqueo automático por inactividad.
import { html, montar } from './html.js';
import { icono } from './icons.js';
import { confirmar, pedirTexto, toast } from './dialogos.js';
import * as seguridad from '../services/seguridad.js';
import * as config from '../services/config.js';

let abierto = null;

/** Muestra el bloqueo; la promesa se resuelve al ingresar el PIN correcto. */
export function bloquear() {
  if (!seguridad.activo()) return Promise.resolve();
  if (abierto) return abierto;
  document.body.classList.add('bloqueado');
  document.querySelectorAll('dialog[open]').forEach(d => d.close('cancelar'));
  const capa = document.createElement('div');
  capa.className = 'bloqueo';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'bloqueo-titulo');
  const cfg = config.get();
  montar(capa, html`<form class="bloqueo-caja" novalidate>
    ${cfg.logo ? html`<img class="bloqueo-logo" src="${cfg.logo}" alt="">` : html`<span class="marca-logo marca-logo-xl" aria-hidden="true">C</span>`}
    <h1 id="bloqueo-titulo">${cfg.nombreNegocio || 'CarteraPro'}</h1>
    <p>Ingresa tu PIN para continuar</p>
    <input type="password" id="pin-entrada" class="input pin-input" inputmode="numeric" autocomplete="current-password"
      maxlength="8" pattern="[0-9]*" aria-label="PIN" required>
    <p class="campo-error" id="pin-error" role="alert"></p>
    <div class="teclado" aria-hidden="true">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => html`<button type="button" class="tecla" data-n="${n}" tabindex="-1">${n}</button>`)}
      <button type="button" class="tecla tecla-sec" data-borrar tabindex="-1">${icono('atras')}</button>
      <button type="button" class="tecla" data-n="0" tabindex="-1">0</button>
      <button type="submit" class="tecla tecla-ok" tabindex="-1">${icono('check')}</button>
    </div>
    <button type="submit" class="btn btn-pri btn-lg btn-bloque">Desbloquear</button>
    <button type="button" class="btn-link" data-olvide>¿Olvidaste tu PIN?</button>
  </form>`);
  document.body.append(capa);

  const form = capa.querySelector('form');
  const input = capa.querySelector('#pin-entrada');
  const error = capa.querySelector('#pin-error');
  input.focus();

  abierto = new Promise(resolve => {
    capa.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.n != null && input.value.length < 8) input.value += t.dataset.n;
      if (t.hasAttribute('data-borrar')) input.value = input.value.slice(0, -1);
      if (t.hasAttribute('data-olvide')) olvide();
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const espera = seguridad.esperaRestante();
      if (espera > 0) { error.textContent = `Demasiados intentos. Espera ${Math.ceil(espera / 1000)} segundos.`; return; }
      if (!input.value) return;
      if (await seguridad.verificar(input.value)) {
        capa.remove();
        document.body.classList.remove('bloqueado');
        abierto = null;
        resolve();
      } else {
        const w = seguridad.esperaRestante();
        error.textContent = w ? `PIN incorrecto. Por seguridad, espera ${Math.ceil(w / 1000)} segundos.` : 'PIN incorrecto. Inténtalo de nuevo.';
        input.value = '';
        capa.querySelector('.bloqueo-caja').classList.remove('sacudir');
        void capa.offsetWidth;
        capa.querySelector('.bloqueo-caja').classList.add('sacudir');
        input.focus();
      }
    });
  });
  return abierto;
}

async function olvide() {
  const seguir = await confirmar({
    titulo: '¿Olvidaste tu PIN?',
    mensaje: 'Por seguridad, el PIN no se puede recuperar. La única opción es borrar los datos de este dispositivo y empezar de nuevo. Si tienes una copia de seguridad (.json), podrás restaurarla después: las copias no incluyen el PIN.',
    aceptar: 'Borrar datos', peligro: true,
  });
  if (!seguir) return;
  const texto = await pedirTexto({ titulo: 'Confirma el borrado', mensaje: 'Escribe BORRAR para eliminar todos los datos de este dispositivo.', etiqueta: 'Confirmación', aceptar: 'Borrar todo', peligro: true, obligatorio: true });
  if (texto?.trim().toUpperCase() !== 'BORRAR') { if (texto !== null) toast('No se borró nada.', 'info'); return; }
  const { borrarTodo } = await import('../services/backup.js');
  await borrarTodo();
  location.hash = '#/bienvenida';
  location.reload();
}

/** Bloquea tras N minutos sin actividad o al volver después de N minutos en segundo plano. */
export function instalarAutobloqueo() {
  let ultima = Date.now();
  let oculto = 0;
  const actividad = () => { ultima = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, actividad, { passive: true }));
  const limite = () => (config.get().bloqueoMinutos || 0) * 60000;
  setInterval(() => {
    if (seguridad.activo() && limite() && !abierto && Date.now() - ultima > limite()) bloquear();
  }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { oculto = Date.now(); return; }
    if (seguridad.activo() && limite() && oculto && Date.now() - oculto > limite()) bloquear();
    actividad();
  });
}
