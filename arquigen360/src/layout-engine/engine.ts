import type { Opening, FurnitureItem, Program, Room, RoomSpec, RoomType, Site } from '../geometry/types';
import { GRID } from '../geometry/rect';
import { CATALOG } from './catalog';
import { PRIVATE_ORDER, SOCIAL_ORDER } from './rules';
import { uid } from '../utils/id';
import { generateOpenings } from './openings';
import { autoFurnish } from '../furniture/autoFurnish';
import { canonicalSize, toLot } from '../geometry/site';
export { buildableRect, streetWall } from '../geometry/site';

/*
 * Motor de distribución determinista.
 * Trabaja en un marco canónico (u = a lo ancho de la fachada, v = profundidad desde la calle)
 * y al final transforma al lado real de acceso.
 */

interface Item {
  spec: RoomSpec;
  area: number;
  short: number;
}

interface Placement {
  spec?: RoomSpec;
  type: RoomType;
  name: string;
  u: number;
  v: number;
  w: number;
  d: number;
}

interface Row {
  items: Item[];
  need: number;
}

const WET: RoomType[] = ['bathroom', 'ensuite', 'laundry', 'service', 'storage', 'closet'];
const SERVICE: RoomType[] = ['laundry', 'service', 'storage'];
const CORRIDOR = 1.0;

const itemOf = (s: RoomSpec): Item => ({
  spec: s,
  area: Math.max(s.minArea, s.minWidth * s.minLength),
  short: Math.min(s.minWidth, s.minLength),
});

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function rowNeed(items: Item[], width: number) {
  return Math.max(sum(items.map((i) => i.area)) / width, ...items.map((i) => i.short));
}

/** Agrupa ambientes en filas respetando su lado corto mínimo */
function buildRows(items: Item[], width: number, tol = 1.1): Row[] {
  const rows: Item[][] = [];
  let cur: Item[] = [];
  for (const it of items) {
    if (cur.length && sum(cur.map((c) => c.short)) + it.short <= width * tol) cur.push(it);
    else {
      if (cur.length) rows.push(cur);
      cur = [it];
    }
  }
  if (cur.length) rows.push(cur);
  return rows.map((r) => ({ items: r, need: rowNeed(r, width) }));
}

const depthOf = (rows: Row[]) => sum(rows.map((r) => r.need));

/** Reparte una profundidad total entre filas (el sobrante va a ambientes secos) */
function stretch(rows: Row[], total: number): number[] {
  const base = rows.map((r) => r.need);
  const s = sum(base);
  if (s <= 0) return base;
  if (total <= s) return base.map((b) => (b * total) / s);
  const extra = total - s;
  const dry = rows.map((r) => (r.items.some((i) => !WET.includes(i.spec.type)) ? 1 : 0));
  const wsum = sum(dry.map((d, i) => d * base[i]));
  if (wsum <= 0) return base.map((b) => b + (extra * b) / s);
  return base.map((b, i) => b + (dry[i] ? (extra * b) / wsum : 0));
}

/** Coloca filas en un rectángulo; reverse = la primera fila queda al fondo del rectángulo */
function placeRows(rows: Row[], u0: number, v0: number, width: number, total: number, reverse = false): Placement[] {
  const depths = stretch(rows, total);
  const order = rows.map((_, i) => i);
  if (reverse) order.reverse();
  const out: Placement[] = [];
  let v = v0;
  for (const idx of order) {
    const row = rows[idx];
    const d = depths[idx];
    const shorts = sum(row.items.map((i) => i.short));
    const areas = sum(row.items.map((i) => i.area));
    let u = u0;
    row.items.forEach((it, k) => {
      const w =
        k === row.items.length - 1
          ? u0 + width - u
          : shorts <= width
            ? it.short + ((width - shorts) * it.area) / areas
            : (width * it.short) / shorts;
      out.push({ spec: it.spec, type: it.spec.type, name: it.spec.name, u, v, w, d });
      u += w;
    });
    v += d;
  }
  return out;
}

// ---------------------------------------------------------------- zona privada

interface PrivatePlan {
  depth: number;
  place: (u0: number, v0: number, depth: number, reverse: boolean) => Placement[];
}

