/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadProject, checkProject, sanitizeText, migrate } from './migrations';
import { projectSchema, LIMITS } from './projectSchema';
import { legacyV1, sampleProject } from '../test/helpers';
import { checkImportFile } from '../projects/storage';

describe('versionado y migración del esquema', () => {
  it('un proyecto nuevo cumple el esquema 2.0.0', () => {
    const p = sampleProject();
    expect(p.schemaVersion).toBe('2.0.0');
    expect(checkProject(p)).toEqual([]);
  });

  it('abre proyectos 1.x y los migra a 2.0.0 sin perder geometría', () => {
    const old = legacyV1();
    const r = loadProject(JSON.stringify(old));
    expect(r.ok).toBe(true);
    expect(r.migratedFrom).toBe('1.0.0');
    expect(r.project!.schemaVersion).toBe('2.0.0');
    expect(r.project!.rooms).toEqual(old.rooms);
    expect(r.project!.metadata.status).toBe('BORRADOR');
    expect(r.project!.audit[0].action).toBe('migrate');
    expect(r.warnings[0]).toMatch(/1\.0\.0/);
  });

  it('proyectos 1.x sin aberturas ni muebles siguen abriendo', () => {
    const old = legacyV1();
    delete old.openings;
    delete old.furniture;
    const r = loadProject(old);
    expect(r.ok).toBe(true);
    expect(r.project!.openings).toEqual([]);
  });

  it('no elimina campos desconocidos', () => {
    const old = { ...legacyV1(), campoDelFuturo: { a: 1 }, notasCliente: 'x' };
    const r = loadProject(old);
    expect(r.ok).toBe(true);
    expect((r.project as unknown as Record<string, unknown>).campoDelFuturo).toEqual({ a: 1 });
    expect((r.project as unknown as Record<string, unknown>).notasCliente).toBe('x');
  });

  it('rechaza un esquema más nuevo que la aplicación', () => {
    expect(() => migrate({ schemaVersion: '3.0.0' })).toThrow(/más nueva/);
  });

  it('rechaza archivos sin versión', () => {
    const r = loadProject({ rooms: [] });
    expect(r.ok).toBe(false);
  });

  it('el archivo schema/project.schema.json está al día', () => {
    const path = new URL('../../schema/project.schema.json', import.meta.url);
    const text = JSON.stringify(projectSchema, null, 2) + '\n';
    if (!existsSync(path) || (globalThis as { process?: { env: Record<string, string> } }).process?.env.WRITE_SCHEMA) writeFileSync(path, text);
    expect(readFileSync(path, 'utf8')).toBe(text);
  });
});

describe('seguridad de importación', () => {
  it('JSON corrupto', () => {
    const r = loadProject('{"rooms": [');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/JSON válido/);
  });

  it('JSON excesivamente grande', () => {
    const r = loadProject('x'.repeat(LIMITS.importBytes + 1));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/máximo/);
  });

  it('valores negativos', () => {
    const p = sampleProject();
    const bad = { ...p, rooms: p.rooms.map((r, i) => (i === 0 ? { ...r, width: -3 } : r)) };
    expect(loadProject(bad).ok).toBe(false);
  });

  it('dimensiones infinitas (1e400 en el texto)', () => {
    const text = JSON.stringify(sampleProject()).replace(/"width":8,/, '"width":1e400,');
    expect(text).toContain('1e400');
    const r = loadProject(text);
    expect(r.ok).toBe(false);
  });

  it('tipos inesperados', () => {
    const p = sampleProject();
    expect(loadProject({ ...p, rooms: 'no es un arreglo' }).ok).toBe(false);
    expect(loadProject({ ...p, site: { ...p.site, width: '8' } }).ok).toBe(false);
    expect(loadProject([p]).ok).toBe(false);
  });

  it('textos con HTML se limpian', () => {
    const p = sampleProject();
    const evil = { ...p, name: '<img src=x onerror=alert(1)>Casa', rooms: p.rooms.map((r, i) => (i === 0 ? { ...r, name: '<script>alert(1)</script>Sala' } : r)) };
    const r = loadProject(JSON.stringify(evil));
    expect(r.ok).toBe(true);
    expect(r.project!.name).not.toMatch(/[<>]/);
    expect(r.project!.rooms[0].name).not.toMatch(/[<>]/);
    expect(sanitizeText('a\u0000b\u001Fc<d>')).toBe('abcd');
  });

  it('identificadores repetidos se rechazan', () => {
    const p = sampleProject();
    const dup = { ...p, rooms: [...p.rooms, { ...p.rooms[0] }] };
    const r = loadProject(dup);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/repetido/);
  });

  it('aberturas que apuntan a ambientes inexistentes se descartan con aviso', () => {
    const p = sampleProject();
    const bad = { ...p, openings: [...p.openings, { ...p.openings[0], id: 'op-x', roomId: 'no-existe' }] };
    const r = loadProject(bad);
    expect(r.ok).toBe(true);
    expect(r.project!.openings.length).toBe(p.openings.length);
    expect(r.warnings.join(' ')).toMatch(/descartaron/);
  });

  it('valida extensión, tipo y tamaño del archivo antes de leerlo', () => {
    expect(checkImportFile({ name: 'a.exe', type: 'application/x-msdownload', size: 10 }, 100)).toMatch(/\.json/);
    expect(checkImportFile({ name: 'a.json', type: 'text/html', size: 10 }, 100)).toMatch(/Tipo/);
    expect(checkImportFile({ name: 'a.json', type: 'application/json', size: 1000 }, 100)).toMatch(/máximo/);
    expect(checkImportFile({ name: 'a.json', type: 'application/json', size: 0 }, 100)).toMatch(/vacío/);
    expect(checkImportFile({ name: 'a.json', type: 'application/json', size: 10 }, 100)).toBeNull();
  });
});
