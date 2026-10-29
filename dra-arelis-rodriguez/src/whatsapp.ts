import { NOMBRE_CORTO as NOMBRE, WHATSAPP } from './contenido';

/**
 * Enlace a la conversación de WhatsApp con un mensaje ya escrito.
 * wa.me abre la aplicación en el teléfono y WhatsApp Web en la computadora.
 * encodeURIComponent codifica acentos, espacios y saltos de línea (\n → %0A).
 */
export function enlaceWhatsApp(mensaje?: string, numero: string = WHATSAPP): string {
  const base = `https://wa.me/${numero.replace(/\D/g, '')}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export const mensajeGeneral = (): string =>
  `Hola, ${NOMBRE}. Me gustaría hacer una consulta sobre la atención odontológica y la disponibilidad de citas.`;

export const mensajeServicio = (servicioEnMensaje: string): string =>
  `Hola, ${NOMBRE}. Me gustaría recibir información sobre ${servicioEnMensaje} y consultar la disponibilidad de una cita.`;

export interface SolicitudCita {
  nombre: string;
  telefono: string;
  servicio: string;
  /** Fecha en formato AAAA-MM-DD (del campo de fecha). */
  dia: string;
  horario: string;
  comentario: string;
}

/** «2026-11-05» → «jueves 5 de noviembre de 2026». */
export function fechaLegible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  // Mediodía local: evita que el cambio de zona horaria mueva el día.
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha);
}

const limpio = (texto: string): string => texto.trim().replace(/\s+\n/g, '\n');

export function mensajeCita(s: SolicitudCita): string {
  const lineas = [
    `Hola, ${NOMBRE}. Quisiera solicitar una cita odontológica.`,
    '',
    `Nombre: ${limpio(s.nombre)}`,
  ];
  if (s.telefono.trim()) lineas.push(`Número de contacto: ${s.telefono.trim()}`);
  lineas.push(
    `Servicio de interés: ${s.servicio}`,
    `Día preferido: ${fechaLegible(s.dia)}`,
    `Horario preferido: ${s.horario}`,
    `Comentario: ${limpio(s.comentario) || 'Sin comentarios'}`,
    '',
    'Quedo pendiente de la disponibilidad. Muchas gracias.',
  );
  return lineas.join('\n');
}