function planPrivate(items: Item[], width: number, pref: [number, number] | null): PrivatePlan {
  if (!items.length) return { depth: 0, place: () => [] };
  const byType = (t: RoomType) => items.filter((i) => i.spec.type === t);
  const master = byType('master_bedroom');
  const suite = [...byType('ensuite'), ...byType('closet')];
  const others = items
    .filter((i) => !['master_bedroom', 'ensuite', 'closet'].includes(i.spec.type))
    .sort((a, b) => PRIVATE_ORDER.indexOf(a.spec.type) - PRIVATE_ORDER.indexOf(b.spec.type));

  // bloque principal: suite hacia el lado social, dormitorio principal al extremo privado
  const masterRows: Item[][] = [];
  if (suite.length) masterRows.push(suite);
  master.forEach((m) => masterRows.push([m]));

  const mode = width >= 2 * 2.4 + CORRIDOR ? 'double' : width >= 2.4 + CORRIDOR ? 'single' : 'none';

  if (mode === 'double') {
    const left: Item[][] = [];
    const right: Item[][] = [];
    const avail = width - CORRIDOR;
    const needOf = (col: Item[][], w: number) => sum(col.map((r) => rowNeed(r, w)));
    for (const o of others) {
      if (needOf(right, avail / 2) <= needOf(left, avail / 2) + needOf(masterRows, avail / 2)) right.push([o]);
      else left.push([o]);
    }
    left.push(...masterRows);
    if (!right.length && left.length > 1) right.push(left.shift()!);
    const wl0 = Math.max(2.4, ...left.map((r) => sum(r.map((i) => i.short))));
    const wr0 = Math.max(2.4, ...right.map((r) => sum(r.map((i) => i.short))), 0);
    let wl = (avail * wl0) / (wl0 + wr0);
    if (pref) {
      // el pasillo debe tocar un espacio social abierto
      const lo = pref[0];
      const hi = pref[1] - CORRIDOR;
      if (hi >= lo) wl = Math.min(Math.max(wl, lo), hi);
    }
    wl = Math.min(Math.max(wl, 2.2), avail - 2.2);
    const wr = avail - wl;
    const lRows = left.map((r) => ({ items: r, need: rowNeed(r, wl) }));
    const rRows = right.map((r) => ({ items: r, need: rowNeed(r, wr) }));
    const depth = Math.max(depthOf(lRows), depthOf(rRows));
    return {
      depth,
      place: (u0, v0, D, reverse) => [
        ...placeRows(lRows, u0, v0, wl, D, reverse),
        { type: 'hall', name: 'Circulación', u: u0 + wl, v: v0, w: CORRIDOR, d: D },
        ...placeRows(rRows, u0 + wl + CORRIDOR, v0, wr, D, reverse),
      ],
    };
  }

  const all = [...others.map((o) => [o]), ...masterRows];
  if (mode === 'single') {
    const cw = width - CORRIDOR;
    const rows = all.map((r) => ({ items: r, need: rowNeed(r, cw) }));
    // pasillo a la derecha, salvo que la preferencia pida la izquierda
    const corridorLeft = pref ? pref[1] < width - CORRIDOR + 0.5 && pref[0] < CORRIDOR : false;
    return {
      depth: depthOf(rows),
      place: (u0, v0, D, reverse) =>
        corridorLeft
          ? [{ type: 'hall', name: 'Circulación', u: u0, v: v0, w: CORRIDOR, d: D }, ...placeRows(rows, u0 + CORRIDOR, v0, cw, D, reverse)]
          : [...placeRows(rows, u0, v0, cw, D, reverse), { type: 'hall', name: 'Circulación', u: u0 + cw, v: v0, w: CORRIDOR, d: D }],
    };
  }
  const rows = all.map((r) => ({ items: r, need: rowNeed(r, width) }));
  return { depth: depthOf(rows), place: (u0, v0, D, reverse) => placeRows(rows, u0, v0, width, D, reverse) };
}

// ---------------------------------------------------------------- motor

export interface LayoutResult {
  rooms: Room[];
  openings: Opening[];
  furniture: FurnitureItem[];
  notes: string[];
}

