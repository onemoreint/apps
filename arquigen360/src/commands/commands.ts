import type { Opening, Project, Room, RoomType, StyleId, WallSide } from '../geometry/types';
import { inside, overlaps, roomRect, wallLength } from '../geometry/rect';
import { buildableRect } from '../geometry/site';
import { CATALOG } from '../layout-engine/catalog';
import { computeAreas } from '../layout-engine/validate';
import { ROOM_TYPES, LIMITS } from '../schema/projectSchema';
import { validateSchema, type JsonSchema } from '../schema/validator';
import { sanitizeText } from '../schema/migrations';
import { uid } from '../utils/id';
import { footprint } from '../furniture/library';

/*
 * Sistema de comandos declarativos.
 * La IA (o cualquier origen externo) NUNCA modifica el proyecto: propone comandos
 * que pasan por este pipeline. Si una etapa falla, el comando no se aplica.
 *
 *   JSON → esquema → permiso → objeto existe → límites → geometría → colisiones → normativa → aplicar
 */

export type EditorCommand =
  | { command: 'resize_space'; targetId: string; changes: { width?: number; length?: number } }
  | { command: 'move_space'; targetId: string; changes: { x?: number; y?: number } }
  | { command: 'translate_space'; targetId: string; changes: { dx?: number; dy?: number } }
  | { command: 'rename_space'; targetId: string; changes: { name: string } }
  | { command: 'delete_space'; targetId: string }
  | { command: 'add_space'; changes: { type: RoomType; name?: string; width: number; length: number; x: number; y: number } }
  | { command: 'add_opening'; targetId: string; changes: { kind: 'door' | 'window'; wall: WallSide; width: number; offset?: number } }
  | { command: 'set_style'; changes: { style: StyleId } };

export type CommandName = EditorCommand['command'];
export type Actor = 'user' | 'ai';
export type Stage = 'json' | 'schema' | 'permission' | 'exists' | 'limits' | 'geometry' | 'collision' | 'normative' | 'applied';

export const STAGE_LABEL: Record<Stage, string> = {
  json: 'JSON',
  schema: 'Esquema',
  permission: 'Permiso',
  exists: 'Objeto existe',
  limits: 'Límites',
  geometry: 'Geometría',
  collision: 'Colisiones',
  normative: 'Normativa',
  applied: 'Aplicado',
};

export interface CommandResult {
  ok: boolean;
  /** etapa alcanzada: 'applied' si todo pasó, o la etapa que falló */
  stage: Stage;
  reason: string;
  command: unknown;
  summary: string;
}

const dim = { type: 'number', minimum: 0.6, maximum: 30 } as const satisfies JsonSchema;
const coord = { type: 'number', minimum: -LIMITS.siteMax, maximum: LIMITS.siteMax } as const satisfies JsonSchema;
const target = { type: 'string', minLength: 1, maxLength: 64 } as const satisfies JsonSchema;

const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({ type: 'object', properties, required, additionalProperties: false });

