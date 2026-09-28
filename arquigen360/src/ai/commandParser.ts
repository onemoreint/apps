import type { Project, Room, RoomType, StyleId, WallSide } from '../geometry/types';
import type { EditorCommand } from '../commands/commands';
import { CATALOG } from '../layout-engine/catalog';
import { findFreeSpot } from '../geometry/freeSpot';

/*
 * Intérprete local (sin red) de órdenes de edición en español.
 * Solo PROPONE comandos; el pipeline de src/commands decide si se aplican.
 */

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUM = '(\\d+(?:[.,]\\d+)?)';
const toNum = (s: string) => parseFloat(s.replace(',', '.'));
/** convierte "50 cm" / "0,5 m" / "1 metro" a metros */
function meters(value: string, unit?: string) {
  const v = toNum(value);
  return unit && /^c/.test(unit) ? v / 100 : v;
}

const TYPE_WORDS: [RegExp, RoomType][] = [
  [/dormitorio principal|habitacion principal|alcoba principal|cuarto principal/, 'master_bedroom'],
  [/bano privado|bano principal/, 'ensuite'],
  [/dormitorio|habitacion|alcoba|cuarto|recamara/, 'bedroom'],
  [/bano/, 'bathroom'],
  [/sala/, 'living'],
  [/comedor/, 'dining'],
  [/cocina/, 'kitchen'],
  [/lavanderia|zona de ropas/, 'laundry'],
  [/area de servicio|servicios/, 'service'],
  [/patio/, 'patio'],
  [/jardin/, 'garden'],
  [/garaje|garage|parqueadero|cochera/, 'garage'],
  [/estudio/, 'study'],
  [/oficina/, 'office'],
  [/terraza/, 'terrace'],
  [/balcon/, 'balcony'],
  [/deposito|bodega/, 'storage'],
  [/vestidor/, 'closet'],
  [/pasillo|circulacion/, 'hall'],
];

/** Busca el ambiente mencionado: primero por nombre exacto (el más largo), luego por tipo */
export function findRoom(text: string, rooms: Room[]): Room | undefined {
  const t = norm(text);
  const byName = [...rooms].sort((a, b) => b.name.length - a.name.length).find((r) => t.includes(norm(r.name)));
  if (byName) return byName;
  for (const [re, type] of TYPE_WORDS) {
    const m = t.match(re);
    if (!m) continue;
    const list = rooms.filter((r) => r.type === type);
    if (!list.length) continue;
    const idx = t.slice(m.index! + m[0].length).match(/^\s*(\d+)/);
    if (idx) {
      const hit = list.find((r) => new RegExp(`\\b${idx[1]}$`).test(norm(r.name)));
      if (hit) return hit;
    }
    return list[0];
  }
  return undefined;
}

const typeIn = (text: string): RoomType | undefined => TYPE_WORDS.find(([re]) => re.test(norm(text)))?.[1];

const WALL_WORDS: [RegExp, WallSide][] = [
  [/superior|fondo|norte|arriba|posterior/, 'N'],
  [/inferior|frente|frontal|sur|abajo|fachada/, 'S'],
  [/izquierd|oeste/, 'W'],
  [/derech|este\b/, 'E'],
];

const STYLE_WORDS: [RegExp, StyleId][] = [
  [/tecnico/, 'tecnico'],
  [/inmobiliario/, 'inmobiliario'],
  [/moderno/, 'moderno'],
  [/calido/, 'calido'],
];

export interface ParsedCommands {
  commands: EditorCommand[];
  unrecognized: string[];
}

