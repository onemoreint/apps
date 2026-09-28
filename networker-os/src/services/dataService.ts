import { db, ALL_TABLES } from '../data/db';
import { buildDemoContacts, buildDemoOrganization, buildDemoPractice } from '../data/seed';
import { settingsRepo } from '../data/repositories';
import type { Contact, Interest, Stage, Temperature } from '../domain/models';
import { uid } from '../utils/dates';

export const SETTINGS = {
  userName: 'userName',
  userFullName: 'userFullName',
  company: 'company',
  pinHash: 'pinHash',
  initialized: 'initialized',
  demoActive: 'demoActive',
} as const;

/** Primera apertura: carga los datos demo para que la app muestre su funcionamiento de inmediato. */
export async function initializeApp(): Promise<void> {
  const done = await settingsRepo.get(SETTINGS.initialized, false);
  if (done) return;
  await seedDemo();
  await settingsRepo.set(SETTINGS.userName, 'José');
  await settingsRepo.set(SETTINGS.userFullName, 'José Lugo');
  await settingsRepo.set(SETTINGS.initialized, true);
}

export async function seedDemo(now: Date = new Date()): Promise<void> {
  const fullName = await settingsRepo.get(SETTINGS.userFullName, 'José Lugo');
  const { contacts, interactions } = buildDemoContacts(now);
  const { members, logs } = buildDemoOrganization(now, fullName);
  await db.transaction('rw', [db.contacts, db.interactions, db.members, db.activityLogs, db.practice, db.settings], async () => {
    await db.contacts.bulkPut(contacts);
    await db.interactions.bulkPut(interactions);
    const hasLeader = await db.members.get('me');
    await db.members.bulkPut(hasLeader ? members.filter((m) => m.id !== 'me') : members);
    await db.activityLogs.bulkPut(logs);
    await db.practice.bulkPut(buildDemoPractice(now));
    await db.settings.put({ key: SETTINGS.demoActive, value: true });
  });
}

/** Borra solo los datos demo; conserva todo lo que el usuario haya creado. */
export async function clearDemo(): Promise<void> {
  await db.transaction('rw', [db.contacts, db.interactions, db.members, db.activityLogs, db.practice, db.settings], async () => {
    await db.contacts.filter((c) => !!c.isDemo).delete();
    await db.interactions.filter((i) => !!i.isDemo).delete();
    await db.members.filter((m) => !!m.isDemo).delete();
    await db.activityLogs.filter((l) => !!l.isDemo).delete();
    await db.practice.filter((p) => p.id.startsWith('demo-')).delete();
    await db.settings.put({ key: SETTINGS.demoActive, value: false });
    if (!(await db.members.get('me'))) {
      const name = await settingsRepo.get(SETTINGS.userFullName, 'Yo');
      await db.members.put({ id: 'me', name, parentId: null, role: 'lider', country: '', joinedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() });
    }
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) if (t !== 'settings') await db.table(t).clear();
    await db.settings.put({ key: SETTINGS.demoActive, value: false });
  });
  const name = await settingsRepo.get(SETTINGS.userFullName, 'Yo');
  await db.members.put({ id: 'me', name, parentId: null, role: 'lider', country: '', joinedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() });
}

// ---------- Respaldo ----------

export interface BackupFile {
  app: 'networker-os';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    const rows = await db.table(t).toArray();
    // Por seguridad, el hash del PIN no se exporta.
    data[t] = t === 'settings' ? rows.filter((r: { key: string }) => r.key !== SETTINGS.pinHash) : rows;
  }
  return { app: 'networker-os', version: 1, exportedAt: new Date().toISOString(), data };
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackup(file: BackupFile): Promise<void> {
  if (file?.app !== 'networker-os' || !file.data) throw new Error('El archivo no es un respaldo de NETWORKER OS.');
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) {
      const rows = file.data[t];
      if (!Array.isArray(rows)) continue;
      if (t !== 'settings') await db.table(t).clear();
      await db.table(t).bulkPut(t === 'settings' ? rows.filter((r) => (r as { key: string }).key !== SETTINGS.pinHash) : rows);
    }
  });
}

// ---------- Importador desde NETWORKER CRM u otros JSON/CSV ----------

