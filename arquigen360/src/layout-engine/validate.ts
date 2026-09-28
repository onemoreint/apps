import type { Opening, Project, Room } from '../geometry/types';
import { area, inside, overlaps, roomRect, sharedEdge, wallStart } from '../geometry/rect';
import { CATALOG } from './catalog';
import { RULES, isOpenPair } from './rules';
import { buildableRect, streetWall } from '../geometry/site';

export type IssueCode = 'overlap' | 'setback' | 'outside_lot' | 'minimum' | 'occupancy' | 'main_door' | 'access' | 'daylight' | 'relation' | 'garage_access' | 'floors';

export interface Issue {
  level: 'error' | 'warn' | 'info';
  /** categoría estable, usada por el motor normativo */
  code: IssueCode;
  msg: string;
  roomIds: string[];
}

export interface AreaReport {
  lot: number;
  buildable: number;
  built: number;
  free: number;
  circulation: number;
  occupancy: number;
  rooms: { id: string; name: string; type: Room['type']; width: number; length: number; area: number }[];
}

const f2 = (v: number) => v.toFixed(2);

/** Ambiente al otro lado de una puerta (null = exterior) */
export function doorOtherSide(o: Opening, host: Room, rooms: Room[]): Room | null {
  const a = wallStart(host, o.wall) + o.offset;
  const b = a + o.width;
  for (const r of rooms) {
    if (r === host) continue;
    const e = sharedEdge(host, r, 0.01);
    if (e && e.wallA === o.wall && b > e.start + 0.05 && a < e.end - 0.05) return r;
  }
  return null;
}

export function computeAreas(p: Project): AreaReport {
  const lot = p.site.width * p.site.length;
  const br = buildableRect(p.site);
  const covered = p.rooms.filter((r) => CATALOG[r.type].covered);
  const built = covered.reduce((s, r) => s + area(r), 0);
  const circulation = p.rooms.filter((r) => r.type === 'hall').reduce((s, r) => s + area(r), 0);
  return {
    lot,
    buildable: br.w * br.h,
    built,
    free: Math.max(0, lot - built),
    circulation,
    occupancy: lot > 0 ? (built / lot) * 100 : 0,
    rooms: p.rooms.map((r) => ({ id: r.id, name: r.name, type: r.type, width: r.width, length: r.length, area: area(r) })),
  };
}

