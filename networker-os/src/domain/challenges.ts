// Entrenador: retos diarios. El progreso se calcula con la actividad real registrada en la app;
// los retos que no se pueden medir automáticamente se marcan a mano.

import type { ChallengeCheck, Contact, Interaction, PracticeLog } from './models';
import { addDays, daysBetween, startOfDay, toDateKey } from '../utils/dates';

export interface ChallengeData {
  contacts: Contact[];
  interactions: Interaction[];
  practice: PracticeLog[];
  checks: ChallengeCheck[];
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  target: number;
  mode: 'auto' | 'manual';
  cta: { label: string; to: string };
  count: (d: ChallengeData, day: Date) => number;
}

const sameDay = (iso: string, day: Date) => toDateKey(new Date(iso)) === toDateKey(day);
const manualCount = (id: string) => (d: ChallengeData, day: Date) =>
  d.checks.some((c) => c.challengeId === id && c.date === toDateKey(day)) ? 1 : 0;

export const CORE_CHALLENGES: ChallengeDef[] = [
  {
    id: 'nuevos_contactos',
    title: 'Contacta 5 personas nuevas',
    description: 'Registra y escribe a 5 personas que no estaban en tu lista.',
    target: 5,
    mode: 'auto',
    cta: { label: 'Nuevo contacto', to: '/contactos/nuevo' },
    count: (d, day) => d.contacts.filter((c) => sameDay(c.createdAt, day)).length,
  },
  {
    id: 'seguimientos',
    title: 'Haz seguimiento a 3 prospectos',
    description: 'Registra 3 mensajes o llamadas a personas que ya estaban en tu lista.',
    target: 3,
    mode: 'auto',
    cta: { label: 'Ver Radar', to: '/radar' },
    count: (d, day) => {
      const ids = new Set(
        d.interactions
          .filter((i) => sameDay(i.date, day) && i.direction === 'saliente' && ['seguimiento', 'mensaje', 'llamada'].includes(i.type))
          .filter((i) => {
            const c = d.contacts.find((x) => x.id === i.contactId);
            return c && startOfDay(new Date(c.createdAt)) < startOfDay(day);
          })
          .map((i) => i.contactId),
      );
      return ids.size;
    },
  },
  {
    id: 'ayudar_equipo',
    title: 'Ayuda a un miembro del equipo',
    description: 'Acompaña una llamada, resuelve una duda o revisa su plan de la semana. Márcalo cuando lo hagas.',
    target: 1,
    mode: 'manual',
    cta: { label: 'Mi organización', to: '/organizacion' },
    count: manualCount('ayudar_equipo'),
  },
  {
    id: 'practicar_objecion',
    title: 'Practica una objeción',
    description: 'Haz una simulación o analiza una objeción en el laboratorio.',
    target: 1,
    mode: 'auto',
    cta: { label: 'Ir al simulador', to: '/simulador' },
    count: (d, day) => d.practice.filter((p) => sameDay(p.date, day)).length,
  },
];

export const ROTATING_CHALLENGES: ChallengeDef[] = [
  {
    id: 'presentacion',
    title: 'Realiza una presentación',
    description: 'Registra una presentación (en persona, llamada o videollamada).',
    target: 1,
    mode: 'auto',
    cta: { label: 'Ver contactos', to: '/contactos' },
    count: (d, day) => d.interactions.filter((i) => i.type === 'presentacion' && sameDay(i.date, day)).length,
  },
  {
    id: 'recuperar',
    title: 'Recupera un prospecto',
    description: 'Escribe a alguien que llevaba más de 14 días sin interacción.',
    target: 1,
    mode: 'auto',
    cta: { label: 'Ver recuperación', to: '/radar' },
    count: (d, day) => {
      const todays = d.interactions.filter((i) => i.direction === 'saliente' && sameDay(i.date, day));
      return todays.filter((t) => {
        const prev = d.interactions
          .filter((i) => i.contactId === t.contactId && i.date < startOfDay(day).toISOString() && i.type !== 'nota' && i.type !== 'cambio_estado')
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return prev && daysBetween(prev.date, day) > 14;
      }).length > 0
        ? 1
        : 0;
    },
  },
  {
    id: 'registrar_todo',
    title: 'Registra 5 interacciones',
    description: 'Todo lo que no se registra, el Radar no lo puede priorizar.',
    target: 5,
    mode: 'auto',
    cta: { label: 'Ver contactos', to: '/contactos' },
    count: (d, day) => d.interactions.filter((i) => sameDay(i.date, day) && i.type !== 'cambio_estado').length,
  },
];

export function challengesFor(day: Date): ChallengeDef[] {
  const idx = Math.floor(startOfDay(day).getTime() / 86_400_000) % ROTATING_CHALLENGES.length;
  return [...CORE_CHALLENGES, ROTATING_CHALLENGES[idx]];
}

export interface ChallengeProgress {
  def: ChallengeDef;
  count: number;
  done: boolean;
}

export function progressFor(data: ChallengeData, day: Date): ChallengeProgress[] {
  return challengesFor(day).map((def) => {
    const count = def.count(data, day);
    return { def, count: Math.min(count, def.target), done: count >= def.target };
  });
}

export interface DayHistory {
  date: string;
  done: number;
  total: number;
}

export function history(data: ChallengeData, now: Date, days = 14): DayHistory[] {
  const out: DayHistory[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(startOfDay(now), -i);
    const p = progressFor(data, day);
    out.push({ date: toDateKey(day), done: p.filter((x) => x.done).length, total: p.length });
  }
  return out;
}

/** Racha: días consecutivos con al menos 3 retos cumplidos (hoy cuenta si ya se cumplió). */
export function streak(h: DayHistory[]): number {
  let s = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    const ok = h[i].done >= 3;
    if (ok) s++;
    else if (i === h.length - 1) continue; // hoy aún en curso
    else break;
  }
  return s;
}
