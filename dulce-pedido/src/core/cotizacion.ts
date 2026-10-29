import { copConMoneda, leerPesos } from './dinero';
import { esFechaValida, fechaLarga, sumarDias } from './fechas';
import { telefonoValido } from './validar';

export type DatosCotizacion = {
  nombre: string;
  telefono: string;
  tipo_evento: string;
  fecha_evento: string;
  personas: string;
  presupuesto: string;
  descripcion: string;
  acepta_datos: boolean;
};

export const COTIZACION_VACIA: DatosCotizacion = {
  nombre: '',
  telefono: '',
  tipo_evento: '',
  fecha_evento: '',
  personas: '',
  presupuesto: '',
  descripcion: '',
  acepta_datos: false,
};

export const TIPOS_EVENTO = ['Cumpleaños', 'Boda', 'Bautizo o primera comunión', 'Baby shower', 'Evento empresarial', 'Detalle o regalo', 'Otro'];

export type ErroresCotizacion = Partial<Record<keyof DatosCotizacion, string>>;

export function validarCotizacion(d: DatosCotizacion, hoy: string): ErroresCotizacion {
  const e: ErroresCotizacion = {};
  const nombre = d.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) e.nombre = 'Escribe tu nombre.';
  if (!telefonoValido(d.telefono)) e.telefono = 'Escribe un número de contacto válido (solo números).';
  if (d.fecha_evento) {
    if (!esFechaValida(d.fecha_evento)) e.fecha_evento = 'Elige una fecha válida.';
    else if (d.fecha_evento < hoy) e.fecha_evento = 'La fecha del evento ya pasó.';
    else if (d.fecha_evento > sumarDias(hoy, 730)) e.fecha_evento = 'Elige una fecha dentro de los próximos dos años.';
  }
  if (d.personas.trim() && !/^\d{1,4}$/.test(d.personas.trim())) e.personas = 'Escribe un número.';
  else if (d.personas.trim() && Number(d.personas) < 1) e.personas = 'Escribe un número.';
  if (d.presupuesto.trim() && leerPesos(d.presupuesto) === null) e.presupuesto = 'Escribe un valor en pesos.';
  const desc = d.descripcion.trim();
  if (desc.length < 10) e.descripcion = 'Cuéntanos qué necesitas (mínimo 10 caracteres).';
  else if (desc.length > 1500) e.descripcion = 'Máximo 1.500 caracteres.';
  if (!d.acepta_datos) e.acepta_datos = 'Necesitamos tu autorización para responder tu solicitud.';
  return e;
}

export function mensajeCotizacion(d: DatosCotizacion, codigo: string | null, demo = false): string {
  const l: string[] = ['Hola, quiero solicitar una cotización.'];
  if (codigo) l.push(`Solicitud N.º ${codigo}`);
  if (demo) l.push('(Solicitud de prueba — tienda de demostración)');
  l.push('');
  l.push(`Nombre: ${d.nombre.trim()}`);
  l.push(`Teléfono: ${d.telefono.trim()}`);
  if (d.tipo_evento) l.push(`Ocasión: ${d.tipo_evento}`);
  if (d.fecha_evento) l.push(`Fecha del evento: ${fechaLarga(d.fecha_evento)}`);
  if (d.personas.trim()) l.push(`Personas: ${d.personas.trim()}`);
  const presupuesto = leerPesos(d.presupuesto);
  if (presupuesto !== null) l.push(`Presupuesto aproximado: ${copConMoneda(presupuesto)}`);
  l.push('');
  l.push('Lo que necesito:');
  l.push(d.descripcion.trim());
  l.push('');
  l.push('Quedo atento(a) a la propuesta y al valor. ¡Gracias!');
  return l.join('\n');
}

/**
 * Coordenadas a partir de un enlace de Google Maps. Prefiere el punto exacto del
 * lugar (!3d…!4d…) sobre el centro de la vista (@lat,lng).
 */
export function coordenadasDeEnlace(url: string): { lat: number; lng: number } | null {
  const texto = decodeURIComponent(url);
  const lugar = texto.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const vista = texto.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const consulta = texto.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const simple = texto.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  const m = lugar ?? consulta ?? simple ?? vista;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function urlMapaIncrustado(lat: number, lng: number, zoom = 16): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=es&output=embed`;
}

export function urlComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
