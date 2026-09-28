/*
 * Validador de JSON Schema (subconjunto del draft 2020-12), sin dependencias.
 * Soporta: type, enum, const, minimum, maximum, exclusiveMinimum, minLength,
 * maxLength, pattern, items, minItems, maxItems, properties, required,
 * additionalProperties (booleano). Los números deben ser finitos.
 */

export type JsonType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface JsonSchema {
  $id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  type?: JsonType | JsonType[];
  enum?: readonly unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
}

export interface SchemaError {
  path: string;
  message: string;
}

function typeOf(v: unknown): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v as JsonType;
}

function matchesType(v: unknown, t: JsonType): boolean {
  const actual = typeOf(v);
  if (t === 'number') return (actual === 'number' || actual === 'integer') && Number.isFinite(v as number);
  if (t === 'integer') return actual === 'integer' && Number.isFinite(v as number);
  return actual === t;
}

export function validateSchema(value: unknown, schema: JsonSchema, path = '$', errors: SchemaError[] = [], maxErrors = 50): SchemaError[] {
  if (errors.length >= maxErrors) return errors;
  const push = (message: string) => errors.push({ path, message });

  if (typeof value === 'number' && !Number.isFinite(value)) {
    push('debe ser un número finito');
    return errors;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      push(`tipo inválido: se esperaba ${types.join(' o ')}`);
      return errors;
    }
  }
  if (schema.const !== undefined && value !== schema.const) push(`debe ser ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) push(`valor no permitido (${String(value).slice(0, 40)})`);

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) push(`debe ser ≥ ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) push(`debe ser ≤ ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) push(`debe ser > ${schema.exclusiveMinimum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) push(`texto demasiado corto (mín. ${schema.minLength})`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) push(`texto demasiado largo (máx. ${schema.maxLength})`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) push('formato inválido');
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) push(`mínimo ${schema.minItems} elementos`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      push(`máximo ${schema.maxItems} elementos`);
      return errors;
    }
    if (schema.items) value.forEach((item, i) => validateSchema(item, schema.items!, `${path}[${i}]`, errors, maxErrors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (obj[key] === undefined) errors.push({ path: `${path}.${key}`, message: 'campo obligatorio' });
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (obj[key] !== undefined) validateSchema(obj[key], sub, `${path}.${key}`, errors, maxErrors);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) if (obj[key] !== undefined && !schema.properties?.[key]) errors.push({ path: `${path}.${key}`, message: 'campo no permitido' });
    }
  }
  return errors;
}
