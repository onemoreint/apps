// Mensajes de WhatsApp: siempre respetuosos y profesionales. Se abren con un enlace wa.me
// (no requiere WhatsApp Business API).
import { formatear as dinero } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';
import { soloDigitos } from '../domain/validaciones.js';
import * as config from './config.js';

export const PLANTILLAS = {
  recordatorio: {
    nombre: 'Recordatorio de pago',
    texto: 'Hola {nombre} 👋\n\nTe recordamos que tienes una cuota pendiente por {valor} con vencimiento el {fecha}.\n\nSi ya realizaste el pago, puedes ignorar este mensaje.\n\nGracias.\n{negocio}',
  },
  proxima: {
    nombre: 'Próxima cuota',
    texto: 'Hola {nombre} 👋\n\nTe informamos que tu próxima cuota (N° {cuota}) por {valor} vence el {fecha}.\n\nGracias por tu puntualidad.\n{negocio}',
  },
  vencido: {
    nombre: 'Pago vencido',
    texto: 'Hola {nombre}, esperamos que estés bien.\n\nTe escribimos porque la cuota N° {cuota} por {valor}, con vencimiento el {fecha}, aparece pendiente en nuestro registro.\n\nSi ya pagaste, por favor envíanos el comprobante. Si necesitas acordar una fecha, con gusto lo conversamos.\n\nGracias.\n{negocio}',
  },
  confirmacion: {
    nombre: 'Confirmación de pago',
    texto: 'Hola {nombre} 👋\n\nConfirmamos que recibimos tu pago por {valor} el {fecha}.\nRecibo: {recibo}\nSaldo pendiente: {saldo}\n\n¡Gracias!\n{negocio}',
  },
};

const primerNombre = n => String(n || '').trim().split(/\s+/)[0] || '';

/** Valores de dinero siempre visibles en el mensaje, aunque la app tenga "ocultar valores". */
export function generar(tipo, datos) {
  const cfg = config.get();
  const reemplazos = {
    nombre: primerNombre(datos.cliente?.nombreCompleto),
    valor: dinero(datos.valor, { ocultable: false }),
    fecha: fecha(datos.fecha),
    cuota: datos.cuota ?? '',
    recibo: datos.recibo ?? '',
    saldo: dinero(datos.saldo ?? 0, { ocultable: false }),
    negocio: cfg.nombreNegocio || '',
  };
  const plantilla = cfg.plantillasWhatsApp?.[tipo] || PLANTILLAS[tipo].texto;
  return plantilla.replace(/\{(\w+)\}/g, (_, k) => reemplazos[k] ?? '').trim();
}

/** Número internacional: si no trae indicativo, se antepone el del país configurado. */
export function numeroInternacional(telefono) {
  const n = soloDigitos(telefono).replace(/^0+/, '');
  const prefijo = config.prefijoPais();
  return n && prefijo && n.length <= 10 ? prefijo + n : n;
}

export function enlace(cliente, mensaje) {
  const numero = numeroInternacional(cliente?.whatsapp || cliente?.telefono);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/** Elige el tipo de mensaje adecuado según el estado de la cuota. */
export function tipoSegunEstado(estado, diasHasta) {
  if (estado === 'VENCIDA') return 'vencido';
  return diasHasta > 0 ? 'proxima' : 'recordatorio';
}
