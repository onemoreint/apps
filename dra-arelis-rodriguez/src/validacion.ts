import { DIAS_ATENCION, HORARIO } from './contenido';
import type { SolicitudCita } from './whatsapp';

export type Errores = Partial<Record<keyof SolicitudCita, string>>;

/** Fecha de hoy en formato AAAA-MM-DD según el reloj del visitante. */
export function hoyISO(ahora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}

/** Día de la semana (0 = domingo … 6 = sábado) de una fecha AAAA-MM-DD. */
export function diaSemana(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a!, m! - 1, d!, 12).getDay();
}

export function validarSolicitud(s: SolicitudCita, hoy: string = hoyISO()): Errores {
  const e: Errores = {};
  const nombre = s.nombre.trim();
  if (!nombre) e.nombre = 'Escribe tu nombre para que la doctora sepa cómo dirigirse a ti.';
  else if (nombre.length < 2) e.nombre = 'El nombre parece demasiado corto.';
  else if (nombre.length > 80) e.nombre = 'Usa un nombre de hasta 80 caracteres.';

  const tel = s.telefono.trim();
  if (tel) {
    const digitos = tel.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(tel) || digitos.length < 7 || digitos.length > 15)
      e.telefono = 'Revisa el número: solo dígitos, espacios o el signo +. También puedes dejarlo vacío.';
  }

  if (!s.servicio) e.servicio = 'Elige el servicio que te interesa (si no estás seguro, elige «Valoración odontológica»).';

  if (!s.dia) e.dia = 'Elige el día que prefieres.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(s.dia)) e.dia = 'Revisa la fecha elegida.';
  else if (s.dia < hoy) e.dia = 'Elige un día a partir de hoy.';
  else if (!DIAS_ATENCION.includes(diaSemana(s.dia)))
    e.dia = `La atención es de ${HORARIO.dias.toLowerCase()}. Elige uno de esos días.`;

  if (!s.horario) e.horario = 'Elige el horario que prefieres.';

  if (s.comentario.length > 500) e.comentario = 'El comentario puede tener hasta 500 caracteres.';
  return e;
}
