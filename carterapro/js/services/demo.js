// Datos de demostración creados con la misma lógica real de la app (no son datos "pintados").
import { transaccion, todos } from '../data/db.js';
import { hoy as fechaHoy, sumarDias } from '../core/dates.js';
import { getMoneda, factor } from '../core/money.js';
import { primerVencimientoSugerido } from '../domain/cuotas.js';
import { saldoCuota } from '../domain/pagos.js';
import * as clientes from './clientes.js';
import * as creditos from './creditos.js';
import * as pagos from './pagos.js';
import * as config from './config.js';
import { cambio } from './datos.js';
import { uid } from '../data/db.js';
import * as gastos from './gastos.js';
import * as caja from './caja.js';
import * as multas from './multas.js';
import * as visitas from './visitas.js';

const CLIENTES = [
  ['Carlos Pérez', '1023456789', '3001234567', 'Cra 45 #12-30', 'Medellín', 'Tienda La Esquina', 'Belén'],
  ['María Gómez', '43567890', '3109876543', 'Calle 10 #5-22', 'Envigado', 'Vecina del barrio', 'Zúñiga'],
  ['Luis Rodríguez', '71234567', '3204567890', 'Av. 80 #30-15', 'Medellín', 'Taller de motos', 'Belén'],
  ['Ana Torres', '1098765432', '3157654321', 'Calle 50 #40-10', 'Itagüí', 'Peluquería Ana', 'Santa María'],
  ['Jorge Ramírez', '98765432', '3011122334', 'Cra 70 #44-21', 'Bello', 'Referido por Carlos', 'Niquía'],
  ['Sandra Morales', '52345678', '3125556677', 'Calle 33 #66-90', 'Sabaneta', '', 'Centro'],
  ['Andrés Castro', '80123456', '3168889900', 'Cra 52 #48-11', 'Medellín', 'Vendedor ambulante', 'Guayabal'],
  ['Paola Herrera', '1037654321', '3007778899', 'Calle 65 #72-08', 'La Estrella', '', 'Ancón'],
  ['Diego Vargas', '15234567', '3143334455', 'Cra 43A #1-50', 'Envigado', 'Panadería', 'Zúñiga'],
  ['Lucía Mendoza', '39456789', '3186665544', 'Calle 9 #43-80', 'Medellín', '', 'Guayabal'],
];

// [indiceCliente, monto(COP), tipo, tasa%, interesFijo, cuotas, frecuencia, díasDesdeInicio, pagos[[díaDesdeInicio, cuotasOCantidad]], cobrador(0|1), multa]
const CREDITOS = [
  [0, 1_000_000, 'PCT_CAPITAL', 10, 0, 20, 'DIARIA', 12, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2], [8, 1], [9, 0.5], [10, 1], [11, 1]], 0, null],
  [1, 2_000_000, 'PCT_PERIODO', 5, 0, 6, 'MENSUAL', 95, [[30, 1], [61, 1], [90, 1]], 1, null],
  [2, 500_000, 'FIJO', 0, 100_000, 4, 'SEMANAL', 35, [[7, 1], [14, 1], [22, 1], [28, 1]], 0, null],
  [3, 800_000, 'PCT_CAPITAL', 20, 0, 8, 'QUINCENAL', 70, [[15, 1], [33, 1], [45, 0.4]], 1, { tipo: 'DIARIA', valor: 2_000, tope: 20_000 }],
  [4, 300_000, 'SIN_INTERES', 0, 0, 6, 'SEMANAL', 4, [], 0, null],
  [6, 400_000, 'PCT_CAPITAL', 20, 0, 24, 'DIARIA', 6, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]], 0, { tipo: 'FIJA', valor: 3_000, tope: 0 }],
  [8, 600_000, 'PCT_CAPITAL', 20, 0, 30, 'DIARIA', 9, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [9, 2]], 1, null],
];

const COBRADORES = [['Pedro Gil', '3015550101'], ['Yuli Ríos', '3025550202']];

export async function hayDemo() {
  return (await todos('clientes')).some(c => c.esDemo);
}

