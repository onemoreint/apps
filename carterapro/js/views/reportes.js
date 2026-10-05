import { html, montar, acciones, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, seccion, progreso } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as config from '../services/config.js';
import { formatoNumero } from '../services/creditos.js';
import { aCsv, numeroCsv, descargar } from '../services/exportar.js';
import { PERIODOS, rangoPeriodo, reportePeriodo, serieAgrupada } from '../domain/reportes.js';
import { formatear as dinero, porcentaje, getMoneda } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';
import { ir } from '../core/router.js';

export async function render(el, _p, query) {
  const { datos, analisis, hoy } = await obtener();
  const periodo = PERIODOS[query.periodo] ? query.periodo : 'MES';
  const rango = rangoPeriodo(periodo, hoy, { desde: query.desde, hasta: query.hasta });
  const rep = reportePeriodo({ datos, analisis }, rango);
  const k = rep.kpis;
  const cliente = id => analisis.creditos.get(id);
  const cfg = config.get();

  montar(el, html`
    <div class="no-imprimir">${encabezado('Reportes', { subtitulo: 'Cobros, cartera y mora' })}</div>
    <div class="solo-imprimir reporte-cabeza-impresion"><strong>${cfg.nombreNegocio}</strong> · Reporte del ${fecha(rango.desde)} al ${fecha(rango.hasta)} · generado el ${fecha(hoy)}</div>

    <div class="no-imprimir">
      <nav class="chips" aria-label="Periodo">
        ${Object.entries(PERIODOS).map(([key, t]) => html`<a class="chip" href="#/reportes?periodo=${key}${key === 'PERSONALIZADO' ? `&desde=${rango.desde}&hasta=${rango.hasta}` : ''}" ${key === periodo ? html`aria-current="page"` : ''}>${t}</a>`)}
      </nav>
      ${periodo === 'PERSONALIZADO' ? html`<form class="tarjeta rango-form" id="rango">
        <label class="campo"><span class="campo-etiqueta">Desde</span><input class="input" type="date" name="desde" id="r-desde" value="${rango.desde}" required></label>
        <label class="campo"><span class="campo-etiqueta">Hasta</span><input class="input" type="date" name="hasta" id="r-hasta" value="${rango.hasta}" required></label>
        <button class="btn btn-pri" type="submit">Aplicar</button>
      </form>` : ''}
      <p class="rango-texto">${icono('calendario')} Del <strong>${fecha(rango.desde)}</strong> al <strong>${fecha(rango.hasta)}</strong></p>
    </div>

    ${seccion('Cobrado en el periodo', html`
      <div class="kpis">
        <div class="kpi"><span class="kpi-etiqueta">Total cobrado</span><strong class="kpi-valor dinero">${dinero(rep.cobro.total)}</strong><span class="kpi-nota">${rep.cobro.n} ${rep.cobro.n === 1 ? 'pago' : 'pagos'}</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Capital recuperado</span><strong class="kpi-valor dinero">${dinero(rep.cobro.capital)}</strong></div>
        <div class="kpi"><span class="kpi-etiqueta">Intereses cobrados</span><strong class="kpi-valor dinero verde">${dinero(rep.cobro.interes)}</strong></div>
        <div class="kpi"><span class="kpi-etiqueta">Cumplimiento</span><strong class="kpi-valor">${rep.cumplimiento == null ? '—' : porcentaje(rep.cumplimiento)}</strong>
          <span class="kpi-nota">${rep.cuotasPagadas} de ${rep.cuotasPeriodo} cuotas del periodo pagadas</span></div>
      </div>
      ${rep.esperado ? html`<div class="tarjeta cumplimiento">
        <div class="rend-fila"><span>Cobrado de lo que vencía en el periodo</span><strong class="dinero">${dinero(rep.cobradoDeEsperado)} / ${dinero(rep.esperado)}</strong></div>
        ${progreso(rep.cumplimiento, 'verde')}
      </div>` : ''}`)}

    <div class="columnas">
      ${(() => { const serie = serieAgrupada(rep.cobro.porDia, rango); return seccion({ dia: 'Pagos por día', semana: 'Pagos por semana', mes: 'Pagos por mes' }[serie.agrupacion], grafica(serie)); })()}
      ${seccion('Por método de pago', metodos(rep.cobro.porMetodo, rep.cobro.total))}
    </div>

    ${seccion('Cartera hoy', html`<div class="kpis kpis-cifras">
      <div class="cifra"><small>Cartera total</small><strong class="dinero">${dinero(k.porCobrar)}</strong></div>
      <div class="cifra"><small>Cartera vencida</small><strong class="dinero rojo">${dinero(k.carteraVencida)}</strong></div>
      <div class="cifra"><small>Morosidad</small><strong>${porcentaje(k.tasaMorosidad)}</strong></div>
      <div class="cifra"><small>Créditos activos</small><strong>${k.creditosActivos}</strong></div>
      <div class="cifra"><small>Créditos pagados</small><strong>${k.creditosFinalizados}</strong></div>
      <div class="cifra"><small>Clientes</small><strong>${k.totalClientes}</strong></div>
    </div>
    <p class="rango-texto">En el periodo: ${rep.nuevos.length} ${rep.nuevos.length === 1 ? 'crédito nuevo' : 'créditos nuevos'} por ${dinero(rep.prestadoNuevo)} · ${rep.pagados.length} ${rep.pagados.length === 1 ? 'crédito terminado' : 'créditos terminados'}.</p>`)}

    ${seccion('Mora por cliente', rep.mora.length ? html`<div class="tabla-caja"><table class="tabla">
      <thead><tr><th scope="col">Cliente</th><th scope="col" class="num">Cuotas vencidas</th><th scope="col" class="num">Mayor atraso</th><th scope="col" class="num">Vencido</th><th scope="col" class="num">Saldo total</th></tr></thead>
      <tbody>${rep.mora.map(m => html`<tr>
        <td><a href="#/clientes/${m.cliente.id}">${m.cliente.nombreCompleto}</a></td>
        <td class="num">${m.cuotas}</td><td class="num">${m.maxAtraso} ${m.maxAtraso === 1 ? 'día' : 'días'}</td>
        <td class="num dinero rojo">${dinero(m.vencido)}</td><td class="num dinero">${dinero(m.saldo)}</td></tr>`)}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${rep.mora.reduce((s, m) => s + m.cuotas, 0)}</td><td></td>
        <td class="num dinero">${dinero(rep.mora.reduce((s, m) => s + m.vencido, 0))}</td><td class="num dinero">${dinero(rep.mora.reduce((s, m) => s + m.saldo, 0))}</td></tr></tfoot>
    </table></div>` : html`<p class="vacio-mini">${icono('check')} No hay clientes con cuotas vencidas.</p>`, { contador: rep.mora.length })}

    ${seccion('Pagos del periodo', rep.pagos.length ? html`<div class="tabla-caja"><table class="tabla">
      <thead><tr><th scope="col">Fecha</th><th scope="col">Recibo</th><th scope="col">Cliente</th><th scope="col">Crédito</th><th scope="col">Método</th><th scope="col" class="num">Capital</th><th scope="col" class="num">Interés</th><th scope="col" class="num">Total</th></tr></thead>
      <tbody>${rep.pagos.map(p => {
        const i = cliente(p.creditoId);
        const cap = p.aplicaciones.reduce((s, a) => s + a.capital, 0);
        return html`<tr><td>${fecha(p.fecha)}</td><td><a href="#/recibos/${p.id}">${p.numeroRecibo}</a></td><td>${i?.cliente?.nombreCompleto}</td>
          <td>${formatoNumero(i?.credito.numero || 0)}</td><td>${p.metodoPago}</td>
          <td class="num dinero">${dinero(cap)}</td><td class="num dinero">${dinero(p.monto - cap)}</td><td class="num dinero"><strong>${dinero(p.monto)}</strong></td></tr>`;
      })}</tbody>
      <tfoot><tr><td colspan="5">Total</td><td class="num dinero">${dinero(rep.cobro.capital)}</td><td class="num dinero">${dinero(rep.cobro.interes)}</td><td class="num dinero">${dinero(rep.cobro.total)}</td></tr></tfoot>
    </table></div>` : html`<p class="vacio-mini">No hay pagos en este periodo.</p>`, { contador: rep.pagos.length })}

    <div class="barra-acciones no-imprimir reporte-acciones">
      <button type="button" class="btn btn-sec" data-accion="csvPagos" ${rep.pagos.length ? '' : 'disabled'}>${icono('copia')}<span>Pagos en CSV</span></button>
      <button type="button" class="btn btn-sec" data-accion="csvMora" ${rep.mora.length ? '' : 'disabled'}>${icono('copia')}<span>Mora en CSV</span></button>
      <button type="button" class="btn btn-pri" data-accion="imprimir">${icono('recibo')}<span>Imprimir o guardar PDF</span></button>
    </div>`);

  $('#rango', el)?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    ir(`/reportes?periodo=PERSONALIZADO&desde=${f.get('desde')}&hasta=${f.get('hasta')}`);
  });

  const dec = getMoneda().decimales;
  const sufijo = `${rango.desde}_a_${rango.hasta}`;
  return acciones(el, {
    imprimir: () => window.print(),
    csvPagos() {
      descargar(`pagos_${sufijo}.csv`, aCsv([
        { titulo: 'Fecha', valor: p => p.fecha },
        { titulo: 'Recibo', valor: p => p.numeroRecibo },
        { titulo: 'Cliente', valor: p => cliente(p.creditoId)?.cliente?.nombreCompleto },
        { titulo: 'Documento', valor: p => cliente(p.creditoId)?.cliente?.documento },
        { titulo: 'Crédito', valor: p => formatoNumero(cliente(p.creditoId)?.credito.numero || 0) },
        { titulo: 'Cuotas', valor: p => p.aplicaciones.map(a => a.numeroCuota).join(' ') },
        { titulo: 'Método', valor: p => p.metodoPago },
        { titulo: 'Capital', valor: p => numeroCsv(p.aplicaciones.reduce((s, a) => s + a.capital, 0), dec) },
        { titulo: 'Interés', valor: p => numeroCsv(p.aplicaciones.reduce((s, a) => s + a.interes, 0), dec) },
        { titulo: 'Total', valor: p => numeroCsv(p.monto, dec) },
        { titulo: 'Observación', valor: p => p.observacion },
      ], rep.pagos));
      toast('Archivo de pagos descargado.');
    },
    csvMora() {
      descargar(`mora_${hoy}.csv`, aCsv([
        { titulo: 'Cliente', valor: m => m.cliente.nombreCompleto },
        { titulo: 'Teléfono', valor: m => m.cliente.telefono },
        { titulo: 'Cuotas vencidas', valor: m => m.cuotas },
        { titulo: 'Mayor atraso (días)', valor: m => m.maxAtraso },
        { titulo: 'Vencido', valor: m => numeroCsv(m.vencido, dec) },
        { titulo: 'Saldo total', valor: m => numeroCsv(m.saldo, dec) },
      ], rep.mora));
      toast('Archivo de mora descargado.');
    },
  });
}

