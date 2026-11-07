import { site } from "../config/site";

/** Construye un enlace wa.me con mensaje precargado. */
export function waLink(message: string = site.whatsappDefaultMessage, phone: string = site.contact.whatsapp) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp en una pestaña nueva (o en la app en móvil). */
export function openWhatsApp(message?: string, phone?: string) {
  window.open(waLink(message, phone), "_blank", "noopener,noreferrer");
}

/** Formato de moneda configurable (los demos usan COP por defecto). */
export function money(value: number, currency = "COP", locale = "es-CO") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** Validación sencilla de teléfono: 7 a 15 dígitos (formato internacional E.164). */
export function isValidPhone(value: string) {
  const d = value.replace(/\D/g, "");
  return d.length >= 7 && d.length <= 15;
}
