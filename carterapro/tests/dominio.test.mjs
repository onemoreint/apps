// Pruebas del motor de cálculo. Ejecutar: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularInteres, porcentajeABp } from '../js/domain/interes.js';
import { generarCuotas, generarFechas, repartir, primerVencimientoSugerido } from '../js/domain/cuotas.js';
import { distribuirPago, aplicarACuotas, saldoCuota, montoHastaCuota } from '../js/domain/pagos.js';
import { resumenCredito, estadoCuota, estadoVisualCuota } from '../js/domain/estados.js';
import { analizarCartera } from '../js/domain/metricas.js';
import { evaluarRiesgo } from '../js/domain/riesgo.js';
import { validarCliente, buscarDuplicados, validarCredito } from '../js/domain/validaciones.js';
import { sumarMeses, sumarDias, diferenciaDias } from '../js/core/dates.js';
import { aMinimo, setMoneda, formatear } from '../js/core/money.js';

const conIds = cuotas => cuotas.map(c => ({ ...c, id: 'c' + c.numero, creditoId: 'k1', pagadoCapital: 0, pagadoInteres: 0, valorPagado: 0 }));

function pagar(cuotas, monto, fecha) {
  const { aplicaciones } = distribuirPago(cuotas, monto);
  const cambiadas = new Map(aplicarACuotas(cuotas, aplicaciones, fecha).map(c => [c.id, c]));
  return { cuotas: cuotas.map(c => cambiadas.get(c.id) || c), aplicaciones };
}

test('interés: las 4 modalidades', () => {
  assert.equal(calcularInteres({ monto: 1_000_000, tipo: 'PCT_CAPITAL', tasaBp: 1000 }), 100_000);
  assert.equal(calcularInteres({ monto: 1_000_000, tipo: 'PCT_PERIODO', tasaBp: 200, numeroCuotas: 20 }), 400_000);
  assert.equal(calcularInteres({ monto: 1_000_000, tipo: 'FIJO', interesFijo: 150_000 }), 150_000);
  assert.equal(calcularInteres({ monto: 1_000_000, tipo: 'SIN_INTERES' }), 0);
  assert.equal(porcentajeABp('2,5'), 250);
});

test('cuotas: caso Carlos Pérez $1.000.000 al 10% en 20 cuotas', () => {
  const cuotas = generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-10-06' });
  assert.equal(cuotas.length, 20);
  assert.ok(cuotas.every(c => c.valorProgramado === 55_000 && c.capital === 50_000 && c.interes === 5_000));
  assert.equal(cuotas[1].fechaVencimiento, '2026-10-07');
  assert.equal(cuotas.reduce((s, c) => s + c.valorProgramado, 0), 1_100_000);
});

test('cuotas: redondeo — la última absorbe la diferencia', () => {
  assert.deepEqual(repartir(1_100_000, 7), [157142, 157142, 157142, 157142, 157142, 157142, 157148]);
  const cuotas = generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 7, frecuencia: 'SEMANAL', fechaPrimerVencimiento: '2026-10-12' });
  assert.equal(cuotas.reduce((s, c) => s + c.valorProgramado, 0), 1_100_000);
});

