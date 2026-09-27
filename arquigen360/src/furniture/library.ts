import type { FurnitureItem, FurnitureKind } from '../geometry/types';

export interface FurnitureDef {
  kind: FurnitureKind;
  label: string;
  group: 'Dormitorio' | 'Sala' | 'Comedor' | 'Cocina' | 'Baño' | 'Exterior' | 'Servicio';
  /** ancho (a lo largo del muro) y fondo, en metros */
  w: number;
  d: number;
  /** altura para la vista 2.5D */
  h: number;
  resizable?: boolean;
}

const defs: FurnitureDef[] = [
  { kind: 'bed_single', label: 'Cama individual', group: 'Dormitorio', w: 0.9, d: 1.9, h: 0.5 },
  { kind: 'bed_double', label: 'Cama matrimonial', group: 'Dormitorio', w: 1.4, d: 1.9, h: 0.5 },
  { kind: 'bed_queen', label: 'Cama queen', group: 'Dormitorio', w: 1.6, d: 2.0, h: 0.5 },
  { kind: 'bed_king', label: 'Cama king', group: 'Dormitorio', w: 2.0, d: 2.0, h: 0.5 },
  { kind: 'wardrobe', label: 'Armario', group: 'Dormitorio', w: 1.2, d: 0.6, h: 2.0, resizable: true },
  { kind: 'nightstand', label: 'Mesa de noche', group: 'Dormitorio', w: 0.45, d: 0.4, h: 0.55 },
  { kind: 'desk', label: 'Escritorio', group: 'Dormitorio', w: 1.2, d: 0.6, h: 0.75 },
  { kind: 'sofa2', label: 'Sofá 2 puestos', group: 'Sala', w: 1.6, d: 0.85, h: 0.8 },
  { kind: 'sofa3', label: 'Sofá 3 puestos', group: 'Sala', w: 2.1, d: 0.9, h: 0.8 },
  { kind: 'sofaL', label: 'Sofá en L', group: 'Sala', w: 2.4, d: 1.6, h: 0.8 },
  { kind: 'coffee_table', label: 'Mesa de centro', group: 'Sala', w: 1.0, d: 0.55, h: 0.4 },
  { kind: 'tv_unit', label: 'Mueble TV', group: 'Sala', w: 1.6, d: 0.4, h: 0.6 },
  { kind: 'table4', label: 'Mesa 4 puestos', group: 'Comedor', w: 1.4, d: 1.6, h: 0.75 },
  { kind: 'table6', label: 'Mesa 6 puestos', group: 'Comedor', w: 1.4, d: 2.2, h: 0.75 },
  { kind: 'table8', label: 'Mesa 8 puestos', group: 'Comedor', w: 1.5, d: 2.8, h: 0.75 },
  { kind: 'fridge', label: 'Nevera', group: 'Cocina', w: 0.75, d: 0.7, h: 1.8 },
  { kind: 'sink', label: 'Fregadero', group: 'Cocina', w: 0.8, d: 0.6, h: 0.9 },
  { kind: 'stove', label: 'Cocina (estufa)', group: 'Cocina', w: 0.6, d: 0.6, h: 0.9 },
  { kind: 'island', label: 'Isla', group: 'Cocina', w: 1.8, d: 0.9, h: 0.9 },
  { kind: 'counter', label: 'Muebles inferiores', group: 'Cocina', w: 2.4, d: 0.6, h: 0.9, resizable: true },
  { kind: 'upper_cabinets', label: 'Muebles superiores', group: 'Cocina', w: 2.4, d: 0.35, h: 0.7, resizable: true },
  { kind: 'shower', label: 'Ducha', group: 'Baño', w: 0.9, d: 0.9, h: 0.1 },
  { kind: 'bathtub', label: 'Bañera', group: 'Baño', w: 1.7, d: 0.75, h: 0.55 },
  { kind: 'wc', label: 'WC', group: 'Baño', w: 0.4, d: 0.7, h: 0.45 },
  { kind: 'basin', label: 'Lavamanos', group: 'Baño', w: 0.6, d: 0.45, h: 0.85 },
  { kind: 'washer', label: 'Lavadora', group: 'Servicio', w: 0.6, d: 0.6, h: 0.9 },
  { kind: 'car', label: 'Vehículo', group: 'Exterior', w: 1.8, d: 4.4, h: 1.45 },
  { kind: 'plant', label: 'Planta', group: 'Exterior', w: 0.6, d: 0.6, h: 0.9 },
  { kind: 'tree', label: 'Árbol', group: 'Exterior', w: 2.6, d: 2.6, h: 3.5 },
  { kind: 'stairs', label: 'Escalera', group: 'Exterior', w: 1.0, d: 3.0, h: 0.2 },
];

export const FURNITURE: Record<FurnitureKind, FurnitureDef> = Object.fromEntries(defs.map((d) => [d.kind, d])) as Record<FurnitureKind, FurnitureDef>;
export const FURNITURE_LIST = defs;

/** Huella del mueble en coordenadas del ambiente */
export function footprint(f: FurnitureItem) {
  const def = FURNITURE[f.kind];
  const w = f.w ?? def.w;
  const d = def.d;
  const rotated = f.rotation === 90 || f.rotation === 270;
  const fw = rotated ? d : w;
  const fd = rotated ? w : d;
  return { x: f.cx - fw / 2, y: f.cy - fd / 2, w: fw, h: fd, sw: w, sd: d };
}
