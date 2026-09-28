// Modelo de datos de NETWORKER OS.
// Las tablas se reflejan casi 1:1 en Supabase/PostgreSQL para la futura migración.

export type Stage =
  | 'nuevo'
  | 'contactado'
  | 'interesado'
  | 'presentacion_pendiente'
  | 'presentacion_realizada'
  | 'seguimiento'
  | 'cliente'
  | 'distribuidor'
  | 'inactivo'
  | 'no_interesado';

export type Temperature = 'alta' | 'media' | 'baja' | 'fria';
export type Interest = 'producto' | 'negocio' | 'ambos' | 'desconocido';

export type ObjectionKey =
  | 'tiempo'
  | 'dinero'
  | 'pensarlo'
  | 'consultar'
  | 'desconfianza'
  | 'no_vendedor'
  | 'mala_experiencia'
  | 'escepticismo_producto'
  | 'precio'
  | 'sin_contactos';

export interface NextAction {
  text: string;
  dueDate: string; // ISO (fecha)
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string | null; // cache derivado del historial
  nextAction: NextAction | null; // próxima acción definida por el usuario
  notes: string;
  tags: string[];
  source: string;
  ownerId: string; // miembro responsable ('me' = el usuario)
  stage: Stage;
  temperature: Temperature;
  interest: Interest;
  objection: ObjectionKey | null;
  isDemo?: boolean;
}

export type InteractionType =
  | 'contacto'
  | 'mensaje'
  | 'llamada'
  | 'presentacion'
  | 'seguimiento'
  | 'compra'
  | 'cambio_estado'
  | 'nota';

/** entrante = el prospecto me escribió/habló; saliente = yo lo contacté; interna = registro propio */
export type Direction = 'entrante' | 'saliente' | 'interna';

export type Topic = 'precio' | 'negocio' | 'producto' | 'objecion' | 'decision' | 'duda';

export interface Interaction {
  id: string;
  contactId: string;
  type: InteractionType;
  direction: Direction;
  topics: Topic[];
  note: string;
  date: string; // ISO
  meta?: { from?: Stage; to?: Stage };
  isDemo?: boolean;
}

export type MemberRole = 'lider' | 'distribuidor' | 'cliente';

export interface Member {
  id: string;
  name: string;
  parentId: string | null;
  role: MemberRole;
  country: string;
  joinedAt: string;
  lastActivityAt: string | null;
  isDemo?: boolean;
}

export interface ActivityLog {
  id: string;
  memberId: string;
  weekStart: string; // lunes de la semana (YYYY-MM-DD)
  newContacts: number;
  presentations: number;
  followUps: number;
  newClients: number;
  newDistributors: number;
  isDemo?: boolean;
}

export interface ChallengeCheck {
  id: string; // `${date}:${challengeId}`
  date: string; // YYYY-MM-DD
  challengeId: string;
}

export interface PracticeLog {
  id: string;
  date: string; // ISO
  kind: 'simulador' | 'objeciones';
  label: string;
  summary?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export type Priority = 'alta' | 'media' | 'baja';
export type RadarBucket = 'inmediata' | 'seguimiento' | 'recuperacion';

export type SituationKey =
  | 'primer_contacto'
  | 'seguimiento'
  | 'recuperar'
  | 'pregunto_precio'
  | 'pregunto_negocio'
  | 'vio_presentacion'
  | 'no_responde'
  | 'quiere_pensarlo'
  | 'sin_tiempo'
  | 'sin_dinero'
  | 'quiere_consultarlo'
  | 'tiene_dudas'
  | 'interes_producto'
  | 'interes_negocio';

export interface NextBestAction {
  contactId: string;
  ruleId: string;
  priority: Priority;
  score: number;
  bucket: RadarBucket;
  situation: string; // qué está pasando
  action: string; // qué hacer
  reason: string; // por qué
  dueDate: string; // cuándo (ISO)
  conversation: SituationKey; // situación sugerida para el generador
}
