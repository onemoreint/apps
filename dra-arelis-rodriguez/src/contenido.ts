/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CONTENIDO EDITABLE DE LA PÁGINA
 *  Casi todo lo que se cambia a mano (textos, servicios, fotos, datos por confirmar)
 *  está en este archivo. Al guardarlo, la página se actualiza sola en modo `npm run dev`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Número de WhatsApp en formato internacional, solo dígitos (sin +, espacios ni guiones). */
export const WHATSAPP = '584167831789';
/** Cómo se muestra el número en pantalla. */
export const WHATSAPP_VISIBLE = '+58 416 783 1789';

export const NOMBRE = 'Dra. Arelis Rodríguez';
export const PROFESION = 'Odontóloga';

/**
 * Marcadores de datos pendientes.
 * true  → los datos aún sin confirmar aparecen como recuadros punteados «Por confirmar»
 *         (útil para revisar la página con la doctora).
 * false → los datos sin confirmar simplemente no se muestran (versión final para pacientes).
 */
export const MOSTRAR_PENDIENTES = true;

/**
 * Fotografías.
 * Las actuales son ilustrativas (Unsplash, licencia gratuita de uso comercial) y NO muestran
 * a la doctora. Para usar fotos propias: cópialas en la carpeta public/fotos/ y escribe aquí
 * la ruta, por ejemplo 'fotos/consultorio.jpg'.
 */
export const FOTOS = {
  hero: {
    src: 'https://images.unsplash.com/photo-1777331903190-341a3dd0441b?auto=format&fit=crop&w=1200&q=75',
    alt: 'Odontóloga conversando con una paciente en un consultorio luminoso',
    /** true mientras no sea una foto real de la doctora: muestra «Imagen ilustrativa». */
    ilustrativa: true,
  },
  consultorio: {
    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1100&q=70',
    alt: 'Consultorio odontológico moderno, limpio y luminoso',
    ilustrativa: true,
  },
  /** Foto real de la doctora para «Sobre mí». Déjala en null hasta tenerla. */
  doctora: null as null | { src: string; alt: string },
};

export type IconoServicio = 'valoracion' | 'limpieza' | 'preventiva' | 'restauracion' | 'estetica' | 'otros';

export interface Servicio {
  /** Nombre visible en la tarjeta y en el formulario. */
  nombre: string;
  /** Cómo se nombra dentro del mensaje de WhatsApp («información sobre …»). */
  enMensaje: string;
  descripcion: string;
  icono: IconoServicio;
}

/**
 * Servicios (categorías provisionales).
 * Para quitar uno, borra su bloque { … }. Para agregar otro, copia un bloque y cambia los textos.
 * Íconos disponibles: valoracion, limpieza, preventiva, restauracion, estetica, otros.
 */
export const SERVICIOS: Servicio[] = [
  {
    nombre: 'Valoración odontológica',
    enMensaje: 'la valoración odontológica',
    descripcion:
      'Un primer encuentro para conocer tu salud bucal, escuchar tus inquietudes y orientarte sobre los pasos a seguir.',
    icono: 'valoracion',
  },
  {
    nombre: 'Limpieza dental',
    enMensaje: 'la limpieza dental',
    descripcion:
      'Una atención pensada para mantener tus dientes y encías cuidados, con la frecuencia que la profesional te recomiende.',
    icono: 'limpieza',
  },
  {
    nombre: 'Odontología preventiva',
    enMensaje: 'la odontología preventiva',
    descripcion:
      'Hábitos, revisiones y orientación para cuidar tu sonrisa en el día a día y anticiparte a posibles molestias.',
    icono: 'preventiva',
  },
  {
    nombre: 'Restauraciones dentales',
    enMensaje: 'las restauraciones dentales',
    descripcion:
      'Opciones para recuperar la función y la comodidad de tus dientes, definidas a partir de una valoración previa.',
    icono: 'restauracion',
  },
  {
    nombre: 'Estética dental',
    enMensaje: 'la estética dental',
    descripcion:
      'Una conversación sobre cómo te sientes con tu sonrisa y qué alternativas podrían ser adecuadas para ti.',
    icono: 'estetica',
  },
  {
    nombre: 'Otros tratamientos odontológicos',
    enMensaje: 'otros tratamientos odontológicos',
    descripcion:
      '¿Buscas otra atención? Escríbenos y te contamos si está disponible o cómo podemos orientarte.',
    icono: 'otros',
  },
];

/**
 * Perfil de la doctora («Sobre mí»).
 * Escribe el texto entre comillas cuando esté confirmado. Mientras sea null, aparece como
 * «Por confirmar» (si MOSTRAR_PENDIENTES es true) o no se muestra (si es false).
 */
export const PERFIL: { etiqueta: string; valor: string | null }[] = [
  { etiqueta: 'Perfil profesional', valor: null },
  { etiqueta: 'Formación académica', valor: null },
  { etiqueta: 'Experiencia', valor: null },
  { etiqueta: 'Áreas de atención', valor: null },
  { etiqueta: 'Ubicación del consultorio', valor: null },
];

/**
 * Ubicación y horario del consultorio. Mientras sean null, la página invita a
 * consultarlos por WhatsApp (en las preguntas frecuentes y en el pie de página).
 */
export const UBICACION: string | null = null;
export const HORARIO: string | null = null;

export const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Cómo puedo solicitar una cita?',
    respuesta:
      'Puedes llenar el formulario de esta página o escribir directamente por WhatsApp. En ambos casos se abre una conversación con la doctora, que te responderá con la disponibilidad.',
  },
  {
    pregunta: '¿Cómo sé qué tratamiento necesito?',
    respuesta:
      'No necesitas saberlo de antemano. Lo adecuado para cada persona se define después de una valoración profesional. Si no estás segura o seguro, puedes elegir «Valoración odontológica» o simplemente contar tu inquietud.',
  },
  {
    pregunta: '¿Puedo consultar primero por WhatsApp?',
    respuesta:
      'Sí. Puedes escribir para resolver dudas generales sobre la atención o la disponibilidad antes de agendar. Te pedimos no enviar información médica privada en los primeros mensajes; esos detalles se conversan en la consulta.',
  },
  {
    pregunta: '¿La solicitud de cita queda confirmada automáticamente?',
    respuesta:
      'No. Al enviar la solicitud se abre WhatsApp con tus datos listos para enviar. La cita queda confirmada solo cuando la doctora te responda con un día y una hora disponibles.',
  },
  {
    pregunta: '¿Dónde se encuentra el consultorio?',
    respuesta: UBICACION
      ? `El consultorio está en ${UBICACION}. Si necesitas indicaciones para llegar, escríbenos por WhatsApp.`
      : 'Escríbenos por WhatsApp y con gusto te indicamos la ubicación del consultorio y cómo llegar.',
  },
];

/** Crédito del desarrollador (pie de página). Para quitarlo, cambia `mostrar` a false. */
export const CREDITO = {
  mostrar: true,
  texto: 'Sitio desarrollado por José Lugo',
  enlace: 'https://wa.me/573126387467',
};
