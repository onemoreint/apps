// ARQUIGEN 360 — modelo de datos (fuente de verdad)
// Unidades internas: metros. Origen: esquina frontal-izquierda del lote.
// x: a lo ancho (izq → der). y: a lo largo (frente → fondo).

export type AccessSide = 'front' | 'back' | 'left' | 'right';
/** Lado de un ambiente: S = y mínimo, N = y máximo, W = x mínimo, E = x máximo */
export type WallSide = 'S' | 'N' | 'W' | 'E';

export type RoomType =
  | 'master_bedroom'
  | 'bedroom'
  | 'bathroom'
  | 'ensuite'
  | 'living'
  | 'dining'
  | 'kitchen'
  | 'laundry'
  | 'service'
  | 'patio'
  | 'garden'
  | 'garage'
  | 'study'
  | 'office'
  | 'terrace'
  | 'balcony'
  | 'storage'
  | 'closet'
  | 'hall';

export type Zone = 'social' | 'private' | 'service' | 'exterior' | 'circulation' | 'garage';

export interface Setbacks {
  front: number;
  back: number;
  side: number;
}

export interface Site {
  width: number;
  length: number;
  units: 'm';
  floors: number;
  access: AccessSide;
  /** Ángulo del norte en grados, 0 = norte hacia el fondo del lote (arriba en el plano) */
  northAngle: number;
  /** Porcentaje máximo de ocupación del lote */
  maxOccupancy: number;
  setbacks: Setbacks;
}

export interface RoomSpec {
  id: string;
  type: RoomType;
  name: string;
  minWidth: number;
  minLength: number;
  minArea: number;
  /** 1 = alta, 5 = baja */
  priority: number;
  nearTo: RoomType[];
}

export interface Preferences {
  socialZone: 'front' | 'back';
  openKitchen: boolean;
  garageCars: 0 | 1 | 2;
}

export interface Program {
  rooms: RoomSpec[];
  preferences: Preferences;
}

export interface Room {
  id: string;
  specId?: string;
  type: RoomType;
  name: string;
  x: number;
  y: number;
  width: number;
  length: number;
}

export type OpeningKind = 'door' | 'window' | 'garage_door';

export interface Opening {
  id: string;
  kind: OpeningKind;
  roomId: string;
  wall: WallSide;
  /** distancia desde el inicio del muro (esquina de menor x o menor y) */
  offset: number;
  width: number;
  swing: 'in' | 'out';
  hinge: 'start' | 'end';
}

export type FurnitureKind =
  | 'bed_single'
  | 'bed_double'
  | 'bed_queen'
  | 'bed_king'
  | 'wardrobe'
  | 'nightstand'
  | 'desk'
  | 'sofa2'
  | 'sofa3'
  | 'sofaL'
  | 'coffee_table'
  | 'tv_unit'
  | 'table4'
  | 'table6'
  | 'table8'
  | 'fridge'
  | 'sink'
  | 'stove'
  | 'island'
  | 'counter'
  | 'upper_cabinets'
  | 'shower'
  | 'bathtub'
  | 'wc'
  | 'basin'
  | 'washer'
  | 'car'
  | 'plant'
  | 'tree'
  | 'stairs';

export interface FurnitureItem {
  id: string;
  roomId: string;
  kind: FurnitureKind;
  /** centro relativo al origen del ambiente */
  cx: number;
  cy: number;
  /** grados antihorario; 0 = respaldo hacia N */
  rotation: 0 | 90 | 180 | 270;
  /** largo a lo ancho del símbolo, para piezas lineales (mesones, armarios) */
  w?: number;
}

export type StyleId = 'tecnico' | 'inmobiliario' | 'moderno' | 'calido';

/** Versión actual del esquema del proyecto (ver src/schema/migrations.ts) */
export const SCHEMA_VERSION = '2.0.0';

/** Estado profesional del documento. Nunca existe "aprobado para construcción" automático. */
export type DocStatus = 'BORRADOR' | 'PREVALIDACION' | 'REVISION_PROFESIONAL' | 'APROBADO_POR_USUARIO';

export type PlanningInstrument = '' | 'POT' | 'PBOT' | 'EOT';

export interface Jurisdiction {
  country: 'CO';
  department: string;
  municipality: string;
  planningInstrument: PlanningInstrument;
  /** zona o tratamiento urbanístico, texto libre */
  zone: string;
}

export interface ProjectMetadata {
  author: string;
  status: DocStatus;
}

/** Copia del modelo para el historial de versiones (sin versiones ni auditoría) */
export type ProjectSnapshot = Pick<Project, 'site' | 'program' | 'rooms' | 'openings' | 'furniture' | 'style'>;

export interface ProjectVersion {
  id: string;
  name: string;
  createdAt: string;
  snapshot: ProjectSnapshot;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  /** 'user' | 'ai' | 'system' */
  actor: 'user' | 'ai' | 'system';
  action: string;
  projectId: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  result: 'ok' | 'rejected' | 'error';
  detail?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  site: Site;
  program: Program;
  /** "spaces" en la especificación 2026; se conserva el nombre para compatibilidad */
  rooms: Room[];
  openings: Opening[];
  furniture: FurnitureItem[];
  style: StyleId;
  /** campo heredado del esquema 1.x, se conserva para compatibilidad */
  version: 1;
  schemaVersion: typeof SCHEMA_VERSION;
  metadata: ProjectMetadata;
  jurisdiction: Jurisdiction;
  versions: ProjectVersion[];
  audit: AuditEvent[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
