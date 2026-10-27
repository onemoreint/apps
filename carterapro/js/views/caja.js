import { html, montar, acciones, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, seccion, avatar, campo } from '../ui/componentes.js';
import { formularioDialogo, pedirTexto, toast } from '../ui/dialogos.js';
import { nuevoGasto, nuevoMovimiento } from '../ui/formularios.js';
import { obtener } from '../services/datos.js';
import * as cobradores from '../services/cobradores.js';
import * as cajaSrv from '../services/caja.js';
import { formatoNumero } from '../services/creditos.js';
import { resumenCaja, efectivoDisponible, totalPago, TIPOS_MOVIMIENTO, SIN_COBRADOR } from '../domain/caja.js';
import { formatear as dinero, aMinimo, aTextoInput, getMoneda } from '../core/money.js';
import { esValida, larga, inicioMes, finMes, diferenciaDias } from '../core/dates.js';
import { ir, recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el, _p, query) {
  const { datos, analisis, hoy } = await obtener();
  const fecha = esValida(query.fecha) && diferenciaDias(hoy, query.fecha) <= 0 ? query.fecha : hoy;
  const equipo = cobradores.lista();
  const filtro = query.cobrador || '';
  const r = resumenCaja(datos, { desde: fecha, hasta: fecha, cobradorId: filtro || undefined });
  const disponible = efectivoDisponible(datos, fecha);
  const mes = resumenCaja(datos, { desde: inicioMes(fecha), hasta: fecha < finMes(fecha) ? fecha : finMes(fecha) });
  const cierres = datos.cierres.filter(c => c.fecha === fecha && (c.cobradorId || '') === filtro)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const quien = filtro === SIN_COBRADOR ? 'Oficina / sin cobrador' : filtro ? cobradores.nombre(filtro) : equipo.length ? 'Todo el negocio' : 'Caja del día';
  const info = id => analisis.creditos.get(id);
  const qs = extra => '/caja?' + new URLSearchParams({ ...(fecha !== hoy ? { fecha } : {}), ...(filtro ? { cobrador: filtro } : {}), ...extra });

  const linea = (texto, valor, signo, nota) => html`<div class="liq-fila ${signo < 0 ? 'resta' : ''}">
    <dt>${texto}${nota ? html`<small>${nota}</small>` : ''}</dt>
    <dd class="dinero">${signo < 0 ? '− ' : signo > 0 ? '+ ' : ''}${dinero(valor)}</dd></div>`;

  montar(el, html`
    ${encabezado('Caja', { subtitulo: 'Liquidación diaria, base y gastos' })}
    <div class="caja-filtros">
      <label class="campo campo-compacto"><span class="campo-etiqueta">Día</span>
        <input type="date" class="input" id="fecha" value="${fecha}" max="${hoy}"></label>
      ${equipo.length ? html`<label class="campo campo-compacto"><span class="campo-etiqueta">Cobrador</span>
        <select class="input" id="cobrador">
          <option value="" ${!filtro ? 'selected' : ''}>Todo el negocio</option>
          ${equipo.map(c => html`<option value="${c.id}" ${filtro === c.id ? 'selected' : ''}>${c.nombre}</option>`)}
          <option value="${SIN_COBRADOR}" ${filtro === SIN_COBRADOR ? 'selected' : ''}>Oficina / sin cobrador</option>
        </select></label>` : ''}
    </div>

    <div class="columnas">
      <div>
        <section class="tarjeta liquidacion" aria-label="Liquidación">
          <h2 class="tarjeta-titulo">${icono('caja')} ${quien}<small>${larga(fecha)}</small></h2>
          <dl class="liq">
            ${filtro || r.base ? linea('Base entregada', r.base, 1, 'Efectivo con el que salió') : ''}
            ${linea('Cobrado en cuotas', r.cobradoCuotas, 1, `${r.pagos.length} ${r.pagos.length === 1 ? 'pago' : 'pagos'}`)}
            ${r.cobradoMultas ? linea('Multas cobradas', r.cobradoMultas, 1) : ''}
            ${linea('Préstamos entregados', r.prestado, -1, `${r.numeroPrestamos} ${r.numeroPrestamos === 1 ? 'crédito' : 'créditos'}`)}
            ${linea('Gastos', r.totalGastos, -1, `${r.gastos.length} ${r.gastos.length === 1 ? 'gasto' : 'gastos'}`)}
            <div class="liq-total"><dt>${filtro ? 'Debe entregar' : 'Efectivo del día'}</dt>
              <dd class="dinero ${r.esperado < 0 ? 'rojo' : ''}">${dinero(r.esperado)}</dd></div>
          </dl>
          ${r.esperado < 0 ? html`<p class="aviso aviso-amarillo">${icono('info')} Salió más dinero del que entró: se prestó o se gastó más de lo cobrado${filtro ? ' más la base' : ''}.</p>` : ''}
          ${cierres.map(c => html`<p class="aviso ${c.diferencia === 0 ? 'aviso-verde' : c.diferencia > 0 ? 'aviso-azul' : 'aviso-rojo'}">
            ${icono(c.diferencia === 0 ? 'check' : 'alerta')}
            <span>Caja cerrada: entregó <strong class="dinero">${dinero(c.entregado)}</strong> de ${dinero(c.esperado)} ·
              ${c.diferencia === 0 ? 'cuadró exacto' : c.diferencia > 0 ? html`sobrante <strong class="dinero">${dinero(c.diferencia)}</strong>` : html`faltante <strong class="dinero">${dinero(-c.diferencia)}</strong>`}
              ${c.nota ? html`<br><small>${c.nota}</small>` : ''}</span></p>`)}
          <div class="liq-botones">
            <button type="button" class="btn btn-pri" data-accion="cerrar">${icono('candado')}<span>${cierres.length ? 'Cerrar de nuevo' : 'Cerrar caja'}</span></button>
            <button type="button" class="btn btn-sec" data-accion="gasto">${icono('gasto')}<span>Gasto</span></button>
            ${equipo.length ? html`<button type="button" class="btn btn-sec" data-accion="base">${icono('dinero')}<span>Entregar base</span></button>` : ''}
          </div>
        </section>

        <section class="tarjeta caja-general">
          <h2 class="tarjeta-titulo">Caja general del negocio</h2>
          <div class="caja-general-cifras">
            <span><small>Efectivo disponible</small><strong class="dinero ${disponible < 0 ? 'rojo' : ''}">${dinero(disponible)}</strong></span>
            <span><small>Utilidad del mes</small><strong class="dinero ${mes.utilidad < 0 ? 'rojo' : 'verde'}">${dinero(mes.utilidad)}</strong></span>
          </div>
          <p class="campo-ayuda">Utilidad = intereses cobrados (${dinero(mes.intereses)}) + multas (${dinero(mes.cobradoMultas)}) − gastos (${dinero(mes.totalGastos)}) del mes.
            ${disponible < 0 ? 'El disponible es negativo porque no has registrado tu capital inicial: agrégalo como aporte.' : ''}</p>
          <div class="liq-botones">
            <button type="button" class="btn btn-sec btn-sm" data-accion="aporte">${icono('mas_circulo')}<span>Aporte de capital</span></button>
            <button type="button" class="btn btn-sec btn-sm" data-accion="retiro">${icono('tendencia')}<span>Retiro del dueño</span></button>
          </div>
        </section>
      </div>

      <div>
        ${seccion('Pagos recibidos', r.pagos.length ? html`<ul class="pagos-lista tarjeta">${r.pagos.map(p => {
          const i = info(p.creditoId);
          return html`<li class="pago"><a href="#/recibos/${p.id}">${avatar(i?.cliente)}
            <span class="pago-texto"><strong>${i?.cliente?.nombreCompleto || 'Cliente'}</strong>
              <small>${p.numeroRecibo} · ${p.metodoPago}${equipo.length ? ` · ${cobradores.nombre(p.cobradorId)}` : ''}${p.multa ? ` · multa ${dinero(p.multa)}` : ''}</small></span>
            <span class="pago-fin"><strong class="dinero">${dinero(totalPago(p))}</strong></span></a></li>`;
        })}</ul>` : html`<p class="vacio-mini">Sin pagos este día.</p>`, { contador: r.pagos.length })}

        ${r.desembolsos.length ? seccion('Préstamos entregados', html`<ul class="pagos-lista tarjeta">${r.desembolsos.map(k => {
          const i = info(k.id);
          return html`<li class="pago"><a href="#/creditos/${k.id}">${avatar(i?.cliente)}
            <span class="pago-texto"><strong>${i?.cliente?.nombreCompleto}</strong><small>${formatoNumero(k.numero)}${k.renovadoDe ? ' · renovación' : ''}</small></span>
            <span class="pago-fin"><strong class="dinero rojo">− ${dinero(k.desembolso ?? k.montoPrestado)}</strong></span></a></li>`;
        })}</ul>`, { contador: r.desembolsos.length }) : ''}

        ${seccion('Gastos', r.gastos.length ? html`<ul class="pagos-lista tarjeta">${r.gastos.map(g => html`<li class="pago">
            <span class="pago-ico">${icono('gasto')}</span>
            <span class="pago-texto"><strong>${g.categoria}</strong><small>${[g.descripcion, equipo.length ? cobradores.nombre(g.cobradorId) : ''].filter(Boolean).join(' · ')}</small></span>
            <span class="pago-fin"><strong class="dinero">− ${dinero(g.monto)}</strong></span></li>`)}</ul>`
          : html`<p class="vacio-mini">Sin gastos este día.</p>`, { contador: r.gastos.length, enlace: { href: '#/gastos', texto: 'Todos los gastos' } })}

        ${r.movimientos.length ? seccion('Movimientos de caja', html`<ul class="pagos-lista tarjeta">${r.movimientos.map(m => html`<li class="pago">
            <span class="pago-ico">${icono(m.tipo === 'RETIRO' ? 'tendencia' : 'dinero')}</span>
            <span class="pago-texto"><strong>${TIPOS_MOVIMIENTO[m.tipo].nombre}${m.tipo === 'BASE' ? ` · ${cobradores.nombre(m.cobradorId)}` : ''}</strong>${m.nota ? html`<small>${m.nota}</small>` : ''}</span>
            <span class="pago-fin"><strong class="dinero">${m.tipo === 'RETIRO' ? '− ' : ''}${dinero(m.monto)}</strong>
              <button type="button" class="btn-link" data-accion="anularMov" data-id="${m.id}">Anular</button></span></li>`)}</ul>`) : ''}
      </div>
    </div>`);

  $('#fecha', el).addEventListener('change', e => { if (esValida(e.target.value)) ir(qs({ fecha: e.target.value })); });
  $('#cobrador', el)?.addEventListener('change', e => {
    const p = new URLSearchParams({ ...(fecha !== hoy ? { fecha } : {}), ...(e.target.value ? { cobrador: e.target.value } : {}) });
    ir('/caja?' + p);
  });

  const cobradorReal = filtro && filtro !== SIN_COBRADOR ? filtro : '';
  return acciones(el, {
    async gasto() { if (await nuevoGasto({ fecha, cobradorId: cobradorReal })) recargar(); },
    async base() { if (await nuevoMovimiento('BASE', { fecha, cobradorId: cobradorReal })) recargar(); },
    async aporte() { if (await nuevoMovimiento('APORTE', { fecha })) recargar(); },
    async retiro() { if (await nuevoMovimiento('RETIRO', { fecha })) recargar(); },
    async anularMov(btn) {
      const motivo = await pedirTexto({ titulo: '¿Anular este movimiento?', etiqueta: 'Motivo', aceptar: 'Anular', peligro: true, obligatorio: true });
      if (motivo === null) return;
      await intentar(() => cajaSrv.anularMovimiento(btn.dataset.id, motivo), 'anular el movimiento');
      toast('Movimiento anulado.');
      recargar();
    },
    async cerrar() {
      const res = await formularioDialogo({
        titulo: `Cerrar caja · ${quien}`,
        mensaje: `El sistema espera ${dinero(r.esperado, { ocultable: false })}. Cuenta el efectivo y escribe lo que se entregó.`,
        aceptar: 'Guardar cierre',
        cuerpo: html`${campo({ etiqueta: `Efectivo entregado (${getMoneda().simbolo})`, nombre: 'entregado', valor: aTextoInput(Math.max(0, r.esperado)), requerido: true, attrs: 'inputmode="decimal" autocomplete="off"' })}
          ${campo({ etiqueta: 'Nota', nombre: 'nota', attrs: 'maxlength="160" placeholder="Ej: faltó el pago de Carlos, lo trae mañana"' })}`,
        validar: d => { const v = aMinimo(d.entregado); return Number.isInteger(v) && v >= 0 ? {} : { entregado: 'Escribe el efectivo entregado.' }; },
      });
      if (!res) return;
      const cierre = await intentar(() => cajaSrv.cerrar({ fecha, cobradorId: filtro, resumen: r, entregado: aMinimo(res.entregado), nota: res.nota }), 'cerrar la caja');
      toast(cierre.diferencia === 0 ? 'Caja cerrada: cuadró exacto.' : cierre.diferencia > 0 ? `Caja cerrada con sobrante de ${dinero(cierre.diferencia, { ocultable: false })}.` : `Caja cerrada con faltante de ${dinero(-cierre.diferencia, { ocultable: false })}.`, cierre.diferencia < 0 ? 'error' : 'exito');
      recargar();
    },
  });
}
