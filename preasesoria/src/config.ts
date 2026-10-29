/**
 * CONFIGURACIÓN DE LA PREASESORÍA
 * Cambia estos valores y vuelve a compilar (npm run build) para personalizar la app.
 */
export const CONFIG = {
  /** Número que recibe las respuestas, solo dígitos con indicativo de país (sin +, espacios ni guiones). */
  whatsappNumero: '573022917846',

  /** Cómo se muestra el número en pantalla. */
  whatsappVisible: '+57 302 291 7846',

  /** Responsable del tratamiento de los datos (quien recibe las respuestas). */
  responsableNombre: 'Jaqueline Cataño',

  /** Nombre corto para los textos de la app. */
  nombreCorto: 'Jaqueline',

  /** Especialidad que se muestra junto a la foto. */
  especialidad: 'Especialista en pérdida de peso',

  /** Correo de contacto para consultas sobre datos personales. */
  responsableCorreo: 'diosjake86@gmail.com',

  /**
   * Enlace a una política de tratamiento de datos externa (opcional).
   * Vacío = se muestra la política incluida en la app (src/components/Politica.tsx).
   */
  politicaPrivacidadUrl: '',

  /** Fecha desde la que rige la política incluida en la app. */
  politicaVigencia: '29 de octubre de 2026',

  /** Título visible en la app. */
  tituloApp: 'Valoración de bienestar',

  /**
   * Longitud máxima del enlace de WhatsApp (en caracteres, ya codificado) que se considera
   * fiable para abrirse en una sola vez. Si el mensaje la supera, se ofrece enviarlo por partes.
   */
  maxLongitudEnlace: 6000,
} as const;

export function nombreResponsable(): string {
  return CONFIG.responsableNombre.trim()
    ? CONFIG.responsableNombre.trim()
    : `el asesor que te compartió este enlace (WhatsApp ${CONFIG.whatsappVisible})`;
}
