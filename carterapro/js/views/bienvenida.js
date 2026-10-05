import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { toast } from '../ui/dialogos.js';
import * as config from '../services/config.js';
import * as demo from '../services/demo.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';
import { t } from '../core/i18n.js';

export function render(el) {
  montar(el, html`<section class="bienvenida">
    <div class="bienvenida-marca"><span class="marca-logo marca-logo-xl" aria-hidden="true">C</span></div>
    <h1>${t('bienvenida.titulo')}</h1>
    <p class="bienvenida-lema">${t('bienvenida.lema')}</p>
    <ul class="bienvenida-lista">
      <li>${icono('check')}<span>Cuotas y saldos calculados automáticamente</span></li>
      <li>${icono('check')}<span>Sabe a quién cobrar hoy y quién está atrasado</span></li>
      <li>${icono('check')}<span>Funciona sin internet; tus datos se quedan en tu dispositivo</span></li>
    </ul>
    <div class="bienvenida-botones">
      <a class="btn btn-pri btn-lg" href="#/configuracion?inicio=1">${t('bienvenida.comenzar')}</a>
      <button type="button" class="btn btn-sec btn-lg" data-accion="demo">${t('bienvenida.demo')}</button>
    </div>
    <p class="nota-legal">CarteraPro es una herramienta administrativa. Eres responsable de cumplir las leyes de crédito, tributarias y de protección de datos de tu país.</p>
  </section>`);

  return acciones(el, {
    async demo(btn) {
      btn.disabled = true;
      btn.textContent = 'Preparando demo…';
      try {
        await intentar(async () => {
          if (!config.get().configurado) {
            await config.guardar({ configurado: true, nombreNegocio: 'Mi Negocio (demo)' });
          }
          if (!(await demo.hayDemo())) await demo.cargar();
        }, 'cargar los datos de demostración');
        toast('Datos de demostración cargados.');
        ir('/');
      } catch {
        btn.disabled = false;
        btn.textContent = 'Ver demo';
      }
    },
  });
}
