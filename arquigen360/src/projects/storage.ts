import type { Project } from '../geometry/types';
import { uid } from '../utils/id';

const KEY = 'arquigen360.projects.v1';

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  rooms: number;
  site: string;
}

function readAll(): Record<string, Project> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Project>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Project>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  list(): ProjectMeta[] {
    return Object.values(readAll())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, rooms: p.rooms.length, site: `${p.site.width} × ${p.site.length} m` }));
  },
  get(id: string): Project | null {
    return readAll()[id] ?? null;
  },
  save(p: Project): boolean {
    const all = readAll();
    all[p.id] = { ...p, updatedAt: Date.now() };
    return writeAll(all);
  },
  remove(id: string): boolean {
    const all = readAll();
    delete all[id];
    return writeAll(all);
  },
  duplicate(p: Project): Project {
    const copy: Project = { ...structuredClone(p), id: uid(), name: `${p.name} (copia)`, createdAt: Date.now(), updatedAt: Date.now() };
    storage.save(copy);
    return copy;
  },
};

/** Valida lo mínimo de un archivo .json de proyecto */
export function parseProject(text: string): Project {
  const p = JSON.parse(text) as Project;
  if (!p || p.version !== 1 || !p.site || !Array.isArray(p.rooms) || !p.program) throw new Error('El archivo no es un proyecto de ARQUIGEN 360.');
  return { ...p, openings: p.openings ?? [], furniture: p.furniture ?? [] };
}
