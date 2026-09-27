import type { Program, Project, RoomSpec, RoomType, Site } from '../geometry/types';
import { CATALOG } from '../layout-engine/catalog';
import { uid } from '../utils/id';

export function makeSpec(type: RoomType, over: Partial<RoomSpec> = {}): RoomSpec {
  const c = CATALOG[type];
  const minWidth = over.minWidth ?? c.minWidth;
  const minLength = over.minLength ?? c.minLength;
  return {
    id: uid(),
    type,
    name: c.label,
    minWidth,
    minLength,
    minArea: +(minWidth * minLength).toFixed(2),
    priority: c.priority,
    nearTo: [...c.nearTo],
    ...over,
  };
}

/** Renombra ambientes repetidos: Dormitorio 2, Dormitorio 3… */
export function numberNames(specs: RoomSpec[]): RoomSpec[] {
  const counts: Record<string, number> = {};
  const totals: Record<string, number> = {};
  specs.forEach((s) => (totals[s.type] = (totals[s.type] ?? 0) + 1));
  return specs.map((s) => {
    const base = CATALOG[s.type].label;
    if (s.name !== base && !/ \d+$/.test(s.name)) return s;
    counts[s.type] = (counts[s.type] ?? 0) + 1;
    const offset = s.type === 'bedroom' && specs.some((x) => x.type === 'master_bedroom') ? 1 : 0;
    const name = totals[s.type] > 1 || offset ? `${base} ${counts[s.type] + offset}` : base;
    return { ...s, name };
  });
}

export const defaultSite = (): Site => ({
  width: 8,
  length: 16,
  units: 'm',
  floors: 1,
  access: 'front',
  northAngle: 0,
  maxOccupancy: 85,
  setbacks: { front: 1.0, back: 1.5, side: 0 },
});

export const defaultProgram = (): Program => ({
  rooms: numberNames([
    makeSpec('living'),
    makeSpec('dining'),
    makeSpec('kitchen'),
    makeSpec('laundry'),
    makeSpec('master_bedroom', { minWidth: 3.7, minLength: 3.35 }),
    makeSpec('ensuite'),
    makeSpec('bedroom', { minWidth: 3.0, minLength: 2.5 }),
    makeSpec('bedroom', { minWidth: 2.7, minLength: 2.65 }),
    makeSpec('bathroom'),
    makeSpec('garage'),
  ]),
  preferences: { socialZone: 'front', openKitchen: true, garageCars: 1 },
});

export function newProject(name = 'Casa 8 × 16'): Project {
  const now = Date.now();
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    site: defaultSite(),
    program: defaultProgram(),
    rooms: [],
    openings: [],
    furniture: [],
    style: 'inmobiliario',
    version: 1,
  };
}
