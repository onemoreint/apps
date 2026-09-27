import type { Preferences, RoomType } from '../geometry/types';

/** Regla de relación espacial, usada por el motor (orden) y por el validador. */
export interface AdjacencyRule {
  a: RoomType;
  b: RoomType[];
  kind: 'adjacent' | 'accessFrom';
  message: string;
  level: 'warn' | 'info';
}

export const RULES: AdjacencyRule[] = [
  { a: 'kitchen', b: ['dining', 'living'], kind: 'adjacent', level: 'warn', message: 'La cocina debería estar junto al comedor.' },
  { a: 'dining', b: ['living', 'kitchen'], kind: 'adjacent', level: 'warn', message: 'El comedor debería estar junto a la sala o la cocina.' },
  { a: 'laundry', b: ['kitchen', 'service', 'garage', 'patio', 'hall'], kind: 'adjacent', level: 'info', message: 'La lavandería suele ir junto a cocina o área de servicios.' },
  { a: 'bathroom', b: ['hall', 'living', 'dining'], kind: 'accessFrom', level: 'warn', message: 'El baño debe ser accesible desde circulación.' },
  { a: 'ensuite', b: ['master_bedroom'], kind: 'adjacent', level: 'warn', message: 'El baño privado debe conectar con el dormitorio principal.' },
  { a: 'closet', b: ['master_bedroom', 'ensuite'], kind: 'adjacent', level: 'info', message: 'El vestidor debería conectar con el dormitorio principal.' },
];

/** Pares de ambientes sin muro entre sí (espacios integrados). */
export function isOpenPair(a: RoomType, b: RoomType, prefs: Preferences): boolean {
  const pair = (x: RoomType, y: RoomType) => (a === x && b === y) || (a === y && b === x);
  if (pair('living', 'dining') || pair('living', 'hall') || pair('dining', 'hall') || pair('hall', 'hall')) return true;
  if (prefs.openKitchen && (pair('kitchen', 'dining') || pair('kitchen', 'living') || pair('kitchen', 'hall'))) return true;
  return false;
}

/** Orden de apilado en la zona social (desde el lado de la zona anterior hacia afuera). */
export const SOCIAL_ORDER: RoomType[] = ['living', 'dining', 'kitchen', 'laundry', 'service', 'storage'];
export const PRIVATE_ORDER: RoomType[] = ['bathroom', 'study', 'office', 'bedroom', 'closet', 'ensuite', 'master_bedroom'];
