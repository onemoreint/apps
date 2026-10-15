// Lógica de negocio pura: sin React ni DOM. Cada función replica una parte
// observada del Excel "Organizador – Plantilla Finanzas Personales Mensual".

export type Tipo = 'Ingreso' | 'Gasto' | 'Ahorro';

export const TIPOS: Tipo[] = ['Ingreso', 'Gasto', 'Ahorro'];

/** Grupos por tipo (columna "Grupo" del registro). */
export const GRUPOS: Record<Tipo, string[]> = {
  Ingreso: ['Fijo', 'Variable'],
  Gasto: ['Obligatorio', 'Necesario', 'NoEsencial'],
  Ahorro: ['Ahorros'],
};

/** Nombre de la tabla del Excel que alimenta cada lista (Ingreso_Fijo, Gasto_Obligatorios…). */
export const NOMBRE_TABLA: Record<string, string> = {
  'Ingreso|Fijo': 'Ingreso_Fijo',
  'Ingreso|Variable': 'Ingreso_Variable',
  'Ahorro|Ahorros': 'Ahorro_Ahorros',
  'Gasto|Obligatorio': 'Gasto_Obligatorios',
  'Gasto|Necesario': 'Gasto_Necesario',
  'Gasto|NoEsencial': 'Gasto_NoEsencial',
};

export interface Movimiento {
  id: string;
  /** ISO yyyy-mm-dd */
  fecha: string;
  detalle: string;
  tipo: Tipo;
  grupo: string;
  categoria: string;
  /** null = celda vacía en el Excel (cuenta como 0, se muestra "$-"). */
  importe: number | null;
}

/** Clave `${tipo}|${grupo}` → categorías. */
export type Catalogo = Record<string, string[]>;

export interface MesConfig {
  /** Presupuesto de gastos. Clave `${grupo}|${categoria}`. */
  presupuesto: Record<string, number>;
  metaAhorro: number;
  /** Hipótesis H2: acumulado previo que alimenta la tarjeta "En total". */
  saldoInicial: number;
}

export interface Ajustes {
  /** true = reproduce el Top 5 del Excel tal cual (repite categorías empatadas). */
  top5ModoExcel: boolean;
  formato: 'excel' | 'co';
}

export interface Estado {
  version: 1;
  movimientos: Movimiento[];
  catalogo: Catalogo;
  meses: Record<string, MesConfig>;
  ajustes: Ajustes;
}

export const claveGrupo = (tipo: Tipo, grupo: string) => `${tipo}|${grupo}`;
export const claveCat = (grupo: string, categoria: string) => `${grupo}|${categoria}`;

export const mesDe = (fecha: string) => fecha.slice(0, 7);
export const valor = (m: Movimiento) => m.importe ?? 0;
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function delMes(movs: Movimiento[], mes: string) {
  return movs.filter((m) => mesDe(m.fecha) === mes);
}

export function totalTipo(movs: Movimiento[], tipo: Tipo) {
  return suma(movs.filter((m) => m.tipo === tipo).map(valor));
}

export function configVacia(): MesConfig {
  return { presupuesto: {}, metaAhorro: 0, saldoInicial: 0 };
}

export function presupuestoGrupo(cfg: MesConfig, grupo: string) {
  return suma(
    Object.entries(cfg.presupuesto)
      .filter(([k]) => k.split('|')[0] === grupo)
      .map(([, v]) => v || 0),
  );
}

export function presupuestoTotal(cfg: MesConfig) {
  return suma(Object.values(cfg.presupuesto).map((v) => v || 0));
}

export interface Resumen {
  ingresos: number;
  gastos: number;
  ahorro: number;
  presupuestoGastos: number;
  /** H1: presupuesto de gastos − gasto total */
  puedesGastar: number;
  /** ingresos − gastos − ahorro: lo que queda libre este mes */
  balance: number;
  /** H2: saldo inicial + ingresos − gastos */
  enTotal: number;
  metaAhorro: number;
  faltaMeta: number;
  /** 0..1 (puede superar 1 si se pasa la meta) */
  avanceMeta: number;
}

export function resumen(movsMes: Movimiento[], cfg: MesConfig): Resumen {
  const ingresos = totalTipo(movsMes, 'Ingreso');
  const gastos = totalTipo(movsMes, 'Gasto');
  const ahorro = totalTipo(movsMes, 'Ahorro');
  const presupuestoGastos = presupuestoTotal(cfg);
  const metaAhorro = cfg.metaAhorro || 0;
  return {
    ingresos,
    gastos,
    ahorro,
    presupuestoGastos,
    puedesGastar: presupuestoGastos - gastos,
    balance: ingresos - gastos - ahorro,
    enTotal: (cfg.saldoInicial || 0) + ingresos - gastos,
    metaAhorro,
    faltaMeta: Math.max(0, metaAhorro - ahorro),
    avanceMeta: metaAhorro > 0 ? ahorro / metaAhorro : 0,
  };
}

