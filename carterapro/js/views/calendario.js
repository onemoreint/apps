import { html, montar } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, tarjetaCobro, seccion, avatar, badge } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { saldoCuota } from '../domain/pagos.js';
import { estadoCuota, estadoVisualCuota, diasAtraso } from '../domain/estados.js';
import { formatear as dinero } from '../core/money.js';
import { sumarMeses, sumarDias, inicioMes, finMes, diaSemana, larga, esValida } from '../core/dates.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function indexar(analisis, datos, hoy) {
  const dias = new Map();
  const dia = f => {
    if (!dias.has(f)) dias.set(f, { cuotas: [], pagos: [], nuevos: [] });
    return dias.get(f);
  };
  for (const { credito, cliente, cuotas } of analisis.creditos.values()) {
    if (credito.cancelado) continue;
    dia(credito.fechaInicio).nuevos.push({ credito, cliente });
    const gracia = credito.diasGracia || 0;
    for (const c of cuotas) {
      dia(c.fechaVencimiento).cuotas.push({
        cuota: c, credito, cliente, saldo: saldoCuota(c),
        estado: estadoCuota(c, hoy, gracia), visual: estadoVisualCuota(c, hoy, gracia), diasAtraso: diasAtraso(c, hoy),
      });
    }
  }
  for (const p of datos.pagos) if (!p.anulado) dia(p.fecha).pagos.push(p);
  return dias;
}

function tonoDia(d) {
  if (!d) return '';
  if (d.cuotas.some(i => i.estado === 'VENCIDA')) return 'rojo';
  if (d.cuotas.some(i => i.saldo > 0)) return 'amarillo';
  if (d.cuotas.length) return 'verde';
  return '';
}

export async function render(el, _p, query) {
  const { analisis, datos, hoy } = await obtener();
  const mes = /^\d{4}-\d{2}$/.test(query.mes || '') ? `${query.mes}-01` : inicioMes(hoy);
  const seleccionado = esValida(query.dia) ? query.dia : (inicioMes(hoy) === mes ? hoy : mes);
  const dias = indexar(analisis, datos, hoy);
  const [y, m] = mes.split('-').map(Number);
  const vacios = (diaSemana(mes) + 6) % 7;
  const ultimo = Number(finMes(mes).slice(8));
  const ym = f => f.slice(0, 7);

  const celdas = [];
  for (let i = 0; i < vacios; i++) celdas.push(html`<span class="cal-celda vacia" aria-hidden="true"></span>`);
  for (let n = 1; n <= ultimo; n++) {
    const f = sumarDias(mes, n - 1);
    const d = dias.get(f);
    const tono = tonoDia(d);
    const esperado = d ? d.cuotas.reduce((s, i) => s + i.cuota.valorProgramado, 0) : 0;
    const etiqueta = [`${n} de ${MESES[m - 1]}`, d?.cuotas.length && `${d.cuotas.length} cobros`, d?.nuevos.length && 'crédito nuevo'].filter(Boolean).join(', ');
    celdas.push(html`<a class="cal-celda ${tono ? 'cal-' + tono : ''} ${f === hoy ? 'es-hoy' : ''} ${f === seleccionado ? 'sel' : ''}"
        href="#/calendario?mes=${ym(mes)}&dia=${f}" aria-label="${etiqueta}" ${f === seleccionado ? html`aria-current="date"` : ''}>
      <span class="cal-num">${n}</span>
      ${d?.cuotas.length ? html`<span class="cal-info"><b>${d.cuotas.length}</b><small class="dinero">${dinero(esperado, { compacto: true })}</small></span>` : ''}
      ${d?.nuevos.length ? html`<i class="cal-punto-azul" title="Crédito nuevo"></i>` : ''}
    </a>`);
  }

  montar(el, html`
    ${encabezado('Calendario de cobros', { subtitulo: 'Toca un día para ver el detalle' })}
    <div class="calendario-layout">
      <section class="tarjeta calendario" aria-label="Calendario">
        <div class="cal-cabeza">
          <a class="btn-icono" href="#/calendario?mes=${ym(sumarMeses(mes, -1))}" aria-label="Mes anterior">${icono('atras')}</a>
          <h2>${MESES[m - 1]} ${y}</h2>
          <a class="btn-icono" href="#/calendario?mes=${ym(sumarMeses(mes, 1))}" aria-label="Mes siguiente">${icono('derecha')}</a>
        </div>
        <div class="cal-rejilla">
          ${DIAS.map(d => html`<span class="cal-dia-semana" aria-hidden="true">${d}</span>`)}
          ${celdas}
        </div>
        <ul class="cal-leyenda">
          <li><i class="cal-l verde"></i>Pagado</li><li><i class="cal-l amarillo"></i>Por cobrar</li>
          <li><i class="cal-l rojo"></i>Vencido</li><li><i class="cal-l azul"></i>Crédito nuevo</li>
        </ul>
        ${inicioMes(hoy) !== mes ? html`<a class="enlace" href="#/calendario">Volver a hoy</a>` : ''}
      </section>
      <div>${detalleDia(seleccionado, dias.get(seleccionado), hoy)}</div>
    </div>`);
}

