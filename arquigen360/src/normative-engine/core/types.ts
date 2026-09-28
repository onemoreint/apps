import type { Project } from '../../geometry/types';

/** Estados de validación (especificación 2026, §6). No se usa solo "cumple / no cumple". */
export type ValidationStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_EVALUATED' | 'NOT_APPLICABLE' | 'UNVERIFIED';

export const STATUS_LABEL: Record<ValidationStatus, string> = {
  PASS: 'Cumple la verificación',
  WARNING: 'Advertencia',
  FAIL: 'No cumple la verificación',
  NOT_EVALUATED: 'No evaluado',
  NOT_APPLICABLE: 'No aplica',
  UNVERIFIED: 'No verificado',
};

/**
 * Origen de la regla:
 * - user_input: parámetro que el usuario ingresó (p. ej. retiros, ocupación máxima)
 * - internal_criterion: criterio de diseño de ARQUIGEN, NO es norma
 * - official: norma oficial; solo se evalúa si la regla está verificada ('active')
 */
export type SourceKind = 'user_input' | 'internal_criterion' | 'official';

export interface RegulatoryRule {
  id: string;
  title: string;
  jurisdiction: string;
  authority: string;
  sourceDocument: string;
  sourceUrl?: string;
  version: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: 'active' | 'superseded' | 'draft' | 'unverified';
  requirement: string;
  validationType: 'geometric' | 'parameter' | 'precheck' | 'reference';
  sourceKind: SourceKind;
  /** agrupación para el centro de estado */
  group: 'geometry' | 'areas' | 'circulation' | 'municipal' | 'structure' | 'installations' | 'design';
  /** fecha en que se actualizó el registro de esta regla en ARQUIGEN */
  updatedAt: string;
}

export interface RuleResult {
  ruleId: string;
  status: ValidationStatus;
  message: string;
  explanation: string;
  affectedIds: string[];
  findings: string[];
}

export interface RuleDefinition {
  rule: (p: Project) => RegulatoryRule;
  evaluate: (p: Project) => Omit<RuleResult, 'ruleId'>;
}

export interface ComplianceReport {
  rulesetVersion: string;
  evaluatedAt: string;
  jurisdiction: Project['jurisdiction'];
  items: { rule: RegulatoryRule; result: RuleResult }[];
  counts: Record<ValidationStatus, number>;
}
