import { describe, expect, it } from 'vitest';
import { generateLayout } from './engine';
import { newProject, makeSpec, numberNames } from '../projects/defaults';
import { overlaps, roomRect, inside } from '../geometry/rect';
import { buildableRect } from '../geometry/site';
import { checkProject } from '../schema/migrations';
import { rng } from '../test/helpers';
import { SELECTABLE } from './catalog';
import type { AccessSide, RoomType } from '../geometry/types';

/*
 * Pruebas por propiedades: para cientos de entradas aleatorias (reproducibles),
 * el motor nunca debe producir geometrías imposibles.
 */
describe('motor: propiedades con entradas aleatorias', () => {
  it('300 casos: sin superposición, dentro del área construible, números finitos y esquema válido', () => {
    const rand = rng(20260927);
    const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
    let withRooms = 0;
    for (let i = 0; i < 300; i++) {
      const p = newProject('Caso');
      p.site.width = +(4 + rand() * 20).toFixed(2);
      p.site.length = +(8 + rand() * 30).toFixed(2);
      p.site.access = pick(['front', 'back', 'left', 'right'] as AccessSide[]);
      p.site.setbacks = { front: +(rand() * 3).toFixed(2), back: +(rand() * 3).toFixed(2), side: +(rand() * 1.5).toFixed(2) };
      p.site.maxOccupancy = Math.round(40 + rand() * 60);
      const n = 2 + Math.floor(rand() * 10);
      p.program = {
        rooms: numberNames(Array.from({ length: n }, () => makeSpec(pick(SELECTABLE) as RoomType))),
        preferences: { socialZone: pick(['front', 'back'] as const), openKitchen: rand() > 0.5, garageCars: pick([0, 1, 2] as const) },
      };
      const res = generateLayout(p.site, p.program);
      const q = { ...p, rooms: res.rooms, openings: res.openings, furniture: res.furniture };
      if (q.rooms.length) withRooms++;
      const br = buildableRect(p.site);
      const lot = { x: 0, y: 0, w: p.site.width, h: p.site.length };
      for (const r of q.rooms) {
        expect(Number.isFinite(r.x + r.y + r.width + r.length)).toBe(true);
        expect(r.width).toBeGreaterThan(0);
        expect(r.length).toBeGreaterThan(0);
        expect(inside(roomRect(r), br, 0.011) || inside(roomRect(r), lot, 0.011)).toBe(true);
      }
      for (let a = 0; a < q.rooms.length; a++)
        for (let b = a + 1; b < q.rooms.length; b++) expect(overlaps(roomRect(q.rooms[a]), roomRect(q.rooms[b]), 0.01)).toBe(false);
      expect(checkProject(q)).toEqual([]);
    }
    expect(withRooms).toBeGreaterThan(250);
  });
});
