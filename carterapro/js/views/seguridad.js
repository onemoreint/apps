import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, campo } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { bloquear } from '../ui/bloqueo.js';
import * as seguridad from '../services/seguridad.js';
import * as config from '../services/config.js';
import { recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

/** Diálogo para escribir y confirmar un PIN nuevo. @returns {Promise<string|null>} */
function pedirPinNuevo(titulo) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'dialogo';
    montar(d, html`<form method="dialog" class="dialogo-cuerpo" novalidate>
      <h2 class="dialogo-titulo">${titulo}</h2>
      <p class="dialogo-texto">Usa entre 4 y 8 números que no sean fáciles de adivinar (evita 1234 o tu año de nacimiento).</p>
      <label class="campo"><span class="campo-etiqueta">PIN nuevo</span><input id="pin1" class="input pin-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8"></label>
      <label class="campo"><span class="campo-etiqueta">Repite el PIN</span><input id="pin2" class="input pin-input" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8"></label>
      <p class="campo-error" role="alert"></p>
      <div class="dialogo-botones"><button value="cancelar" formnovalidate class="btn btn-sec">Cancelar</button><button value="ok" class="btn btn-pri" id="pin-ok">Guardar PIN</button></div>
    </form>`);
    document.body.append(d);
    const [p1, p2, err] = [d.querySelector('#pin1'), d.querySelector('#pin2'), d.querySelector('.campo-error')];
    d.querySelector('#pin-ok').addEventListener('click', e => {
      if (!seguridad.pinValido(p1.value)) { e.preventDefault(); err.textContent = 'El PIN debe tener entre 4 y 8 números.'; return; }
      if (p1.value !== p2.value) { e.preventDefault(); err.textContent = 'Los dos PIN no coinciden.'; }
    });
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok' ? p1.value : null); d.remove(); });
    d.showModal();
    p1.focus();
  });
}

export function render(el) {
  const cfg = config.get();
  const activo = seguridad.activo();
  const seguro = !!globalThis.crypto?.subtle;

  montar(el, html`
    ${encabezado('Seguridad', { atras: '#/mas', subtitulo: 'PIN de acceso y privacidad' })}
    <div class="formulario">
      <section class="tarjeta ajuste">
        <span class="ajuste-ico ${activo ? 'verde' : ''}">${icono('escudo')}</span>
        <div class="ajuste-texto"><strong>PIN de acceso</strong><small>${activo ? 'Activado. Se pide al abrir la app.' : 'Desactivado. Cualquiera con tu teléfono puede ver tu cartera.'}</small></div>
        ${activo
          ? html`<div class="ajuste-botones"><button type="button" class="btn btn-sec btn-sm" data-accion="cambiar">Cambiar PIN</button><button type="button" class="btn btn-texto btn-sm" data-accion="quitar">Desactivar</button></div>`
          : html`<button type="button" class="btn btn-pri btn-sm" data-accion="activar" ${seguro ? '' : 'disabled'}>Activar PIN</button>`}
      </section>
      ${!seguro ? html`<p class="aviso aviso-amarillo">${icono('alerta')} El PIN necesita que la app se abra desde una dirección segura (https) o instalada.</p>` : ''}

      ${activo ? html`<section class="tarjeta">
        ${campo({ etiqueta: 'Bloqueo automático', nombre: 'bloqueoMinutos', valor: cfg.bloqueoMinutos, opciones: [
          { valor: 0, texto: 'Solo al abrir la app' }, { valor: 1, texto: 'Tras 1 minuto sin uso' },
          { valor: 5, texto: 'Tras 5 minutos sin uso' }, { valor: 15, texto: 'Tras 15 minutos sin uso' }, { valor: 30, texto: 'Tras 30 minutos sin uso' }] })}
        <button type="button" class="btn btn-sec" data-accion="bloquearYa">${icono('escudo')}<span>Bloquear ahora</span></button>
      </section>` : ''}

      <section class="tarjeta ajuste">
        <span class="ajuste-ico">${icono(cfg.ocultarValores ? 'ojo_no' : 'ojo')}</span>
        <div class="ajuste-texto"><strong>Ocultar valores</strong><small>Muestra •••••• en lugar de montos. Útil en lugares públicos. También con el ojo de arriba.</small></div>
        <label class="interruptor"><input type="checkbox" id="ocultar" ${cfg.ocultarValores ? 'checked' : ''}><span aria-hidden="true"></span><span class="oculto-visual">Ocultar valores</span></label>
      </section>

      <p class="nota-legal">El PIN se guarda cifrado con una función de derivación (PBKDF2) y nunca en texto. Protege el acceso a la pantalla, pero no reemplaza el bloqueo de tu teléfono: mantén también activo el bloqueo del dispositivo. Si olvidas el PIN no se puede recuperar; tendrás que borrar los datos y restaurar una copia de seguridad.</p>
    </div>`);

  el.querySelector('#f-bloqueoMinutos')?.addEventListener('change', async e => {
    await intentar(() => config.guardar({ bloqueoMinutos: Number(e.target.value) }), 'guardar el ajuste');
    toast('Bloqueo automático actualizado.');
  });
  el.querySelector('#ocultar').addEventListener('change', async e => {
    await config.guardar({ ocultarValores: e.target.checked });
    recargar();
  });

  return acciones(el, {
    async activar() {
      const pin = await pedirPinNuevo('Crear PIN');
      if (!pin) return;
      await intentar(() => seguridad.activar(pin), 'activar el PIN');
      toast('PIN activado. Se pedirá al abrir la app.');
      recargar();
    },
    async cambiar() {
      const pin = await pedirPinNuevo('Cambiar PIN');
      if (!pin) return;
      await intentar(() => seguridad.activar(pin), 'cambiar el PIN');
      toast('PIN cambiado.');
    },
    async quitar() {
      await bloquearParaConfirmar();
      await intentar(() => seguridad.desactivar(), 'desactivar el PIN');
      toast('PIN desactivado.');
      recargar();
    },
    bloquearYa: () => bloquear(),
  });
}

/** Para desactivar el PIN se pide el PIN actual. */
function bloquearParaConfirmar() {
  return bloquear();
}
