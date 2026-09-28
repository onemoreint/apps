import type { JsonSchema } from './validator';

/*
 * JSON Schema del proyecto ARQUIGEN 360 (schemaVersion 2.0.0).
 * Se publica también como schema/project.schema.json (lo mantiene al día una prueba).
 * additionalProperties no se restringe: los campos desconocidos se conservan.
 */

export const LIMITS = {
  siteMin: 2,
  siteMax: 500,
  roomMin: 0.3,
  roomMax: 100,
  nameMax: 80,
  textMax: 200,
  rooms: 300,
  openings: 1500,
  furniture: 3000,
  specs: 300,
  versions: 50,
  audit: 1000,
  importBytes: 5 * 1024 * 1024,
} as const;

const num = (minimum?: number, maximum?: number): JsonSchema => ({ type: 'number', minimum, maximum });
const str = (maxLength: number = LIMITS.textMax, minLength?: number): JsonSchema => ({ type: 'string', maxLength, minLength });

export const ROOM_TYPES = [
  'master_bedroom', 'bedroom', 'bathroom', 'ensuite', 'living', 'dining', 'kitchen', 'laundry', 'service', 'patio',
  'garden', 'garage', 'study', 'office', 'terrace', 'balcony', 'storage', 'closet', 'hall',
] as const;

export const FURNITURE_KINDS = [
  'bed_single', 'bed_double', 'bed_queen', 'bed_king', 'wardrobe', 'nightstand', 'desk', 'sofa2', 'sofa3', 'sofaL',
  'coffee_table', 'tv_unit', 'table4', 'table6', 'table8', 'fridge', 'sink', 'stove', 'island', 'counter',
  'upper_cabinets', 'shower', 'bathtub', 'wc', 'basin', 'washer', 'car', 'plant', 'tree', 'stairs',
] as const;

const WALLS = ['S', 'N', 'W', 'E'] as const;

export const siteSchema: JsonSchema = {
  type: 'object',
  required: ['width', 'length', 'units', 'floors', 'access', 'northAngle', 'maxOccupancy', 'setbacks'],
  properties: {
    width: num(LIMITS.siteMin, LIMITS.siteMax),
    length: num(LIMITS.siteMin, LIMITS.siteMax),
    units: { enum: ['m'] },
    floors: { type: 'integer', minimum: 1, maximum: 10 },
    access: { enum: ['front', 'back', 'left', 'right'] },
    northAngle: num(-360, 360),
    maxOccupancy: num(1, 100),
    setbacks: {
      type: 'object',
      required: ['front', 'back', 'side'],
      properties: { front: num(0, 50), back: num(0, 50), side: num(0, 50) },
    },
  },
};

export const roomSpecSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'type', 'name', 'minWidth', 'minLength', 'minArea', 'priority', 'nearTo'],
  properties: {
    id: str(64, 1),
    type: { enum: ROOM_TYPES },
    name: str(LIMITS.nameMax),
    minWidth: num(LIMITS.roomMin, LIMITS.roomMax),
    minLength: num(LIMITS.roomMin, LIMITS.roomMax),
    minArea: num(0, 10000),
    priority: num(1, 5),
    nearTo: { type: 'array', maxItems: 30, items: { enum: ROOM_TYPES } },
  },
};

export const roomSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'type', 'name', 'x', 'y', 'width', 'length'],
  properties: {
    id: str(64, 1),
    specId: str(64),
    type: { enum: ROOM_TYPES },
    name: str(LIMITS.nameMax),
    x: num(-LIMITS.siteMax, LIMITS.siteMax),
    y: num(-LIMITS.siteMax, LIMITS.siteMax),
    width: { type: 'number', exclusiveMinimum: 0, maximum: LIMITS.roomMax },
    length: { type: 'number', exclusiveMinimum: 0, maximum: LIMITS.roomMax },
  },
};

