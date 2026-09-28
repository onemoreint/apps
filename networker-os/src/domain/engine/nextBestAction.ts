// Motor "¿Qué hago ahora?"
// Sistema de REGLAS DE PRODUCTIVIDAD, no una predicción. Cada regla explica su motivo.

import type {
  Contact,
  Interaction,
  NextBestAction,
  ObjectionKey,
  Priority,
  RadarBucket,
  SituationKey,
  Stage,
  Topic,
} from '../models';
import { daysBetween, isoAtDaysFrom, relativeDay } from '../../utils/dates';
import { objectionLabel } from '../labels';

const TOUCH_TYPES = new Set(['contacto', 'mensaje', 'llamada', 'presentacion', 'seguimiento', 'compra']);
const CLOSED: Stage[] = ['no_interesado'];
const WON: Stage[] = ['cliente', 'distribuidor'];
const OPEN_PIPELINE: Stage[] = ['contactado', 'interesado', 'presentacion_pendiente', 'presentacion_realizada', 'seguimiento'];

export interface EngineContext {
  contact: Contact;
  now: Date;
  touches: Interaction[]; // ordenadas de más reciente a más antigua
  lastTouch: Interaction | null;
  daysSinceTouch: number;
  lastInbound: Interaction | null;
  lastOutbound: Interaction | null;
  awaitingReply: boolean;
  unansweredOutbound: number; // mensajes míos seguidos sin respuesta
  lastPresentation: Interaction | null;
  decisionAfterPresentation: boolean;
  everInterested: boolean;
  lastPurchase: Interaction | null;
  nextActionDelta: number | null; // días hasta la próxima acción (negativo = vencida)
}

