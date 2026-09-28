import { SCHEMA_VERSION, type Project } from '../geometry/types';
import { LIMITS, projectSchema } from './projectSchema';
import { validateSchema, type SchemaError } from './validator';
import { uid } from '../utils/id';

/*
 * Carga segura de proyectos:
 *   tamaño → JSON → detectar schemaVersion → migraciones explícitas → JSON Schema → validación de dominio
 * Las migraciones nunca eliminan campos desconocidos.
 */

type Raw = Record<string, unknown>;

export interface LoadResult {
  ok: boolean;
  project?: Project;
  migratedFrom?: string;
  warnings: string[];
  errors: string[];
}

/** Quita caracteres de control y signos < >, recorta y limita la longitud */
export function sanitizeText(value: unknown, max: number = LIMITS.nameMax): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const defaultJurisdiction = (): Project['jurisdiction'] => ({
  country: 'CO',
  department: 'Antioquia',
  municipality: '',
  planningInstrument: '',
  zone: '',
});

/** Migraciones en orden. Cada una recibe el objeto de la versión anterior. */
const MIGRATIONS: { from: string; to: string; run: (p: Raw) => Raw }[] = [
  {
    from: '1.0.0',
    to: '2.0.0',
    run: (p) => ({
      ...p,
      openings: Array.isArray(p.openings) ? p.openings : [],
      furniture: Array.isArray(p.furniture) ? p.furniture : [],
      version: 1,
      schemaVersion: '2.0.0',
      metadata: { author: '', status: 'BORRADOR' },
      jurisdiction: defaultJurisdiction(),
      versions: [],
      audit: [
        {
          id: uid(),
          timestamp: new Date().toISOString(),
          actor: 'system',
          action: 'migrate',
          projectId: typeof p.id === 'string' ? p.id : '',
          result: 'ok',
          detail: 'Esquema 1.0.0 → 2.0.0',
        },
      ],
    }),
  },
];

export function detectSchemaVersion(p: Raw): string | null {
  if (typeof p.schemaVersion === 'string') return p.schemaVersion;
  if (p.version === 1) return '1.0.0';
  return null;
}

const major = (v: string) => parseInt(v.split('.')[0], 10);

export function migrate(raw: Raw): { project: Raw; from: string } {
  const from = detectSchemaVersion(raw);
  if (!from) throw new Error('El archivo no indica una versión de esquema de ARQUIGEN 360.');
  if (major(from) > major(SCHEMA_VERSION)) throw new Error(`El proyecto se creó con una versión más nueva (${from}). Actualiza la aplicación.`);
  let current = raw;
  let v = from;
  let guard = 0;
  while (v !== SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step || guard++ > 20) throw new Error(`No existe migración desde la versión ${v}.`);
    current = step.run(current);
    v = step.to;
  }
  return { project: current, from };
}

/** Reparaciones y comprobaciones que el JSON Schema no puede expresar */
export function domainValidate(p: Project): { project: Project; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();
  const dup = (id: string, what: string) => {
    if (ids.has(id)) errors.push(`Identificador repetido en ${what}: ${id}`);
    ids.add(id);
  };
  p.rooms.forEach((r) => dup(r.id, 'ambientes'));
  p.openings.forEach((o) => dup(o.id, 'aberturas'));
  p.furniture.forEach((f) => dup(f.id, 'mobiliario'));
  const specIds = new Set<string>();
  for (const s of p.program.rooms) {
    if (specIds.has(s.id)) errors.push(`Identificador repetido en el programa: ${s.id}`);
    specIds.add(s.id);
  }

  const roomIds = new Set(p.rooms.map((r) => r.id));
  const openings = p.openings.filter((o) => roomIds.has(o.roomId));
  const furniture = p.furniture.filter((f) => roomIds.has(f.roomId));
  if (openings.length < p.openings.length) warnings.push(`Se descartaron ${p.openings.length - openings.length} aberturas de ambientes inexistentes.`);
  if (furniture.length < p.furniture.length) warnings.push(`Se descartaron ${p.furniture.length - furniture.length} muebles de ambientes inexistentes.`);

  const rooms = p.rooms.map((r) => ({
    ...r,
    name: sanitizeText(r.name) || 'Ambiente',
    specId: r.specId && specIds.has(r.specId) ? r.specId : undefined,
  }));
  const program = { ...p.program, rooms: p.program.rooms.map((s) => ({ ...s, name: sanitizeText(s.name) || 'Ambiente' })) };
  const project: Project = {
    ...p,
    name: sanitizeText(p.name) || 'Proyecto sin nombre',
    rooms,
    program,
    openings,
    furniture,
    metadata: { ...p.metadata, author: sanitizeText(p.metadata.author) },
    jurisdiction: {
      ...p.jurisdiction,
      department: sanitizeText(p.jurisdiction.department),
      municipality: sanitizeText(p.jurisdiction.municipality),
      zone: sanitizeText(p.jurisdiction.zone),
    },
  };
  return { project, warnings, errors };
}

const fmtErrors = (errs: SchemaError[]) => errs.slice(0, 6).map((e) => `${e.path.replace(/^\$\.?/, '') || 'proyecto'}: ${e.message}`);

/** Punto de entrada único para abrir proyectos (archivo, almacenamiento local o respaldo) */
export function loadProject(input: string | unknown): LoadResult {
  let raw: unknown = input;
  if (typeof input === 'string') {
    if (input.length > LIMITS.importBytes) return { ok: false, warnings: [], errors: [`El archivo supera el máximo de ${LIMITS.importBytes / 1024 / 1024} MB.`] };
    try {
      raw = JSON.parse(input);
    } catch {
      return { ok: false, warnings: [], errors: ['El archivo no es un JSON válido.'] };
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, warnings: [], errors: ['El archivo no contiene un proyecto.'] };

  let migrated: { project: Raw; from: string };
  try {
    migrated = migrate(raw as Raw);
  } catch (e) {
    return { ok: false, warnings: [], errors: [(e as Error).message] };
  }
  const schemaErrors = validateSchema(migrated.project, projectSchema);
  if (schemaErrors.length) return { ok: false, warnings: [], errors: ['El proyecto no cumple el esquema:', ...fmtErrors(schemaErrors)] };

  const dom = domainValidate(migrated.project as unknown as Project);
  if (dom.errors.length) return { ok: false, warnings: dom.warnings, errors: dom.errors };
  const warnings = [...dom.warnings];
  if (migrated.from !== SCHEMA_VERSION) warnings.unshift(`Proyecto actualizado del esquema ${migrated.from} al ${SCHEMA_VERSION}.`);
  return { ok: true, project: dom.project, migratedFrom: migrated.from, warnings, errors: [] };
}

/** Validación completa de un proyecto ya en memoria (antes de guardar o exportar) */
export function checkProject(p: Project): string[] {
  return fmtErrors(validateSchema(p, projectSchema));
}
