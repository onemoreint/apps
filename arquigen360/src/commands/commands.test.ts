import { describe, expect, it } from 'vitest';
import { runCommand, runCommands } from './commands';
import { parseEditRequest } from '../ai/commandParser';
import { sampleProject } from '../test/helpers';
import { checkProject } from '../schema/migrations';
import { guardInput, AI_INPUT_MAX } from '../ai/provider';

const byName = (p: ReturnType<typeof sampleProject>, name: string) => p.rooms.find((r) => r.name === name)!;

describe('pipeline de comandos', () => {
  it('aplica un cambio válido y conserva el esquema', () => {
    const p = sampleProject();
    const r = byName(p, 'Sala');
    const { project, result } = runCommand(p, { command: 'rename_space', targetId: r.id, changes: { name: 'Sala familiar' } }, 'ai');
    expect(result.ok).toBe(true);
    expect(byName(project, 'Sala familiar').id).toBe(r.id);
    expect(checkProject(project)).toEqual([]);
    expect(p.rooms.find((x) => x.id === r.id)!.name).toBe('Sala'); // el original no se muta
  });

  it('JSON inválido → etapa json', () => {
    expect(runCommand(sampleProject(), '{no', 'ai').result.stage).toBe('json');
  });

  it('comando no reconocido o campos extra → etapa schema', () => {
    const p = sampleProject();
    expect(runCommand(p, { command: 'run_sql', query: 'DROP TABLE' }, 'ai').result.stage).toBe('schema');
    expect(runCommand(p, { command: 'approve_project' }, 'ai').result.stage).toBe('schema');
    expect(runCommand(p, { command: 'resize_space', targetId: p.rooms[0].id, changes: { width: 3, eval: 'x' } }, 'ai').result.stage).toBe('schema');
  });

  it('valores negativos o infinitos → etapa schema', () => {
    const p = sampleProject();
    const id = p.rooms[0].id;
    expect(runCommand(p, { command: 'resize_space', targetId: id, changes: { width: -2 } }, 'ai').result.stage).toBe('schema');
    expect(runCommand(p, { command: 'resize_space', targetId: id, changes: { width: Infinity } }, 'ai').result.stage).toBe('schema');
    expect(runCommand(p, '{"command":"resize_space","targetId":"' + id + '","changes":{"width":1e400}}', 'ai').result.stage).toBe('schema');
  });

  it('la IA no puede eliminar → etapa permission; el usuario sí', () => {
    const p = sampleProject();
    const id = byName(p, 'Baño').id;
    expect(runCommand(p, { command: 'delete_space', targetId: id }, 'ai').result.stage).toBe('permission');
    const u = runCommand(p, { command: 'delete_space', targetId: id }, 'user');
    expect(u.result.ok).toBe(true);
    expect(u.project.rooms.some((r) => r.id === id)).toBe(false);
    expect(u.project.openings.some((o) => o.roomId === id)).toBe(false);
  });

  it('ID manipulado o inexistente → etapa exists', () => {
    expect(runCommand(sampleProject(), { command: 'rename_space', targetId: '../../etc', changes: { name: 'x' } }, 'ai').result.stage).toBe('exists');
  });

  it('fuera del área construible → etapa geometry', () => {
    const p = sampleProject();
    const r = byName(p, 'Sala');
    expect(runCommand(p, { command: 'move_space', targetId: r.id, changes: { y: 0 } }, 'ai').result.stage).toBe('geometry'); // invade el retiro frontal
  });

  it('superposición → etapa collision', () => {
    const p = sampleProject();
    const r = byName(p, 'Dormitorio 2');
    const res = runCommand(p, { command: 'resize_space', targetId: r.id, changes: { width: r.width + 1 } }, 'ai');
    expect(res.result.ok).toBe(false);
    expect(['collision', 'geometry']).toContain(res.result.stage);
  });

  it('ocupación mayor al máximo → etapa normative', () => {
    const p = sampleProject((q) => { q.site.maxOccupancy = 30; });
    // el proyecto ya supera 30 %; agregar área cubierta en el patio libre debe rechazarse
    const res = runCommand(p, { command: 'add_space', changes: { type: 'study', width: 2.5, length: 1.2, x: 0, y: 1 } }, 'ai');
    expect(res.result.ok).toBe(false);
  });

  it('una lista se evalúa en orden y solo aplica los válidos', () => {
    const p = sampleProject();
    const sala = byName(p, 'Sala');
    const { project, results } = runCommands(p, [
      { command: 'rename_space', targetId: sala.id, changes: { name: 'Estar' } },
      { command: 'delete_space', targetId: sala.id },
      { command: 'set_style', changes: { style: 'moderno' } },
    ], 'ai');
    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
    expect(project.style).toBe('moderno');
    expect(byName(project, 'Estar')).toBeTruthy();
  });
});

describe('intérprete local de órdenes', () => {
  it('entiende renombrar, medidas, mover, eliminar, estilo y aberturas', () => {
    const p = sampleProject();
    const r = parseEditRequest('Renombra la sala como Sala familiar. Haz el dormitorio 2 de 3.10 x 2.60. Mueve la lavandería 20 cm a la derecha. Elimina el baño. Cambia al estilo moderno. Agrega una ventana en la cocina muro derecho', p);
    expect(r.commands.map((c) => c.command)).toEqual(['rename_space', 'resize_space', 'translate_space', 'delete_space', 'set_style', 'add_opening']);
    const resize = r.commands[1] as { targetId: string; changes: { width: number; length: number } };
    expect(p.rooms.find((x) => x.id === resize.targetId)!.name).toBe('Dormitorio 2');
    expect(resize.changes).toEqual({ width: 3.1, length: 2.6 });
    expect((r.commands[2] as { changes: { dx: number } }).changes.dx).toBeCloseTo(0.2);
    expect(r.unrecognized).toEqual([]);
  });

  it('reporta lo que no entiende', () => {
    const r = parseEditRequest('pinta todo de azul', sampleProject());
    expect(r.commands).toEqual([]);
    expect(r.unrecognized).toEqual(['pinta todo de azul']);
  });

  it('limita y limpia la entrada', () => {
    expect(() => guardInput('a'.repeat(AI_INPUT_MAX + 1))).toThrow();
    expect(guardInput('<b>hola</b>\u0000')).toBe('bhola/b');
  });
});
