// Análisis completo de la cartera a partir de los datos crudos.
// Es la fuente única para dashboard, listas, reportes y (a futuro) el Analista IA.
import { diferenciaDias } from '../core/dates.js';
import { saldoCuota } from './pagos.js';
import { resumenCredito, estadoVisualCuota, estadoCuota, diasAtraso, peorEstado } from './estados.js';
import { evaluarRiesgo } from './riesgo.js';

export function analizarCartera({ clientes = [], creditos = [], cuotas = [], pagos = [] }, hoy) {
  const cuotasPorCredito = agrupar(cuotas, 'creditoId');
  const clientePorId = new Map(clientes.map(c => [c.id, c]));

  const infoCreditos = new Map();
  for (const credito of creditos) {
    const lista = (cuotasPorCredito.get(credito.id) || []).sort((a, b) => a.numero - b.numero);
    infoCreditos.set(credito.id, {
      credito,
      cliente: clientePorId.get(credito.clienteId),
      cuotas: lista,
      resumen: resumenCredito(credito, lista, hoy),
    });
  }

  const infoClientes = new Map();
  for (const cliente of clientes) {
    infoClientes.set(cliente.id, { cliente, creditos: [], activos: 0, saldo: 0, totalPrestado: 0, totalPagado: 0, vencido: 0 });
  }
  for (const info of infoCreditos.values()) {
    const ic = infoClientes.get(info.credito.clienteId);
    if (!ic) continue;
    ic.creditos.push(info);
    ic.totalPagado += info.resumen.totalPagado;
    if (info.credito.cancelado) continue;
    ic.totalPrestado += info.credito.montoPrestado;
    ic.saldo += info.resumen.saldoTotal;
    ic.vencido += info.resumen.montoVencido;
    if (info.resumen.estado === 'ACTIVO' || info.resumen.estado === 'VENCIDO') ic.activos++;
  }
  for (const ic of infoClientes.values()) {
    ic.creditos.sort((a, b) => (b.credito.numero || 0) - (a.credito.numero || 0));
    ic.visual = peorEstado(ic.creditos.map(i => i.resumen.visual));
    ic.riesgo = evaluarRiesgo(
      ic.creditos.filter(i => !i.credito.cancelado).map(i => ({ cuotas: i.cuotas, gracia: i.credito.diasGracia || 0 })),
      hoy,
    );
  }

  const cobros = clasificarCobros(infoCreditos, hoy);
  const kpis = calcularKpis(infoCreditos, pagos, clientes, hoy);
  return { creditos: infoCreditos, clientes: infoClientes, kpis, ...cobros, alertas: generarAlertas(kpis, cobros) };
}

function agrupar(lista, campo) {
  const m = new Map();
  for (const x of lista) {
    if (!m.has(x[campo])) m.set(x[campo], []);
    m.get(x[campo]).push(x);
  }
  return m;
}

/** Cuotas con saldo agrupadas por urgencia. */
export function clasificarCobros(infoCreditos, hoy, diasProximos = 7) {
  const hoyLista = [], atrasados = [], proximos = [];
  for (const { credito, cliente, cuotas } of infoCreditos.values()) {
    if (credito.cancelado) continue;
    const gracia = credito.diasGracia || 0;
    for (const cuota of cuotas) {
      const saldo = saldoCuota(cuota);
      if (saldo <= 0) continue;
      const dias = diferenciaDias(hoy, cuota.fechaVencimiento);
      const item = {
        cuota, credito, cliente, saldo,
        visual: estadoVisualCuota(cuota, hoy, gracia),
        estado: estadoCuota(cuota, hoy, gracia),
        diasAtraso: diasAtraso(cuota, hoy),
      };
      if (dias === 0) hoyLista.push(item);
      else if (dias < 0) atrasados.push(item);
      else if (dias <= diasProximos) proximos.push(item);
    }
  }
  atrasados.sort((a, b) => b.diasAtraso - a.diasAtraso);
  proximos.sort((a, b) => a.cuota.fechaVencimiento.localeCompare(b.cuota.fechaVencimiento));
  hoyLista.sort((a, b) => (a.cliente?.nombreCompleto || '').localeCompare(b.cliente?.nombreCompleto || ''));
  return { cobrosHoy: hoyLista, atrasados, proximos };
}

function calcularKpis(infoCreditos, pagos, clientes, hoy) {
  const k = {
    capitalPrestado: 0, porCobrar: 0, capitalRecuperado: 0, interesesGenerados: 0, interesesProgramados: 0,
    carteraVencida: 0, totalClientes: clientes.length, creditosActivos: 0, creditosVencidos: 0,
    creditosFinalizados: 0, totalEsperado: 0, totalCobrado: 0, exigibleHoy: 0, cobradoExigible: 0,
  };
  for (const { credito, cuotas, resumen } of infoCreditos.values()) {
    k.capitalRecuperado += resumen.pagadoCapital;
    k.interesesGenerados += resumen.pagadoInteres;
    if (credito.cancelado) continue;
    k.capitalPrestado += credito.montoPrestado;
    k.interesesProgramados += credito.interesTotal;
    k.totalEsperado += credito.totalAPagar;
    k.porCobrar += resumen.saldoTotal;
    k.carteraVencida += resumen.montoVencido;
    if (resumen.estado === 'PAGADO') k.creditosFinalizados++;
    else k.creditosActivos++;
    if (resumen.estado === 'VENCIDO') k.creditosVencidos++;
    for (const c of cuotas) {
      if (diferenciaDias(c.fechaVencimiento, hoy) >= 0) {
        k.exigibleHoy += c.valorProgramado;
        k.cobradoExigible += c.valorPagado || 0;
      }
    }
  }
  const validos = pagos.filter(p => !p.anulado);
  k.totalCobrado = validos.reduce((s, p) => s + p.monto, 0);
  k.numeroPagos = validos.length;
  k.totalPendiente = k.porCobrar;
  k.promedioPago = validos.length ? Math.round(k.totalCobrado / validos.length) : 0;
  k.tasaRecuperacion = k.totalEsperado ? (k.totalEsperado - k.porCobrar) / k.totalEsperado : 0;
  k.tasaMorosidad = k.porCobrar ? k.carteraVencida / k.porCobrar : 0;
  k.cumplimiento = k.exigibleHoy ? k.cobradoExigible / k.exigibleHoy : 1;
  return k;
}

function generarAlertas(kpis, { cobrosHoy, atrasados }) {
  const alertas = [];
  if (cobrosHoy.length) {
    alertas.push({ tono: 'amarillo', tipo: 'hoy', n: cobrosHoy.length,
      texto: `${cobrosHoy.length} ${cobrosHoy.length === 1 ? 'cuota vence' : 'cuotas vencen'} hoy.` });
  }
  const vencidos = atrasados.filter(i => i.estado === 'VENCIDA');
  const clientesAtrasados = new Set(vencidos.map(i => i.credito.clienteId)).size;
  if (clientesAtrasados) {
    alertas.push({ tono: 'rojo', tipo: 'atrasados', n: clientesAtrasados,
      texto: `${clientesAtrasados} ${clientesAtrasados === 1 ? 'cliente tiene pagos atrasados' : 'clientes tienen pagos atrasados'}.` });
  }
  if (kpis.carteraVencida > 0) alertas.push({ tono: 'rojo', tipo: 'monto', monto: kpis.carteraVencida });
  return alertas;
}
