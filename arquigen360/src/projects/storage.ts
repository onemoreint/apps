import type { Project } from '../geometry/types';
import { uid } from '../utils/id';
import { loadProject, type LoadResult } from '../schema/migrations';

/*
 * Persistencia local mediante adaptadores (especificación 2026, §24 y §36).
 *  - IndexedDBAdapter: preferido para proyectos (datos grandes).
 *  - LocalStorageAdapter: respaldo si IndexedDB no está disponible.
 *  - CloudProjectAdapter: solo la interfaz; no existe backend todavía.
 * Todo proyecto leído pasa por loadProject() (migración + esquema + dominio).
 */

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  rooms: number;
  site: string;
  status: Project['metadata']['status'];
}

export interface ProjectRepository {
  id: 'indexeddb' | 'localstorage' | 'memory' | 'cloud';
  list(): Promise<ProjectMeta[]>;
  get(id: string): Promise<LoadResult | null>;
  save(p: Project): Promise<void>;
  remove(id: string): Promise<void>;
  all(): Promise<unknown[]>;
}

const LEGACY_KEY = 'arquigen360.projects.v1';
const DB_NAME = 'arquigen360';
const STORE = 'projects';

const meta = (p: Project): ProjectMeta => ({
  id: p.id,
  name: p.name,
  updatedAt: p.updatedAt,
  rooms: p.rooms.length,
  site: `${p.site.width} × ${p.site.length} m`,
  status: p.metadata?.status ?? 'BORRADOR',
});

const toMeta = (raw: unknown): ProjectMeta | null => {
  const r = loadProject(raw);
  return r.ok && r.project ? meta(r.project) : null;
};

// ---------------------------------------------------------------- localStorage

export function LocalStorageAdapter(store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeLocalStorage()): ProjectRepository {
  const readAll = (): Record<string, unknown> => {
    try {
      const raw = store?.getItem(LEGACY_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };
  const writeAll = (all: Record<string, unknown>) => {
    if (!store) throw new Error('Este navegador no permite guardar datos locales.');
    store.setItem(LEGACY_KEY, JSON.stringify(all));
  };
  return {
    id: 'localstorage',
    list: async () => Object.values(readAll()).map(toMeta).filter((m): m is ProjectMeta => !!m).sort((a, b) => b.updatedAt - a.updatedAt),
    get: async (id) => {
      const raw = readAll()[id];
      return raw ? loadProject(raw) : null;
    },
    save: async (p) => {
      const all = readAll();
      all[p.id] = p;
      writeAll(all);
    },
    remove: async (id) => {
      const all = readAll();
      delete all[id];
      writeAll(all);
    },
    all: async () => Object.values(readAll()),
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- IndexedDB

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB.'));
    req.onblocked = () => reject(new Error('IndexedDB está bloqueado por otra pestaña.'));
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error ?? req.error);
    t.onabort = () => reject(t.error ?? new Error('Operación cancelada.'));
  });
}

export function IndexedDBAdapter(): ProjectRepository {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= openDb());
  const all = async () => (await tx(await db(), 'readonly', (s) => s.getAll())) as unknown[];
  return {
    id: 'indexeddb',
    all,
    list: async () => (await all()).map(toMeta).filter((m): m is ProjectMeta => !!m).sort((a, b) => b.updatedAt - a.updatedAt),
    get: async (id) => {
      const raw = await tx(await db(), 'readonly', (s) => s.get(id));
      return raw ? loadProject(raw) : null;
    },
    save: async (p) => {
      // structuredClone garantiza que solo se guardan datos, sin referencias de la interfaz
      await tx(await db(), 'readwrite', (s) => s.put(structuredClone(p)));
    },
    remove: async (id) => {
      await tx(await db(), 'readwrite', (s) => s.delete(id));
    },
  };
}

/** Interfaz para la futura nube (Supabase u otro). No implementada: no hay backend. */
export function CloudProjectAdapter(): ProjectRepository {
  const off = async (): Promise<never> => {
    throw new Error('El almacenamiento en la nube aún no está disponible.');
  };
  return { id: 'cloud', list: off, get: off, save: off, remove: off, all: off };
}

// ---------------------------------------------------------------- selección y migración

let repoPromise: Promise<ProjectRepository> | null = null;

async function pickRepository(): Promise<ProjectRepository> {
  if (typeof indexedDB !== 'undefined') {
    try {
      const idb = IndexedDBAdapter();
      await idb.list();
      // mover proyectos antiguos de localStorage a IndexedDB (una sola vez)
      const legacy = LocalStorageAdapter();
      const old = await legacy.all();
      if (old.length) {
        for (const raw of old) {
          const r = loadProject(raw);
          if (r.ok && r.project) await idb.save(r.project);
        }
        try {
          safeLocalStorage()?.removeItem(LEGACY_KEY);
        } catch {
          /* sin acceso: se conserva la copia */
        }
      }
      return idb;
    } catch {
      /* IndexedDB no disponible: se usa localStorage */
    }
  }
  return LocalStorageAdapter();
}

export const getRepository = () => (repoPromise ??= pickRepository());

export async function duplicateProject(p: Project): Promise<Project> {
  const copy: Project = { ...structuredClone(p), id: uid(), name: `${p.name} (copia)`, createdAt: Date.now(), updatedAt: Date.now() };
  await (await getRepository()).save(copy);
  return copy;
}

// ---------------------------------------------------------------- respaldo

export const BACKUP_KIND = 'arquigen360-backup';

export async function exportBackup(): Promise<string> {
  const projects = await (await getRepository()).all();
  return JSON.stringify({ kind: BACKUP_KIND, createdAt: new Date().toISOString(), projects }, null, 2);
}

/** Restaura un respaldo. Cada proyecto se valida por separado; los inválidos se reportan. */
export async function importBackup(text: string): Promise<{ restored: number; rejected: string[] }> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El respaldo no es un JSON válido.');
  }
  const d = data as { kind?: unknown; projects?: unknown };
  if (!d || d.kind !== BACKUP_KIND || !Array.isArray(d.projects)) throw new Error('El archivo no es un respaldo de ARQUIGEN 360.');
  if (d.projects.length > 500) throw new Error('El respaldo tiene demasiados proyectos (máx. 500).');
  const repo = await getRepository();
  let restored = 0;
  const rejected: string[] = [];
  for (const raw of d.projects) {
    const r = loadProject(raw);
    if (r.ok && r.project) {
      await repo.save(r.project);
      restored++;
    } else rejected.push(r.errors[0] ?? 'proyecto inválido');
  }
  return { restored, rejected };
}

/** Validación del archivo antes de leerlo (§19): extensión, tipo y tamaño */
export function checkImportFile(file: { name: string; type: string; size: number }, maxBytes: number): string | null {
  if (!/\.json$/i.test(file.name)) return 'Solo se aceptan archivos .json.';
  if (file.type && !/json|text\/plain|octet-stream/.test(file.type)) return `Tipo de archivo no permitido (${file.type}).`;
  if (file.size > maxBytes) return `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/** compatibilidad: parseProject lanza error si el archivo no es válido */
export function parseProject(text: string): Project {
  const r = loadProject(text);
  if (!r.ok || !r.project) throw new Error(r.errors.join(' '));
  return r.project;
}