test('fechas: mensual conserva el día y ajusta a fin de mes', () => {
  const f = generarFechas({ fechaPrimerVencimiento: '2026-01-31', numeroCuotas: 4, frecuencia: 'MENSUAL' });
  assert.deepEqual(f, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(sumarMeses('2026-12-15', 1), '2027-01-15');
});

test('fechas: diaria sin domingos', () => {
  // 2026-10-10 es sábado
  const f = generarFechas({ fechaPrimerVencimiento: '2026-10-09', numeroCuotas: 4, frecuencia: 'DIARIA', excluirDomingos: true });
  assert.deepEqual(f, ['2026-10-09', '2026-10-10', '2026-10-12', '2026-10-13']);
  assert.equal(primerVencimientoSugerido('2026-10-10', 'DIARIA', true), '2026-10-12');
  assert.equal(primerVencimientoSugerido('2026-10-05', 'QUINCENAL'), '2026-10-20');
});

test('pagos: completo, parcial, excedente y atrasado', () => {
  let cuotas = conIds(generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-10-06' }));

  // Pago completo de la cuota 1
  ({ cuotas } = pagar(cuotas, 55_000, '2026-10-06'));
  assert.equal(saldoCuota(cuotas[0]), 0);
  assert.equal(cuotas[0].pagadoCapital, 50_000);
  assert.equal(cuotas[0].pagadoInteres, 5_000);

  // Pago parcial de 30.000 en la cuota 2 → prorrateo 27.273 capital / 2.727 interés
  let r = pagar(cuotas, 30_000, '2026-10-07');
  cuotas = r.cuotas;
  assert.equal(r.aplicaciones.length, 1);
  assert.equal(r.aplicaciones[0].interes, 2_727);
  assert.equal(r.aplicaciones[0].capital, 27_273);
  assert.equal(saldoCuota(cuotas[1]), 25_000);
  assert.equal(estadoCuota(cuotas[1], '2026-10-07'), 'PARCIAL');

  // Pago atrasado y superior: 100.000 el día 10 → completa cuota 2 (25.000), paga 3 (55.000) y 20.000 a la 4
  assert.equal(estadoCuota(cuotas[2], '2026-10-10'), 'VENCIDA');
  r = pagar(cuotas, 100_000, '2026-10-10');
  cuotas = r.cuotas;
  assert.deepEqual(r.aplicaciones.map(a => a.monto), [25_000, 55_000, 20_000]);
  assert.equal(saldoCuota(cuotas[1]), 0);
  assert.equal(cuotas[1].fechaPagoCompleto, '2026-10-10');
  assert.equal(saldoCuota(cuotas[3]), 35_000);

  // Totales consistentes
  const total = cuotas.reduce((s, c) => s + c.valorPagado, 0);
  assert.equal(total, 185_000);
  const capital = cuotas.reduce((s, c) => s + c.pagadoCapital, 0);
  const interes = cuotas.reduce((s, c) => s + c.pagadoInteres, 0);
  assert.equal(capital + interes, 185_000);

  // Resumen del crédito al día 10: cuota 4 vence el 09 (vencida), saldo 35.000 + cuota 5 del 10 hoy
  const res = resumenCredito({ totalAPagar: 1_100_000, diasGracia: 0 }, cuotas, '2026-10-10');
  assert.equal(res.saldoTotal, 1_100_000 - 185_000);
  assert.equal(res.estado, 'VENCIDO');
  assert.equal(res.vencidas, 1);
  assert.equal(res.montoVencido, 35_000);
  assert.equal(res.cuotasPagadas, 3);

  // No se puede pagar más del saldo
  assert.throws(() => distribuirPago(cuotas, 2_000_000), /mayor que lo que se debe/);
  assert.throws(() => distribuirPago(cuotas, 0), /mayor que cero/);
});

test('pagos: revertir (anular) deja la cuota como estaba', () => {
  const cuotas = conIds(generarCuotas({ montoPrestado: 100_000, interesTotal: 10_000, numeroCuotas: 2, frecuencia: 'SEMANAL', fechaPrimerVencimiento: '2026-10-12' }));
  const { aplicaciones } = distribuirPago(cuotas, 70_000);
  const pagadas = aplicarACuotas(cuotas, aplicaciones, '2026-10-12');
  const revertidas = aplicarACuotas(pagadas, aplicaciones, '2026-10-12', -1);
  assert.ok(revertidas.every(c => c.valorPagado === 0 && !c.fechaPagoCompleto));
  assert.equal(montoHastaCuota(cuotas, 2), 110_000);
});

test('días de gracia: no vence hasta superar la gracia', () => {
  const c = { fechaVencimiento: '2026-10-05', capital: 100, interes: 0, valorProgramado: 100, valorPagado: 0 };
  assert.equal(estadoCuota(c, '2026-10-07', 2), 'PENDIENTE');
  assert.equal(estadoCuota(c, '2026-10-08', 2), 'VENCIDA');
  assert.equal(estadoVisualCuota(c, '2026-10-04'), 'PROXIMO');
  assert.equal(estadoVisualCuota(c, '2026-09-20'), 'AL_DIA');
});

test('métricas del dashboard', () => {
  const hoy = '2026-10-10';
  let cuotas = conIds(generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-10-06' }));
  ({ cuotas } = pagar(cuotas, 55_000 * 3, '2026-10-08')); // paga cuotas 1-3; la 4 (día 9) queda vencida
  const datos = {
    clientes: [{ id: 'cli1', nombreCompleto: 'Carlos Pérez' }, { id: 'cli2', nombreCompleto: 'Ana Ruiz' }],
    creditos: [{ id: 'k1', numero: 1, clienteId: 'cli1', montoPrestado: 1_000_000, interesTotal: 100_000, totalAPagar: 1_100_000, diasGracia: 0 }],
    cuotas,
    pagos: [{ monto: 165_000 }],
  };
  const a = analizarCartera(datos, hoy);
  const k = a.kpis;
  assert.equal(k.capitalPrestado, 1_000_000);
  assert.equal(k.porCobrar, 935_000);
  assert.equal(k.capitalRecuperado, 150_000);
  assert.equal(k.interesesGenerados, 15_000);
  assert.equal(k.carteraVencida, 55_000);
  assert.equal(k.creditosActivos, 1);
  assert.equal(k.totalCobrado, 165_000);
  assert.equal(a.cobrosHoy.length, 1); // cuota 5 vence el 10
  assert.equal(a.atrasados.length, 1);
  assert.equal(a.proximos.length, 7);
  assert.equal(a.clientes.get('cli1').visual, 'VENCIDO');
  assert.equal(a.clientes.get('cli2').visual, 'SIN_CREDITOS');
  assert.equal(a.alertas.length, 3);
});

test('riesgo administrativo', () => {
  const base = { capital: 100, interes: 0, valorProgramado: 100 };
  const pagadaATiempo = { ...base, fechaVencimiento: '2026-10-01', pagadoCapital: 100, valorPagado: 100, fechaPagoCompleto: '2026-10-01' };
  const vencida = d => ({ ...base, fechaVencimiento: d, pagadoCapital: 0, valorPagado: 0 });
  assert.equal(evaluarRiesgo([{ cuotas: [pagadaATiempo] }], '2026-10-10').nivel, 'BUEN_HISTORIAL');
  assert.equal(evaluarRiesgo([{ cuotas: [pagadaATiempo, vencida('2026-10-08')] }], '2026-10-10').nivel, 'PRECAUCION');
  assert.equal(evaluarRiesgo([{ cuotas: [vencida('2026-08-01')] }], '2026-10-10').nivel, 'ALTO_RIESGO');
  assert.equal(evaluarRiesgo([], '2026-10-10').nivel, 'SIN_HISTORIAL');
});

test('validaciones y duplicados', () => {
  assert.ok(validarCliente({ nombreCompleto: 'Al', telefono: '' }).nombreCompleto);
  assert.deepEqual(validarCliente({ nombreCompleto: 'Carlos Pérez', telefono: '300 123 4567' }), {});
  const dup = buscarDuplicados({ nombreCompleto: 'carlos  perez', telefono: '+57 300-123-4567' },
    [{ id: 'x', nombreCompleto: 'Carlos Pérez', telefono: '3001234567' }]);
  assert.deepEqual(dup[0].motivos, ['teléfono', 'nombre']);
  const e = validarCredito({ clienteId: 'x', montoPrestado: -5, tipoInteres: 'PCT_CAPITAL', tasaBp: 0, numeroCuotas: 0, frecuencia: 'DIARIA', fechaInicio: '2026-10-05', fechaPrimerVencimiento: '2026-10-01', diasGracia: 0 });
  assert.deepEqual(Object.keys(e).sort(), ['fechaPrimerVencimiento', 'montoPrestado', 'numeroCuotas', 'tasa']);
});

test('dinero: lectura de montos escritos por el usuario', () => {
  setMoneda({ codigo: 'COP' });
  assert.equal(aMinimo('1.000.000'), 1_000_000);
  assert.equal(aMinimo('$ 60,000'), 60_000);
  setMoneda({ codigo: 'USD' });
  assert.equal(aMinimo('1,500.50'), 150_050);
  assert.equal(aMinimo('1500,5'), 150_050);
  assert.equal(aMinimo('1.500'), 150_000);
  assert.ok(Number.isNaN(aMinimo('abc')));
  setMoneda({ codigo: 'COP' });
  assert.match(formatear(1_250_000), /1\.250\.000/);
  assert.equal(diferenciaDias('2026-10-01', sumarDias('2026-10-01', 45)), 45);
});

import { rangoPeriodo, reportePeriodo, serieAgrupada } from '../js/domain/reportes.js';

test('reportes: rangos de periodo', () => {
  assert.deepEqual(rangoPeriodo('SEMANA', '2026-10-07'), { desde: '2026-10-05', hasta: '2026-10-11' });
  assert.deepEqual(rangoPeriodo('MES_ANTERIOR', '2026-03-15'), { desde: '2026-02-01', hasta: '2026-02-28' });
  assert.deepEqual(rangoPeriodo('PERSONALIZADO', '2026-10-05', { desde: '2026-10-10', hasta: '2026-10-01' }), { desde: '2026-10-01', hasta: '2026-10-10' });
});

test('reportes: cobro del periodo separa capital, interés y método', () => {
  let cuotas = conIds(generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-10-06' }));
  const r1 = pagar(cuotas, 55_000, '2026-10-06'); cuotas = r1.cuotas;
  const r2 = pagar(cuotas, 30_000, '2026-10-07'); cuotas = r2.cuotas;
  const datos = {
    clientes: [{ id: 'cli1', nombreCompleto: 'Carlos Pérez' }],
    creditos: [{ id: 'k1', numero: 1, clienteId: 'cli1', fechaInicio: '2026-10-05', montoPrestado: 1_000_000, interesTotal: 100_000, totalAPagar: 1_100_000, diasGracia: 0 }],
    cuotas,
    pagos: [
      { numeroRecibo: 'R-1', fecha: '2026-10-06', monto: 55_000, metodoPago: 'Efectivo', aplicaciones: r1.aplicaciones },
      { numeroRecibo: 'R-2', fecha: '2026-10-07', monto: 30_000, metodoPago: 'Nequi', aplicaciones: r2.aplicaciones },
      { numeroRecibo: 'R-3', fecha: '2026-10-07', monto: 9_999, metodoPago: 'Nequi', aplicaciones: [], anulado: true },
    ],
  };
  const analisis = analizarCartera(datos, '2026-10-08');
  const rep = reportePeriodo({ datos, analisis }, { desde: '2026-10-01', hasta: '2026-10-07' });
  assert.equal(rep.cobro.total, 85_000);
  assert.equal(rep.cobro.capital + rep.cobro.interes, 85_000);
  assert.equal(rep.cobro.interes, 5_000 + 2_727);
  assert.deepEqual(rep.cobro.porMetodo, { Efectivo: 55_000, Nequi: 30_000 });
  assert.equal(rep.esperado, 110_000);
  assert.equal(rep.cuotasPagadas, 1);
  assert.equal(rep.nuevos.length, 1);
  assert.equal(rep.mora.length, 1); // cuota 2 parcial y la 3 vencidas al día 8
  assert.equal(serieAgrupada(rep.cobro.porDia, rep.rango).puntos.length, 7);
  const anual = serieAgrupada(rep.cobro.porDia, { desde: '2026-01-01', hasta: '2026-12-31' });
  assert.equal(anual.agrupacion, 'mes');
  assert.equal(anual.puntos.length, 12);
  assert.equal(anual.puntos[9].valor, 85_000);
});

import { construirCopia, validarCopia, leerCsv, clientesDesdeCsv } from '../js/domain/copia.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

test('copia: se construye sin datos de seguridad y valida integridad', () => {
  const datos = {
    clientes: [{ id: 'c1', nombreCompleto: 'Carlos' }],
    creditos: [{ id: 'k1', clienteId: 'c1', montoPrestado: 100, totalAPagar: 110, fechaInicio: '2026-10-01' }],
    cuotas: [{ id: 'q1', creditoId: 'k1', valorProgramado: 110, capital: 100, interes: 10, fechaVencimiento: '2026-10-02' }],
    pagos: [{ id: 'p1', creditoId: 'k1', monto: 50, fecha: '2026-10-02', aplicaciones: [{ cuotaId: 'q1' }] }],
    config: { nombreNegocio: 'X', pinHash: 'secreto', pinSalt: 'sal', pinActivo: true },
  };
  const copia = construirCopia(datos, '2026-10-05T10:00:00Z');
  assert.equal(copia.datos.config.pinHash, undefined);
  assert.equal(copia.datos.config.nombreNegocio, 'X');
  assert.deepEqual(copia.resumen, { clientes: 1, creditos: 1, cuotas: 1, pagos: 1 });
  const ida = JSON.parse(JSON.stringify(copia));
  assert.equal(validarCopia(ida).ok, true);

  const rota = structuredClone(ida);
  rota.datos.creditos[0].clienteId = 'nadie';
  rota.datos.pagos[0].aplicaciones[0].cuotaId = 'zz';
  const v = validarCopia(rota);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some(e => e.includes('créditos pertenecen')));
  assert.ok(v.errores.some(e => e.includes('pagos tienen datos inválidos')));
  assert.equal(validarCopia({ hola: 1 }).ok, false);
  assert.match(validarCopia({ ...ida, version: 99 }).errores[0], /más nueva/);
});

test('importar CSV: separadores, comillas y encabezados en español', () => {
  const csv = '﻿Nombre;Teléfono;Cédula;Notas\r\n"Pérez, Carlos";300 123 4567;1023;"Paga los ""viernes"""\r\nAna Ruiz;310 555 1234;;\r\n';
  const filas = leerCsv(csv);
  assert.equal(filas.length, 3);
  const { clientes, columnas } = clientesDesdeCsv(filas);
  assert.deepEqual(columnas.sort(), ['documento', 'nombreCompleto', 'notas', 'telefono']);
  assert.equal(clientes[0].nombreCompleto, 'Pérez, Carlos');
  assert.equal(clientes[0].notas, 'Paga los "viernes"');
  assert.equal(clientes[1].fila, 3);
  const coma = clientesDesdeCsv(leerCsv('nombre,celular\nLuis,3001112233'));
  assert.equal(coma.clientes[0].telefono, '3001112233');
  assert.ok(clientesDesdeCsv(leerCsv('a;b\n1;2')).errores.length);
});

test('service worker: guarda todos los archivos de la app', () => {
  const raiz = new URL('..', import.meta.url).pathname;
  const sw = readFileSync(join(raiz, 'service-worker.js'), 'utf8');
  const listar = d => readdirSync(join(raiz, d)).flatMap(n => statSync(join(raiz, d, n)).isDirectory() ? listar(join(d, n)) : [join(d, n)]);
  const faltan = ['css', 'js', 'icons'].flatMap(listar).filter(f => !sw.includes(`'./${f}'`));
  assert.deepEqual(faltan, [], 'Ejecuta: node tools/actualizar-sw.mjs');
});

import { diagnosticar, resumenAnonimo, promptAnalisis } from '../js/domain/diagnostico.js';
import { t, setIdioma } from '../js/core/i18n.js';

test('diagnóstico: detecta morosidad y genera resumen anónimo', () => {
  let cuotas = conIds(generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-09-01' }));
  const datos = {
    clientes: [{ id: 'cli1', nombreCompleto: 'Carlos Pérez', telefono: '3001234567', documento: '1023' }],
    creditos: [{ id: 'k1', numero: 1, clienteId: 'cli1', fechaInicio: '2026-08-31', montoPrestado: 1_000_000, interesTotal: 100_000, totalAPagar: 1_100_000, numeroCuotas: 20, frecuencia: 'DIARIA', diasGracia: 0 }],
    cuotas, pagos: [],
  };
  const analisis = analizarCartera(datos, '2026-10-10');
  const h = diagnosticar({ analisis, datos }, '2026-10-10');
  assert.equal(h[0].nivel, 'alerta');
  assert.ok(h.some(x => x.titulo.includes('Morosidad alta')));
  assert.ok(h.some(x => x.titulo.includes('ningún pago')));
  const r = resumenAnonimo({ analisis }, '2026-10-10');
  const texto = JSON.stringify(r);
  assert.ok(!texto.includes('Carlos') && !texto.includes('3001234567') && !texto.includes('1023"'));
  assert.equal(r.creditos[0].cliente, 'C1');
  assert.match(promptAnalisis(r), /No sugieras prácticas de cobranza abusivas/);
});

test('i18n: traduce y vuelve al español si falta la clave', () => {
  setIdioma('en');
  assert.equal(t('nav.creditos'), 'Loans');
  assert.equal(t('clave.inexistente'), 'clave.inexistente');
  setIdioma('xx');
  assert.equal(t('nav.creditos'), 'Créditos');
});