/** Suma por categoría para un tipo (y opcionalmente un grupo), en el orden del catálogo
 *  y agregando al final las categorías usadas que no estén en él. */
export function porCategoria(
  movs: Movimiento[],
  catalogo: Catalogo,
  tipo: Tipo,
  grupo?: string,
): { grupo: string; categoria: string; total: number }[] {
  const grupos = grupo ? [grupo] : GRUPOS[tipo];
  const out: { grupo: string; categoria: string; total: number }[] = [];
  for (const g of grupos) {
    const lista = [...(catalogo[claveGrupo(tipo, g)] ?? [])];
    for (const m of movs) {
      if (m.tipo === tipo && m.grupo === g && m.categoria && !lista.includes(m.categoria)) lista.push(m.categoria);
    }
    for (const c of lista) {
      out.push({
        grupo: g,
        categoria: c,
        total: suma(movs.filter((m) => m.tipo === tipo && m.grupo === g && m.categoria === c).map(valor)),
      });
    }
  }
  return out;
}

export function realPorGrupo(movs: Movimiento[], tipo: Tipo = 'Gasto') {
  return GRUPOS[tipo].map((g) => ({
    grupo: g,
    total: suma(movs.filter((m) => m.tipo === tipo && m.grupo === g).map(valor)),
  }));
}

/**
 * Top 5 de gastos NoEsencial del mes (tarjeta "MARZO").
 * modoExcel=true replica la fórmula observada: para k=1..5 toma K.ESIMO.MAYOR(k)
 * y busca la PRIMERA categoría con ese valor, por lo que los empates se repiten
 * (en el video aparece "Restaurantes $0.00" dos veces).
 */
export function top5NoEsencial(movs: Movimiento[], catalogo: Catalogo, modoExcel: boolean) {
  const filas = porCategoria(movs, catalogo, 'Gasto', 'NoEsencial');
  if (modoExcel) {
    const valores = filas.map((f) => f.total).sort((a, b) => b - a);
    const out: { categoria: string; total: number }[] = [];
    for (let k = 0; k < Math.min(5, valores.length); k++) {
      const v = valores[k];
      const f = filas.find((x) => x.total === v)!;
      out.push({ categoria: f.categoria, total: v });
    }
    return out;
  }
  return [...filas]
    .sort((a, b) => b.total - a.total) // sort estable: empates conservan el orden del catálogo
    .slice(0, 5)
    .map(({ categoria, total }) => ({ categoria, total }));
}

/** Seguimiento por día: suma de importes por fecha con filtros opcionales. */
export function porDia(movs: Movimiento[], filtro: { tipo?: Tipo | ''; grupo?: string }) {
  const map = new Map<string, number>();
  for (const m of movs) {
    if (filtro.tipo && m.tipo !== filtro.tipo) continue;
    if (filtro.grupo && m.grupo !== filtro.grupo) continue;
    map.set(m.fecha, (map.get(m.fecha) ?? 0) + valor(m));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, total]) => ({ fecha, total }));
}

export interface ErroresMov {
  fecha?: string;
  tipo?: string;
  grupo?: string;
  categoria?: string;
  importe?: string;
  detalle?: string;
}

export function validarMovimiento(
  m: Partial<Omit<Movimiento, 'importe'>> & { importe?: string | number | null },
  catalogo: Catalogo,
): ErroresMov {
  const e: ErroresMov = {};
  if (!m.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha) || isNaN(Date.parse(m.fecha))) e.fecha = 'Indica una fecha válida.';
  if (!m.tipo || !TIPOS.includes(m.tipo)) e.tipo = 'Elige Ingreso, Gasto o Ahorro.';
  else if (!m.grupo || !GRUPOS[m.tipo].includes(m.grupo)) e.grupo = `Elige un grupo de ${m.tipo}.`;
  else if (!m.categoria) e.categoria = 'Elige una categoría.';
  else if (!(catalogo[claveGrupo(m.tipo, m.grupo)] ?? []).includes(m.categoria))
    e.categoria = `"${m.categoria}" no está en la lista ${NOMBRE_TABLA[claveGrupo(m.tipo, m.grupo)]}.`;
  if ((m.detalle ?? '').length > 120) e.detalle = 'Máximo 120 caracteres.';
  const imp = m.importe;
  if (imp !== null && imp !== undefined && imp !== '') {
    const n = typeof imp === 'number' ? imp : parseImporte(imp);
    if (n === null) e.importe = 'Escribe solo números, por ejemplo 250000.';
    else if (n < 0) e.importe = 'El importe no puede ser negativo. Usa el Tipo para indicar si sale dinero.';
    else if (n > 1e13) e.importe = 'El importe es demasiado grande.';
  }
  return e;
}

