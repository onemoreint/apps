// Pruebas del motor de la versión 2: multas, caja, ruta, usura y copias v1 → v2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { multasSugeridas, distribuirMulta, saldoMultas, validarPolitica } from '../js/domain/multas.js';
import { resumenCaja, efectivoDisponible } from '../js/domain/caja.js';
import { construirRuta, enlaceMapa } from '../js/domain/ruta.js';
import { tasaEfectivaAnual, evaluarUsura } from '../js/domain/usura.js';
import { analizarCartera } from '../js/domain/metricas.js';
import { validarCopia, construirCopia } from '../js/domain/copia.js';
import { generarCuotas } from '../js/domain/cuotas.js';

const cuota = (id, numero, fecha, valor, pagado = 0) => ({ id, numero, fechaVencimiento: fecha, capital: valor, interes: 0, valorProgramado: valor, pagadoCapital: pagado, pagadoInteres: 0, valorPagado: pagado });

test('multas: fija por cuota vencida, diaria con tope y sin repetir lo ya aplicado', () => {
  const cuotas = [cuota('a', 1, '2026-10-01', 100), cuota('b', 2, '2026-10-08', 100), cuota('c', 3, '2026-10-30', 100)];
  const fija = multasSugeridas({ multa: { tipo: 'FIJA', valor: 50 } }, cuotas, [], '2026-10-10');
  assert.deepEqual(fija.map(x => [x.cuota.id, x.monto]), [['a', 50], ['b', 50]]);
  assert.equal(multasSugeridas({ multa: { tipo: 'FIJA', valor: 50 } }, cuotas, [{ cuotaId: 'a', monto: 50 }], '2026-10-10').length, 1);
  const diaria = multasSugeridas({ multa: { tipo: 'DIARIA', valor: 10, tope: 60 }, diasGracia: 2 }, cuotas, [{ cuotaId: 'a', monto: 30 }], '2026-10-10');
  // cuota a: 9 días − 2 de gracia = 7 → 70, tope 60, ya aplicado 30 → 30. cuota b: 2−2 = 0 → no está vencida.
  assert.deepEqual(diaria.map(x => [x.cuota.id, x.monto]), [['a', 30]]);
  assert.equal(multasSugeridas({ multa: null }, cuotas, [], '2026-10-10').length, 0);
  assert.ok(validarPolitica({ tipo: 'FIJA', valor: 0 }).multaValor);
});

test('multas: cobro se reparte del cargo más antiguo y respeta lo pendiente', () => {
  const cargos = [{ id: 'm2', fecha: '2026-10-05', monto: 40, pagado: 0 }, { id: 'm1', fecha: '2026-10-01', monto: 30, pagado: 10 }, { id: 'x', fecha: '2026-10-01', monto: 99, anulado: true }];
  assert.equal(saldoMultas(cargos), 60);
  assert.deepEqual(distribuirMulta(cargos, 35), [{ cargoId: 'm1', monto: 20 }, { cargoId: 'm2', monto: 15 }]);
  assert.throws(() => distribuirMulta(cargos, 61));
});

test('caja: liquidación del cobrador, renovación sin efectivo y caja general', () => {
  const datos = {
    pagos: [
      { fecha: '2026-10-26', monto: 100, multa: 10, cobradorId: 'p', aplicaciones: [{ interes: 20 }] },
      { fecha: '2026-10-26', monto: 50, cobradorId: 'y', aplicaciones: [{ interes: 5 }] },
      { fecha: '2026-10-26', monto: 500, tipo: 'RENOVACION', cobradorId: 'p', aplicaciones: [] },
      { fecha: '2026-10-26', monto: 70, anulado: true, cobradorId: 'p', aplicaciones: [] },
    ],
    creditos: [
      { fechaInicio: '2026-10-26', montoPrestado: 800, desembolso: 300, cobradorId: 'p' },
      { fechaInicio: '2026-10-26', montoPrestado: 200, cobradorId: 'y', cancelado: true },
    ],
    gastos: [{ fecha: '2026-10-26', monto: 15, cobradorId: 'p' }, { fecha: '2026-10-26', monto: 5, anulado: true }],
    caja: [{ fecha: '2026-10-01', tipo: 'APORTE', monto: 1000 }, { fecha: '2026-10-26', tipo: 'BASE', monto: 400, cobradorId: 'p' }, { fecha: '2026-10-20', tipo: 'RETIRO', monto: 100 }],
  };
  const p = resumenCaja(datos, { desde: '2026-10-26', hasta: '2026-10-26', cobradorId: 'p' });
  assert.equal(p.cobrado, 110);
  assert.equal(p.prestado, 300);
  assert.equal(p.base, 400);
  assert.equal(p.esperado, 400 + 110 - 300 - 15);
  const todo = resumenCaja(datos, { desde: '2026-10-26', hasta: '2026-10-26' });
  assert.equal(todo.base, 0, 'la base no cuenta para el negocio completo');
  assert.equal(todo.utilidad, 25 + 10 - 15);
  assert.equal(efectivoDisponible(datos, '2026-10-26'), 1000 - 100 + 160 - 300 - 15);
});

