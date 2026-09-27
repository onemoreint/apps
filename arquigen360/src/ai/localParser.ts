import type { AccessSide, Program, RoomSpec, RoomType, Site } from '../geometry/types';
import { makeSpec, numberNames } from '../projects/defaults';

/**
 * Intérprete local (sin red) de instrucciones en español.
 * Convierte texto libre en Site parcial + Program. Nunca produce geometría.
 */
export interface Interpretation {
  site?: Partial<Site>;
  program: Program;
  summary: string[];
}

const WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const num = (s: string) => (WORDS[s] ?? parseFloat(s.replace(',', '.')));
const N = '(\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis)';

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function interpret(text: string): Interpretation {
  const t = norm(text);
  const summary: string[] = [];
  const site: Partial<Site> = {};

  const lot = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m|mts|metros)?\s*(?:x|por|×)\s*(\d+(?:[.,]\d+)?)/);
  if (lot) {
    site.width = num(lot[1]);
    site.length = num(lot[2]);
    summary.push(`Terreno ${site.width} × ${site.length} m`);
  }
  const floors = t.match(new RegExp(`${N}\\s*(?:pisos|plantas|niveles)`));
  if (floors) {
    site.floors = num(floors[1]);
    summary.push(`${site.floors} piso(s)`);
  }
  const acc = t.match(/acceso\s+(?:por\s+(?:la|el)\s+|lateral\s+|por\s+)?(izquierd|derech|posterior|atras|fondo|frente|frontal)/);
  if (acc) {
    const map: Record<string, AccessSide> = { izquierd: 'left', derech: 'right', posterior: 'back', atras: 'back', fondo: 'back', frente: 'front', frontal: 'front' };
    site.access = map[acc[1]];
    summary.push(`Acceso ${({ left: 'por la izquierda', right: 'por la derecha', back: 'posterior', front: 'frontal' } as const)[site.access]}`);
  }
  const occ = t.match(/ocupacion\s+(?:maxima\s+)?(?:de\s+)?(\d+)\s*%/);
  if (occ) {
    site.maxOccupancy = +occ[1];
    summary.push(`Ocupación máx. ${occ[1]} %`);
  }
  const setbacks: Partial<Site['setbacks']> = {};
  const rf = t.match(/retiro\s+(?:frontal|delantero|anterior)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)/);
  const rb = t.match(/retiro\s+(?:posterior|trasero)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)/);
  const rs = t.match(/retiros?\s+laterales?\s+(?:de\s+)?(\d+(?:[.,]\d+)?)/);
  if (rf) setbacks.front = num(rf[1]);
  if (rb) setbacks.back = num(rb[1]);
  if (rs) setbacks.side = num(rs[1]);
  if (Object.keys(setbacks).length) {
    (site as { setbacks?: Partial<Site['setbacks']> }).setbacks = setbacks;
    summary.push('Retiros indicados');
  }

  const count = (re: string, def = 0) => {
    const m = t.match(new RegExp(`${N}\\s*(?:${re})`));
    if (m) return num(m[1]);
    return new RegExp(`(?:${re})`).test(t) ? Math.max(def, 1) : def;
  };

  const specs: RoomSpec[] = [];
  const beds = count('habitaciones|habitacion|dormitorios|dormitorio|cuartos|alcobas|recamaras|recamara');
  const baths = count('banos|bano');
  if (beds >= 1) specs.push(makeSpec('master_bedroom'));
  for (let i = 1; i < beds; i++) specs.push(makeSpec('bedroom'));
  if (beds) summary.push(`${beds} dormitorio(s)`);
  if (baths >= 2 && beds >= 1) {
    specs.push(makeSpec('ensuite'));
    for (let i = 1; i < baths; i++) specs.push(makeSpec('bathroom'));
  } else if (baths >= 1) specs.push(makeSpec('bathroom'));
  if (baths) summary.push(`${baths} baño(s)`);

  // la zona social siempre existe en una vivienda
  specs.push(makeSpec('living'), makeSpec('dining'), makeSpec('kitchen'));

  const optional: [RegExp, RoomType][] = [
    [/lavanderia|zona de ropas/, 'laundry'],
    [/area de servicio|cuarto de servicio/, 'service'],
    [/patio/, 'patio'],
    [/jardin/, 'garden'],
    [/estudio/, 'study'],
    [/oficina/, 'office'],
    [/terraza/, 'terrace'],
    [/balcon/, 'balcony'],
    [/deposito|bodega/, 'storage'],
    [/vestidor|walk.?in/, 'closet'],
  ];
  for (const [re, type] of optional) if (re.test(t)) { specs.push(makeSpec(type)); summary.push(makeSpec(type).name); }

  let garageCars: 0 | 1 | 2 = 0;
  if (/garaje|garage|parqueadero|cochera|estacionamiento/.test(t)) {
    const cars = t.match(new RegExp(`(?:garaje|garage|parqueadero|cochera|estacionamiento)[^.]*?${N}\\s*(?:carros|carro|vehiculos|vehiculo|autos|auto|coches|coche)`));
    garageCars = cars && num(cars[1]) >= 2 ? 2 : /doble/.test(t) ? 2 : 1;
    specs.push(makeSpec('garage', garageCars === 2 ? { minWidth: 5.6, minArea: 30.8 } : {}));
    summary.push(`Garaje para ${garageCars} vehículo(s)`);
  }

  const openKitchen = !/cocina\s+cerrada/.test(t);
  summary.push(openKitchen ? 'Cocina abierta' : 'Cocina cerrada');

  let socialZone: 'front' | 'back' = 'front';
  if (/(?:dormitorios|habitaciones|zona privada)\s+(?:en\s+la\s+parte\s+)?(?:al\s+)?(?:frente|delantera|adelante)/.test(t) ||
      /(?:zona\s+)?social\s+(?:en\s+la\s+parte\s+)?(?:al\s+)?(?:fondo|posterior|atras)/.test(t)) socialZone = 'back';
  summary.push(socialZone === 'front' ? 'Zona social al frente' : 'Zona social al fondo');

  return {
    site: Object.keys(site).length ? site : undefined,
    program: { rooms: numberNames(specs), preferences: { socialZone, openKitchen, garageCars } },
    summary,
  };
}
