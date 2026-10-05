// Diagnóstico de cartera con reglas locales (sin internet ni IA externa) y resumen
// anónimo listo para enviarse a un modelo de IA en el futuro.
// Los textos son administrativos: no califican a las personas ni recomiendan prestar.
import { diferenciaDias, sumarDias } from '../core/dates.js';

/**
 * @returns {{nivel:'bien'|'atencion'|'alerta', titulo:string, detalle:string, accion?:{texto:string, href:string}}[]}
 */
export function diagnosticar({ analisis, datos }, hoy, fmt = v => String(v)) {
  const k = analisis.kpis;
  const h = [];
  const activos = [...analisis.creditos.values()].filter(i => !i.credito.cancelado && i.resumen.saldoTotal > 0);

  if (!activos.length) {
    return [{ nivel: 'bien', titulo: 'Sin cartera activa', detalle: 'Cuando tengas créditos con saldo, aquí verás el análisis de tu cartera.' }];
  }

  // 1. Morosidad
  if (k.tasaMorosidad >= 0.15) {
    h.push({ nivel: 'alerta', titulo: `Morosidad alta: ${(k.tasaMorosidad * 100).toFixed(1)}%`,
      detalle: `${fmt(k.carteraVencida)} de ${fmt(k.porCobrar)} por cobrar ya está vencido. Prioriza el contacto con los clientes atrasados.`,
      accion: { texto: 'Ver vencidos', href: '#/cobranzas?tab=VENCIDOS' } });
  } else if (k.tasaMorosidad > 0.05) {
    h.push({ nivel: 'atencion', titulo: `Morosidad moderada: ${(k.tasaMorosidad * 100).toFixed(1)}%`,
      detalle: `Hay ${fmt(k.carteraVencida)} vencidos. Un recordatorio a tiempo suele evitar que el atraso crezca.`,
      accion: { texto: 'Ver vencidos', href: '#/cobranzas?tab=VENCIDOS' } });
  } else {
    h.push({ nivel: 'bien', titulo: k.carteraVencida ? 'Morosidad baja' : 'Sin cartera vencida',
      detalle: k.carteraVencida ? `Solo ${(k.tasaMorosidad * 100).toFixed(1)}% del saldo está vencido.` : 'Todas las cuotas exigibles están al día.' });
  }

  // 2. Atrasos largos
  const largos = [...analisis.clientes.values()].filter(ic => ic.creditos.some(i => !i.credito.cancelado && i.resumen.maxAtraso > 30));
  if (largos.length) {
    h.push({ nivel: 'alerta', titulo: `${largos.length} ${largos.length === 1 ? 'cliente lleva' : 'clientes llevan'} más de 30 días de atraso`,
      detalle: `Los atrasos largos son los más difíciles de recuperar. Considera acordar un plan de pago por escrito.`,
      accion: { texto: 'Ver reporte de mora', href: '#/reportes' } });
  }

  // 3. Concentración de la cartera
  const porCliente = [...analisis.clientes.values()].filter(ic => ic.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  if (porCliente.length >= 3 && k.porCobrar > 0) {
    const share = porCliente[0].saldo / k.porCobrar;
    if (share >= 0.3) {
      h.push({ nivel: 'atencion', titulo: `Un solo cliente concentra el ${Math.round(share * 100)}% de tu cartera`,
        detalle: 'Si ese cliente se atrasa, afecta gran parte de tu flujo. Diversificar reduce el riesgo.' });
    }
  }

  // 4. Cumplimiento de los últimos 30 días
  const desde = sumarDias(hoy, -30);
  let esperado = 0, cobrado = 0;
  for (const i of activos) for (const c of i.cuotas) {
    if (c.fechaVencimiento >= desde && c.fechaVencimiento <= hoy) { esperado += c.valorProgramado; cobrado += Math.min(c.valorPagado || 0, c.valorProgramado); }
  }
  if (esperado > 0) {
    const pct = cobrado / esperado;
    h.push({ nivel: pct >= 0.9 ? 'bien' : pct >= 0.7 ? 'atencion' : 'alerta',
      titulo: `Cumplimiento de los últimos 30 días: ${Math.round(pct * 100)}%`,
      detalle: `De ${fmt(esperado)} que vencían, se han cobrado ${fmt(cobrado)}.` });
  }

  // 5. Créditos sin ningún pago con cuotas ya vencidas
  const sinPagos = activos.filter(i => i.resumen.totalPagado === 0 && i.resumen.vencidas > 0);
  if (sinPagos.length) {
    h.push({ nivel: 'alerta', titulo: `${sinPagos.length} ${sinPagos.length === 1 ? 'crédito no ha recibido' : 'créditos no han recibido'} ningún pago`,
      detalle: 'Tienen cuotas vencidas y ningún abono registrado. Verifica si hay pagos sin registrar.',
      accion: { texto: 'Ver créditos con atraso', href: '#/creditos?filtro=VENCIDO' } });
  }

  // 6. Próximos 7 días
  const proximo = analisis.proximos.reduce((s, i) => s + i.saldo, 0) + analisis.cobrosHoy.reduce((s, i) => s + i.saldo, 0);
  if (proximo > 0) {
    h.push({ nivel: 'bien', titulo: `Flujo esperado en 7 días: ${fmt(proximo)}`,
      detalle: `${analisis.cobrosHoy.length + analisis.proximos.length} cuotas vencen entre hoy y la próxima semana.`,
      accion: { texto: 'Ver calendario', href: '#/calendario' } });
  }

  // 7. Pagos recientes
  const ultimoPago = datos.pagos.filter(p => !p.anulado).map(p => p.fecha).sort().at(-1);
  if (ultimoPago && diferenciaDias(ultimoPago, hoy) > 7) {
    h.push({ nivel: 'atencion', titulo: `No registras pagos desde hace ${diferenciaDias(ultimoPago, hoy)} días`,
      detalle: 'Si recibiste pagos, regístralos para que saldos y estados estén al día.' });
  }

  const orden = { alerta: 0, atencion: 1, bien: 2 };
  return h.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

/**
 * Resumen ANÓNIMO de la cartera para un futuro asistente de IA:
 * sin nombres, teléfonos ni documentos; los clientes se identifican como C1, C2…
 * Montos en unidades de la moneda (no en unidad mínima).
 */
export function resumenAnonimo({ analisis }, hoy, { moneda = 'COP', decimales = 0 } = {}) {
  const u = v => Math.round((v / 10 ** decimales) * 100) / 100;
  const k = analisis.kpis;
  const alias = new Map([...analisis.clientes.keys()].map((id, i) => [id, `C${i + 1}`]));
  return {
    fecha: hoy,
    moneda,
    indicadores: {
      capitalPrestado: u(k.capitalPrestado), porCobrar: u(k.porCobrar), carteraVencida: u(k.carteraVencida),
      capitalRecuperado: u(k.capitalRecuperado), interesesCobrados: u(k.interesesGenerados),
      tasaRecuperacion: +k.tasaRecuperacion.toFixed(4), tasaMorosidad: +k.tasaMorosidad.toFixed(4),
      clientes: k.totalClientes, creditosActivos: k.creditosActivos, creditosFinalizados: k.creditosFinalizados,
      totalCobrado: u(k.totalCobrado), numeroPagos: k.numeroPagos,
    },
    creditos: [...analisis.creditos.values()].filter(i => !i.credito.cancelado).map(i => ({
      cliente: alias.get(i.credito.clienteId),
      monto: u(i.credito.montoPrestado), total: u(i.credito.totalAPagar),
      frecuencia: i.credito.frecuencia, cuotas: i.credito.numeroCuotas, inicio: i.credito.fechaInicio,
      pagado: u(i.resumen.totalPagado), saldo: u(i.resumen.saldoTotal),
      cuotasPagadas: i.resumen.cuotasPagadas, cuotasVencidas: i.resumen.vencidas, mayorAtrasoDias: i.resumen.maxAtraso,
      estado: i.resumen.estado,
    })),
  };
}

export function promptAnalisis(resumen) {
  return `Eres un analista de cartera de microcréditos. Analiza estos datos (JSON anónimo) de un pequeño negocio de préstamos y dime:
1) los principales problemas de la cartera, 2) qué clientes (por su código) requieren atención y por qué, 3) tendencias de recuperación y morosidad, 4) tres acciones concretas y respetuosas para mejorar el cobro esta semana.
No sugieras prácticas de cobranza abusivas. Responde en español, breve y práctico.

${JSON.stringify(resumen)}`;
}
