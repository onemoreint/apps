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

const CLIENTES = [
  ['Carlos Pérez', '1023456789', '3001234567', 'Cra 45 #12-30', 'Medellín', 'Tienda La Esquina'],
  ['María Gómez', '43567890', '3109876543', 'Calle 10 #5-22', 'Envigado', 'Vecina del barrio'],
  ['Luis Rodríguez', '71234567', '3204567890', 'Av. 80 #30-15', 'Medellín', 'Taller de motos'],
  ['Ana Torres', '1098765432', '3157654321', 'Calle 50 #40-10', 'Itagüí', 'Peluquería Ana'],
  ['Jorge Ramírez', '98765432', '3011122334', 'Cra 70 #44-21', 'Bello', 'Referido por Carlos'],
  ['Sandra Morales', '52345678', '3125556677', 'Calle 33 #66-90', 'Sabaneta', ''],
  ['Andrés Castro', '80123456', '3168889900', 'Cra 52 #48-11', 'Medellín', 'Vendedor ambulante'],
  ['Paola Herrera', '1037654321', '3007778899', 'Calle 65 #72-08', 'La Estrella', ''],
  ['Diego Vargas', '15234567', '3143334455', 'Cra 43A #1-50', 'Envigado', 'Panadería'],
  ['Lucía Mendoza', '39456789', '3186665544', 'Calle 9 #43-80', 'Medellín', ''],
];

// [indiceCliente, monto(COP), tipo, tasa%, interesFijo, cuotas, frecuencia, díasDesdeInicio, pagos[[díaDesdeInicio, cuotasOCantidad]]]
const CREDITOS = [
  [0, 1_000_000, 'PCT_CAPITAL', 10, 0, 20, 'DIARIA', 12, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2], [8, 1], [9, 0.5], [10, 1], [11, 1]]],
  [1, 2_000_000, 'PCT_PERIODO', 5, 0, 6, 'MENSUAL', 95, [[30, 1], [61, 1], [90, 1]]],
  [2, 500_000, 'FIJO', 0, 100_000, 4, 'SEMANAL', 35, [[7, 1], [14, 1], [22, 1], [28, 1]]],
  [3, 800_000, 'PCT_CAPITAL', 20, 0, 8, 'QUINCENAL', 70, [[15, 1], [33, 1], [45, 0.4]]],
  [4, 300_000, 'SIN_INTERES', 0, 0, 6, 'SEMANAL', 4, []],
];

export async function hayDemo() {
  return (await todos('clientes')).some(c => c.esDemo);
}

export async function cargar() {
  const hoy = fechaHoy();
  const escala = getMoneda().codigo === 'COP' ? 1 : 0.001;
  const dinero = v => Math.round(v * escala * factor());
  const metodos = config.get().metodosPago;

  const creados = [];
  for (const [nombre, documento, telefono, direccion, ciudad, referencia] of CLIENTES) {
    creados.push(await clientes.guardar({ nombreCompleto: nombre, documento, telefono, direccion, ciudad, referencia, notas: 'Cliente de demostración', esDemo: true }));
  }

  for (const [i, monto, tipo, tasa, fijo, n, frecuencia, hace, listaPagos] of CREDITOS) {
    const fechaInicio = sumarDias(hoy, -hace);
    const credito = await creditos.crear({
      clienteId: creados[i].id, montoPrestado: dinero(monto), tipoInteres: tipo, tasaBp: tasa * 100,
      interesFijo: dinero(fijo), numeroCuotas: n, frecuencia, fechaInicio,
      fechaPrimerVencimiento: primerVencimientoSugerido(fechaInicio, frecuencia),
      excluirDomingos: false, diasGracia: 0, notas: 'Crédito de demostración', esDemo: true,
    });
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
  cambio('demo:cargada');
}

/** Elimina solo los registros marcados como demostración. */
export async function eliminar() {
  await transaccion(['clientes', 'creditos', 'cuotas', 'pagos'], async api => {
    for (const store of ['pagos', 'cuotas', 'creditos', 'clientes']) {
      for (const r of await api.todos(store)) if (r.esDemo) await api.delete(store, r.id);
    }
  });
  cambio('demo:eliminada');
}