export const openingSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'kind', 'roomId', 'wall', 'offset', 'width', 'swing', 'hinge'],
  properties: {
    id: str(64, 1),
    kind: { enum: ['door', 'window', 'garage_door'] },
    roomId: str(64, 1),
    wall: { enum: WALLS },
    offset: num(0, LIMITS.roomMax),
    width: { type: 'number', exclusiveMinimum: 0, maximum: 20 },
    swing: { enum: ['in', 'out'] },
    hinge: { enum: ['start', 'end'] },
  },
};

export const furnitureSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'roomId', 'kind', 'cx', 'cy', 'rotation'],
  properties: {
    id: str(64, 1),
    roomId: str(64, 1),
    kind: { enum: FURNITURE_KINDS },
    cx: num(-LIMITS.roomMax, LIMITS.roomMax),
    cy: num(-LIMITS.roomMax, LIMITS.roomMax),
    rotation: { enum: [0, 90, 180, 270] },
    w: { type: 'number', exclusiveMinimum: 0, maximum: 20 },
  },
};

const snapshotProps = {
  site: siteSchema,
  program: {
    type: 'object',
    required: ['rooms', 'preferences'],
    properties: {
      rooms: { type: 'array', maxItems: LIMITS.specs, items: roomSpecSchema },
      preferences: {
        type: 'object',
        required: ['socialZone', 'openKitchen', 'garageCars'],
        properties: {
          socialZone: { enum: ['front', 'back'] },
          openKitchen: { type: 'boolean' },
          garageCars: { enum: [0, 1, 2] },
        },
      },
    },
  },
  rooms: { type: 'array', maxItems: LIMITS.rooms, items: roomSchema },
  openings: { type: 'array', maxItems: LIMITS.openings, items: openingSchema },
  furniture: { type: 'array', maxItems: LIMITS.furniture, items: furnitureSchema },
  style: { enum: ['tecnico', 'inmobiliario', 'moderno', 'calido'] },
} satisfies Record<string, JsonSchema>;

export const projectSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://onemoreint.github.io/apps/arquigen360/schema/project-2.0.0.json',
  title: 'Proyecto ARQUIGEN 360',
  description: 'Modelo digital del proyecto. Es la fuente única de verdad de la geometría. Medidas en metros.',
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt', 'schemaVersion', 'site', 'program', 'rooms', 'openings', 'furniture', 'style', 'metadata', 'jurisdiction', 'versions', 'audit'],
  properties: {
    id: str(64, 1),
    name: str(LIMITS.nameMax),
    createdAt: num(0),
    updatedAt: num(0),
    version: { const: 1 },
    schemaVersion: { const: '2.0.0' },
    ...snapshotProps,
    metadata: {
      type: 'object',
      required: ['author', 'status'],
      properties: {
        author: str(LIMITS.nameMax),
        status: { enum: ['BORRADOR', 'PREVALIDACION', 'REVISION_PROFESIONAL', 'APROBADO_POR_USUARIO'] },
      },
    },
    jurisdiction: {
      type: 'object',
      required: ['country', 'department', 'municipality', 'planningInstrument', 'zone'],
      properties: {
        country: { enum: ['CO'] },
        department: str(LIMITS.nameMax),
        municipality: str(LIMITS.nameMax),
        planningInstrument: { enum: ['', 'POT', 'PBOT', 'EOT'] },
        zone: str(LIMITS.nameMax),
      },
    },
    versions: {
      type: 'array',
      maxItems: LIMITS.versions,
      items: {
        type: 'object',
        required: ['id', 'name', 'createdAt', 'snapshot'],
        properties: {
          id: str(64, 1),
          name: str(LIMITS.nameMax),
          createdAt: str(40),
          snapshot: { type: 'object', required: Object.keys(snapshotProps), properties: snapshotProps },
        },
      },
    },
    audit: {
      type: 'array',
      maxItems: LIMITS.audit,
      items: {
        type: 'object',
        required: ['id', 'timestamp', 'actor', 'action', 'projectId', 'result'],
        properties: {
          id: str(64, 1),
          timestamp: str(40),
          actor: { enum: ['user', 'ai', 'system'] },
          action: str(60),
          projectId: str(64),
          entityId: str(64),
          result: { enum: ['ok', 'rejected', 'error'] },
          detail: str(400),
        },
      },
    },
  },
};
