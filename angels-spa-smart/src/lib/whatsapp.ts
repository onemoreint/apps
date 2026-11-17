// Mensajes preparados para WhatsApp mediante enlaces oficiales wa.me.
// No se envía nada automáticamente: el enlace abre WhatsApp con el texto listo
// y la persona decide si lo envía. Ver ARCHITECTURE.md para la integración futura
// con WhatsApp Business Platform (plantillas aprobadas, opt-in y costos por conversación).
import { formatDateLong, formatTime } from './time'
import { money } from './format'

export type MessageKind =
  | 'solicitud'
  | 'confirmacion'
  | 'recordatorio'
  | 'reprogramacion'
  | 'cancelacion'
  | 'promocion'
  | 'cumpleanos'

export function waLink(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

interface Ctx {
  businessName: string
  clientName: string
  serviceName?: string
  date?: string
  startMin?: number
  price?: number | null
  promoTitle?: string
  promoDescription?: string
  address?: string
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n

export function buildMessage(kind: MessageKind, c: Ctx): string {
  const when = c.date && c.startMin !== undefined ? `${formatDateLong(c.date)} a las ${formatTime(c.startMin)}` : ''
  const n = firstName(c.clientName)
  switch (kind) {
    case 'solicitud':
      return `Hola ${c.businessName} 💖 Soy ${c.clientName}. Acabo de solicitar una cita de *${c.serviceName}* para el ${when}. Quedo atenta a la confirmación. ¡Gracias!`
    case 'confirmacion':
      return `Hola ${n} 💖 Te confirmamos tu cita en ${c.businessName}:\n\n✨ ${c.serviceName}\n📅 ${when}${c.price != null ? `\n💳 Valor: ${money(c.price)}` : ''}${c.address ? `\n📍 ${c.address}` : ''}\n\n¡Te esperamos!`
    case 'recordatorio':
      return `Hola ${n} ✨ Te recordamos tu cita de *${c.serviceName}* en ${c.businessName} el ${when}. Si necesitas reprogramar, escríbenos por aquí. 💅`
    case 'reprogramacion':
      return `Hola ${n} 💖 Tu cita de *${c.serviceName}* en ${c.businessName} quedó reprogramada para el ${when}. ¡Nos vemos pronto!`
    case 'cancelacion':
      return `Hola ${n}, te escribimos de ${c.businessName}. Tu cita de *${c.serviceName}* del ${when} quedó cancelada. Cuando quieras, agendamos una nueva fecha. 💖`
    case 'promocion':
      return `Hola ${n} 💖 En ${c.businessName} tenemos una promoción para ti: *${c.promoTitle}*. ${c.promoDescription ?? ''}\n\nResponde este mensaje para reservar.`
    case 'cumpleanos':
      return `¡Feliz cumpleaños, ${n}! 🎂💖 Todo el equipo de ${c.businessName} te desea un día maravilloso.`
  }
}
