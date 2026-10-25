/**
 * Identidad de la radio — ÚNICO lugar para cambiar nombre, logotipo, colores y contacto.
 * Lo usan la interfaz, el manifiesto de la PWA y los textos legales.
 */
export const brand = {
  name: 'Radio Mix Online',
  shortName: 'Radio Mix',
  tagline: 'Música variada, en vivo y para todos los gustos.',
  /** Monograma del logotipo (se dibuja en SVG). Para usar una imagen, pon su ruta en logoUrl. */
  monogram: 'RM',
  logoUrl: '' as string,
  colors: {
    background: '#0b0a10',
    surface: '#15131d',
    accent: '#ff5a36', // coral
    accent2: '#ffc23d', // ámbar
    accent3: '#38d6c4', // turquesa
  },
  contact: {
    owner: 'José Lugo',
    email: 'clerigman@gmail.com',
    whatsapp: '+573126387467',
    instagram: 'joselugoofficial',
    tiktok: 'joselugooficial',
  },
  /** Fecha de la versión vigente de la política de privacidad y condiciones. */
  legalUpdated: '25 de octubre de 2026',
} as const;

export type Brand = typeof brand;
