import { html, montar } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { kpi, seccion, tarjetaCobro, vacio, progreso } from '../ui/componentes.js';
import { obtener } from '../services/datos.js';
import * as config from '../services/config.js';
import { formatear as dinero, porcentaje } from '../core/money.js';
import { larga, diferenciaDias, deDate } from '../core/dates.js';
import * as instalacion from '../services/instalacion.js';

const LIMITE = 6;

export async function render(el) {
  const { analisis: a, datos, hoy } = await obtener();
  const k = a.kpis;
  const cfg = config.get();

  if (!datos.clientes.length) {
    montar(el, html`
      ${saludo(cfg, hoy)}
      ${accionesRapidas()}
      ${vacio({ ico: 'clientes', titulo: 'Empieza creando tu primer cliente',
        texto: 'Luego le asignas un crédito y CarteraPro calcula las cuotas por ti.',
        accion: { href: '#/clientes/nuevo', texto: 'Crear cliente' } })}`);
    return;
  }

  // En "próximos" basta la siguiente cuota de cada crédito (evita repetir créditos diarios).
  const proximos = a.proximos.filter((i, n, arr) => arr.findIndex(x => x.credito.id === i.credito.id) === n);
  const lista = (items, vacioTexto) => items.length
    ? html`<div class="lista-cobros">${items.slice(0, LIMITE).map(i => tarjetaCobro(i, hoy))}</div>
      ${items.length > LIMITE ? html`<p class="mas-items">y ${items.length - LIMITE} más…</p>` : ''}`
    : html`<p class="vacio-mini">${icono('check')} ${vacioTexto}</p>`;

  montar(el, html`
    ${saludo(cfg, hoy)}
    ${alertas(a.alertas)}
    ${avisoCopia(cfg, datos, hoy)}
    ${instalacion.estado() === 'disponible' ? html`<a class="alerta alerta-azul" href="#/instalar">${icono('telefono')}<span>Instala CarteraPro en tu pantalla de inicio para usarla sin internet.</span></a>` : ''}
    ${accionesRapidas()}

    <section class="kpis" aria-label="Indicadores principales">
      ${kpi('Capital prestado', dinero(k.capitalPrestado, { compacto: true }), { ico: 'creditos' })}
      ${kpi('Por cobrar', dinero(k.porCobrar, { compacto: true }), { ico: 'reloj', tono: 'amarillo' })}
      ${kpi('Capital recuperado', dinero(k.capitalRecuperado, { compacto: true }), { ico: 'tendencia', tono: 'verde' })}
      ${kpi('Intereses cobrados', dinero(k.interesesGenerados, { compacto: true }), { ico: 'dinero', tono: 'verde', nota: `de ${dinero(k.interesesProgramados, { compacto: true })} pactados` })}
      ${kpi('Cartera vencida', dinero(k.carteraVencida, { compacto: true }), { ico: 'alerta', tono: k.carteraVencida ? 'rojo' : '' })}
      ${kpi('Clientes', String(k.totalClientes), { ico: 'clientes', href: '#/clientes' })}
      ${kpi('Créditos activos', String(k.creditosActivos), { ico: 'creditos', href: '#/creditos', nota: k.creditosVencidos ? `${k.creditosVencidos} con atraso` : 'ninguno con atraso' })}
      ${kpi('Créditos finalizados', String(k.creditosFinalizados), { ico: 'check', tono: 'azul', href: '#/creditos?filtro=PAGADO' })}
    </section>

    ${seccion('Rendimiento', html`<div class="tarjeta rendimiento">
      <div class="rend-barra">
        <div class="rend-fila"><span>Recuperación</span><strong>${porcentaje(k.tasaRecuperacion)}</strong></div>
        ${progreso(k.tasaRecuperacion, 'verde')}
        <small>Lo cobrado frente al total pactado de los créditos vigentes.</small>
      </div>
      <div class="rend-barra">
        <div class="rend-fila"><span>Morosidad</span><strong>${porcentaje(k.tasaMorosidad)}</strong></div>
        ${progreso(k.tasaMorosidad, 'rojo')}
        <small>Parte del saldo por cobrar que ya está vencida.</small>
      </div>
      <dl class="rend-datos">
        <div><dt>Total esperado</dt><dd class="dinero">${dinero(k.totalEsperado)}</dd></div>
        <div><dt>Total cobrado</dt><dd class="dinero">${dinero(k.totalCobrado)}</dd></div>
        <div><dt>Total pendiente</dt><dd class="dinero">${dinero(k.totalPendiente)}</dd></div>
        <div><dt>Promedio por pago</dt><dd class="dinero">${dinero(k.promedioPago)}</dd></div>
      </dl>
    </div>`)}

    <div class="columnas">
      <div>
        ${seccion('Cobros de hoy', lista(a.cobrosHoy, 'No hay cuotas que venzan hoy.'), { contador: a.cobrosHoy.length, enlace: { href: '#/cobranzas', texto: 'Ver cobranzas' } })}
        ${a.atrasados.length ? seccion('Atrasados', lista(a.atrasados, ''), { contador: a.atrasados.length }) : ''}
      </div>
      <div>
        ${seccion('Próximos 7 días', lista(proximos, 'No hay cobros en los próximos 7 días.'), { contador: proximos.length, enlace: { href: '#/calendario', texto: 'Calendario' } })}
      </div>
    </div>`);
}

function saludo(cfg, hoy) {
  const h = new Date().getHours();
  const s = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return html`<header class="pagina-cabeza saludo">
    <div class="pagina-titulos"><p class="fecha-hoy">${larga(hoy)}</p><h1>${s}${cfg.nombreNegocio ? html`, <span class="nombre-negocio">${cfg.nombreNegocio}</span>` : ''}</h1></div>
  </header>`;
}

function avisoCopia(cfg, datos, hoy) {
  if (!datos.creditos.some(k => !k.esDemo)) return '';
  const dias = cfg.ultimoBackup ? diferenciaDias(deDate(new Date(cfg.ultimoBackup)), hoy) : null;
  if (dias != null && dias <= 7) return '';
  return html`<a class="alerta alerta-amarillo" href="#/copia">${icono('copia')}<span>${dias == null
    ? 'Aún no tienes copia de seguridad. Hazla ahora: toma un minuto.'
    : `Tu última copia de seguridad fue hace ${dias} días. Haz una nueva.`}</span></a>`;
}

function accionesRapidas() {
  const b = (href, ico, texto) => html`<a class="accion-rapida" href="${href}"><span class="accion-ico">${icono(ico)}</span><span>${texto}</span></a>`;
  return html`<nav class="acciones-rapidas" aria-label="Acciones rápidas">
    ${b('#/clientes/nuevo', 'usuario', 'Cliente')}
    ${b('#/creditos/nuevo', 'creditos', 'Crédito')}
    ${b('#/pagos/nuevo', 'dinero', 'Pago')}
    ${b('#/cobranzas', 'cobranza', 'Cobranzas')}
  </nav>`;
}

function alertas(lista) {
  if (!lista.length) return '';
  return html`<div class="alertas" role="region" aria-label="Alertas">
    ${lista.map(al => html`<p class="alerta alerta-${al.tono}">${icono(al.tono === 'rojo' ? 'alerta' : 'reloj')}
      <span>${al.tipo === 'monto' ? html`Tienes <strong class="dinero">${dinero(al.monto)}</strong> en cartera vencida.` : al.texto}</span></p>`)}
  </div>`;
}
