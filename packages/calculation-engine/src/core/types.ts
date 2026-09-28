/**
 * Tipos base del motor. Todo cálculo relevante devuelve un `CalcResult`, que
 * transporta además del valor: la fórmula, las variables usadas (con unidades),
 * los supuestos y las validaciones (§16, §38, §42).
 *
 * Esto es lo que SolarAI leerá después para explicar; la IA nunca calcula.
 */

export type ValidationStatus = 'OK' | 'WARNING' | 'ERROR' | 'REVIEW_REQUIRED';

export interface Validation {
  /** Código estable, útil para traducir o para tests (p. ej. STRING_VOC_EXCEEDS_MAX). */
  code: string;
  status: ValidationStatus;
  message: string;
  /** Referencia opcional a la regla técnica configurada que originó la validación. */
  ruleRef?: string;
}

export interface Variable {
  name: string;
  value: number | string | null;
  unit?: string;
  source?: string;
}

export interface CalcResult<T> {
  value: T;
  formula: string;
  variables: Variable[];
  assumptions: string[];
  validations: Validation[];
}

const SEVERITY: Record<ValidationStatus, number> = { OK: 0, WARNING: 1, REVIEW_REQUIRED: 2, ERROR: 3 };

/** Estado agregado: el peor de todos (ERROR > REVIEW_REQUIRED > WARNING > OK). */
export function worstStatus(validations: readonly Validation[]): ValidationStatus {
  let worst: ValidationStatus = 'OK';
  for (const v of validations) if (SEVERITY[v.status] > SEVERITY[worst]) worst = v.status;
  return worst;
}

/** Error de entrada: el motor se niega a calcular con datos inválidos en lugar de suponer. */
export class InputError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = 'InputError';
  }
}

export function requirePositive(field: string, value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new InputError(field, 'debe ser un número mayor que cero');
  }
  return value;
}

export function requireNonNegative(field: string, value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    throw new InputError(field, 'debe ser un número mayor o igual que cero');
  }
  return value;
}

export function requireFraction(field: string, value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0 || value > 1) {
    throw new InputError(field, 'debe ser una fracción en (0, 1]');
  }
  return value;
}
