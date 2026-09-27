import { describe, expect, it } from 'vitest';
import { generateLayout } from './engine';
import { validate } from './validate';
import { defaultProgram, defaultSite, makeSpec, newProject, numberNames } from '../projects/defaults';
import { overlaps, roomRect, inside } from '../geometry/rect';
import { buildableRect } from '../geometry/site';
import { computeWalls } from '../geometry/walls';
import type { AccessSide, Project } from '../geometry/types';
import { interpret } from '../ai/localParser';

function check(p: Project) {
  const { rooms } = p;
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++) expect(overlaps(roomRect(rooms[i]), roomRect(rooms[j]), 0.01)).toBe(false);
  const br = buildableRect(p.site);
  for (const r of rooms) expect(inside(roomRect(r), br, 0.011)).toBe(true);
}

function build(mut: (p: Project) => void = () => {}) {
  const p = newProject();
  mut(p);
  const res = generateLayout(p.site, p.program);
  Object.assign(p, { rooms: res.rooms, openings: res.openings, furniture: res.furniture });
  return { p, res };
}

describe('motor de distribución', () => {
  it('programa por defecto 8 × 16', () => {
    const { p, res } = build();
    check(p);
    if ((globalThis as { process?: { env: Record<string, string> } }).process?.env.SHOW) {
      console.log(res.notes);
      console.table(p.rooms.map((r) => ({ n: r.name, x: r.x, y: r.y, w: r.width, l: r.length })));
      console.log(validate(p).map((i) => `${i.level}: ${i.msg}`).join('\n'));
      console.log(p.openings.length, 'aberturas', p.furniture.length, 'muebles', computeWalls(p.rooms, p.program.preferences).length, 'muros');
    }
    expect(p.rooms.length).toBeGreaterThan(8);
    expect(validate(p).filter((i) => i.level === 'error')).toEqual([]);
  });

  for (const access of ['front', 'back', 'left', 'right'] as AccessSide[]) {
    for (const socialZone of ['front', 'back'] as const) {
      it(`acceso ${access}, social ${socialZone}`, () => {
        const { p } = build((q) => {
          q.site.access = access;
          q.program.preferences.socialZone = socialZone;
        });
        check(p);
      });
    }
  }

  it('lote angosto 5 × 20 con garaje', () => {
    const { p } = build((q) => {
      q.site.width = 5;
      q.site.length = 20;
    });
    check(p);
  });

  it('lote amplio 12 × 25 con exteriores', () => {
    const { p } = build((q) => {
      q.site = { ...defaultSite(), width: 12, length: 25, setbacks: { front: 3, back: 2, side: 1 } };
      q.program = defaultProgram();
      q.program.rooms = numberNames([...q.program.rooms, makeSpec('study'), makeSpec('patio'), makeSpec('garden')]);
      q.program.preferences.garageCars = 2;
    });
    check(p);
  });

  it('intérprete local', () => {
    const r = interpret('Quiero una casa de 8 x 16 metros con 3 habitaciones, 2 baños, cocina abierta, sala, comedor y garaje para 2 carros. Dormitorios atrás.');
    expect(r.site?.width).toBe(8);
    expect(r.site?.length).toBe(16);
    const types = r.program.rooms.map((x) => x.type);
    expect(types.filter((t) => t === 'master_bedroom' || t === 'bedroom').length).toBe(3);
    expect(types.filter((t) => t === 'bathroom' || t === 'ensuite').length).toBe(2);
    expect(r.program.preferences.garageCars).toBe(2);
    expect(r.program.preferences.openKitchen).toBe(true);
    expect(r.program.preferences.socialZone).toBe('front');
  });
});
