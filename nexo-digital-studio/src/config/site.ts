/**
 * ════════════════════════════════════════════════════════════════
 *  CONFIGURACIÓN CENTRAL · NEXO DIGITAL STUDIO
 *  Edita aquí nombre comercial, contacto, redes y textos globales.
 *  Los valores marcados con  PENDIENTE  deben personalizarse
 *  antes de publicar en el dominio definitivo.
 * ════════════════════════════════════════════════════════════════
 */

const env = import.meta.env;

/** Solo dígitos con código de país. Se puede sobrescribir con VITE_WHATSAPP_NUMBER. */
const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || "573126387467").replace(/\D/g, "");

export const site = {
  name: "NEXO DIGITAL STUDIO",
  shortName: "NEXO",
  tagline: "Experiencias digitales que conectan, impresionan y convierten.",
  description:
    "Agencia digital: landing pages, páginas web profesionales, menús digitales QR, catálogos, pedidos por WhatsApp, microaplicaciones e inteligencia artificial para negocios.",
  url: env.VITE_SITE_URL || "https://onemoreint.github.io/apps/nexo/",
  locale: "es",

  contact: {
    whatsapp: WHATSAPP_NUMBER,
    /** Teléfono legible para mostrar en pantalla. */
    phoneDisplay: "+57 312 638 7467",
    /** PENDIENTE: correo comercial de la agencia. Déjalo vacío para ocultarlo. */
    email: "",
    /** PENDIENTE: ciudad / zona de atención que quieras mostrar. */
    area: "Atención remota · Colombia, Venezuela y Latinoamérica",
    hours: "Lunes a sábado · 8:00 a. m. – 7:00 p. m.",
  },

  /** PENDIENTE: completa solo las redes que existan. Las vacías no se muestran. */
  social: {
    instagram: "",
    tiktok: "",
    facebook: "",
    linkedin: "",
  },

  whatsappDefaultMessage:
    "Hola, quiero digitalizar mi negocio. Me gustaría conocer sus soluciones y recibir una propuesta.",

  /** Crédito de desarrollo en el pie de página. */
  credit: { name: "José Lugo", label: "Dirección y desarrollo" },

  /** Fecha de la última actualización de la política de privacidad. */
  privacyUpdated: "7 de noviembre de 2026",
} as const;

export type SocialKey = keyof typeof site.social;

/** Navegación principal (ancla → etiqueta). */
export const navLinks = [
  { href: "#servicios", label: "Servicios" },
  { href: "#showroom", label: "Showroom" },
  { href: "#nexo-ai", label: "NEXO AI" },
  { href: "#proceso", label: "Proceso" },
  { href: "#faq", label: "Preguntas" },
] as const;
