import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from './storage';
import { diffSnapshots } from './versions';
import { legacyV1, sampleProject } from '../test/helpers';
import { runCommand } from '../commands/commands';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe('almacenamiento local', () => {
  it('guarda, lista, abre y elimina', async () => {
    const mem = memoryStorage();
    const repo = LocalStorageAdapter(mem);
    const p = sampleProject();
    await repo.save(p);
    expect((await repo.list()).map((m) => m.id)).toEqual([p.id]);
    const r = await repo.get(p.id);
    expect(r?.ok).toBe(true);
    expect(r?.project?.rooms).toEqual(p.rooms);
    await repo.remove(p.id);
    expect(await repo.list()).toEqual([]);
  });

  it('proyectos antiguos guardados en el navegador siguen abriendo', async () => {
    const mem = memoryStorage();
    const old = legacyV1();
    mem.setItem('arquigen360.projects.v1', JSON.stringify({ [old.id as string]: old }));
    const r = await LocalStorageAdapter(mem).get(old.id as string);
    expect(r?.ok).toBe(true);
    expect(r?.project?.schemaVersion).toBe('2.0.0');
  });

  it('datos corruptos en el navegador no rompen la lista', async () => {
    const mem = memoryStorage();
    mem.setItem('arquigen360.projects.v1', '{corrupto');
    expect(await LocalStorageAdapter(mem).list()).toEqual([]);
    mem.setItem('arquigen360.projects.v1', JSON.stringify({ a: { basura: true } }));
    expect(await LocalStorageAdapter(mem).list()).toEqual([]);
  });
});

describe('comparación de versiones', () => {
  it('detecta ambientes cambiados, agregados y eliminados por ID', () => {
    const p = sampleProject();
    const sala = p.rooms.find((r) => r.name === 'Sala')!;
    const baño = p.rooms.find((r) => r.name === 'Baño')!;
    let q = runCommand(p, { command: 'rename_space', targetId: sala.id, changes: { name: 'Estar' } }, 'user').project;
    q = runCommand(q, { command: 'delete_space', targetId: baño.id }, 'user').project;
    const d = diffSnapshots(p, q);
    expect(d.removed).toEqual(['Baño']);
    expect(d.changed.map((c) => c.name)).toEqual(['Sala → Estar']);
    expect(d.builtAfter).toBeLessThan(d.builtBefore);
  });
});
