import { describe, expect, it } from 'vitest';
import {
  aCSV, alertas, delMes, leerRespaldo, parseImporte, porCategoria, porDia, presupuestoGrupo,
  realPorGrupo, resumen, top5NoEsencial, validarMovimiento, mesAnterior, type Movimiento,
} from './finance';
import { CATALOGO_ORIGINAL, CONFIG_MARZO_EJEMPLO, MOVIMIENTOS_VIDEO, estadoEjemplo } from './ejemplo';
import { dinero, fechaExcel } from './format';

const marzo = delMes(MOVIMIENTOS_VIDEO, '2025-03');
const r = resumen(marzo, CONFIG_MARZO_EJEMPLO);

describe('Casos del video (dashboard de marzo)', () => {
  it('V1 Gasto total = $2,326,090.00', () => expect(dinero(r.gastos)).toBe('$2,326,090.00'));
  it('V2 Tus ingresos = $5,000,000.00', () => expect(dinero(r.ingresos)).toBe('$5,000,000.00'));
  it('V3 Vas ahorrando = $1,000,000.00', () => expect(dinero(r.ahorro)).toBe('$1,000,000.00'));
  it('V4 Puedes gastar = $3,240,410.00 (H1 con presupuesto de ejemplo)', () =>
    expect(dinero(r.puedesGastar)).toBe('$3,240,410.00'));
  it('V5 En total = $12,673,910.00 (H2 con saldo inicial 10 M)', () => expect(dinero(r.enTotal)).toBe('$12,673,910.00'));
  it('V6 Meta de ahorro: faltan $2.000.000 y 33 %', () => {
    expect(r.faltaMeta).toBe(2000000);
    expect(Math.round(r.avanceMeta * 100)).toBe(33);
  });
  it('V7 Top 5 NoEsencial modo Excel repite "Restaurantes"', () => {
    expect(top5NoEsencial(marzo, CATALOGO_ORIGINAL, true)).toEqual([
      { categoria: 'Rappi', total: 1110000 },
      { categoria: 'Ropa', total: 543090 },
      { categoria: 'Zapatillas', total: 243000 },
      { categoria: 'Restaurantes', total: 0 },
      { categoria: 'Restaurantes', total: 0 },
    ]);
  });
  it('V8 Top 5 corregido no repite categorías', () => {
    const t = top5NoEsencial(marzo, CATALOGO_ORIGINAL, false).map((x) => x.categoria);
    expect(t).toEqual(['Rappi', 'Ropa', 'Zapatillas', 'Restaurantes', 'Salidas']);
  });
  it('V9 Detalle de gastos: Rappi 1.110.000, Luz 80.000, Celular 100.000, Pasajes taxi 10.000, Comida super 0', () => {
    const m = Object.fromEntries(porCategoria(marzo, CATALOGO_ORIGINAL, 'Gasto').map((f) => [f.categoria, f.total]));
    expect(m['Rappi']).toBe(1110000);
    expect(m['Luz']).toBe(80000);
    expect(m['Celular']).toBe(100000);
    expect(m['Pasajes taxi']).toBe(10000);
    expect(m['Comida super']).toBe(0);
  });
  it('V10 Real por grupo coincide con barras azules', () => {
    expect(realPorGrupo(marzo)).toEqual([
      { grupo: 'Obligatorio', total: 180000 },
      { grupo: 'Necesario', total: 250000 },
      { grupo: 'NoEsencial', total: 1896090 },
    ]);
  });
  it('V11 Presupuesto por grupo conserva la forma del gráfico (Obligatorio >> NoEsencial > Necesario)', () => {
    const o = presupuestoGrupo(CONFIG_MARZO_EJEMPLO, 'Obligatorio');
    const n = presupuestoGrupo(CONFIG_MARZO_EJEMPLO, 'Necesario');
    const ne = presupuestoGrupo(CONFIG_MARZO_EJEMPLO, 'NoEsencial');
    expect(o).toBeGreaterThan(ne);
    expect(ne).toBeGreaterThan(n);
  });
  it('V12 Seguimiento por día de gastos agrupa el 18-Mar (250k + 150k)', () => {
    const d = porDia(marzo, { tipo: 'Gasto' });
    expect(d.find((x) => x.fecha === '2025-03-18')?.total).toBe(400000);
    expect(d.find((x) => x.fecha === '2025-03-09')).toBeUndefined();
  });
});