/** Esquema por comando. Solo estos comandos existen. */
export const COMMAND_SCHEMAS: Record<CommandName, JsonSchema> = {
  resize_space: obj({ command: { const: 'resize_space' }, targetId: target, changes: obj({ width: dim, length: dim }) }, ['command', 'targetId', 'changes']),
  move_space: obj({ command: { const: 'move_space' }, targetId: target, changes: obj({ x: coord, y: coord }) }, ['command', 'targetId', 'changes']),
  translate_space: obj({ command: { const: 'translate_space' }, targetId: target, changes: obj({ dx: { type: 'number', minimum: -30, maximum: 30 }, dy: { type: 'number', minimum: -30, maximum: 30 } }) }, ['command', 'targetId', 'changes']),
  rename_space: obj({ command: { const: 'rename_space' }, targetId: target, changes: obj({ name: { type: 'string', minLength: 1, maxLength: LIMITS.nameMax } }, ['name']) }, ['command', 'targetId', 'changes']),
  delete_space: obj({ command: { const: 'delete_space' }, targetId: target }, ['command', 'targetId']),
  add_space: obj({
    command: { const: 'add_space' },
    changes: obj({ type: { enum: ROOM_TYPES.filter((t) => t !== 'hall') }, name: { type: 'string', maxLength: LIMITS.nameMax }, width: dim, length: dim, x: coord, y: coord }, ['type', 'width', 'length', 'x', 'y']),
  }, ['command', 'changes']),
  add_opening: obj({
    command: { const: 'add_opening' },
    targetId: target,
    changes: obj({ kind: { enum: ['door', 'window'] }, wall: { enum: ['S', 'N', 'W', 'E'] }, width: { type: 'number', minimum: 0.4, maximum: 6 }, offset: { type: 'number', minimum: 0, maximum: 30 } }, ['kind', 'wall', 'width']),
  }, ['command', 'targetId', 'changes']),
  set_style: obj({ command: { const: 'set_style' }, changes: obj({ style: { enum: ['tecnico', 'inmobiliario', 'moderno', 'calido'] } }, ['style']) }, ['command', 'changes']),
};

/** Autorización por origen. La IA no puede eliminar: eso lo hace el usuario en el editor. */
export const PERMISSIONS: Record<Actor, ReadonlySet<CommandName>> = {
  user: new Set(Object.keys(COMMAND_SCHEMAS) as CommandName[]),
  ai: new Set<CommandName>(['resize_space', 'move_space', 'translate_space', 'rename_space', 'add_space', 'add_opening', 'set_style']),
};

export function describeCommand(c: unknown, p: Project): string {
  const cmd = c as Partial<EditorCommand> & { targetId?: string; changes?: Record<string, unknown> };
  const r = p.rooms.find((x) => x.id === cmd.targetId);
  const who = r ? r.name : cmd.targetId ? `«${String(cmd.targetId).slice(0, 20)}»` : '';
  const ch = cmd.changes ?? {};
  const n = (v: unknown) => (typeof v === 'number' ? v.toFixed(2) : '?');
  switch (cmd.command) {
    case 'resize_space': return `Cambiar medidas de ${who} a ${n(ch.width ?? r?.width)} × ${n(ch.length ?? r?.length)} m`;
    case 'move_space': return `Mover ${who} a x=${n(ch.x ?? r?.x)}, y=${n(ch.y ?? r?.y)}`;
    case 'translate_space': return `Desplazar ${who} ${n(ch.dx ?? 0)} m en X y ${n(ch.dy ?? 0)} m en Y`;
    case 'rename_space': return `Renombrar ${who} como «${String(ch.name ?? '')}»`;
    case 'delete_space': return `Eliminar ${who}`;
    case 'add_space': return `Agregar ${CATALOG[ch.type as RoomType]?.label ?? String(ch.type)} de ${n(ch.width)} × ${n(ch.length)} m`;
    case 'add_opening': return `Agregar ${ch.kind === 'window' ? 'ventana' : 'puerta'} de ${n(ch.width)} m en ${who}`;
    case 'set_style': return `Cambiar estilo a ${String(ch.style)}`;
    default: return `Comando desconocido: ${String(cmd.command ?? '(sin nombre)').slice(0, 30)}`;
  }
}

const fail = (stage: Stage, reason: string, command: unknown, p: Project): CommandResult => ({ ok: false, stage, reason, command, summary: describeCommand(command, p) });

function boundsFor(p: Project, r: Pick<Room, 'type'>) {
  return CATALOG[r.type].covered ? buildableRect(p.site) : { x: 0, y: 0, w: p.site.width, h: p.site.length };
}