test('ruta: una parada por cliente, orden, estados y filtro por cobrador', () => {
  const clientes = [
    { id: 'c1', nombreCompleto: 'Zoe', ordenRuta: 20, direccion: 'Cra 1', ciudad: 'Medellín' },
    { id: 'c2', nombreCompleto: 'Ana', ordenRuta: 10 },
    { id: 'c3', nombreCompleto: 'Luis' },
  ];
  const creditos = [
    { id: 'k1', clienteId: 'c1', cobradorId: 'p' }, { id: 'k2', clienteId: 'c1', cobradorId: 'p' },
    { id: 'k3', clienteId: 'c2', cobradorId: 'y' }, { id: 'k4', clienteId: 'c3', cobradorId: 'p' },
  ];
  const cuotas = [
    { ...cuota('q1', 1, '2026-10-26', 100), creditoId: 'k1' }, { ...cuota('q2', 1, '2026-10-20', 50), creditoId: 'k2' },
    { ...cuota('q3', 1, '2026-10-26', 80, 80), creditoId: 'k3' }, { ...cuota('q4', 1, '2026-11-02', 70), creditoId: 'k4' },
  ];
  const pagos = [{ creditoId: 'k3', fecha: '2026-10-26', monto: 80 }];
  const visitas = [{ clienteId: 'c1', fecha: '2026-10-26', resultado: 'NO_ESTABA', creadoEn: 'x' }];
  const a = analizarCartera({ clientes, creditos, cuotas, pagos }, '2026-10-26');
  const { paradas, totales } = construirRuta(a.creditos, { pagos, visitas }, '2026-10-26');
  assert.deepEqual(paradas.map(p => [p.cliente.id, p.estado]), [['c2', 'PAGADO'], ['c1', 'VISITADO']]);
  assert.equal(paradas[1].exigible, 150);
  assert.deepEqual(totales, { paradas: 2, visitadas: 2, porCobrar: 150, recaudado: 80, meta: 230 });
  assert.equal(construirRuta(a.creditos, { pagos, visitas }, '2026-10-26', 'y').paradas.length, 1);
  assert.match(enlaceMapa(clientes[0]), /google\.com\/maps.*Cra%201/);
  assert.equal(enlaceMapa(clientes[1]), null);
});

test('usura: tasa efectiva anual del plan de cuotas', () => {
  // 1.000.000 al 10 % en 20 cuotas diarias: ≈ 0,95 % diario → cerca de 3.000 % E.A.
  const cuotas = generarCuotas({ montoPrestado: 1_000_000, interesTotal: 100_000, numeroCuotas: 20, frecuencia: 'DIARIA', fechaPrimerVencimiento: '2026-10-02' });
  const ea = tasaEfectivaAnual(1_000_000, '2026-10-01', cuotas);
  assert.ok(ea > 20 && ea < 60, String(ea));
  // Un pago único de 1.100 a un año exacto = 10 % E.A.
  const anual = tasaEfectivaAnual(1000, '2025-10-01', [{ fechaVencimiento: '2026-10-01', valorProgramado: 1100 }]);
  assert.ok(Math.abs(anual - 0.1) < 0.0005, String(anual));
  assert.equal(evaluarUsura(anual, '26,5'.replace(',', '.')).estado, 'OK');
  assert.equal(evaluarUsura(ea, 26.5).estado, 'EXCEDE');
  assert.equal(evaluarUsura(ea, '').estado, 'SIN_TOPE');
});

test('copias: una copia v1 (sin caja ni gastos) sigue siendo válida', () => {
  const v1 = { formato: 'carterapro-backup', version: 1, datos: { clientes: [{ id: 'c', nombreCompleto: 'A' }], creditos: [], cuotas: [], pagos: [] } };
  assert.equal(validarCopia(v1).ok, true);
  const v2 = construirCopia({ ...v1.datos, gastos: [{ id: 'g', monto: 5, fecha: '2026-10-01' }] });
  assert.equal(v2.version, 2);
  assert.deepEqual(v2.datos.cargos, []);
  assert.equal(validarCopia(JSON.parse(JSON.stringify(v2))).ok, true);
  const mala = structuredClone(v2); mala.datos.gastos[0].monto = -1;
  assert.equal(validarCopia(mala).ok, false);
});
