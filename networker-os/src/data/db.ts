import Dexie, { type EntityTable } from 'dexie';
import type { ActivityLog, ChallengeCheck, Contact, Interaction, Member, PracticeLog, Setting } from '../domain/models';

// Base de datos local (IndexedDB). Cada tabla equivale a una tabla futura en Supabase/PostgreSQL.
export class NetworkerDB extends Dexie {
  contacts!: EntityTable<Contact, 'id'>;
  interactions!: EntityTable<Interaction, 'id'>;
  members!: EntityTable<Member, 'id'>;
  activityLogs!: EntityTable<ActivityLog, 'id'>;
  challengeChecks!: EntityTable<ChallengeCheck, 'id'>;
  practice!: EntityTable<PracticeLog, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'networker-os') {
    super(name);
    this.version(1).stores({
      contacts: 'id, stage, temperature, createdAt, updatedAt, lastInteractionAt, ownerId',
      interactions: 'id, contactId, date, type',
      members: 'id, parentId, role',
      activityLogs: 'id, memberId, weekStart',
      challengeChecks: 'id, date, challengeId',
      practice: 'id, date, kind',
      settings: 'key',
    });
  }
}

export const db = new NetworkerDB();

export const ALL_TABLES = ['contacts', 'interactions', 'members', 'activityLogs', 'challengeChecks', 'practice', 'settings'] as const;
