import type { Project } from '../geometry/types';
import { newProject } from '../projects/defaults';
import { generateLayout } from '../layout-engine/engine';

/** Proyecto de ejemplo generado (datos ficticios, sin información personal) */
export function sampleProject(mut: (p: Project) => void = () => {}): Project {
  const p = newProject('Proyecto de prueba');
  mut(p);
  const res = generateLayout(p.site, p.program);
  return { ...p, rooms: res.rooms, openings: res.openings, furniture: res.furniture };
}

/** Proyecto con el formato 1.x (antes de la actualización 2026) */
export function legacyV1(p: Project = sampleProject()): Record<string, unknown> {
  const { schemaVersion: _s, metadata: _m, jurisdiction: _j, versions: _v, audit: _a, ...rest } = p;
  void _s; void _m; void _j; void _v; void _a;
  return { ...rest, version: 1 };
}

/** Generador pseudoaleatorio reproducible (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
