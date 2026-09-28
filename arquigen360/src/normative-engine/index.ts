import type { Project } from '../geometry/types';
import type { ComplianceReport, RegulatoryRule, RuleResult, ValidationStatus } from './core/types';
import { RULES } from './rules/catalog';

export * from './core/types';
export { FRAMEWORKS } from './sources/frameworks';
export { COLOMBIA, PLANNING_INSTRUMENTS } from './jurisdictions/co';

/** Versión del conjunto de reglas (versions/). Cambia cada vez que se agregue o modifique una regla. */
export const RULESET_VERSION = '2026.09.0';
export const RULESET_CHANGELOG = [
  { version: '2026.09.0', date: '2026-09-27', notes: 'Primer conjunto: reglas geométricas y de parámetros del usuario, prevalidaciones NSR-10 / RETIE / RETILAP y marco urbanístico municipal sin reglas verificadas.' },
];

const ALL: ValidationStatus[] = ['PASS', 'WARNING', 'FAIL', 'NOT_EVALUATED', 'NOT_APPLICABLE', 'UNVERIFIED'];

export function evaluateCompliance(p: Project): ComplianceReport {
  const items = RULES.map((def) => {
    const rule = def.rule(p);
    let result: RuleResult;
    try {
      result = { ruleId: rule.id, ...def.evaluate(p) };
    } catch (e) {
      result = { ruleId: rule.id, status: 'NOT_EVALUATED', message: 'La regla no pudo evaluarse.', explanation: (e as Error).message, affectedIds: [], findings: [] };
    }
    // una regla oficial no verificada nunca puede dar PASS o FAIL
    if (rule.sourceKind === 'official' && rule.status !== 'active' && (result.status === 'PASS' || result.status === 'FAIL')) {
      result = { ...result, status: 'UNVERIFIED' };
    }
    return { rule, result };
  });
  const counts = Object.fromEntries(ALL.map((s) => [s, items.filter((i) => i.result.status === s).length])) as Record<ValidationStatus, number>;
  return { rulesetVersion: RULESET_VERSION, evaluatedAt: new Date().toISOString(), jurisdiction: p.jurisdiction, items, counts };
}

/** Centro de estado (§33): peor estado por grupo */
const ORDER: ValidationStatus[] = ['FAIL', 'WARNING', 'UNVERIFIED', 'NOT_EVALUATED', 'PASS', 'NOT_APPLICABLE'];
export const STATUS_GROUPS: { key: RegulatoryRule['group'][]; label: string }[] = [
  { key: ['geometry'], label: 'Geometría' },
  { key: ['areas'], label: 'Áreas' },
  { key: ['circulation'], label: 'Circulación' },
  { key: ['municipal'], label: 'Normativa municipal' },
  { key: ['structure'], label: 'Estructura' },
  { key: ['installations'], label: 'Instalaciones' },
];

export function groupStatus(report: ComplianceReport, groups: RegulatoryRule['group'][]): ValidationStatus {
  const list = report.items.filter((i) => groups.includes(i.rule.group)).map((i) => i.result.status);
  return ORDER.find((s) => list.includes(s)) ?? 'NOT_APPLICABLE';
}

/**
 * Adaptadores (§36). El local usa las reglas incluidas en el HTML.
 * El remoto queda definido para un futuro servicio normativo; no hay backend todavía.
 */
export interface NormativeAdapter {
  id: string;
  evaluate(p: Project): Promise<ComplianceReport>;
}
export const LocalNormativeAdapter: NormativeAdapter = { id: 'local', evaluate: async (p) => evaluateCompliance(p) };
export function RemoteNormativeAdapter(endpoint: string): NormativeAdapter {
  return {
    id: 'remote',
    evaluate: async () => {
      throw new Error(`Servicio normativo remoto no configurado (${endpoint}).`);
    },
  };
}
