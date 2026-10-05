import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado } from '../ui/componentes.js';
import { confirmar, toast } from '../ui/dialogos.js';
import * as demo from '../services/demo.js';
import * as config from '../services/config.js';
import { recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el) {
  const hayDemo = await demo.hayDemo();
  const cfg = config.get();
  const item = (href, ico, titulo, sub) => html`<a class="fila" href="${href}"><span class="fila-ico">${icono(ico)}</span>
    <span class="fila-texto"><strong>${titulo}</strong><small>${sub}</small></span>${icono('derecha', 'ico-tenue')}</a>`;

  montar(el, html`
    ${encabezado('Más opciones')}
    <div class="lista">
      ${item('#/analista', 'ia', 'Analista IA', 'Diagnóstico automático de tu cartera')}
      ${item('#/cobranzas', 'cobranza', 'Cobranzas', 'Cobrar hoy, vencidos y próximos')}
      ${item('#/calendario', 'calendario', 'Calendario de cobros', 'Vencimientos día por día')}
      ${item('#/reportes', 'tendencia', 'Reportes', 'Cobros, cartera, mora y exportación CSV')}
      ${item('#/buscar', 'buscar', 'Buscar', 'Clientes, créditos y recibos')}
      ${item('#/copia', 'copia', 'Copia de seguridad', 'Exportar, restaurar, Excel e importar clientes')}
      ${item('#/seguridad', 'escudo', 'Seguridad', 'PIN de acceso, bloqueo automático, ocultar valores')}
      ${item('#/instalar', 'telefono', 'Instalar la app', 'Úsala sin internet desde tu pantalla de inicio')}
      ${item('#/configuracion', 'config', 'Configuración', `${cfg.nombreNegocio || 'Tu negocio'} · ${cfg.moneda?.codigo} · métodos de pago`)}
    </div>

    <section class="seccion">
      <div class="seccion-cabeza"><h2>Datos de demostración</h2></div>
      <div class="tarjeta">
        <p>${hayDemo
          ? 'Tienes datos de demostración cargados. Puedes eliminarlos sin afectar tus datos reales.'
          : 'Carga 10 clientes y 5 créditos de ejemplo (con pagos, atrasos y un crédito pagado) para explorar la app.'}</p>
        <button type="button" class="btn ${hayDemo ? 'btn-peligro' : 'btn-sec'}" data-accion="${hayDemo ? 'quitarDemo' : 'cargarDemo'}">
          ${icono(hayDemo ? 'basura' : 'demo')}<span>${hayDemo ? 'Eliminar datos de demostración' : 'Cargar datos de demostración'}</span></button>
      </div>
    </section>

    <div class="lista lista-sep">${item('#/ayuda', 'ayuda', 'Ayuda y aviso legal', 'Cómo se calculan intereses, pagos y estados')}</div>

    <p class="version">CarteraPro · versión 1.0 (MVP) · Los datos se guardan solo en este dispositivo.</p>`);

  return acciones(el, {
    async cargarDemo(btn) {
      btn.disabled = true;
      try {
        await intentar(() => demo.cargar(), 'cargar los datos de demostración');
      } catch {
        btn.disabled = false;
        return;
      }
      toast('Datos de demostración cargados.');
      recargar();
    },
    async quitarDemo() {
      if (!(await confirmar({ titulo: '¿Eliminar los datos de demostración?', mensaje: 'Se borrarán solo los clientes, créditos y pagos de ejemplo. Tus datos reales no se tocan.', aceptar: 'Eliminar', peligro: true }))) return;
      await intentar(() => demo.eliminar(), 'eliminar los datos de demostración');
      toast('Datos de demostración eliminados.');
      recargar();
    },
  });
}
