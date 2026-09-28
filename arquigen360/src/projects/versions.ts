import type { ProjectSnapshot } from '../geometry/types';
import { CATALOG } from '../layout-engine/catalog';

export interface VersionDiff {
  builtBefore: number;
  builtAfter: number;
  added: string[];
  removed: string[];
  changed: { name: string; before: string; after: string }[];
  siteChanged: boolean;
  styleChanged: boolean;
  openingsDelta: number;
  furnitureDelta: number;
}

const built = (s: ProjectSnapshot) => s.rooms.filter((r) => CATALOG[r.type].covered).reduce((a, r) => a + r.width * r.length, 0);
const dims = (r: ProjectSnapshot['rooms'][number]) => `${r.width.toFixed(2)} × ${r.length.toFixed(2)} @ (${r.x.toFixed(2)}, ${r.y.toFixed(2)})`;

/** Compara dos estados del modelo por identificador estable de ambiente */
export function diffSnapshots(a: ProjectSnapshot, b: ProjectSnapshot): VersionDiff {
  const aMap = new Map(a.rooms.map((r) => [r.id, r]));
  const bMap = new Map(b.rooms.map((r) => [r.id, r]));
  const added = b.rooms.filter((r) => !aMap.has(r.id)).map((r) => r.name);
  const removed = a.rooms.filter((r) => !bMap.has(r.id)).map((r) => r.name);
  const changed = b.rooms
    .filter((r) => aMap.has(r.id))
    .map((r) => ({ r, o: aMap.get(r.id)! }))
    .filter(({ r, o }) => dims(r) !== dims(o) || r.name !== o.name)
    .map(({ r, o }) => ({ name: r.name !== o.name ? `${o.name} → ${r.name}` : r.name, before: dims(o), after: dims(r) }));
  return {
    builtBefore: built(a),
    builtAfter: built(b),
    added,
    removed,
    changed,
    siteChanged: JSON.stringify(a.site) !== JSON.stringify(b.site),
    styleChanged: a.style !== b.style,
    openingsDelta: b.openings.length - a.openings.length,
    furnitureDelta: b.furniture.length - a.furniture.length,
  };
}