function detalleDia(f, d, hoy) {
  const cuotas = d?.cuotas || [];
  const pagos = d?.pagos || [];
  const esperado = cuotas.reduce((s, i) => s + i.cuota.valorProgramado, 0);
  const recibido = pagos.reduce((s, p) => s + p.monto, 0);
  const pendiente = cuotas.reduce((s, i) => s + i.saldo, 0);
  const porCobrar = cuotas.filter(i => i.saldo > 0);
  const pagadas = cuotas.filter(i => i.saldo <= 0);
  return html`<section class="dia-detalle">
    <h2 class="dia-titulo">${larga(f)}</h2>
    <div class="kpis kpis-dia">
      <div class="cifra"><small>Cobros</small><strong>${cuotas.length}</strong></div>
      <div class="cifra"><small>Total esperado</small><strong class="dinero">${dinero(esperado)}</strong></div>
      <div class="cifra"><small>Recibido ese día</small><strong class="dinero verde">${dinero(recibido)}</strong></div>
      <div class="cifra"><small>Pendiente</small><strong class="dinero ${pendiente ? 'rojo' : ''}">${dinero(pendiente)}</strong></div>
    </div>
    ${porCobrar.length ? seccion('Por cobrar', html`<div class="lista-cobros">${porCobrar.map(i => tarjetaCobro(i, hoy))}</div>`, { contador: porCobrar.length }) : ''}
    ${pagadas.length ? seccion('Cuotas pagadas', html`<div class="lista">${pagadas.map(i => html`<a class="fila" href="#/creditos/${i.credito.id}">
        ${avatar(i.cliente)}<span class="fila-texto"><strong>${i.cliente?.nombreCompleto}</strong><small>Cuota ${i.cuota.numero}/${i.credito.numeroCuotas} · ${formatoNumero(i.credito.numero)}</small></span>
        <span class="fila-derecha"><strong class="dinero">${dinero(i.cuota.valorProgramado)}</strong>${badge('PAGADO')}</span></a>`)}</div>`) : ''}
    ${d?.nuevos.length ? seccion('Créditos entregados', html`<div class="lista">${d.nuevos.map(n => html`<a class="fila" href="#/creditos/${n.credito.id}">
        <span class="num-credito">${formatoNumero(n.credito.numero)}</span><span class="fila-texto"><strong>${n.cliente?.nombreCompleto}</strong><small>Desembolso</small></span>
        <span class="fila-derecha"><strong class="dinero">${dinero(n.credito.montoPrestado)}</strong></span></a>`)}</div>`) : ''}
    ${!cuotas.length && !d?.nuevos.length && !pagos.length ? html`<p class="vacio-mini">${icono('calendario')} No hay movimientos este día.</p>` : ''}
  </section>`;
}