/** Acepta "250000", "250.000", "250,000", "1.234.567,89", "$ 80,000.00". */
export function parseImporte(txt: string): number | null {
  let s = txt.replace(/[\s$]/g, '');
  if (s === '') return null;
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const decSep = (() => {
    if (lastDot >= 0 && lastComma >= 0) return lastDot > lastComma ? '.' : ',';
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : '';
    if (!sep) return '';
    const parts = s.split(sep);
    // un único separador seguido de 1-2 dígitos = decimales; si no, miles
    return parts.length === 2 && parts[1].length <= 2 ? sep : '';
  })();
  if (decSep) {
    const thou = decSep === '.' ? ',' : '.';
    s = s.split(thou).join('').replace(decSep, '.');
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface Alerta {
  nivel: 'aviso' | 'critico';
  texto: string;
}

/** Mejora B: alertas de coherencia y sobre-presupuesto. */
export function alertas(movsMes: Movimiento[], cfg: MesConfig, catalogo: Catalogo): Alerta[] {
  const out: Alerta[] = [];
  const r = resumen(movsMes, cfg);
  if (r.presupuestoGastos > 0 && r.puedesGastar < 0)
    out.push({ nivel: 'critico', texto: `Superaste el presupuesto de gastos del mes.` });
  for (const f of porCategoria(movsMes, catalogo, 'Gasto')) {
    const p = cfg.presupuesto[claveCat(f.grupo, f.categoria)] || 0;
    if (p > 0 && f.total > p) out.push({ nivel: 'aviso', texto: `${f.categoria}: gastado ${pct(f.total / p)} de lo presupuestado.` });
    else if (p === 0 && f.total > 0 && r.presupuestoGastos > 0)
      out.push({ nivel: 'aviso', texto: `${f.categoria} tiene gastos pero no tiene presupuesto.` });
  }
  if (r.ingresos > 0 && r.gastos + r.ahorro > r.ingresos)
    out.push({ nivel: 'critico', texto: 'Gastos más ahorro superan los ingresos registrados del mes.' });
  const sinImporte = movsMes.filter((m) => m.importe === null).length;
  if (sinImporte) out.push({ nivel: 'aviso', texto: `${sinImporte} movimiento(s) sin importe; cuentan como $0.` });
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function mesesConDatos(e: Estado): string[] {
  const s = new Set<string>([...e.movimientos.map((m) => mesDe(m.fecha)), ...Object.keys(e.meses)]);
  return [...s].filter(Boolean).sort();
}

/** Mes anterior en formato yyyy-mm. */
export function mesAnterior(mes: string) {
  const [y, m] = mes.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** CSV con separador ";" (abre bien en Excel en español) y BOM UTF-8. */
export function aCSV(movs: Movimiento[]) {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const filas = [['Fecha', 'Detalle', 'Tipo', 'Grupo', 'Categoria', 'Importe']];
  for (const m of [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const [y, mo, d] = m.fecha.split('-');
    filas.push([`${d}/${mo}/${y}`, m.detalle, m.tipo, m.grupo, m.categoria, m.importe === null ? '' : String(m.importe).replace('.', ',')]);
  }
  return '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
}

/** Valida y normaliza un respaldo JSON importado. Lanza Error con mensaje claro. */
export function leerRespaldo(txt: string): Estado {
  let o: unknown;
  try {
    o = JSON.parse(txt);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const e = o as Partial<Estado>;
  if (!e || typeof e !== 'object' || !Array.isArray(e.movimientos) || typeof e.catalogo !== 'object')
    throw new Error('El archivo no parece un respaldo de esta app (faltan movimientos o catálogos).');
  for (const m of e.movimientos) {
    if (!m || typeof m.fecha !== 'string' || !TIPOS.includes(m.tipo) || typeof m.grupo !== 'string')
      throw new Error('Hay movimientos con datos incompletos en el respaldo.');
    if (m.importe !== null && typeof m.importe !== 'number') throw new Error('Hay importes no numéricos en el respaldo.');
  }
  return {
    version: 1,
    movimientos: e.movimientos.map((m) => ({ ...m, id: m.id || nuevoId(), detalle: m.detalle ?? '', categoria: m.categoria ?? '' })),
    catalogo: e.catalogo as Catalogo,
    meses: (e.meses as Record<string, MesConfig>) ?? {},
    ajustes: { top5ModoExcel: false, formato: 'excel', ...(e.ajustes ?? {}) },
  };
}

export function nuevoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
