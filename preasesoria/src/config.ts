/**
 * CONFIGURACIÓN DE LA PREASESORÍA
 * Cambia estos valores y vuelve a compilar (npm run build) para personalizar la app.
 */
export const CONFIG = {
  /** Número que recibe las respuestas, solo dígitos con indicativo de país (sin +, espacios ni guiones). */
  whatsappNumero: '573022917846',

  /** Cómo se muestra el número en pantalla. */
  whatsappVisible: '+57 302 291 7846',

  /**
   * Nombre de la persona o empresa responsable del tratamiento de los datos.
   * Déjalo vacío hasta definirlo: la app NO inventa un responsable y mostrará
   * "el asesor que te compartió este enlace" junto al número de WhatsApp.
   */
  responsableNombre: '',

  /** Correo de contacto para consultas sobre datos personales (opcional). */
  responsableCorreo: '',

  /**
   * Enlace a la política de tratamiento de datos personales.
   * Déjalo vacío si aún no está publicada: la app indicará que se puede solicitar por WhatsApp.
   */
  politicaPrivacidadUrl: '',

  /** Título visible en la app. */
  tituloApp: 'Preasesoría de bienestar',

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
