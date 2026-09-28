// Repositorios: única puerta de acceso a los datos. Para migrar a Supabase se reemplaza
// la implementación de estas funciones sin tocar la interfaz de usuario.

import { db } from './db';
import type { ActivityLog, Contact, Interaction, Member, PracticeLog, Stage } from '../domain/models';
import { toDateKey, uid } from '../utils/dates';

const nowIso = () => new Date().toISOString();

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'lastInteractionAt'> & { createdAt?: string };

export const contactsRepo = {
  async create(input: ContactInput): Promise<string> {
    const id = uid();
    const created = input.createdAt ?? nowIso();
    await db.transaction('rw', db.contacts, db.interactions, async () => {
      await db.contacts.add({ ...input, id, createdAt: created, updatedAt: created, lastInteractionAt: null });
      await db.interactions.add({
        id: uid(),
        contactId: id,
        type: 'cambio_estado',
        direction: 'interna',
        topics: [],
        note: 'Contacto registrado',
        date: created,
        meta: { to: input.stage },
      });
    });
    return id;
  },

  async update(id: string, patch: Partial<Contact>): Promise<void> {
    await db.transaction('rw', db.contacts, db.interactions, async () => {
      const prev = await db.contacts.get(id);
      if (!prev) return;
      await db.contacts.update(id, { ...patch, updatedAt: nowIso() });
      if (patch.stage && patch.stage !== prev.stage) await logStageChange(id, prev.stage, patch.stage);
    });
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.contacts, db.interactions, async () => {
      await db.interactions.where('contactId').equals(id).delete();
      await db.contacts.delete(id);
    });
  },
};

async function logStageChange(contactId: string, from: Stage, to: Stage) {
  await db.interactions.add({
    id: uid(),
    contactId,
    type: 'cambio_estado',
    direction: 'interna',
    topics: to === 'cliente' || to === 'distribuidor' || to === 'no_interesado' ? ['decision'] : [],
    note: '',
    date: nowIso(),
    meta: { from, to },
  });
}

export async function recomputeLastInteraction(contactId: string) {
  const list = await db.interactions.where('contactId').equals(contactId).toArray();
  const touches = list.filter((i) => i.type !== 'cambio_estado' && i.type !== 'nota' && i.direction !== 'interna');
  const last = touches.reduce<string | null>((m, i) => (!m || i.date > m ? i.date : m), null);
  await db.contacts.update(contactId, { lastInteractionAt: last });
}

export interface InteractionInput extends Omit<Interaction, 'id'> {
  newStage?: Stage;
  nextAction?: Contact['nextAction'] | 'clear';
}

export const interactionsRepo = {
  async add(input: InteractionInput): Promise<void> {
    const { newStage, nextAction, ...data } = input;
    await db.transaction('rw', db.contacts, db.interactions, async () => {
      await db.interactions.add({ ...data, id: uid() });
      const patch: Partial<Contact> = { updatedAt: nowIso() };
      if (nextAction === 'clear') patch.nextAction = null;
      else if (nextAction) patch.nextAction = nextAction;
      const prev = await db.contacts.get(data.contactId);
      if (newStage && prev && newStage !== prev.stage) {
        patch.stage = newStage;
        await logStageChange(data.contactId, prev.stage, newStage);
      }
      await db.contacts.update(data.contactId, patch);
      await recomputeLastInteraction(data.contactId);
    });
  },

  async remove(id: string): Promise<void> {
    const i = await db.interactions.get(id);
    if (!i) return;
    await db.interactions.delete(id);
    await recomputeLastInteraction(i.contactId);
  },
};

export const membersRepo = {
  async save(m: Omit<Member, 'id'> & { id?: string }): Promise<string> {
    const id = m.id ?? uid();
    await db.members.put({ ...m, id });
    return id;
  },
  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.members, db.activityLogs, async () => {
      const m = await db.members.get(id);
      // Los miembros que dependían de él pasan a su patrocinador.
      await db.members.where('parentId').equals(id).modify({ parentId: m?.parentId ?? 'me' });
      await db.activityLogs.where('memberId').equals(id).delete();
      await db.members.delete(id);
    });
  },
  async logWeek(log: Omit<ActivityLog, 'id'>): Promise<void> {
    const existing = await db.activityLogs.where('memberId').equals(log.memberId).filter((l) => l.weekStart === log.weekStart).first();
    await db.transaction('rw', db.activityLogs, db.members, async () => {
      if (existing) await db.activityLogs.update(existing.id, log);
      else await db.activityLogs.add({ ...log, id: uid() });
      const total = log.newContacts + log.presentations + log.followUps + log.newClients + log.newDistributors;
      if (total > 0) await db.members.update(log.memberId, { lastActivityAt: nowIso() });
    });
  },
};

export const practiceRepo = {
  async add(p: Omit<PracticeLog, 'id' | 'date'>): Promise<void> {
    await db.practice.add({ ...p, id: uid(), date: nowIso() });
  },
};

export const challengesRepo = {
  async mark(challengeId: string, day: Date = new Date()): Promise<void> {
    const date = toDateKey(day);
    await db.challengeChecks.put({ id: `${date}:${challengeId}`, date, challengeId });
  },
  async toggle(challengeId: string, day: Date = new Date()): Promise<void> {
    const date = toDateKey(day);
    const id = `${date}:${challengeId}`;
    if (await db.challengeChecks.get(id)) await db.challengeChecks.delete(id);
    else await db.challengeChecks.add({ id, date, challengeId });
  },
};

export const settingsRepo = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const s = await db.settings.get(key);
    return (s?.value as T) ?? fallback;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },
};
