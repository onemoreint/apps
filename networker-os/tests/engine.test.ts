import { describe, expect, it } from 'vitest';
import { buildDemoContacts, buildDemoOrganization } from '../src/data/seed';
import { calculateNextBestAction, rankActions } from '../src/domain/engine/nextBestAction';
import { buildRadar } from '../src/domain/engine/radar';
import { computeStats, processInsights } from '../src/domain/engine/stats';
import { computeDuplication } from '../src/domain/engine/duplication';
import type { Contact, Interaction } from '../src/domain/models';
import { isoAtDaysFrom } from '../src/utils/dates';

const NOW = new Date(2026, 8, 27, 10, 0, 0);
const { contacts, interactions } = buildDemoContacts(NOW);
const byId = (id: string) => contacts.find((c) => c.id === id)!;
const nba = (id: string) => calculateNextBestAction(byId(id), interactions, NOW);

function contact(p: Partial<Contact> = {}): Contact {
  return {
    id: 'x', firstName: 'Test', lastName: 'User', phone: '', whatsapp: '', country: '', city: '',
    createdAt: isoAtDaysFrom(NOW, -20), updatedAt: isoAtDaysFrom(NOW, -20), lastInteractionAt: null,
    nextAction: null, notes: '', tags: [], source: '', ownerId: 'me', stage: 'interesado',
    temperature: 'media', interest: 'producto', objection: null, ...p,
  };
}
const ix = (daysAgo: number, p: Partial<Interaction> = {}): Interaction => ({
  id: Math.random().toString(), contactId: 'x', type: 'mensaje', direction: 'saliente', topics: [], note: '',
  date: isoAtDaysFrom(NOW, -daysAgo), ...p,
});

describe('Motor ¿Qué hago ahora? (datos demo)', () => {
  it('Carlos: preguntó por el negocio sin respuesta → prioridad alta, inmediata', () => {
    const a = nba('demo-carlos')!;
    expect(a.ruleId).toBe('responder_negocio');
    expect(a.priority).toBe('alta');
    expect(a.bucket).toBe('inmediata');
    expect(a.reason.length).toBeGreaterThan(20);
  });
  it('Jorge: preguntó precio → responder antes de enviar nueva información', () => {
    expect(nba('demo-jorge')!.ruleId).toBe('responder_precio');
  });
  it('María: pidió información de producto → responder', () => {
    expect(nba('demo-maria')!.ruleId).toBe('responder_mensaje');
  });
  it('Ana: vio la presentación sin decisión → seguimiento post-presentación', () => {
    expect(nba('demo-ana')!.ruleId).toBe('post_presentacion');
  });
  it('Natalia: acción vencida', () => {
    expect(nba('demo-natalia')!.ruleId).toBe('accion_vencida');
  });
  it('Luis: >14 días sin interacción y con interés previo → recuperación', () => {
    const a = nba('demo-luis')!;
    expect(a.ruleId).toBe('recuperacion');
    expect(a.bucket).toBe('recuperacion');
  });
  it('Ricardo: 2 mensajes seguidos sin respuesta → no responde', () => {
    expect(nba('demo-ricardo')!.ruleId).toBe('no_responde');
  });
  it('Laura: próxima acción futura programada → sin acción urgente', () => {
    expect(nba('demo-laura')).toBeNull();
  });
  it('Gabriela (no interesada) nunca recibe acciones', () => {
    expect(nba('demo-gabriela')).toBeNull();
  });
  it('El ranking prioriza las alertas altas primero', () => {
    const r = rankActions(contacts, interactions, NOW);
    expect(r[0].priority).toBe('alta');
    expect(r.slice(0, 5).every((a) => a.priority === 'alta')).toBe(true);
  });
});

describe('Las prioridades cambian según los datos', () => {
  it('Interesado sin seguimiento >2 días → alta si temperatura alta', () => {
    const c = contact({ temperature: 'alta' });
    const a = calculateNextBestAction(c, [ix(4)], NOW)!;
    expect(a.ruleId).toBe('interesado_sin_seguimiento');
    expect(a.priority).toBe('alta');
  });
  it('Si se define una próxima acción futura, la alerta desaparece', () => {
    const c = contact({ temperature: 'alta', nextAction: { text: 'Llamar', dueDate: isoAtDaysFrom(NOW, 2) } });
    expect(calculateNextBestAction(c, [ix(4)], NOW)).toBeNull();
  });
  it('Responder cambia la acción: pregunta de precio respondida ya no es prioridad', () => {
    const c = contact();
    const asked = [ix(2, { direction: 'entrante', topics: ['precio'] })];
    expect(calculateNextBestAction(c, asked, NOW)!.ruleId).toBe('responder_precio');
    const answered = [...asked, ix(1, { direction: 'saliente', topics: ['precio'] })];
    expect(calculateNextBestAction(c, answered, NOW)?.ruleId ?? null).not.toBe('responder_precio');
  });
  it('Registrar decisión tras la presentación elimina el seguimiento post-presentación', () => {
    const c = contact({ stage: 'presentacion_realizada' });
    const base = [ix(3, { type: 'presentacion' })];
    expect(calculateNextBestAction(c, base, NOW)!.ruleId).toBe('post_presentacion');
    const decided = [...base, ix(1, { direction: 'entrante', topics: ['decision'] })];
    expect(calculateNextBestAction(c, decided, NOW)?.ruleId).not.toBe('post_presentacion');
  });
  it('Contacto nuevo sin mensaje → primer contacto', () => {
    const c = contact({ stage: 'nuevo', interest: 'desconocido', temperature: 'baja', createdAt: isoAtDaysFrom(NOW, -1) });
    expect(calculateNextBestAction(c, [], NOW)!.ruleId).toBe('primer_contacto');
  });
});

describe('Radar, indicadores y duplicación', () => {
  const radar = buildRadar(contacts, interactions, NOW);
  it('Radar llena todas las categorías con los datos demo', () => {
    expect(radar.inmediata.length).toBeGreaterThanOrEqual(3);
    expect(radar.seguimiento.length).toBeGreaterThan(0);
    expect(radar.recuperacion.length).toBeGreaterThan(0);
    expect(radar.potencialDistribuidor.map((p) => p.contact.id)).toContain('demo-ana');
    expect(radar.potencialCliente.map((p) => p.contact.id)).toContain('demo-jorge');
    expect(radar.potencialDistribuidor.every((p) => p.signals.length > 0)).toBe(true);
  });
  it('Indicadores del tablero', () => {
    const s = computeStats(contacts, interactions, NOW);
    expect(s.total).toBe(16);
    expect(s.clientes).toBe(1);
    expect(s.distribuidores).toBe(1);
    expect(s.presentaciones).toBeGreaterThanOrEqual(2);
    expect(processInsights(contacts, interactions, NOW).length).toBeGreaterThan(0);
  });
  it('Índice de duplicación entre 0 y 100 con recomendaciones', () => {
    const { members, logs } = buildDemoOrganization(NOW, 'José Lugo');
    const d = computeDuplication(members, logs, contacts, interactions, NOW);
    expect(d.index).toBeGreaterThan(0);
    expect(d.index).toBeLessThan(100);
    expect(d.recommendations.length).toBeGreaterThan(0);
    expect(d.members.find((m) => m.member.id === 'm-paola')!.status).toBe('inactivo');
  });
});