const pick = (o: Record<string, unknown>, keys: string[]): string => {
  for (const k of Object.keys(o)) {
    if (keys.includes(k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_-]/g, ''))) {
      const v = o[k];
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
};

function mapStage(raw: string): Stage {
  const s = raw.toLowerCase();
  if (/distrib|socio|afiliad/.test(s)) return 'distribuidor';
  if (/client/.test(s)) return 'cliente';
  if (/no ?interes|perdid|descart/.test(s)) return 'no_interesado';
  if (/inactiv/.test(s)) return 'inactivo';
  if (/present.*(hech|realiz)/.test(s)) return 'presentacion_realizada';
  if (/present/.test(s)) return 'presentacion_pendiente';
  if (/seguim/.test(s)) return 'seguimiento';
  if (/interes/.test(s)) return 'interesado';
  if (/contactad/.test(s)) return 'contactado';
  return 'nuevo';
}

function mapTemp(raw: string): Temperature {
  const s = raw.toLowerCase();
  if (/alt|calient|hot/.test(s)) return 'alta';
  if (/medi|tibi|warm/.test(s)) return 'media';
  if (/fri|cold/.test(s)) return 'fria';
  return 'baja';
}

function mapInterest(raw: string): Interest {
  const s = raw.toLowerCase();
  if (/ambos|los dos/.test(s)) return 'ambos';
  if (/negoc|oportun/.test(s)) return 'negocio';
  if (/product/.test(s)) return 'producto';
  return 'desconocido';
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

/** Importa contactos desde un JSON (NETWORKER CRM u otro CRM) o un CSV. Devuelve cuántos se importaron. */
export async function importContactsFromText(text: string, fileName: string): Promise<number> {
  let rows: Record<string, unknown>[] = [];
  if (fileName.toLowerCase().endsWith('.csv')) rows = parseCsv(text);
  else {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && typeof parsed === 'object') {
      const candidates = ['contacts', 'contactos', 'prospectos', 'prospects', 'leads', 'clientes'];
      const obj = parsed as Record<string, unknown>;
      const inner = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
      for (const k of Object.keys(inner)) if (candidates.includes(k.toLowerCase()) && Array.isArray(inner[k])) rows = rows.concat(inner[k] as Record<string, unknown>[]);
    }
  }
  const now = new Date().toISOString();
  const contacts: Contact[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    let first = pick(r, ['nombre', 'firstname', 'name', 'nombres']);
    let last = pick(r, ['apellido', 'lastname', 'apellidos']);
    if (first && !last && first.includes(' ')) {
      const parts = first.split(' ');
      first = parts[0];
      last = parts.slice(1).join(' ');
    }
    if (!first) continue;
    const phone = pick(r, ['telefono', 'phone', 'celular', 'movil', 'tel']);
    const created = pick(r, ['createdat', 'fecha', 'fechacreacion', 'created', 'fecharegistro']);
    const createdIso = created && !isNaN(Date.parse(created)) ? new Date(created).toISOString() : now;
    contacts.push({
      id: uid(),
      firstName: first,
      lastName: last,
      phone,
      whatsapp: pick(r, ['whatsapp', 'wa']) || phone,
      country: pick(r, ['pais', 'country']),
      city: pick(r, ['ciudad', 'city']),
      createdAt: createdIso,
      updatedAt: now,
      lastInteractionAt: null,
      nextAction: null,
      notes: pick(r, ['notas', 'notes', 'nota', 'observaciones', 'comentarios']),
      tags: pick(r, ['etiquetas', 'tags']).split(/[,;]/).map((t) => t.trim()).filter(Boolean),
      source: pick(r, ['origen', 'source', 'fuente']) || 'Importado',
      ownerId: 'me',
      stage: mapStage(pick(r, ['estado', 'etapa', 'stage', 'status', 'pipeline'])),
      temperature: mapTemp(pick(r, ['temperatura', 'temperature', 'prioridad'])),
      interest: mapInterest(pick(r, ['interes', 'interest', 'tipo'])),
      objection: null,
    });
  }
  if (!contacts.length) throw new Error('No se encontraron contactos con nombre en el archivo.');
  await db.contacts.bulkAdd(contacts);
  return contacts.length;
}

// ---------- Persistencia ----------

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* no soportado */
  }
  return false;
}
