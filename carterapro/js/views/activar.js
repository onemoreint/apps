import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, progreso } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as licencia from '../services/licencia.js';
import { LIMITES_PRUEBA, BLOQUEADO_EN_PRUEBA, extraer } from '../domain/licencia.js';
import { formatear as fecha, deDate } from '../core/dates.js';
import { ir, recargar } from '../core/router.js';
import { mensajeAmigable } from '../core/errors.js';
import * as config from '../services/config.js';

export async function render(el, _p, query) {
  // Enlace de activación: #/activar?l=CP1....  → se activa solo al abrirlo.
  if (query.l && extraer(query.l) && !licencia.esCompleta()) {
    try {
      const d = await licencia.activar(query.l);
      toast(`¡Versión completa activada para ${d.n}!`);
    } catch (e) {
      toast(mensajeAmigable(e, 'activar la licencia'), 'error', { duracion: 7000 });
    }
    ir('/activar', { reemplazar: true });
    return;
  }

  const est = licencia.get();
  const { datos } = await obtener();
  const usados = t => datos[t].filter(r => !r.esDemo).length;
  const cfg = config.get();

  if (est.modo === 'COMPLETA') {
    montar(el, html`
      ${encabezado('Licencia', { atras: '#/mas' })}
      <section class="tarjeta licencia-ok">
        <span class="licencia-sello">${icono('check')}</span>
        <h2>Versión completa activa</h2>
        <dl class="datos">
          <div><dt>Licenciada a</dt><dd><strong>${est.datos?.n}</strong></dd></div>
          ${est.datos?.id && est.datos.id !== 'DEV' ? html`<div><dt>Número de licencia</dt><dd>${est.datos.id}</dd></div>` : ''}
          ${est.datos?.e ? html`<div><dt>Emitida</dt><dd>${fecha(est.datos.e)}</dd></div>` : ''}
          ${cfg.licenciaActivadaEn ? html`<div><dt>Activada en este dispositivo</dt><dd>${fecha(deDate(new Date(cfg.licenciaActivadaEn)))}</dd></div>` : ''}
        </dl>
        <p class="campo-ayuda">Sin límites de clientes ni de créditos. Guarda tu enlace de activación: lo necesitas si cambias de teléfono o borras los datos del navegador.</p>
      </section>`);
    return;
  }

  const fila = (t, n) => html`<div class="limite">
    <div class="rend-fila"><span>${n}</span><strong>${usados(t)} de ${LIMITES_PRUEBA[t]}</strong></div>
    ${progreso(usados(t) / LIMITES_PRUEBA[t], usados(t) >= LIMITES_PRUEBA[t] ? 'rojo' : 'verde')}</div>`;

  montar(el, html`
    ${encabezado('Activar licencia', { atras: '#/mas', subtitulo: 'Estás usando la versión de prueba' })}
    <section class="tarjeta">
      <h2 class="tarjeta-titulo">${icono('candado')} Versión de prueba</h2>
      <p>Puedes probar todas las funciones con pocos registros. Los datos de demostración no cuentan.</p>
      ${fila('clientes', 'Clientes')}
      ${fila('creditos', 'Créditos')}
      <p class="campo-ayuda">No incluye: ${Object.values(BLOQUEADO_EN_PRUEBA).map(s => s.toLowerCase()).join(', ')}.</p>
    </section>
    <form class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-titulo">${icono('escudo')} Activar versión completa</h2>
      <p>Abre el enlace de activación que recibiste con tu compra, o pega aquí el código completo.</p>
      <label class="campo" data-campo="codigo"><span class="campo-etiqueta">Código de licencia</span>
        <textarea name="codigo" class="input input-codigo" rows="4" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="CP1.…"></textarea>
        <small class="campo-error" role="alert"></small></label>
      <button class="btn btn-pri btn-lg btn-bloque" type="submit">${icono('check')}<span>Activar</span></button>
    </form>
    <p class="nota-legal">${icono('info')} La licencia queda a nombre del comprador y funciona sin internet una vez activada. Tus datos de la versión de prueba se conservan.</p>`);

  const form = $('form', el);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const campo = form.querySelector('.campo');
    try {
      const d = await licencia.activar(form.codigo.value);
      toast(`¡Versión completa activada para ${d.n}!`);
      recargar();
    } catch (err) {
      campo.classList.add('con-error');
      campo.querySelector('.campo-error').textContent = mensajeAmigable(err, 'activar la licencia');
    }
  });
}
