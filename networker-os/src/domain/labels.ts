import type { Direction, Interest, InteractionType, MemberRole, ObjectionKey, Priority, Stage, Temperature, Topic } from './models';

export const STAGES: { key: Stage; label: string; short: string }[] = [
  { key: 'nuevo', label: 'Nuevo contacto', short: 'Nuevo' },
  { key: 'contactado', label: 'Contactado', short: 'Contactado' },
  { key: 'interesado', label: 'Interesado', short: 'Interesado' },
  { key: 'presentacion_pendiente', label: 'Presentación pendiente', short: 'Pres. pendiente' },
  { key: 'presentacion_realizada', label: 'Presentación realizada', short: 'Pres. realizada' },
  { key: 'seguimiento', label: 'Seguimiento pendiente', short: 'Seguimiento' },
  { key: 'cliente', label: 'Cliente', short: 'Cliente' },
  { key: 'distribuidor', label: 'Distribuidor', short: 'Distribuidor' },
  { key: 'inactivo', label: 'Inactivo', short: 'Inactivo' },
  { key: 'no_interesado', label: 'No interesado', short: 'No interesado' },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.key === s)?.label ?? s;

export const TEMPERATURES: { key: Temperature; label: string; emoji: string }[] = [
  { key: 'alta', label: 'Alta', emoji: '🔥' },
  { key: 'media', label: 'Media', emoji: '🟡' },
  { key: 'baja', label: 'Baja', emoji: '🔵' },
  { key: 'fria', label: 'Fría', emoji: '⚪' },
];
export const tempInfo = (t: Temperature) => TEMPERATURES.find((x) => x.key === t)!;

export const INTERESTS: { key: Interest; label: string }[] = [
  { key: 'producto', label: 'Producto' },
  { key: 'negocio', label: 'Negocio' },
  { key: 'ambos', label: 'Producto y negocio' },
  { key: 'desconocido', label: 'Sin definir' },
];
export const interestLabel = (i: Interest) => INTERESTS.find((x) => x.key === i)?.label ?? i;

export const OBJECTIONS: { key: ObjectionKey; label: string }[] = [
  { key: 'tiempo', label: 'Tiempo' },
  { key: 'dinero', label: 'Dinero' },
  { key: 'pensarlo', label: 'Quiere pensarlo' },
  { key: 'consultar', label: 'Quiere consultarlo' },
  { key: 'desconfianza', label: 'Desconfianza del modelo' },
  { key: 'no_vendedor', label: '"No sé vender"' },
  { key: 'mala_experiencia', label: 'Mala experiencia previa' },
  { key: 'escepticismo_producto', label: 'Duda del producto' },
  { key: 'precio', label: 'Precio' },
  { key: 'sin_contactos', label: '"No conozco a nadie"' },
];
export const objectionLabel = (o: ObjectionKey) => OBJECTIONS.find((x) => x.key === o)?.label ?? o;

export const INTERACTION_TYPES: { key: InteractionType; label: string; icon: string }[] = [
  { key: 'contacto', label: 'Contacto', icon: 'user-plus' },
  { key: 'mensaje', label: 'Mensaje', icon: 'message' },
  { key: 'llamada', label: 'Llamada', icon: 'phone' },
  { key: 'presentacion', label: 'Presentación', icon: 'present' },
  { key: 'seguimiento', label: 'Seguimiento', icon: 'repeat' },
  { key: 'compra', label: 'Compra', icon: 'bag' },
  { key: 'cambio_estado', label: 'Cambio de estado', icon: 'flag' },
  { key: 'nota', label: 'Nota', icon: 'note' },
];
export const typeLabel = (t: InteractionType) => INTERACTION_TYPES.find((x) => x.key === t)?.label ?? t;

export const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: 'saliente', label: 'Yo lo contacté' },
  { key: 'entrante', label: 'Me escribió / respondió' },
  { key: 'interna', label: 'Registro interno' },
];

export const TOPICS: { key: Topic; label: string }[] = [
  { key: 'precio', label: 'Precio' },
  { key: 'producto', label: 'Producto' },
  { key: 'negocio', label: 'Negocio' },
  { key: 'objecion', label: 'Objeción' },
  { key: 'duda', label: 'Duda' },
  { key: 'decision', label: 'Decisión' },
];
export const topicLabel = (t: Topic) => TOPICS.find((x) => x.key === t)?.label ?? t;

export const PRIORITY_LABEL: Record<Priority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export const ROLE_LABEL: Record<MemberRole, string> = { lider: 'Líder', distribuidor: 'Distribuidor', cliente: 'Cliente' };

export const SOURCES = ['Referido', 'WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Evento', 'Mercado natural', 'Otro'];