/** Recorta aberturas y muebles de un ambiente que cambió de tamaño */
function fitContents(p: Project, room: Room): Pick<Project, 'openings' | 'furniture'> {
  const openings: Opening[] = p.openings
    .map((o) => {
      if (o.roomId !== room.id) return o;
      const len = wallLength(room, o.wall);
      const width = Math.min(o.width, len - 0.1);
      return { ...o, width: +width.toFixed(2), offset: +Math.max(0, Math.min(o.offset, len - width)).toFixed(2) };
    })
    .filter((o) => o.width >= 0.4);
  const furniture = p.furniture.filter((f) => {
    if (f.roomId !== room.id) return true;
    const fp = footprint(f);
    return fp.x >= -0.01 && fp.y >= -0.01 && fp.x + fp.w <= room.width + 0.01 && fp.y + fp.h <= room.length + 0.01;
  });
  return { openings, furniture };
}

/**
 * Valida y, si todo pasa, aplica un comando. Función pura: devuelve el proyecto nuevo
 * o el mismo proyecto con la razón del rechazo.
 */
export function runCommand(p: Project, input: unknown, actor: Actor): { project: Project; result: CommandResult } {
  // 1. JSON
  let c: unknown = input;
  if (typeof input === 'string') {
    try {
      c = JSON.parse(input);
    } catch {
      return { project: p, result: fail('json', 'El comando no es un JSON válido.', input, p) };
    }
  }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { project: p, result: fail('json', 'El comando debe ser un objeto.', c, p) };

  // 2. esquema (incluye: el comando existe)
  const name = (c as { command?: unknown }).command;
  const schema = typeof name === 'string' ? COMMAND_SCHEMAS[name as CommandName] : undefined;
  if (!schema) return { project: p, result: fail('schema', `Comando no reconocido: «${String(name ?? '').slice(0, 30)}».`, c, p) };
  const errs = validateSchema(c, schema);
  if (errs.length) return { project: p, result: fail('schema', errs.slice(0, 3).map((e) => `${e.path.replace(/^\$\.?/, '')}: ${e.message}`).join('; '), c, p) };
  const cmd = c as EditorCommand;

  // 3. permiso
  if (!PERMISSIONS[actor].has(cmd.command)) {
    const why = cmd.command === 'delete_space' ? 'La IA no puede eliminar ambientes. Elimínalo tú desde el editor.' : 'Este origen no tiene permiso para este comando.';
    return { project: p, result: fail('permission', why, c, p) };
  }

  // 4. objeto existe
  const targetId = 'targetId' in cmd ? cmd.targetId : undefined;
  const room = targetId ? p.rooms.find((r) => r.id === targetId) : undefined;
  if (targetId && !room) return { project: p, result: fail('exists', 'El ambiente indicado no existe en el proyecto.', c, p) };

  // 5–8 según comando
  let next: Project = p;
  let changed: Room | null = null;

  switch (cmd.command) {
    case 'set_style':
      next = { ...p, style: cmd.changes.style };
      break;
    case 'rename_space': {
      const nm = sanitizeText(cmd.changes.name);
      if (!nm) return { project: p, result: fail('limits', 'El nombre queda vacío después de limpiarlo.', c, p) };
      next = { ...p, rooms: p.rooms.map((r) => (r.id === room!.id ? { ...r, name: nm } : r)) };
      break;
    }
    case 'delete_space':
      next = {
        ...p,
        rooms: p.rooms.filter((r) => r.id !== room!.id),
        openings: p.openings.filter((o) => o.roomId !== room!.id),
        furniture: p.furniture.filter((f) => f.roomId !== room!.id),
      };
      break;
    case 'resize_space':
      if (cmd.changes.width === undefined && cmd.changes.length === undefined) return { project: p, result: fail('limits', 'No se indicó ninguna medida.', c, p) };
      changed = { ...room!, width: +(cmd.changes.width ?? room!.width).toFixed(2), length: +(cmd.changes.length ?? room!.length).toFixed(2) };
      break;
    case 'move_space':
      changed = { ...room!, x: +(cmd.changes.x ?? room!.x).toFixed(2), y: +(cmd.changes.y ?? room!.y).toFixed(2) };
      break;
    case 'translate_space':
      changed = { ...room!, x: +(room!.x + (cmd.changes.dx ?? 0)).toFixed(2), y: +(room!.y + (cmd.changes.dy ?? 0)).toFixed(2) };
      break;
    case 'add_space': {
      if (p.rooms.length >= LIMITS.rooms) return { project: p, result: fail('limits', `El proyecto ya tiene el máximo de ${LIMITS.rooms} ambientes.`, c, p) };
      const ch = cmd.changes;
      changed = { id: uid(), type: ch.type, name: sanitizeText(ch.name) || CATALOG[ch.type].label, x: +ch.x.toFixed(2), y: +ch.y.toFixed(2), width: +ch.width.toFixed(2), length: +ch.length.toFixed(2) };
      break;
    }
    case 'add_opening': {
      const len = wallLength(room!, cmd.changes.wall);
      const w = cmd.changes.width;
      if (w > len - 0.2) return { project: p, result: fail('limits', `El muro mide ${len.toFixed(2)} m; no cabe una abertura de ${w.toFixed(2)} m.`, c, p) };
      const offset = cmd.changes.offset ?? (len - w) / 2;
      if (offset + w > len) return { project: p, result: fail('limits', 'La abertura se sale del muro.', c, p) };
      const op: Opening = { id: uid(), kind: cmd.changes.kind, roomId: room!.id, wall: cmd.changes.wall, offset: +offset.toFixed(2), width: +w.toFixed(2), swing: 'in', hinge: 'start' };
      next = { ...p, openings: [...p.openings, op] };
      break;
    }
  }

  if (changed) {
    // 6. geometría: dentro del área construible (o del lote para exteriores)
    const b = boundsFor(p, changed);
    if (!inside(roomRect(changed), b, 0.005)) {
      const where = CATALOG[changed.type].covered ? 'del área construible (respeta los retiros)' : 'del lote';
      return { project: p, result: fail('geometry', `${changed.name} quedaría fuera ${where}.`, c, p) };
    }
    // 7. colisiones
    const hit = p.rooms.find((o) => o.id !== changed!.id && overlaps(roomRect(o), roomRect(changed!), 0.005));
    if (hit) return { project: p, result: fail('collision', `${changed.name} se superpondría con ${hit.name}. Prueba "Redistribuir con estas medidas" o mueve primero el vecino.`, c, p) };
    const exists = p.rooms.some((r) => r.id === changed!.id);
    const rooms = exists ? p.rooms.map((r) => (r.id === changed!.id ? changed! : r)) : [...p.rooms, changed];
    next = { ...p, rooms };
    if (exists && cmd.command === 'resize_space') next = { ...next, ...fitContents(next, changed) };
  }

  // 8. normativa: la ocupación no puede superar el máximo indicado para el terreno
  const before = computeAreas(p).occupancy;
  const after = computeAreas(next).occupancy;
  if (after > p.site.maxOccupancy + 0.01 && after > before + 0.001) {
    return { project: p, result: fail('normative', `La ocupación pasaría a ${after.toFixed(1)} %, por encima del máximo de ${p.site.maxOccupancy} % indicado en Terreno.`, c, p) };
  }

  return { project: { ...next, updatedAt: Date.now() }, result: { ok: true, stage: 'applied', reason: 'Cambio válido.', command: c, summary: describeCommand(c, p) } };
}

/** Evalúa una lista de comandos en orden; cada uno se valida sobre el resultado del anterior. */
export function runCommands(p: Project, commands: unknown[], actor: Actor): { project: Project; results: CommandResult[] } {
  let cur = p;
  const results: CommandResult[] = [];
  for (const c of commands.slice(0, 50)) {
    const r = runCommand(cur, c, actor);
    results.push(r.result);
    if (r.result.ok) cur = r.project;
  }
  return { project: cur, results };
}