/** Divide la orden en frases: ". ", ";", " y luego ", " después " */
function sentences(text: string) {
  return text
    .split(/[;\n]+|\.(?=\s|$)|\s+y\s+luego\s+|\s+despu[eé]s\s+|\s+tambi[eé]n\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

export function parseEditRequest(input: string, project: Project): ParsedCommands {
  const commands: EditorCommand[] = [];
  const unrecognized: string[] = [];

  for (const raw of sentences(input)) {
    const s = norm(raw);
    const room = findRoom(raw, project.rooms);

    // estilo
    const style = /estilo|plano/.test(s) ? STYLE_WORDS.find(([re]) => re.test(s))?.[1] : undefined;
    if (style && /estilo/.test(s)) { commands.push({ command: 'set_style', changes: { style } }); continue; }

    // renombrar
    const ren = raw.match(/(?:renombra|cambia el nombre de|llama)\s+(?:a\s+)?(?:la\s+|el\s+)?(.+?)\s+(?:como|a|por)\s+["«]?([^"»]+)["»]?$/i);
    if (ren && room) { commands.push({ command: 'rename_space', targetId: room.id, changes: { name: ren[2].trim() } }); continue; }

    // eliminar (se propone; la política de permisos lo rechazará para la IA)
    if (/^(elimina|borra|quita|suprime)\b/.test(s) && room) { commands.push({ command: 'delete_space', targetId: room.id }); continue; }

    // agregar abertura
    if (/(agrega|anade|pon|coloca|abre)\b.*\b(ventana|puerta)\b/.test(s) && room) {
      const kind = /ventana/.test(s) ? 'window' : 'door';
      const wall = WALL_WORDS.find(([re]) => re.test(s.replace(norm(room.name), '')))?.[1] ?? 'N';
      const w = s.match(new RegExp(`${NUM}\\s*(cm|m|metro)`));
      const width = w ? meters(w[1], w[2]) : kind === 'window' ? 1.2 : 0.8;
      commands.push({ command: 'add_opening', targetId: room.id, changes: { kind, wall, width } });
      continue;
    }

    // agregar ambiente: "agrega un estudio de 3 x 2.8"
    const add = s.match(new RegExp(`^(?:agrega|anade|crea|incluye)\\s+(?:un|una)?\\s*(.+?)\\s+de\\s+${NUM}\\s*(?:m)?\\s*(?:x|por|×)\\s*${NUM}`));
    if (add) {
      const type = typeIn(add[1]);
      if (type && type !== 'hall') {
        const width = toNum(add[2]);
        const length = toNum(add[3]);
        const spot = findFreeSpot(project, width, length, CATALOG[type].covered);
        commands.push({ command: 'add_space', changes: { type, width, length, x: spot.x, y: spot.y } });
        continue;
      }
    }

    // medidas absolutas: "haz el dormitorio 2 de 3.20 x 3.50"
    const abs = s.match(new RegExp(`${NUM}\\s*(?:m)?\\s*(?:x|por|×)\\s*${NUM}`));
    if (abs && room && /(haz|pon|cambia|deja|ajusta|redimensiona|que mida|mida|de\s)/.test(s)) {
      commands.push({ command: 'resize_space', targetId: room.id, changes: { width: toNum(abs[1]), length: toNum(abs[2]) } });
      continue;
    }

    // cambio relativo: "la cocina 40 cm más ancha", "agranda la sala 0.5 m de largo"
    const rel = s.match(new RegExp(`${NUM}\\s*(cm|m|metros?)\\b`));
    if (rel && room && /(mas|menos|agranda|amplia|reduce|achica)/.test(s) && /(anch|larg|fondo|grande|pequen)/.test(s)) {
      const d = meters(rel[1], rel[2]) * (/(menos|reduce|achica|pequen|angost|cort)/.test(s) ? -1 : 1);
      const changes: { width?: number; length?: number } = {};
      if (/anch|angost|grande|pequen/.test(s)) changes.width = +(room.width + d).toFixed(2);
      if (/larg|fondo|cort|grande|pequen/.test(s)) changes.length = +(room.length + d).toFixed(2);
      commands.push({ command: 'resize_space', targetId: room.id, changes });
      continue;
    }

    // mover: "mueve la cocina 1 m a la derecha"
    if (/^(mueve|desplaza|corre|lleva)\b/.test(s) && room) {
      const m = s.match(new RegExp(`${NUM}\\s*(cm|m|metros?)?`));
      const d = m ? meters(m[1], m[2]) : 0.5;
      let dx = 0;
      let dy = 0;
      if (/derech/.test(s)) dx = d;
      else if (/izquierd/.test(s)) dx = -d;
      else if (/fondo|atras|arriba|posterior/.test(s)) dy = d;
      else if (/frente|adelante|abajo|calle/.test(s)) dy = -d;
      if (dx || dy) { commands.push({ command: 'translate_space', targetId: room.id, changes: { dx, dy } }); continue; }
    }

    unrecognized.push(raw);
  }
  return { commands, unrecognized };
}