describe('Bordes y validaciones', () => {
  it('mes vacío da ceros y sin división por cero', () => {
    const v = resumen([], { presupuesto: {}, metaAhorro: 0, saldoInicial: 0 });
    expect(v).toMatchObject({ ingresos: 0, gastos: 0, puedesGastar: 0, avanceMeta: 0, faltaMeta: 0 });
  });
  it('meta superada: falta 0 y avance > 100 %', () => {
    const v = resumen(marzo, { ...CONFIG_MARZO_EJEMPLO, metaAhorro: 500000 });
    expect(v.faltaMeta).toBe(0);
    expect(v.avanceMeta).toBe(2);
  });
  it('decimales se suman sin perder centavos visibles', () => {
    const ms: Movimiento[] = [0.1, 0.2].map((x, i) => ({ id: String(i), fecha: '2025-01-01', detalle: '', tipo: 'Gasto', grupo: 'Necesario', categoria: 'Gas', importe: x }));
    expect(dinero(resumen(ms, { presupuesto: {}, metaAhorro: 0, saldoInicial: 0 }).gastos)).toBe('$0.30');
  });
  it('parseImporte entiende formatos comunes', () => {
    expect(parseImporte('250000')).toBe(250000);
    expect(parseImporte('250.000')).toBe(250000);
    expect(parseImporte('250,000')).toBe(250000);
    expect(parseImporte('$80,000.00')).toBe(80000);
    expect(parseImporte('1.234.567,89')).toBe(1234567.89);
    expect(parseImporte('12,5')).toBe(12.5);
    expect(parseImporte('abc')).toBeNull();
    expect(parseImporte('')).toBeNull();
  });
  it('validación rechaza negativos, categoría fuera de lista y fecha vacía', () => {
    const e = validarMovimiento({ fecha: '', tipo: 'Gasto', grupo: 'NoEsencial', categoria: 'Luz', importe: '-5' }, CATALOGO_ORIGINAL);
    expect(e.fecha).toBeTruthy();
    expect(e.categoria).toContain('Gasto_NoEsencial');
    expect(e.importe).toBeTruthy();
  });
  it('validación acepta importe vacío como en el Excel', () => {
    expect(validarMovimiento({ fecha: '2025-03-08', tipo: 'Gasto', grupo: 'Necesario', categoria: 'Comida super', importe: '' }, CATALOGO_ORIGINAL)).toEqual({});
  });
  it('grupo incoherente con el tipo es error', () => {
    expect(validarMovimiento({ fecha: '2025-03-08', tipo: 'Ingreso', grupo: 'Necesario', categoria: 'Gas', importe: 1 }, CATALOGO_ORIGINAL).grupo).toBeTruthy();
  });
  it('alertas detectan sobre-presupuesto (Rappi 1.110.000 vs 400.000) y fila sin importe', () => {
    const a = alertas(marzo, CONFIG_MARZO_EJEMPLO, CATALOGO_ORIGINAL).map((x) => x.texto).join(' | ');
    expect(a).toContain('Rappi');
    expect(a).toContain('sin importe');
  });
  it('mesAnterior cruza de año', () => {
    expect(mesAnterior('2025-01')).toBe('2024-12');
    expect(mesAnterior('2025-03')).toBe('2025-02');
  });
  it('CSV usa ; y fecha d/mm/aaaa', () => {
    const csv = aCSV(marzo.slice(0, 2));
    expect(csv.split('\r\n')[1]).toBe('7/03/2025;Luz;Gasto;Obligatorio;Luz;80000'.replace('7/03', '07/03'));
    expect(csv.split('\r\n')[2].endsWith(';')).toBe(true);
    expect(fechaExcel('2025-03-07')).toBe('7/03/2025');
  });
  it('respaldo JSON ida y vuelta conserva los datos', () => {
    const e = estadoEjemplo();
    const back = leerRespaldo(JSON.stringify(e));
    expect(back.movimientos).toHaveLength(14);
    expect(resumen(delMes(back.movimientos, '2025-03'), back.meses['2025-03']).puedesGastar).toBe(3240410);
  });
  it('respaldo inválido da mensaje claro', () => {
    expect(() => leerRespaldo('{')).toThrow('JSON válido');
    expect(() => leerRespaldo('{"a":1}')).toThrow('respaldo');
  });
  it('formato Colombia', () => expect(dinero(3240410, 'co')).toMatch(/^\$ 3\.240\.410$/));
});