export function buildContext(contact: Contact, interactions: Interaction[], now: Date): EngineContext {
  const own = interactions
    .filter((i) => i.contactId === contact.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const touches = own.filter((i) => TOUCH_TYPES.has(i.type) && i.direction !== 'interna');
  const lastTouch = touches[0] ?? null;
  const lastInbound = touches.find((i) => i.direction === 'entrante') ?? null;
  const lastOutbound = touches.find((i) => i.direction === 'saliente') ?? null;
  // Solo un MENSAJE entrante deja la conversación "esperando respuesta".
  // Llamadas, presentaciones y compras son conversaciones de doble vía.
  const awaitingReply = !!lastTouch && lastTouch.direction === 'entrante' && ['mensaje', 'contacto', 'seguimiento'].includes(lastTouch.type);

  let unansweredOutbound = 0;
  for (const t of touches) {
    if (t.direction === 'saliente') unansweredOutbound++;
    else break;
  }

  const lastPresentation = own.find((i) => i.type === 'presentacion') ?? null;
  const decisionAfterPresentation =
    !!lastPresentation &&
    (WON.includes(contact.stage) ||
      CLOSED.includes(contact.stage) ||
      own.some((i) => i.date > lastPresentation.date && (i.topics.includes('decision') || i.type === 'compra')));

  const interestedStages: Stage[] = ['interesado', 'presentacion_pendiente', 'presentacion_realizada', 'seguimiento'];
  const everInterested =
    interestedStages.includes(contact.stage) ||
    contact.temperature === 'alta' ||
    contact.temperature === 'media' ||
    contact.interest !== 'desconocido' ||
    own.some((i) => i.direction === 'entrante' && i.topics.some((t) => t === 'precio' || t === 'negocio' || t === 'producto'));

  const lastPurchase = own.find((i) => i.type === 'compra') ?? null;
  const nextActionDelta = contact.nextAction ? -daysBetween(contact.nextAction.dueDate, now) : null;

  return {
    contact,
    now,
    touches,
    lastTouch,
    daysSinceTouch: lastTouch ? daysBetween(lastTouch.date, now) : daysBetween(contact.createdAt, now),
    lastInbound,
    lastOutbound,
    awaitingReply,
    unansweredOutbound,
    lastPresentation,
    decisionAfterPresentation,
    everInterested,
    lastPurchase,
    nextActionDelta,
  };
}

interface RuleResult {
  priority: Priority;
  score: number;
  bucket?: RadarBucket;
  situation: string;
  action: string;
  reason: string;
  dueInDays: number;
  conversation: SituationKey;
}

export interface Rule {
  id: string;
  description: string;
  evaluate: (ctx: EngineContext) => RuleResult | null;
}

const OBJECTION_TO_SITUATION: Record<ObjectionKey, SituationKey> = {
  tiempo: 'sin_tiempo',
  dinero: 'sin_dinero',
  precio: 'sin_dinero',
  pensarlo: 'quiere_pensarlo',
  consultar: 'quiere_consultarlo',
  desconfianza: 'tiene_dudas',
  no_vendedor: 'tiene_dudas',
  mala_experiencia: 'tiene_dudas',
  escepticismo_producto: 'tiene_dudas',
  sin_contactos: 'tiene_dudas',
};

const tempBonus = (c: Contact) => ({ alta: 8, media: 4, baja: 0, fria: -4 })[c.temperature];
const name = (c: Contact) => c.firstName;
const hasFutureAction = (ctx: EngineContext) => ctx.nextActionDelta !== null && ctx.nextActionDelta > 0;
const topicsOf = (i: Interaction | null): Topic[] => i?.topics ?? [];

export const RULES: Rule[] = [
  {
    id: 'responder_precio',
    description: 'Preguntó el precio y no hay respuesta registrada',
    evaluate: (ctx) => {
      if (!ctx.awaitingReply || !topicsOf(ctx.lastInbound).includes('precio')) return null;
      return {
        priority: 'alta',
        score: 100 + tempBonus(ctx.contact),
        situation: `Preguntó el precio ${relativeDay(ctx.lastInbound!.date, ctx.now)}.`,
        action: 'Responder su pregunta de precio antes de enviar nueva información',
        reason: `${name(ctx.contact)} hizo una pregunta concreta y todavía no tiene respuesta registrada. Una pregunta sin responder enfría el interés más rápido que cualquier objeción.`,
        dueInDays: 0,
        conversation: 'pregunto_precio',
      };
    },
  },
  {
    id: 'responder_negocio',
    description: 'Preguntó por el negocio y no ha recibido seguimiento',
    evaluate: (ctx) => {
      if (!ctx.awaitingReply || !topicsOf(ctx.lastInbound).includes('negocio')) return null;
      return {
        priority: 'alta',
        score: 97 + tempBonus(ctx.contact),
        situation: `Preguntó por el negocio ${relativeDay(ctx.lastInbound!.date, ctx.now)}.`,
        action: 'Responder y proponer una conversación corta sobre el negocio',
        reason: `${name(ctx.contact)} tomó la iniciativa de preguntar y no ha recibido seguimiento. Es la señal más clara de interés que puede dar un prospecto.`,
        dueInDays: 0,
        conversation: 'pregunto_negocio',
      };
    },
  },
  {
    id: 'responder_mensaje',
    description: 'Escribió y está esperando respuesta',
    evaluate: (ctx) => {
      if (!ctx.awaitingReply) return null;
      const producto = topicsOf(ctx.lastInbound).includes('producto');
      return {
        priority: 'alta',
        score: 92 + tempBonus(ctx.contact),
        situation: producto
          ? `Pidió información sobre producto ${relativeDay(ctx.lastInbound!.date, ctx.now)}.`
          : `Te escribió ${relativeDay(ctx.lastInbound!.date, ctx.now)} y quedó pendiente una respuesta.`,
        action: producto ? 'Responder su consulta de producto y continuar la conversación' : 'Responder su último mensaje',
        reason: `El último movimiento fue de ${name(ctx.contact)}. Mientras no respondas, la conversación está detenida de tu lado.`,
        dueInDays: 0,
        conversation: producto ? 'interes_producto' : 'seguimiento',
      };
    },
  },
  {
    id: 'accion_vencida',
    description: 'La próxima acción definida está vencida',
    evaluate: (ctx) => {
      if (ctx.nextActionDelta === null || ctx.nextActionDelta >= 0) return null;
      const late = -ctx.nextActionDelta;
      return {
        priority: 'alta',
        score: 88 + Math.min(late, 7) + tempBonus(ctx.contact),
        situation: `Tenías pendiente: "${ctx.contact.nextAction!.text}".`,
        action: ctx.contact.nextAction!.text,
        reason: `Esta acción venció ${late === 1 ? 'ayer' : `hace ${late} días`}. Cumplir lo que acordaste con ${name(ctx.contact)} construye confianza.`,
        dueInDays: 0,
        conversation: 'seguimiento',
      };
    },
  },
  {
    id: 'post_presentacion',
    description: 'Vio la presentación y no hay decisión registrada',
    evaluate: (ctx) => {
      if (!ctx.lastPresentation || ctx.decisionAfterPresentation) return null;
      const d = daysBetween(ctx.lastPresentation.date, ctx.now);
      if (d < 1 || hasFutureAction(ctx)) return null;
      return {
        priority: 'alta',
        score: 86 + tempBonus(ctx.contact) - Math.max(0, d - 7),
        situation: `Vio la presentación ${relativeDay(ctx.lastPresentation.date, ctx.now)} y no hay decisión registrada.`,
        action: 'Tener una conversación de seguimiento sobre la presentación',
        reason: 'Después de una presentación, las dudas aparecen en los primeros días. Preguntar qué le pareció ayuda a resolverlas antes de que se conviertan en un "no".',
        dueInDays: 0,
        conversation: 'vio_presentacion',
      };
    },
  },
  {
    id: 'no_responde',
    description: 'Varios mensajes seguidos sin respuesta',
    evaluate: (ctx) => {
      if (ctx.unansweredOutbound < 2 || ctx.daysSinceTouch < 3 || ctx.daysSinceTouch > 14) return null;
      if (CLOSED.includes(ctx.contact.stage) || hasFutureAction(ctx)) return null;
      return {
        priority: 'media',
        score: 62 + tempBonus(ctx.contact),
        situation: `Le has escrito ${ctx.unansweredOutbound} veces seguidas sin respuesta.`,
        action: 'Enviar un mensaje breve que le facilite responder (sin insistir)',
        reason: 'Repetir el mismo tipo de mensaje suele empeorar el silencio. Cambia el enfoque: una pregunta simple o una salida elegante.',
        dueInDays: 1,
        conversation: 'no_responde',
      };
    },
  },
  {
    id: 'interesado_sin_seguimiento',
    description: 'Mostró interés, lleva más de 2 días sin interacción y no tiene próxima acción',
    evaluate: (ctx) => {
      const c = ctx.contact;
      if (!ctx.everInterested || !OPEN_PIPELINE.includes(c.stage)) return null;
      if (ctx.daysSinceTouch <= 2 || ctx.daysSinceTouch > 14 || hasFutureAction(ctx)) return null;
      const hot = c.temperature === 'alta';
      const conv: SituationKey = c.interest === 'negocio' ? 'interes_negocio' : c.interest === 'producto' ? 'interes_producto' : 'seguimiento';
      return {
        priority: hot ? 'alta' : 'media',
        score: (hot ? 80 : 66) + tempBonus(c) - ctx.daysSinceTouch,
        situation: `Mostró interés y lleva ${ctx.daysSinceTouch} días sin interacción.`,
        action: 'Hacer seguimiento y definir un siguiente paso concreto',
        reason: `${name(c)} mostró interés${c.interest !== 'desconocido' ? ` (${c.interest === 'ambos' ? 'producto y negocio' : c.interest})` : ''} pero no tiene próxima acción definida. Sin un siguiente paso, el interés se diluye.`,
        dueInDays: 0,
        conversation: conv,
      };
    },
  },
  {
    id: 'accion_hoy',
    description: 'La próxima acción es para hoy',
    evaluate: (ctx) => {
      if (ctx.nextActionDelta !== 0) return null;
      return {
        priority: 'media',
        score: 72 + tempBonus(ctx.contact),
        situation: `Tienes programado para hoy: "${ctx.contact.nextAction!.text}".`,
        action: ctx.contact.nextAction!.text,
        reason: 'Lo definiste tú como siguiente paso. Hoy es el día.',
        dueInDays: 0,
        conversation: 'seguimiento',
      };
    },
  },
  {
    id: 'agendar_presentacion',
    description: 'Presentación pendiente sin fecha',
    evaluate: (ctx) => {
      if (ctx.contact.stage !== 'presentacion_pendiente' || hasFutureAction(ctx)) return null;
      return {
        priority: 'media',
        score: 68 + tempBonus(ctx.contact),
        situation: 'Tiene una presentación pendiente sin fecha definida.',
        action: 'Acordar día y hora para la presentación',
        reason: 'Una presentación sin fecha tiende a no ocurrir. Proponer dos horarios concretos facilita decir que sí.',
        dueInDays: 0,
        conversation: c2(ctx.contact.interest),
      };
    },
  },
  {
    id: 'objecion_abierta',
    description: 'Tiene una objeción registrada sin trabajar',
    evaluate: (ctx) => {
      const c = ctx.contact;
      if (!c.objection || WON.includes(c.stage) || CLOSED.includes(c.stage)) return null;
      if (ctx.daysSinceTouch < 2 || ctx.daysSinceTouch > 21 || hasFutureAction(ctx)) return null;
      return {
        priority: 'media',
        score: 60 + tempBonus(c),
        situation: `Tiene una objeción registrada: ${objectionLabel(c.objection).toLowerCase()}.`,
        action: 'Retomar la conversación entendiendo primero su objeción',
        reason: 'Una objeción no es un "no": suele ser una pregunta sin responder. Primero entiende qué hay detrás antes de responder.',
        dueInDays: 1,
        conversation: OBJECTION_TO_SITUATION[c.objection],
      };
    },
  },
  {
    id: 'recuperacion',
    description: 'Más de 14 días sin interacción y anteriormente mostró interés',
    evaluate: (ctx) => {
      const c = ctx.contact;
      if (ctx.daysSinceTouch <= 14 || !ctx.everInterested) return null;
      if (CLOSED.includes(c.stage) || WON.includes(c.stage) || hasFutureAction(ctx)) return null;
      if (ctx.touches.length === 0) return null;
      return {
        priority: ctx.daysSinceTouch > 45 ? 'baja' : 'media',
        score: 50 + tempBonus(c) - Math.min(ctx.daysSinceTouch - 14, 30) / 3,
        bucket: 'recuperacion',
        situation: `Lleva ${ctx.daysSinceTouch} días sin interacción.`,
        action: 'Reabrir la conversación con un mensaje sin presión',
        reason: `Anteriormente mostró interés. Un mensaje de reconexión genuino (sin retomar la venta de inmediato) puede reactivar la relación.`,
        dueInDays: 1,
        conversation: 'recuperar',
      };
    },
  },
  {
    id: 'acompanar_distribuidor',
    description: 'Distribuidor sin contacto en más de 7 días',
    evaluate: (ctx) => {
      if (ctx.contact.stage !== 'distribuidor' || ctx.daysSinceTouch < 7 || hasFutureAction(ctx)) return null;
      return {
        priority: 'media',
        score: 56,
        situation: `Es distribuidor y llevas ${ctx.daysSinceTouch} días sin hablar con él/ella.`,
        action: 'Preguntarle cómo va y ofrecer acompañamiento en su próximo paso',
        reason: 'Los primeros meses de un distribuidor definen si se queda. Acompañar vale más que motivar.',
        dueInDays: 1,
        conversation: 'seguimiento',
      };
    },
  },
  {
    id: 'primer_contacto',
    description: 'Contacto nuevo sin primer mensaje',
    evaluate: (ctx) => {
      const c = ctx.contact;
      if (c.stage !== 'nuevo' || ctx.lastOutbound || hasFutureAction(ctx)) return null;
      const age = daysBetween(c.createdAt, ctx.now);
      return {
        priority: age <= 3 ? 'media' : 'baja',
        score: (age <= 3 ? 58 : 42) + tempBonus(c),
        situation: `Lo registraste ${relativeDay(c.createdAt, ctx.now)} y aún no le has escrito.`,
        action: 'Iniciar la conversación con un primer mensaje personal',
        reason: 'Un contacto nuevo se enfría con los días. El primer mensaje debe ser sobre la persona, no sobre el negocio.',
        dueInDays: 0,
        conversation: 'primer_contacto',
      };
    },
  },
  {
    id: 'cliente_experiencia',
    description: 'Cliente sin contacto en más de 21 días',
    evaluate: (ctx) => {
      if (ctx.contact.stage !== 'cliente' || hasFutureAction(ctx)) return null;
      const ref = ctx.lastPurchase ?? ctx.lastTouch;
      const d = ref ? daysBetween(ref.date, ctx.now) : ctx.daysSinceTouch;
      if (d < 21) return null;
      return {
        priority: 'media',
        score: 48,
        situation: `Es cliente y han pasado ${d} días desde ${ctx.lastPurchase ? 'su última compra' : 'el último contacto'}.`,
        action: 'Preguntar por su experiencia con el producto',
        reason: 'Un cliente atendido es la mejor fuente de referidos y recompras. Pregunta por su experiencia, sin empujar una nueva venta.',
        dueInDays: 1,
        conversation: 'seguimiento',
      };
    },
  },
];

function c2(interest: Contact['interest']): SituationKey {
  return interest === 'negocio' || interest === 'ambos' ? 'interes_negocio' : 'interes_producto';
}

/** Todas las reglas que aplican, ordenadas por puntaje. */
export function evaluateAll(contact: Contact, interactions: Interaction[], now: Date = new Date()): NextBestAction[] {
  if (contact.stage === 'no_interesado') return [];
  const ctx = buildContext(contact, interactions, now);
  const out: NextBestAction[] = [];
  for (const rule of RULES) {
    const r = rule.evaluate(ctx);
    if (!r) continue;
    const immediate = r.priority === 'alta' && (ctx.awaitingReply || ctx.daysSinceTouch <= 3 || (ctx.nextActionDelta ?? 1) < 0);
    out.push({
      contactId: contact.id,
      ruleId: rule.id,
      priority: r.priority,
      score: Math.round(r.score),
      bucket: r.bucket ?? (immediate ? 'inmediata' : 'seguimiento'),
      situation: r.situation,
      action: r.action,
      reason: r.reason,
      dueDate: isoAtDaysFrom(now, r.dueInDays),
      conversation: r.conversation,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** La mejor acción siguiente para un contacto (o null si no requiere acción). */
export function calculateNextBestAction(
  contact: Contact,
  interactions: Interaction[],
  now: Date = new Date(),
): NextBestAction | null {
  return evaluateAll(contact, interactions, now)[0] ?? null;
}

/** Acciones de todos los contactos, una por contacto, ordenadas por prioridad. */
export function rankActions(contacts: Contact[], interactions: Interaction[], now: Date = new Date()): NextBestAction[] {
  const byContact = groupInteractions(interactions);
  return contacts
    .map((c) => calculateNextBestAction(c, byContact.get(c.id) ?? [], now))
    .filter((a): a is NextBestAction => !!a)
    .sort((a, b) => b.score - a.score);
}

export function groupInteractions(interactions: Interaction[]): Map<string, Interaction[]> {
  const m = new Map<string, Interaction[]>();
  for (const i of interactions) {
    const arr = m.get(i.contactId);
    if (arr) arr.push(i);
    else m.set(i.contactId, [i]);
  }
  return m;
}
