// Indicadores del tablero. Cada número debe llevar a una acción (regla de oro).

import type { Contact, Interaction } from '../models';
import { daysBetween } from '../../utils/dates';

export interface DashboardStats {
  total: number;
  nuevos: number; // últimos 7 días
  clientes: number;
  distribuidores: number;
  presentaciones: number; // últimos 30 días
  activos: number; // interacción en ≤14 días
  frios: number; // temperatura fría o >30 días sin interacción
}

export function computeStats(contacts: Contact[], interactions: Interaction[], now: Date = new Date()): DashboardStats {
  return {
    total: contacts.length,
    nuevos: contacts.filter((c) => daysBetween(c.createdAt, now) <= 7).length,
    clientes: contacts.filter((c) => c.stage === 'cliente').length,
    distribuidores: contacts.filter((c) => c.stage === 'distribuidor').length,
    presentaciones: interactions.filter((i) => i.type === 'presentacion' && daysBetween(i.date, now) <= 30).length,
    activos: contacts.filter((c) => daysBetween(c.lastInteractionAt, now) <= 14).length,
    frios: contacts.filter(isCold(now)).length,
  };
}

export const isCold = (now: Date) => (c: Contact) =>
  c.stage !== 'no_interesado' && (c.temperature === 'fria' || daysBetween(c.lastInteractionAt ?? c.createdAt, now) > 30);

export const isActive = (now: Date) => (c: Contact) => daysBetween(c.lastInteractionAt, now) <= 14;

export interface ProcessInsight {
  title: string;
  detail: string;
  tone: 'warn' | 'good' | 'info';
}

/** "¿Dónde estoy fallando en mi proceso?" — detecta el cuello de botella del embudo. */
export function processInsights(contacts: Contact[], interactions: Interaction[], now: Date = new Date()): ProcessInsight[] {
  const out: ProcessInsight[] = [];
  const nuevosSinMensaje = contacts.filter(
    (c) => c.stage === 'nuevo' && !interactions.some((i) => i.contactId === c.id && i.direction === 'saliente'),
  ).length;
  const interesados = contacts.filter((c) => ['interesado', 'presentacion_pendiente'].includes(c.stage)).length;
  const presentados = contacts.filter((c) => c.stage === 'presentacion_realizada').length;
  const pendientesRespuesta = contacts.filter((c) => {
    const own = interactions
      .filter((i) => i.contactId === c.id && i.direction !== 'interna' && i.type !== 'nota' && i.type !== 'cambio_estado')
      .sort((a, b) => b.date.localeCompare(a.date));
    return c.stage !== 'no_interesado' && own[0]?.direction === 'entrante' && ['mensaje', 'contacto', 'seguimiento'].includes(own[0].type);
  }).length;
  const presentaciones30 = interactions.filter((i) => i.type === 'presentacion' && daysBetween(i.date, now) <= 30).length;

  if (pendientesRespuesta >= 2)
    out.push({
      tone: 'warn',
      title: `${pendientesRespuesta} personas esperan tu respuesta`,
      detail: 'Responder a tiempo es la acción con mayor impacto y menor esfuerzo. Empieza por ahí.',
    });
  if (interesados >= 3 && presentaciones30 <= 1)
    out.push({
      tone: 'warn',
      title: 'Cuello de botella: presentaciones',
      detail: `Tienes ${interesados} personas interesadas pero solo ${presentaciones30} presentación en 30 días. Proponer fechas concretas destraba el proceso.`,
    });
  if (presentados >= 2)
    out.push({
      tone: 'warn',
      title: 'Cierre pendiente después de presentar',
      detail: `${presentados} personas vieron la presentación y no tienen decisión registrada. El seguimiento post-presentación es donde más prospectos se pierden.`,
    });
  if (nuevosSinMensaje >= 3)
    out.push({
      tone: 'info',
      title: `${nuevosSinMensaje} contactos nuevos sin primer mensaje`,
      detail: 'Registrar contactos no es prospectar. Dedica 15 minutos a iniciar esas conversaciones.',
    });
  if (!out.length)
    out.push({ tone: 'good', title: 'Proceso equilibrado', detail: 'No se detectan cuellos de botella evidentes. Mantén el ritmo de contactos nuevos.' });
  return out;
}
