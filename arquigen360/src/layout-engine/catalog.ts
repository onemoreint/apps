import type { RoomType, Zone } from '../geometry/types';

export interface CatalogEntry {
  type: RoomType;
  label: string;
  plural: string;
  zone: Zone;
  /** cubierto = suma área construida y lleva muros */
  covered: boolean;
  minWidth: number;
  minLength: number;
  priority: number;
  nearTo: RoomType[];
}

export const CATALOG: Record<RoomType, CatalogEntry> = {
  master_bedroom: { type: 'master_bedroom', label: 'Dormitorio principal', plural: 'Dormitorio principal', zone: 'private', covered: true, minWidth: 3.7, minLength: 3.35, priority: 1, nearTo: ['ensuite', 'closet'] },
  bedroom: { type: 'bedroom', label: 'Dormitorio', plural: 'Dormitorios secundarios', zone: 'private', covered: true, minWidth: 3.0, minLength: 2.7, priority: 2, nearTo: ['bathroom'] },
  bathroom: { type: 'bathroom', label: 'Baño', plural: 'Baños', zone: 'private', covered: true, minWidth: 1.6, minLength: 2.2, priority: 2, nearTo: ['hall'] },
  ensuite: { type: 'ensuite', label: 'Baño privado', plural: 'Baño privado', zone: 'private', covered: true, minWidth: 1.6, minLength: 2.2, priority: 2, nearTo: ['master_bedroom'] },
  living: { type: 'living', label: 'Sala', plural: 'Sala', zone: 'social', covered: true, minWidth: 3.5, minLength: 4.0, priority: 1, nearTo: ['dining'] },
  dining: { type: 'dining', label: 'Comedor', plural: 'Comedor', zone: 'social', covered: true, minWidth: 3.0, minLength: 3.0, priority: 2, nearTo: ['kitchen', 'living'] },
  kitchen: { type: 'kitchen', label: 'Cocina', plural: 'Cocina', zone: 'social', covered: true, minWidth: 2.4, minLength: 3.0, priority: 1, nearTo: ['dining', 'laundry', 'service'] },
  laundry: { type: 'laundry', label: 'Lavandería', plural: 'Lavandería', zone: 'service', covered: true, minWidth: 1.6, minLength: 1.8, priority: 3, nearTo: ['kitchen'] },
  service: { type: 'service', label: 'Área de servicios', plural: 'Área de servicios', zone: 'service', covered: true, minWidth: 1.8, minLength: 2.0, priority: 4, nearTo: ['kitchen'] },
  storage: { type: 'storage', label: 'Depósito', plural: 'Depósito', zone: 'service', covered: true, minWidth: 1.2, minLength: 1.5, priority: 5, nearTo: ['kitchen', 'garage'] },
  closet: { type: 'closet', label: 'Vestidor', plural: 'Vestidor', zone: 'private', covered: true, minWidth: 1.5, minLength: 1.8, priority: 4, nearTo: ['master_bedroom'] },
  study: { type: 'study', label: 'Estudio', plural: 'Estudio', zone: 'private', covered: true, minWidth: 2.5, minLength: 2.6, priority: 3, nearTo: ['living'] },
  office: { type: 'office', label: 'Oficina', plural: 'Oficina', zone: 'private', covered: true, minWidth: 2.7, minLength: 2.8, priority: 3, nearTo: ['living'] },
  garage: { type: 'garage', label: 'Garaje', plural: 'Garaje', zone: 'garage', covered: true, minWidth: 3.0, minLength: 5.5, priority: 2, nearTo: ['kitchen'] },
  patio: { type: 'patio', label: 'Patio', plural: 'Patio', zone: 'exterior', covered: false, minWidth: 2.5, minLength: 2.5, priority: 4, nearTo: ['kitchen', 'laundry'] },
  garden: { type: 'garden', label: 'Jardín', plural: 'Jardín', zone: 'exterior', covered: false, minWidth: 2.5, minLength: 2.5, priority: 4, nearTo: ['living'] },
  terrace: { type: 'terrace', label: 'Terraza', plural: 'Terraza', zone: 'exterior', covered: false, minWidth: 2.5, minLength: 2.0, priority: 4, nearTo: ['living', 'dining'] },
  balcony: { type: 'balcony', label: 'Balcón', plural: 'Balcón', zone: 'exterior', covered: false, minWidth: 1.5, minLength: 1.2, priority: 5, nearTo: ['living'] },
  hall: { type: 'hall', label: 'Circulación', plural: 'Circulación', zone: 'circulation', covered: true, minWidth: 0.9, minLength: 1.0, priority: 1, nearTo: [] },
};

/** Ambientes que el usuario puede seleccionar en el programa (el pasillo lo crea el motor) */
export const SELECTABLE: RoomType[] = [
  'master_bedroom', 'bedroom', 'bathroom', 'ensuite', 'living', 'dining', 'kitchen',
  'laundry', 'service', 'patio', 'garden', 'garage', 'study', 'office', 'terrace', 'balcony', 'storage', 'closet',
];

export const isCovered = (t: RoomType) => CATALOG[t].covered;

export type FloorCategory = 'bedroom' | 'wet' | 'social' | 'garage' | 'grass' | 'deck' | 'hall' | 'work';
export const FLOOR_CATEGORY: Record<RoomType, FloorCategory> = {
  master_bedroom: 'bedroom', bedroom: 'bedroom', closet: 'bedroom',
  bathroom: 'wet', ensuite: 'wet', kitchen: 'wet', laundry: 'wet', service: 'wet', storage: 'garage',
  living: 'social', dining: 'social', hall: 'hall',
  study: 'work', office: 'work',
  garage: 'garage', garden: 'grass', patio: 'deck', terrace: 'deck', balcony: 'deck',
};
