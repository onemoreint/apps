// Ruta de cobro del día: una parada por cliente, en el orden en que el cobrador los visita.
import { saldoCuota } from './pagos.js';
import { diasAtraso } from './estados.js';
import { mueveEfectivo, totalPago, SIN_COBRADOR } from './caja.js';
import { pendienteCargo } from './multas.js';

export const RESULTADOS_VISITA = {
  NO_ESTABA: 'No estaba',
  SIN_DINERO: 'No tenía dinero',
  PROMESA: 'Prometió pagar',
  OTRO: 'Otro motivo',
};

export const ESTADOS_PARADA = {
  PENDIENTE: { nombre: 'Por visitar', tono: 'gris' },
  PAGADO: { nombre: 'Pagó', tono: 'verde' },
  ABONO: { nombre: 'Abonó', tono: 'amarillo' },
  VISITADO: { nombre: 'Visitado sin pago', tono: 'rojo' },
};

const coincide = (id, filtro) => !filtro || (filtro === SIN_COBRADOR ? !id : id === filtro);

/**
 * @param {Map} infoCreditos analisis.creditos
 * @param {{pagos?:object[], visitas?:object[], cargos?:object[]}} extra
 * @param {string} hoy
 * @param {string} [cobradorId]
 */
export function construirRuta(infoCreditos, { pagos = [], visitas = [], cargos = [] }, hoy, cobradorId) {
  const pagosHoy = new Map();
  for (const p of pagos) {
    if (p.fecha !== hoy || !mueveEfectivo(p)) continue;
    pagosHoy.set(p.creditoId, (pagosHoy.get(p.creditoId) || 0) + totalPago(p));
  }
  const multas = new Map();
  for (const c of cargos) multas.set(c.creditoId, (multas.get(c.creditoId) || 0) + pendienteCargo(c));

  const paradas = new Map();
  for (const { credito, cliente, cuotas } of infoCreditos.values()) {
    if (credito.cancelado || !cliente || !coincide(credito.cobradorId, cobradorId)) continue;
    let exigible = 0, atraso = 0, cuotasHoy = 0;
    for (const c of cuotas) {
      const s = saldoCuota(c);
      if (s <= 0 || c.fechaVencimiento > hoy) continue;
      exigible += s;
      cuotasHoy++;
      atraso = Math.max(atraso, diasAtraso(c, hoy));
    }
    const pagado = pagosHoy.get(credito.id) || 0;
    if (exigible <= 0 && pagado <= 0) continue;
    if (!paradas.has(cliente.id)) {
      paradas.set(cliente.id, { cliente, creditos: [], exigible: 0, pagadoHoy: 0, multas: 0, maxAtraso: 0 });
    }
    const p = paradas.get(cliente.id);
    p.creditos.push({ credito, exigible, cuotasHoy, atraso });
    p.exigible += exigible;
    p.pagadoHoy += pagado;
    p.multas += multas.get(credito.id) || 0;
    p.maxAtraso = Math.max(p.maxAtraso, atraso);
  }

  const visitasPorCliente = new Map();
  for (const v of visitas) {
    if (!visitasPorCliente.has(v.clienteId)) visitasPorCliente.set(v.clienteId, []);
    visitasPorCliente.get(v.clienteId).push(v);
  }

  const lista = [...paradas.values()].map(p => {
    const vs = (visitasPorCliente.get(p.cliente.id) || []).sort((a, b) => (a.creadoEn || '').localeCompare(b.creadoEn || ''));
    p.visitaHoy = vs.filter(v => v.fecha === hoy).at(-1) || null;
    p.promesaHoy = vs.find(v => v.resultado === 'PROMESA' && v.promesaFecha === hoy) || null;
    if (p.pagadoHoy > 0) p.estado = p.exigible > 0 ? 'ABONO' : 'PAGADO';
    else if (p.visitaHoy) p.estado = 'VISITADO';
    else p.estado = 'PENDIENTE';
    return p;
  });

  lista.sort((a, b) => ordenRuta(a.cliente) - ordenRuta(b.cliente)
    || (a.cliente.sector || '').localeCompare(b.cliente.sector || '', 'es')
    || a.cliente.nombreCompleto.localeCompare(b.cliente.nombreCompleto, 'es'));

  const totales = {
    paradas: lista.length,
    visitadas: lista.filter(p => p.estado !== 'PENDIENTE').length,
    porCobrar: lista.reduce((s, p) => s + p.exigible, 0),
    recaudado: lista.reduce((s, p) => s + p.pagadoHoy, 0),
  };
  totales.meta = totales.porCobrar + totales.recaudado;
  return { paradas: lista, totales };
}

const ordenRuta = c => (Number.isFinite(c.ordenRuta) ? c.ordenRuta : 1e9);

/** Enlace de Google Maps para la dirección del cliente (o null si no tiene). */
export function enlaceMapa(cliente) {
  const partes = [cliente?.direccion, cliente?.sector, cliente?.ciudad].map(s => String(s || '').trim()).filter(Boolean);
  if (!cliente?.direccion) return null;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(partes.join(', '));
}