export function validate(p: Project): Issue[] {
  const issues: Issue[] = [];
  const { rooms, openings, site, program } = p;
  const prefs = program.preferences;
  const lotRect = { x: 0, y: 0, w: site.width, h: site.length };
  const br = buildableRect(site);

  // solapes
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++)
      if (overlaps(roomRect(rooms[i]), roomRect(rooms[j]), 0.01))
        issues.push({ level: 'error', code: 'overlap', msg: `${rooms[i].name} y ${rooms[j].name} se superponen.`, roomIds: [rooms[i].id, rooms[j].id] });

  // límites
  for (const r of rooms) {
    const covered = CATALOG[r.type].covered;
    if (covered && !inside(roomRect(r), br, 0.01))
      issues.push({ level: 'error', code: 'setback', msg: `${r.name} invade los retiros (fuera del área construible).`, roomIds: [r.id] });
    else if (!covered && !inside(roomRect(r), lotRect, 0.01))
      issues.push({ level: 'error', code: 'outside_lot', msg: `${r.name} sale del lote.`, roomIds: [r.id] });
  }

  // mínimos del programa
  for (const r of rooms) {
    const spec = program.rooms.find((s) => s.id === r.specId);
    if (!spec) continue;
    const s = Math.min(r.width, r.length);
    const l = Math.max(r.width, r.length);
    const ms = Math.min(spec.minWidth, spec.minLength);
    const ml = Math.max(spec.minWidth, spec.minLength);
    if (s < ms - 0.05 || l < ml - 0.05)
      issues.push({ level: 'warn', code: 'minimum', msg: `${r.name} mide ${f2(r.width)} × ${f2(r.length)} m; el mínimo pedido es ${f2(spec.minWidth)} × ${f2(spec.minLength)} m.`, roomIds: [r.id] });
    else if (area(r) < spec.minArea - 0.1)
      issues.push({ level: 'warn', code: 'minimum', msg: `${r.name} tiene ${f2(area(r))} m², menos que el área mínima (${f2(spec.minArea)} m²).`, roomIds: [r.id] });
  }

  // ocupación
  const a = computeAreas(p);
  if (a.occupancy > site.maxOccupancy + 0.01)
    issues.push({ level: 'error', code: 'occupancy', msg: `Ocupación ${a.occupancy.toFixed(1)} % supera el máximo permitido (${site.maxOccupancy} %).`, roomIds: [] });

  // accesibilidad desde la entrada (puertas + espacios abiertos)
  const adj = new Map<string, Set<string>>();
  const link = (x: string, y: string) => {
    if (!adj.has(x)) adj.set(x, new Set());
    if (!adj.has(y)) adj.set(y, new Set());
    adj.get(x)!.add(y);
    adj.get(y)!.add(x);
  };
  const entries = new Set<string>();
  for (const o of openings) {
    if (o.kind === 'window') continue;
    const host = rooms.find((r) => r.id === o.roomId);
    if (!host) continue;
    const other = doorOtherSide(o, host, rooms);
    if (other) {
      link(host.id, other.id);
      if (!CATALOG[other.type].covered) entries.add(host.id);
    } else entries.add(host.id);
  }
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++)
      if (isOpenPair(rooms[i].type, rooms[j].type, prefs) && sharedEdge(rooms[i], rooms[j], 0.8)) link(rooms[i].id, rooms[j].id);

  const seen = new Set<string>(entries);
  const queue = [...entries];
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of adj.get(id) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  const hasMainDoor = openings.some((o) => {
    if (o.kind !== 'door') return false;
    const host = rooms.find((r) => r.id === o.roomId);
    return host && o.wall === streetWall(site) && !doorOtherSide(o, host, rooms);
  });
  if (rooms.length && !hasMainDoor && !openings.some((o) => o.kind === 'garage_door'))
    issues.push({ level: 'warn', code: 'main_door', msg: 'No hay puerta de acceso sobre la fachada.', roomIds: [] });
  for (const r of rooms) {
    if (!CATALOG[r.type].covered) continue;
    if (!seen.has(r.id)) issues.push({ level: 'warn', code: 'access', msg: `${r.name} no es accesible desde la entrada (falta una puerta).`, roomIds: [r.id] });
  }

  // iluminación natural
  for (const r of rooms) {
    if (!['bedroom', 'master_bedroom', 'living', 'study', 'office'].includes(r.type)) continue;
    if (!openings.some((o) => o.roomId === r.id && o.kind === 'window'))
      issues.push({ level: 'warn', code: 'daylight', msg: `${r.name} no tiene ventana: da contra medianera o contra otros ambientes.`, roomIds: [r.id] });
  }

  // reglas de relación espacial
  for (const rule of RULES) {
    for (const r of rooms.filter((x) => x.type === rule.a)) {
      const ok = rooms.some((o) => o !== r && rule.b.includes(o.type) && sharedEdge(r, o, 0.5));
      const present = rooms.some((o) => rule.b.includes(o.type));
      if (!ok && present) issues.push({ level: rule.level, code: 'relation', msg: rule.message + (r.name !== CATALOG[r.type].label ? ` (${r.name})` : ''), roomIds: [r.id] });
    }
  }

  // relaciones definidas por el usuario en el programa
  for (const spec of program.rooms) {
    const r = rooms.find((x) => x.specId === spec.id);
    if (!r || !spec.nearTo.length) continue;
    const presentTargets = spec.nearTo.filter((t) => rooms.some((o) => o.type === t));
    if (!presentTargets.length) continue;
    const ok = rooms.some((o) => o !== r && presentTargets.includes(o.type) && sharedEdge(r, o, 0.3));
    if (!ok) issues.push({ level: 'info', code: 'relation', msg: `${r.name} debería estar cerca de: ${presentTargets.map((t) => CATALOG[t].label.toLowerCase()).join(', ')}.`, roomIds: [r.id] });
  }

  // garaje con frente a la calle
  const ws = streetWall(site);
  const frontLine = { S: br.y, N: br.y + br.h, W: br.x, E: br.x + br.w }[ws];
  for (const g of rooms.filter((r) => r.type === 'garage')) {
    const c = { S: g.y, N: g.y + g.length, W: g.x, E: g.x + g.width }[ws];
    if (Math.abs(c - frontLine) > 0.01) issues.push({ level: 'warn', code: 'garage_access', msg: 'El garaje no tiene acceso directo desde la calle.', roomIds: [g.id] });
  }

  if (site.floors > 1) issues.push({ level: 'info', code: 'floors', msg: `El proyecto tiene ${site.floors} pisos; esta versión genera la planta baja.`, roomIds: [] });

  return issues;
}