export function generateLayout(site: Site, program: Program): LayoutResult {
  const notes: string[] = [];
  const { cw, cd } = canonicalSize(site);
  const sb = site.setbacks;
  const bx = sb.side;
  const by = sb.front;
  const bw = cw - 2 * sb.side;
  // la ocupación máxima limita el fondo construible (el resto queda como área libre)
  const maxBuilt = (cw * cd * site.maxOccupancy) / 100;
  const bdRaw = cd - sb.front - sb.back;
  const bd = Math.min(bdRaw, bw > 0 ? maxBuilt / bw : bdRaw);
  if (bw < 2.5 || bd < 3) {
    return { rooms: [], openings: [], furniture: [], notes: ['El área construible es demasiado pequeña. Revisa las dimensiones y los retiros.'] };
  }
  const prefs = program.preferences;

  // --- clasificación
  const specs = [...program.rooms];
  let garageSpec = specs.find((s) => s.type === 'garage');
  if (!garageSpec && prefs.garageCars > 0) {
    garageSpec = { id: uid(), type: 'garage', name: 'Garaje', minWidth: 3.0, minLength: 5.5, minArea: 16.5, priority: 2, nearTo: [] };
  }
  if (garageSpec && prefs.garageCars === 2) garageSpec = { ...garageSpec, minWidth: Math.max(garageSpec.minWidth, 5.6) };
  const extraGarages = specs.filter((s) => s.type === 'garage' && s !== garageSpec).length;
  if (extraGarages) notes.push('Solo se ubica un garaje por lote en esta versión.');

  const ordered = (list: RoomSpec[], order: RoomType[]) =>
    [...list].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.priority - b.priority);
  const social = ordered(specs.filter((s) => ['living', 'dining', 'kitchen'].includes(s.type)), SOCIAL_ORDER).map(itemOf);
  let service = ordered(specs.filter((s) => SERVICE.includes(s.type)), SOCIAL_ORDER).map(itemOf);
  const priv = specs.filter((s) => CATALOG[s.type].zone === 'private').map(itemOf);
  const ext = specs.filter((s) => CATALOG[s.type].zone === 'exterior').map(itemOf);

  // --- garaje
  let gw = 0;
  let gd = 0;
  let garageFull = false;
  if (garageSpec) {
    gw = garageSpec.minWidth;
    gd = Math.max(garageSpec.minLength, 5.0);
    if (bw - gw < 2.6) {
      garageFull = true;
      gw = bw;
      notes.push('El lote es angosto: el garaje ocupa todo el frente y el acceso peatonal es por el garaje.');
    }
  }
  const garageCol = garageSpec && !garageFull;

  const socialFirst = prefs.socialZone === 'front';
  const w1 = bw - (garageCol ? gw : 0);
  const u1 = bx + (garageCol ? gw : 0);

  // --- zona social (con posible columna de servicio detrás del garaje)
  const socialWidth = socialFirst ? w1 : bw;
  let colService: Item[] = [];
  let socialRows = buildRows([...social, ...service], socialWidth);
  if (socialFirst && garageCol && service.length) {
    let bestDepth = Math.max(depthOf(socialRows), gd);
    const main = [...social, ...service];
    const moved: Item[] = [];
    while (main.length && SERVICE.includes(main[main.length - 1].spec.type)) {
      const it = main.pop()!;
      moved.unshift(it);
      const rows = buildRows(main, socialWidth);
      const colDepth = gd + sum(moved.map((m) => Math.max(m.area / gw, m.short)));
      const d = Math.max(depthOf(rows), colDepth);
      if (d <= bestDepth + 0.01) {
        bestDepth = d;
        socialRows = rows;
        colService = [...moved];
      } else break;
    }
    service = service.filter((s) => !colService.includes(s));
  }
  const colRows: Row[] = colService.map((m) => ({ items: [m], need: Math.max(m.area / gw, m.short) }));

  // intervalos abiertos de la zona social que tocan la zona privada
  const openTypes: RoomType[] = ['living', 'dining', 'hall', ...(prefs.openKitchen ? (['kitchen'] as RoomType[]) : [])];
  const probeU = socialFirst ? u1 : bx;
  const probe = placeRows(socialRows, probeU, 0, socialWidth, Math.max(depthOf(socialRows), 1));
  const boundaryRowV = socialFirst ? Math.max(...probe.map((p) => p.v)) : 0;
  const boundary = probe.filter((p) => Math.abs(p.v - boundaryRowV) < 1e-6 && openTypes.includes(p.type));
  const privU0 = socialFirst ? bx : u1;
  let pref: [number, number] | null = null;
  if (boundary.length) {
    // mayor intervalo abierto continuo, relativo al inicio de la zona privada
    const best = boundary.reduce((a, b) => (b.w > a.w ? b : a));
    pref = [best.u - privU0 + 0.1, best.u + best.w - privU0 - 0.1];
  }

  const privWidth = socialFirst ? bw : w1;
  const privPlan = planPrivate(priv, privWidth, pref);
  const extRows = buildRows(ext, bw);

  // --- profundidades
  const socialDepth = depthOf(socialRows);
  const colDepth = gd + depthOf(colRows);
  const band1Need = socialFirst
    ? Math.max(socialDepth, garageCol ? colDepth : 0)
    : Math.max(privPlan.depth, garageCol ? gd : 0);
  const band2Need = socialFirst ? privPlan.depth : socialDepth;
  const gBand = garageFull ? gd : 0;
  const coreAvail = bd - gBand;
  let b1 = band1Need;
  let b2 = band2Need;
  let extDepth = depthOf(extRows);
  if (b1 + b2 > coreAvail) {
    const f = coreAvail / (b1 + b2);
    b1 *= f;
    b2 *= f;
    extDepth = 0;
    notes.push(`El programa excede el área construible: los ambientes se redujeron un ${Math.round((1 - f) * 100)} % para caber.`);
  }
  if (bd < bdRaw - 0.05) notes.push(`La ocupación máxima (${site.maxOccupancy} %) limita el fondo construido a ${bd.toFixed(2)} m.`);
  const leftover = coreAvail - b1 - b2;
  let extRowsUsed = extRows;
  if (ext.length) {
    if (leftover < 1.5) {
      notes.push('No quedó fondo para los espacios exteriores; se omitieron del área construible.');
      extRowsUsed = [];
      extDepth = 0;
    } else extDepth = leftover;
  }

  // --- colocación
  const P: Placement[] = [];
  let v = by;
  if (garageFull && garageSpec) {
    P.push({ spec: garageSpec, type: 'garage', name: garageSpec.name, u: bx, v, w: bw, d: gd });
    v += gd;
  }
  const band1V = v;
  if (garageCol && garageSpec) {
    const gLen = Math.min(gd, b1);
    if (colRows.length && b1 - gLen > 0.5) {
      P.push({ spec: garageSpec, type: 'garage', name: garageSpec.name, u: bx, v, w: gw, d: gLen });
      P.push(...placeRows(colRows, bx, v + gLen, gw, b1 - gLen));
    } else {
      P.push({ spec: garageSpec, type: 'garage', name: garageSpec.name, u: bx, v, w: gw, d: b1 });
    }
  }
  if (socialFirst) {
    P.push(...placeRows(socialRows, u1, band1V, w1, b1));
    P.push(...privPlan.place(bx, band1V + b1, b2, false));
  } else {
    P.push(...privPlan.place(u1, band1V, b1, true));
    P.push(...placeRows(socialRows, bx, band1V + b1, bw, b2));
  }
  if (extRowsUsed.length && extDepth > 0) P.push(...placeRows(extRowsUsed, bx, band1V + b1 + b2, bw, extDepth));

  // --- redondeo a 5 cm en el marco canónico, anclado al borde del área construible
  // (así los bordes compartidos coinciden exactamente y nada se sale de los retiros);
  // después se transforma al lote con redondeo a centímetros para eliminar ruido de coma flotante.
  const r2c = (v: number) => Math.round(v * 100) / 100;
  const snapEdge = (val: number, lo: number, hi: number) => r2c(Math.min(hi, Math.max(lo, lo + Math.round((val - lo) / GRID) * GRID)));
  const uHi = bx + bw;
  const vHi = by + bdRaw;
  const rooms: Room[] = P.filter((p) => p.w > 0.05 && p.d > 0.05).map((p) => {
    const u1 = snapEdge(p.u, bx, uHi);
    const u2 = snapEdge(p.u + p.w, bx, uHi);
    const v1 = snapEdge(p.v, by, vHi);
    const v2 = snapEdge(p.v + p.d, by, vHi);
    const r = toLot(site, u1, v1, r2c(u2 - u1), r2c(v2 - v1));
    const x1 = r2c(r.x);
    const y1 = r2c(r.y);
    return { id: uid(), specId: p.spec?.id, type: p.type, name: p.name, x: x1, y: y1, width: r2c(r2c(r.x + r.w) - x1), length: r2c(r2c(r.y + r.h) - y1) };
  }).filter((r) => r.width > 0.05 && r.length > 0.05);

  const openings = generateOpenings(rooms, site, prefs);
  const furniture = autoFurnish(rooms, openings);
  return { rooms, openings, furniture, notes };
}
