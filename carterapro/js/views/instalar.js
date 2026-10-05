import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import * as instalacion from '../services/instalacion.js';
import { on } from '../core/events.js';
import { recargar } from '../core/router.js';

const paso = (n, texto) => html`<li><span class="paso-num">${n}</span><span>${texto}</span></li>`;

export function render(el) {
  const estado = instalacion.estado();
  montar(el, html`
    ${encabezado('Instalar la app', { atras: '#/mas', subtitulo: 'Úsala como una app normal, incluso sin internet' })}
    <div class="formulario">
      ${estado === 'instalada' ? html`<p class="aviso aviso-azul">${icono('check')} CarteraPro ya está instalada y abierta como app en este dispositivo.</p>` : ''}
      ${estado === 'disponible' ? html`<section class="tarjeta instalar-tarjeta">
        <img src="icons/icon-192.png" alt="" class="instalar-icono" width="72" height="72">
        <div><strong>CarteraPro</strong><p>Se agrega a tu pantalla de inicio, abre a pantalla completa y funciona sin conexión.</p></div>
        <button type="button" class="btn btn-pri btn-lg btn-bloque" data-accion="instalar">${icono('copia')}<span>Instalar ahora</span></button>
      </section>` : ''}

      <section class="tarjeta">
        <h2 class="subtitulo">${icono('telefono')} Android (Chrome)</h2>
        <ol class="pasos">${paso(1, 'Abre CarteraPro en Chrome.')}${paso(2, 'Toca el menú ⋮ arriba a la derecha.')}${paso(3, 'Elige "Instalar app" o "Agregar a pantalla principal".')}</ol>
      </section>
      <section class="tarjeta">
        <h2 class="subtitulo">${icono('telefono')} iPhone y iPad (Safari)</h2>
        <ol class="pasos">${paso(1, 'Abre CarteraPro en Safari.')}${paso(2, 'Toca el botón Compartir (el cuadrado con la flecha hacia arriba).')}${paso(3, 'Elige "Agregar a inicio" y luego "Agregar".')}</ol>
        <p class="nota-legal">En iPhone, Apple puede borrar los datos de apps web que no se abren por varias semanas. Abre la app con frecuencia y haz copias de seguridad.</p>
      </section>
      <section class="tarjeta">
        <h2 class="subtitulo">${icono('inicio')} Computador (Chrome o Edge)</h2>
        <ol class="pasos">${paso(1, 'Busca el ícono de instalar a la derecha de la barra de direcciones.')}${paso(2, 'Haz clic en "Instalar".')}</ol>
      </section>
      <p class="nota-legal">Tus datos se guardan en el navegador donde instales la app. Si la usas en otro teléfono, pásale una copia de seguridad.</p>
    </div>`);

  const quitar = on('instalacion:disponible', () => recargar());
  const quitar2 = acciones(el, {
    async instalar() {
      if (await instalacion.instalar()) toast('¡Listo! CarteraPro quedó instalada.');
      recargar();
    },
  });
  return () => { quitar(); quitar2(); };
}
