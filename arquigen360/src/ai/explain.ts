import type { Project } from '../geometry/types';
import { CATALOG } from '../layout-engine/catalog';
import { computeAreas, validate } from '../layout-engine/validate';

export interface Explanation {
  summary: string;
  points: string[];
  /** advertencia fija: la explicación no es una aprobación */
  disclaimer: string;
}

const pct = (v: number) => `${v.toFixed(1)} %`;

/** Explicación determinista de la propuesta actual (no usa red) */
export function explainLocally(p: Project): Explanation {
  const a = computeAreas(p);
  const issues = validate(p);
  const covered = p.rooms.filter((r) => CATALOG[r.type].covered && r.type !== 'hall');
  const beds = p.rooms.filter((r) => r.type === 'bedroom' || r.type === 'master_bedroom').length;
  const baths = p.rooms.filter((r) => r.type === 'bathroom' || r.type === 'ensuite').length;
  const halls = p.rooms.filter((r) => r.type === 'hall');
  const garage = p.rooms.find((r) => r.type === 'garage');
  const prefs = p.program.preferences;
  const accessWord = { front: 'el frente', back: 'el fondo', left: 'el lado izquierdo', right: 'el lado derecho' }[p.site.access];

  const points: string[] = [];
  points.push(`La vivienda tiene ${covered.length} ambientes cubiertos: ${beds} dormitorio(s) y ${baths} baño(s), con ${a.built.toFixed(2)} m² construidos sobre un lote de ${a.lot.toFixed(2)} m² (ocupación ${pct(a.occupancy)}, máximo indicado ${p.site.maxOccupancy} %).`);
  points.push(prefs.socialZone === 'front'
    ? `La zona social (sala, comedor y cocina) queda hacia el acceso por ${accessWord}, y los dormitorios hacia el interior del lote, que suele ser más silencioso.`
    : `Los dormitorios quedan hacia el acceso por ${accessWord} y la zona social hacia el interior del lote, como pediste.`);
  if (garage) points.push(`El garaje (${garage.width.toFixed(2)} × ${garage.length.toFixed(2)} m) se ubica contra la calle para tener acceso directo del vehículo.`);
  if (halls.length) {
    const area = halls.reduce((s, h) => s + h.width * h.length, 0);
    points.push(`La circulación ocupa ${area.toFixed(2)} m² (${pct((area / Math.max(a.built, 1)) * 100)} del área construida) y da acceso a los dormitorios y baños.`);
  }
  if (prefs.openKitchen) points.push('La cocina se integra al comedor sin muro, como cocina abierta.');
  const minIssues = issues.filter((i) => i.code === 'minimum');
  if (minIssues.length) points.push(`Para que todo cupiera, ${minIssues.length} ambiente(s) quedaron por debajo del mínimo pedido. Revísalos en Validación.`);
  const dark = issues.filter((i) => i.code === 'daylight');
  if (dark.length) points.push(`${dark.length} ambiente(s) no tienen ventana porque dan contra medianera u otros ambientes. Un patio interior o un retiro lateral lo resolvería.`);
  const errors = issues.filter((i) => i.level === 'error').length;

  return {
    summary: errors
      ? `La propuesta tiene ${errors} error(es) de validación que conviene corregir antes de continuar.`
      : 'La propuesta cumple las validaciones geométricas automáticas de ARQUIGEN 360.',
    points,
    disclaimer: 'Explicación automática de una prevalidación. No constituye aprobación ni revisión profesional.',
  };
}
