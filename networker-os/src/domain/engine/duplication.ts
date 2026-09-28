// Índice de Duplicación: cuánto del proceso ejecuta el equipo sin depender del líder.
// No mide ventas: mide actividad del proceso (contactos, presentaciones, seguimientos, altas, autonomía).

import type { ActivityLog, Contact, Interaction, Member } from '../models';
import { addDays, daysBetween, mondayOf, toDateKey } from '../../utils/dates';

export interface ProcessMetrics {
  newContacts: number;
  presentations: number;
  followUps: number;
  newClients: number;
  newDistributors: number;
}

export const METRIC_LABELS: Record<keyof ProcessMetrics, string> = {
  newContacts: 'Nuevos contactos',
  presentations: 'Presentaciones',
  followUps: 'Seguimientos',
  newClients: 'Nuevos clientes',
  newDistributors: 'Nuevos distribuidores',
};

const WEIGHTS: Record<keyof ProcessMetrics | 'autonomy', number> = {
  newContacts: 0.2,
  presentations: 0.25,
  followUps: 0.15,
  newClients: 0.1,
  newDistributors: 0.15,
  autonomy: 0.15,
};

export const empty = (): ProcessMetrics => ({ newContacts: 0, presentations: 0, followUps: 0, newClients: 0, newDistributors: 0 });

export function periodStart(now: Date, weeks: number): Date {
  return addDays(mondayOf(now), -7 * (weeks - 1));
}

/** Actividad del líder, calculada con los datos reales de la app. */
export function leaderMetrics(contacts: Contact[], interactions: Interaction[], now: Date, weeks: number): ProcessMetrics {
  const start = periodStart(now, weeks).toISOString();
  const inPeriod = (iso: string) => iso >= start;
  const m = empty();
  m.newContacts = contacts.filter((c) => inPeriod(c.createdAt) && c.ownerId === 'me').length;
  for (const i of interactions) {
    if (!inPeriod(i.date)) continue;
    if (i.type === 'presentacion') m.presentations++;
    else if (i.direction === 'saliente' && ['seguimiento', 'mensaje', 'llamada'].includes(i.type)) m.followUps++;
    else if (i.type === 'cambio_estado' && i.meta?.to === 'cliente') m.newClients++;
    else if (i.type === 'cambio_estado' && i.meta?.to === 'distribuidor') m.newDistributors++;
  }
  return m;
}

export interface MemberSummary {
  member: Member;
  metrics: ProcessMetrics;
  total: number;
  status: 'activo' | 'en_riesgo' | 'inactivo';
  daysSinceActivity: number;
  depth: number;
}

export interface DuplicationResult {
  index: number; // 0-100
  band: { label: string; tone: 'bad' | 'warn' | 'good' | 'great'; description: string };
  leader: ProcessMetrics;
  team: ProcessMetrics;
  shares: Record<keyof ProcessMetrics, number | null>; // % hecho por el equipo
  autonomy: number; // % de distribuidores con actividad propia
  members: MemberSummary[];
  recommendations: string[];
  weeks: number;
}

export function memberDepth(members: Member[], id: string): number {
  let d = 0;
  let cur = members.find((m) => m.id === id);
  while (cur?.parentId) {
    d++;
    cur = members.find((m) => m.id === cur!.parentId);
    if (d > 20) break;
  }
  return d;
}

