import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, seccion, vacio, progreso } from '../ui/componentes.js';
import { pedirTexto, toast } from '../ui/dialogos.js';
import { nuevoGasto } from '../ui/formularios.js';
import { obtener } from '../services/datos.js';
import * as gastosSrv from '../services/gastos.js';
import * as cobradores from '../services/cobradores.js';
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha, inicioMes, finMes, sumarMeses } from '../core/dates.js';
import { recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export async function render(el, _p, query) {
  const { datos, hoy } = await obtener();
  const mes = /^\d{4}-\d{2}$/.test(query.mes || '') ? `${query.mes}-01` : inicioMes(hoy);
  const desde = inicioMes(mes), hasta = finMes(mes);
  const lista = datos.gastos.filter(g => g.fecha >= desde && g.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creadoEn || '').localeCompare(a.creadoEn || ''));
  const vigentes = lista.filter(g => !g.anulado);
  const total = vigentes.reduce((s, g) => s + g.monto, 0);
  const porCategoria = [...vigentes.reduce((m, g) => m.set(g.categoria, (m.get(g.categoria) || 0) + g.monto), new Map())]
    .sort((a, b) => b[1] - a[1]);
  const equipo = cobradores.lista();
  const [y, m] = mes.split('-').map(Number);
  const nav = d => sumarMeses(mes, d).slice(0, 7);
  const esActual = inicioMes(hoy) === mes;

  montar(el, html`
    ${encabezado('Gastos', { atras: '#/caja', subtitulo: 'Lo que cuesta operar: transporte, comida, papelería…',
      extra: html`<button type="button" class="btn btn-pri btn-sm" data-accion="nuevo">${icono('mas_circulo')}<span>Gasto</span></button>` })}
    <nav class="mes-nav" aria-label="Cambiar de mes">
      <a class="btn-icono" href="#/gastos?mes=${nav(-1)}" aria-label="Mes anterior">${icono('atras')}</a>
      <strong>${MESES[m - 1]} ${y}</strong>
      ${esActual ? html`<span class="btn-icono" aria-hidden="true"></span>` : html`<a class="btn-icono" href="#/gastos?mes=${nav(1)}" aria-label="Mes siguiente">${icono('derecha')}</a>`}
    </nav>
    <div class="tarjeta total-periodo"><span>${vigentes.length} ${vigentes.length === 1 ? 'gasto' : 'gastos'} en el mes</span><strong class="dinero">${dinero(total)}</strong></div>
    ${porCategoria.length ? seccion('Por categoría', html`<div class="tarjeta categorias">${porCategoria.map(([c, v]) => html`
      <div class="categoria"><div class="rend-fila"><span>${c}</span><strong class="dinero">${dinero(v)}</strong></div>${progreso(total ? v / total : 0)}</div>`)}</div>`) : ''}
    ${lista.length ? seccion('Detalle', html`<ul class="pagos-lista tarjeta">${lista.map(g => html`<li class="pago ${g.anulado ? 'anulado' : ''}">
        <span class="pago-ico">${icono(g.anulado ? 'anular' : 'gasto')}</span>
        <span class="pago-texto"><strong>${g.categoria} · ${fecha(g.fecha)}</strong>
          <small>${[g.descripcion, equipo.length ? cobradores.nombre(g.cobradorId) : '', g.anulado ? `ANULADO${g.motivoAnulacion ? ': ' + g.motivoAnulacion : ''}` : ''].filter(Boolean).join(' · ')}</small></span>
        <span class="pago-fin"><strong class="dinero">${dinero(g.monto)}</strong>
          ${g.anulado ? '' : html`<button type="button" class="btn-link" data-accion="anular" data-id="${g.id}">Anular</button>`}</span></li>`)}</ul>`)
      : vacio({ ico: 'gasto', titulo: 'Sin gastos este mes', texto: 'Registra la gasolina, el almuerzo del cobrador o la papelería para conocer tu ganancia real.' })}`);

  return acciones(el, {
    async nuevo() { if (await nuevoGasto({ fecha: hoy })) recargar(); },
    async anular(btn) {
      const motivo = await pedirTexto({ titulo: '¿Anular este gasto?', mensaje: 'Queda en el historial marcado como anulado y deja de contar en la caja.', etiqueta: 'Motivo', aceptar: 'Anular gasto', peligro: true, obligatorio: true });
      if (motivo === null) return;
      await intentar(() => gastosSrv.anular(btn.dataset.id, motivo), 'anular el gasto');
      toast('Gasto anulado.');
      recargar();
    },
  });
}
