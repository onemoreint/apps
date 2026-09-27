import type { Project } from './types';
import { CATALOG } from '../layout-engine/catalog';

export interface DimChain {
  axis: 'x' | 'y';
  /** coordenada de la línea de cota (y para eje x, x para eje y) */
  at: number;
  ticks: number[];
  kind: 'overall' | 'partial';
}

function merge(values: number[], min = 0.1): number[] {
  const sorted = [...new Set(values.map((v) => Math.round(v * 100) / 100))].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (!out.length || v - out[out.length - 1] >= min) out.push(v);
  // conservar siempre el último borde
  if (sorted.length && out[out.length - 1] !== sorted[sorted.length - 1]) out[out.length - 1] = sorted[sorted.length - 1];
  return out;
}

/**
 * Cotas derivadas de la geometría (nunca se guardan):
 *  - generales del lote (ancho y largo)
 *  - parciales con todos los bordes de ambientes cubiertos y los retiros
 */
export function computeDimensions(p: Project): DimChain[] {
  const { width: W, length: L } = p.site;
  const covered = p.rooms.filter((r) => CATALOG[r.type].covered);
  const xs = merge([0, W, ...covered.flatMap((r) => [r.x, r.x + r.width])]);
  const ys = merge([0, L, ...covered.flatMap((r) => [r.y, r.y + r.length])]);
  return [
    { axis: 'x', at: -0.9, ticks: xs, kind: 'partial' },
    { axis: 'x', at: -1.9, ticks: [0, W], kind: 'overall' },
    { axis: 'y', at: -0.9, ticks: ys, kind: 'partial' },
    { axis: 'y', at: -1.9, ticks: [0, L], kind: 'overall' },
  ];
}