export function computeDuplication(
  members: Member[],
  logs: ActivityLog[],
  contacts: Contact[],
  interactions: Interaction[],
  now: Date = new Date(),
  weeks = 4,
): DuplicationResult {
  const startKey = toDateKey(periodStart(now, weeks));
  const leader = leaderMetrics(contacts, interactions, now, weeks);
  const team = empty();
  const perMember = new Map<string, ProcessMetrics>();

  for (const l of logs) {
    if (l.weekStart < startKey) continue;
    const mem = members.find((m) => m.id === l.memberId);
    if (!mem || mem.role === 'lider') continue;
    const acc = perMember.get(l.memberId) ?? empty();
    for (const k of Object.keys(team) as (keyof ProcessMetrics)[]) {
      acc[k] += l[k];
      team[k] += l[k];
    }
    perMember.set(l.memberId, acc);
  }

  const shares = {} as Record<keyof ProcessMetrics, number | null>;
  let weighted = 0;
  let weightSum = 0;
  for (const k of Object.keys(team) as (keyof ProcessMetrics)[]) {
    const tot = team[k] + leader[k];
    shares[k] = tot > 0 ? Math.round((team[k] / tot) * 100) : null;
    if (shares[k] !== null) {
      weighted += (shares[k] as number) * WEIGHTS[k];
      weightSum += WEIGHTS[k];
    }
  }

  const distributors = members.filter((m) => m.role === 'distribuidor');
  const activeDistributors = distributors.filter((m) => {
    const pm = perMember.get(m.id);
    return pm && pm.newContacts + pm.presentations + pm.followUps > 0;
  });
  const autonomy = distributors.length ? Math.round((activeDistributors.length / distributors.length) * 100) : 0;
  if (distributors.length) {
    weighted += autonomy * WEIGHTS.autonomy;
    weightSum += WEIGHTS.autonomy;
  }
  const index = weightSum ? Math.round(weighted / weightSum) : 0;

  const summaries: MemberSummary[] = members
    .filter((m) => m.role !== 'lider')
    .map((m) => {
      const metrics = perMember.get(m.id) ?? empty();
      const total = Object.values(metrics).reduce((a, b) => a + b, 0);
      const d = daysBetween(m.lastActivityAt, now);
      return {
        member: m,
        metrics,
        total,
        daysSinceActivity: d,
        status: d <= 7 ? 'activo' : d <= 21 ? 'en_riesgo' : 'inactivo',
        depth: memberDepth(members, m.id),
      } as MemberSummary;
    });

  return {
    index,
    band: bandFor(index),
    leader,
    team,
    shares,
    autonomy,
    members: summaries,
    recommendations: recommend(shares, summaries, autonomy),
    weeks,
  };
}

export function bandFor(index: number): DuplicationResult['band'] {
  if (index < 30)
    return { label: 'Alta dependencia del líder', tone: 'bad', description: 'La mayor parte del proceso depende de ti. Si te detienes, la organización se detiene.' };
  if (index < 55)
    return { label: 'Duplicación en desarrollo', tone: 'warn', description: 'Tu equipo ya ejecuta parte del proceso, pero aún necesita tu presencia en pasos clave.' };
  if (index < 75)
    return { label: 'Duplicación saludable', tone: 'good', description: 'El equipo ejecuta la mayoría del proceso. Tu rol se acerca al de mentor.' };
  return { label: 'Organización autónoma', tone: 'great', description: 'El proceso se sostiene sin ti. Enfócate en formar nuevos líderes.' };
}

function recommend(shares: Record<keyof ProcessMetrics, number | null>, members: MemberSummary[], autonomy: number): string[] {
  const recs: string[] = [];
  const entries = (Object.entries(shares) as [keyof ProcessMetrics, number | null][]).filter(([, v]) => v !== null) as [keyof ProcessMetrics, number][];
  entries.sort((a, b) => a[1] - b[1]);
  const weakest = entries[0];
  if (weakest && weakest[1] < 50) {
    const tip: Record<keyof ProcessMetrics, string> = {
      presentations: 'Haz presentaciones "a tres" donde tu distribuidor dirija y tú solo apoyes. La próxima que la dirija completa.',
      newContacts: 'Acompaña a tu equipo a construir su lista de contactos y a enviar sus primeros mensajes con el generador de conversaciones.',
      followUps: 'Enséñale al equipo a usar el Radar: cada día, 3 seguimientos antes de buscar contactos nuevos.',
      newClients: 'Revisa con tu equipo el seguimiento post-presentación: ahí se decide la mayoría de los clientes.',
      newDistributors: 'Identifica con cada distribuidor a sus 2 prospectos con más potencial de negocio y agenden juntos la conversación.',
    };
    recs.push(`El equipo solo hace el ${weakest[1]}% de ${METRIC_LABELS[weakest[0]].toLowerCase()}. ${tip[weakest[0]]}`);
  }
  const risk = members.filter((m) => m.member.role === 'distribuidor' && m.status !== 'activo').sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  if (risk.length) {
    const names = risk.slice(0, 3).map((m) => m.member.name.split(' ')[0]).join(', ');
    recs.push(`${risk.length} distribuidor${risk.length > 1 ? 'es' : ''} sin actividad reciente (${names}). Una llamada para entender qué le frena vale más que un mensaje motivacional.`);
  }
  const stars = members.filter((m) => m.member.role === 'distribuidor' && m.metrics.presentations >= 3);
  if (stars.length) {
    recs.push(`${stars.map((m) => m.member.name.split(' ')[0]).join(', ')} ya presenta${stars.length > 1 ? 'n' : ''} de forma independiente. Conviértelo${stars.length > 1 ? 's' : ''} en referente para enseñar a otros.`);
  }
  if (autonomy < 50) recs.push(`Solo el ${autonomy}% de tus distribuidores tuvo actividad propia en el periodo. El objetivo es que cada uno haga al menos una acción semanal sin ti.`);
  return recs;
}