export async function cargar() {
  const hoy = fechaHoy();
  const escala = getMoneda().codigo === 'COP' ? 1 : 0.001;
  const dinero = v => Math.round(v * escala * factor());
  const metodos = config.get().metodosPago;

  // Cobradores de ejemplo (se quitan junto con la demo).
  const previos = config.get().cobradores || [];
  const equipo = COBRADORES.map(([nombre, telefono]) => previos.find(c => c.nombre === nombre) || { id: uid(), nombre, telefono, activo: true, esDemo: true });
  await config.guardar({ cobradores: [...previos.filter(c => !equipo.includes(c)), ...equipo] });

  const creados = [];
  for (const [nombre, documento, telefono, direccion, ciudad, referencia, sector] of CLIENTES) {
    const c = await clientes.guardar({ nombreCompleto: nombre, documento, telefono, direccion, ciudad, referencia, sector, notas: 'Cliente de demostración', esDemo: true });
    creados.push(c);
  }

  const hechos = [];
  for (const [i, monto, tipo, tasa, fijo, n, frecuencia, hace, listaPagos, cob, multa] of CREDITOS) {
    const fechaInicio = sumarDias(hoy, -hace);
    const credito = await creditos.crear({
      clienteId: creados[i].id, montoPrestado: dinero(monto), tipoInteres: tipo, tasaBp: tasa * 100,
      interesFijo: dinero(fijo), numeroCuotas: n, frecuencia, fechaInicio,
      fechaPrimerVencimiento: primerVencimientoSugerido(fechaInicio, frecuencia),
      excluirDomingos: false, diasGracia: 0, notas: 'Crédito de demostración', esDemo: true,
      cobradorId: equipo[cob].id, multa: multa ? { ...multa, valor: dinero(multa.valor), tope: dinero(multa.tope) } : null,
    });
    hechos.push(credito);
    for (const [k, [dia, cantidad]] of listaPagos.entries()) {
      const cuotas = await creditos.cuotasDe(credito.id);
      const pendiente = cuotas.filter(c => saldoCuota(c) > 0);
      if (!pendiente.length) break;
      const monto = cantidad >= 1
        ? pendiente.slice(0, cantidad).reduce((s, c) => s + saldoCuota(c), 0)
        : Math.round(saldoCuota(pendiente[0]) * cantidad);
      await pagos.registrar({
        creditoId: credito.id, monto, fecha: sumarDias(fechaInicio, dia),
        metodoPago: metodos[k % Math.min(3, metodos.length)], observacion: '', esDemo: true,
      });
    }
  }

  // Operación del día: capital inicial, base del cobrador, gastos, una multa y una visita.
  await caja.registrarMovimiento({ tipo: 'APORTE', monto: dinero(8_000_000), fecha: sumarDias(hoy, -100), nota: 'Capital inicial (demo)', esDemo: true });
  await caja.registrarMovimiento({ tipo: 'BASE', monto: dinero(200_000), fecha: hoy, cobradorId: equipo[0].id, nota: 'Base para la ruta', esDemo: true });
  await gastos.registrar({ fecha: hoy, categoria: 'Transporte', monto: dinero(15_000), descripcion: 'Gasolina de la moto', cobradorId: equipo[0].id, esDemo: true });
  await gastos.registrar({ fecha: sumarDias(hoy, -3), categoria: 'Alimentación', monto: dinero(12_000), descripcion: 'Almuerzo', cobradorId: equipo[1].id, esDemo: true });
  await multas.aplicarSugeridas(hechos[3].id);
  await visitas.registrar({ clienteId: creados[3].id, creditoId: hechos[3].id, cobradorId: equipo[1].id, fecha: sumarDias(hoy, -1), resultado: 'PROMESA', promesaFecha: hoy, nota: 'Paga cuando le consignen', esDemo: true });
  await clientes.ordenarRuta([2, 0, 6, 9, 8, 1, 3, 5, 7, 4].map(i => creados[i].id));
  cambio('demo:cargada');
}

/** Elimina solo los registros marcados como demostración. */
export async function eliminar() {
  await config.guardar({ cobradores: (config.get().cobradores || []).filter(c => !c.esDemo) });
  const stores = ['pagos', 'cuotas', 'cargos', 'visitas', 'gastos', 'caja', 'cierres', 'creditos', 'clientes'];
  await transaccion(stores, async api => {
    for (const store of stores) {
      for (const r of await api.todos(store)) if (r.esDemo) await api.delete(store, r.id);
    }
  });
  cambio('demo:eliminada');
}