/** Barras verticales SVG con escala única; etiquetas de eje solo en valores reales. */
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function etiqueta(p, agrupacion) {
  const [, m, d] = p.clave.split('-').map(Number);
  return agrupacion === 'mes' ? MESES_CORTOS[m - 1] : agrupacion === 'semana' ? `${d}/${m}` : String(d);
}

function grafica({ agrupacion, puntos: serie }) {
  const max = Math.max(...serie.map(s => s.valor));
  if (!max) return html`<p class="vacio-mini">Sin pagos en el periodo.</p>`;
  const W = 640, H = 220, izq = 8, abajo = 26, arriba = 22;
  const ancho = (W - izq * 2) / serie.length;
  const alto = v => (v / max) * (H - abajo - arriba);
  const cadaN = Math.ceil(serie.length / 8);
  const pico = serie.reduce((a, b) => (b.valor > a.valor ? b : a));
  return html`<figure class="tarjeta grafica">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pagos recibidos; el mayor cobro fue ${etiquetaLarga(pico, agrupacion)}">
      <line x1="${izq}" x2="${W - izq}" y1="${H - abajo}" y2="${H - abajo}" class="g-eje"></line>
      <line x1="${izq}" x2="${W - izq}" y1="${arriba}" y2="${arriba}" class="g-guia"></line>
      <text x="${W - izq}" y="${arriba - 6}" text-anchor="end" class="g-texto">${dinero(max, { compacto: true })}</text>
      ${serie.map((s, i) => {
        const h = alto(s.valor);
        const x = izq + i * ancho + ancho * 0.18;
        return html`<g>
          ${s.valor ? html`<rect x="${x.toFixed(1)}" y="${(H - abajo - h).toFixed(1)}" width="${(ancho * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="g-barra ${s === pico ? 'pico' : ''}"><title>${etiquetaLarga(s, agrupacion)}: ${dinero(s.valor, { ocultable: false })}</title></rect>` : ''}
          ${i % cadaN === 0 ? html`<text x="${(izq + i * ancho + ancho / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="g-texto">${etiqueta(s, agrupacion)}</text>` : ''}
        </g>`;
      })}
    </svg>
    <figcaption>Mayor cobro: ${etiquetaLarga(pico, agrupacion)} · <span class="dinero">${dinero(pico.valor)}</span></figcaption>
  </figure>`;
}

function etiquetaLarga(p, agrupacion) {
  if (agrupacion === 'mes') return `${MESES_CORTOS[Number(p.clave.slice(5, 7)) - 1]} ${p.clave.slice(0, 4)}`;
  if (agrupacion === 'semana') return `semana del ${fecha(p.desde)}`;
  return fecha(p.clave);
}

function metodos(porMetodo, total) {
  const filas = Object.entries(porMetodo).sort((a, b) => b[1] - a[1]);
  if (!filas.length) return html`<p class="vacio-mini">Sin pagos en el periodo.</p>`;
  return html`<div class="tarjeta metodos">${filas.map(([m, v]) => html`<div class="metodo">
    <div class="rend-fila"><span>${m}</span><strong class="dinero">${dinero(v)} <small>${porcentaje(v / total, 0)}</small></strong></div>
    ${progreso(v / total)}</div>`)}</div>`;
}
