import { html, montar } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, tarjetaCobro, avatar, vacio } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import { formatoNumero } from '../services/creditos.js';
import { saldoCuota } from '../domain/pagos.js';
import { estadoCuota, estadoVisualCuota, diasAtraso } from '../domain/estados.js';
import { formatear as dinero } from '../core/money.js';

const unaPorCredito = items => items.filter((i, n, a) => a.findIndex(x => x.credito.id === i.credito.id) === n);

function listas(analisis, datos, hoy) {
  const pendientes = [];
  for (const { credito, cliente, resumen } of analisis.creditos.values()) {
    if (credito.cancelado || !resumen.proxima) continue;
    const c = resumen.proxima;
    const gracia = credito.diasGracia || 0;
    pendientes.push({ cuota: c, credito, cliente, saldo: saldoCuota(c), visual: estadoVisualCuota(c, hoy, gracia), estado: estadoCuota(c, hoy, gracia), diasAtraso: diasAtraso(c, hoy) });
  }
  pendientes.sort((a, b) => a.cuota.fechaVencimiento.localeCompare(b.cuota.fechaVencimiento));
  return {
    HOY: analisis.cobrosHoy,
    VENCIDOS: analisis.atrasados,
    PROXIMOS: unaPorCredito(analisis.proximos),
    PENDIENTES: pendientes,
    PAGADOS: datos.pagos.filter(p => p.fecha === hoy && !p.anulado),
  };
}

const PESTANAS = [
  ['HOY', 'Cobrar hoy'],
  ['VENCIDOS', 'Vencidos'],
  ['PROXIMOS', 'Próximos 7 días'],
  ['PENDIENTES', 'Pendientes'],
  ['PAGADOS', 'Pagados hoy'],
];

const VACIOS = {
  HOY: ['Nada por cobrar hoy', 'No hay cuotas que venzan hoy.'],
  VENCIDOS: ['Sin atrasos', 'Ningún cliente tiene cuotas atrasadas. ¡Excelente!'],
  PROXIMOS: ['Semana tranquila', 'No hay cuotas que venzan en los próximos 7 días.'],
  PENDIENTES: ['Sin créditos activos', 'Cuando crees créditos aparecerán aquí.'],
  PAGADOS: ['Aún no hay pagos hoy', 'Los pagos que registres hoy aparecerán aquí.'],
};

export async function render(el, _p, query) {
  const { analisis, datos, hoy } = await obtener();
  const L = listas(analisis, datos, hoy);
  const tab = L[query.tab] ? query.tab : (L.HOY.length || !L.VENCIDOS.length ? 'HOY' : 'VENCIDOS');
  const items = L[tab];
  const total = tab === 'PAGADOS' ? items.reduce((s, p) => s + p.monto, 0) : items.reduce((s, i) => s + i.saldo, 0);
  const pagoInfo = p => analisis.creditos.get(p.creditoId);

  montar(el, html`
    ${encabezado('Cobranzas', { subtitulo: 'A quién cobrar y cuánto' })}
    <nav class="chips pestanas" aria-label="Secciones de cobranza">
      ${PESTANAS.map(([k, t]) => html`<a class="chip" href="#/cobranzas?tab=${k}" ${k === tab ? html`aria-current="page"` : ''}>${t}<span class="chip-n">${L[k].length}</span></a>`)}
    </nav>
    ${items.length ? html`
      <div class="tarjeta total-periodo"><span>${items.length} ${tab === 'PAGADOS' ? (items.length === 1 ? 'pago recibido' : 'pagos recibidos') : (items.length === 1 ? 'cuota' : 'cuotas')}</span>
        <strong class="dinero ${tab === 'VENCIDOS' ? 'rojo' : ''}">${dinero(total)}</strong></div>
      ${tab === 'PAGADOS'
        ? html`<ul class="pagos-lista tarjeta">${items.map(p => {
            const i = pagoInfo(p);
            return html`<li class="pago"><a href="#/recibos/${p.id}">${avatar(i?.cliente)}
              <span class="pago-texto"><strong>${i?.cliente?.nombreCompleto}</strong><small>${p.numeroRecibo} · ${formatoNumero(i?.credito.numero || 0)} · ${p.metodoPago}</small></span>
              <span class="pago-fin"><strong class="dinero">${dinero(p.monto)}</strong></span></a></li>`;
          })}</ul>`
        : html`<div class="lista-cobros rejilla-cobros">${items.map(i => tarjetaCobro(i, hoy))}</div>`}`
    : vacio({ ico: tab === 'VENCIDOS' || tab === 'PAGADOS' ? 'check' : 'calendario', titulo: VACIOS[tab][0], texto: VACIOS[tab][1] })}
    <p class="nota-legal centrado">${icono('info')} Los mensajes de WhatsApp son plantillas respetuosas que puedes editar en Configuración.</p>`);
}
