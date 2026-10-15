import type { Catalogo, Estado, MesConfig, Movimiento } from './finance';

/** Catálogos exactamente como aparecen en la hoja "Registro de movimientos". */
export const CATALOGO_ORIGINAL: Catalogo = {
  'Ingreso|Fijo': ['Sueldo Fijo', 'Rentas', 'Otros ing fijos'],
  'Ingreso|Variable': ['Sesión', 'Chivo', 'Chivo propio', 'Otros'],
  'Ahorro|Ahorros': ['Fondo emergencias', 'Fondo inversiones', 'Meta 1', 'Meta 2'],
  'Gasto|Obligatorio': ['Alquiler', 'Préstamo', 'Celular', 'Internet', 'Luz', 'Mantenimiento edificio'],
  'Gasto|Necesario': ['Pasajes corredor', 'Pasajes taxi', 'Gasolina', 'Comida super', 'Gas', 'Salud', 'Pelo'],
  'Gasto|NoEsencial': ['Ropa', 'Rappi', 'Restaurantes', 'Salidas', 'Propina', 'Gastos hormiga', 'Zapatillas'],
};

type Fila = [string, string, Movimiento['tipo'], string, string, number | null];

/** Las 14 filas del registro tal como se leen en el video (marzo 2025). */
const FILAS_VIDEO: Fila[] = [
  ['2025-03-07', 'Luz', 'Gasto', 'Obligatorio', 'Luz', 80000],
  ['2025-03-08', 'Comida', 'Gasto', 'Necesario', 'Comida super', null],
  ['2025-03-09', 'Sueldo', 'Ingreso', 'Fijo', 'Sueldo Fijo', 5000000],
  ['2025-03-10', 'Ahorro', 'Ahorro', 'Ahorros', 'Fondo emergencias', 1000000],
  ['2025-03-11', 'Ropa', 'Gasto', 'NoEsencial', 'Ropa', 543090],
  ['2025-03-12', 'Maquillaje', 'Gasto', 'NoEsencial', 'Zapatillas', 243000],
  ['2025-03-13', 'Rappi', 'Gasto', 'NoEsencial', 'Rappi', 500000],
  ['2025-03-14', 'TELEFONO', 'Gasto', 'Obligatorio', 'Celular', 100000],
  ['2025-03-15', 'Rappi', 'Gasto', 'NoEsencial', 'Rappi', 90000],
  ['2025-03-16', 'Rappi', 'Gasto', 'NoEsencial', 'Rappi', 120000],
  ['2025-03-17', 'Taxi', 'Gasto', 'Necesario', 'Pasajes taxi', 10000],
  ['2025-03-18', 'Rappi', 'Gasto', 'NoEsencial', 'Rappi', 250000],
  ['2025-03-18', 'Rappi', 'Gasto', 'NoEsencial', 'Rappi', 150000],
  ['2025-03-19', 'Gasolina', 'Gasto', 'Necesario', 'Gasolina', 240000],
];

export const MOVIMIENTOS_VIDEO: Movimiento[] = FILAS_VIDEO.map(([fecha, detalle, tipo, grupo, categoria, importe], i) => ({
  id: `video-${i + 1}`,
  fecha,
  detalle,
  tipo,
  grupo,
  categoria,
  importe,
}));

/**
 * Presupuesto de EJEMPLO. La hoja "Mar - Arma tu presupuesto" no aparece en el video;
 * estos montos son supuestos, repartidos según la forma del gráfico
 * "Gastos presupuesto vs real" y ajustados para que su suma (5.566.500)
 * reproduzca "Puedes gastar: $3,240,410.00".
 */
export const CONFIG_MARZO_EJEMPLO: MesConfig = {
  presupuesto: {
    'Obligatorio|Alquiler': 2500000,
    'Obligatorio|Préstamo': 1000000,
    'Obligatorio|Celular': 100000,
    'Obligatorio|Internet': 150000,
    'Obligatorio|Luz': 80000,
    'Obligatorio|Mantenimiento edificio': 236500,
    'Necesario|Pasajes corredor': 50000,
    'Necesario|Pasajes taxi': 50000,
    'Necesario|Gasolina': 240000,
    'Necesario|Comida super': 200000,
    'Necesario|Gas': 20000,
    'NoEsencial|Ropa': 300000,
    'NoEsencial|Rappi': 400000,
    'NoEsencial|Restaurantes': 150000,
    'NoEsencial|Salidas': 90000,
  },
  metaAhorro: 3000000,
  saldoInicial: 10000000,
};

export function estadoEjemplo(): Estado {
  return {
    version: 1,
    movimientos: MOVIMIENTOS_VIDEO.map((m) => ({ ...m })),
    catalogo: structuredClone(CATALOGO_ORIGINAL),
    meses: { '2025-03': structuredClone(CONFIG_MARZO_EJEMPLO) },
    ajustes: { top5ModoExcel: false, formato: 'excel' },
  };
}

export function estadoVacio(mes: string): Estado {
  return {
    version: 1,
    movimientos: [],
    catalogo: structuredClone(CATALOGO_ORIGINAL),
    meses: { [mes]: { presupuesto: {}, metaAhorro: 0, saldoInicial: 0 } },
    ajustes: { top5ModoExcel: false, formato: 'excel' },
  };
}
