/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CONTENIDO EDITABLE DE LA PÁGINA
 *  Casi todo lo que se cambia a mano (textos, servicios, fotos, horario, datos por
 *  confirmar) está en este archivo. Al guardarlo, la página se actualiza sola en `npm run dev`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Número de WhatsApp en formato internacional, solo dígitos (sin +, espacios ni guiones). */
export const WHATSAPP = '584167831789';
/** Cómo se muestra el número en pantalla. */
export const WHATSAPP_VISIBLE = '+58 416 783 1789';

export const NOMBRE = 'Dra. Arelis Rodríguez de Díaz';
/** Versión corta para el saludo de los mensajes y lugares con poco espacio. */
export const NOMBRE_CORTO = 'Dra. Arelis Rodríguez';
export const ESPECIALIDAD = 'Odontología general';

/**
 * Horario de atención (con cita previa).
 * DIAS_ATENCION: 1 = lunes … 5 = viernes, 6 = sábado, 0 = domingo. El formulario no deja
 * elegir días fuera de esta lista.
 */
export const DIAS_ATENCION = [1, 2, 3, 4, 5];
export const HORARIO = {
  dias: 'Lunes a viernes',
  horas: '3:00 a 6:00 p. m.',
  nota: 'Previa cita',
};
export const HORARIO_TEXTO = `${HORARIO.dias}, de ${HORARIO.horas} · ${HORARIO.nota}`;
/** Opciones del campo «Horario preferido» del formulario. */
export const FRANJAS = ['3:00 a 4:00 p. m.', '4:00 a 5:00 p. m.', '5:00 a 6:00 p. m.', 'Cualquier hora de la tarde'];

/**
 * Ubicación del consultorio. Mientras sea null, la página invita a consultarla por WhatsApp.
 * Ejemplo: 'Av. Principal, Edificio X, consultorio 3, Maracay'.
 */
export const UBICACION: string | null = null;

/**
 * Marcadores de datos pendientes.
 * true  → los datos aún sin confirmar aparecen como recuadros punteados «Por confirmar».
 * false → los datos sin confirmar simplemente no se muestran (versión final para pacientes).
 */
export const MOSTRAR_PENDIENTES = true;

const local = (archivo: string) => `${import.meta.env.BASE_URL}fotos/${archivo}`;
const unsplash = (id: string, ancho: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${ancho}&q=72`;

/**
 * Fotografías.
 * - Las de la doctora están en public/fotos/.
 * - Las demás son fotos reales de referencia de Unsplash (licencia gratuita de uso comercial):
 *   NO son del consultorio de la doctora y por eso llevan la etiqueta «Imagen ilustrativa».
 * Para usar fotos propias: cópialas en public/fotos/, usa local('nombre.jpg') y pon ilustrativa: false.
 */
export const FOTOS = {
  doctora: {
    retrato: local('dra-arelis-retrato.webp'),
    avatar: local('dra-arelis-avatar.webp'),
    alt: 'Dra. Arelis Rodríguez de Díaz, odontóloga, sonriendo en su consultorio',
  },
  hero: {
    src: unsplash('1777331903190-341a3dd0441b', 1100),
    alt: 'Odontóloga conversando con una paciente en un consultorio luminoso',
    ilustrativa: true,
  },
  consultorio: {
    src: unsplash('1629909613654-28e377c37b09', 1100),
    alt: 'Consultorio odontológico moderno, limpio y luminoso',
    ilustrativa: true,
  },
};

export type IconoServicio = 'valoracion' | 'limpieza' | 'preventiva' | 'restauracion' | 'estetica' | 'otros';

export interface Servicio {
  /** Nombre visible en la tarjeta y en el formulario. */
  nombre: string;
  /** Cómo se nombra dentro del mensaje de WhatsApp («información sobre …»). */
  enMensaje: string;
  descripcion: string;
  icono: IconoServicio;
  /** Foto de la tarjeta (opcional). Si es de referencia, se marca como ilustrativa. */
  foto?: { src: string; alt: string };
}

/**
 * Servicios de odontología general (categorías provisionales hasta que la doctora las confirme).
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
    foto: { src: unsplash('1662837625421-5fd8ed6131a0', 640), alt: 'Odontóloga revisando a un paciente' },
  },
  {
    nombre: 'Limpieza dental',
    enMensaje: 'la limpieza dental',
    descripcion:
      'Una atención pensada para mantener tus dientes y encías cuidados, con la frecuencia que la profesional te recomiende.',
    icono: 'limpieza',
    foto: { src: unsplash('1606811971618-4486d14f3f99', 640), alt: 'Revisión dental con espejo e instrumento' },
  },
  {
    nombre: 'Odontología preventiva',
    enMensaje: 'la odontología preventiva',
    descripcion:
      'Hábitos, revisiones y orientación para cuidar tu sonrisa en el día a día y anticiparte a posibles molestias.',
    icono: 'preventiva',
    foto: { src: unsplash('1606811856475-5e6fcdc6e509', 640), alt: 'Espejo dental y explorador sobre una superficie blanca' },
  },
  {
    nombre: 'Restauraciones dentales',
    enMensaje: 'las restauraciones dentales',
    descripcion:
      'Opciones para recuperar la función y la comodidad de tus dientes, definidas a partir de una valoración previa.',
    icono: 'restauracion',
    foto: { src: unsplash('1593022356769-11f762e25ed9', 640), alt: 'Modelo dental de referencia' },
  },
  {
    nombre: 'Estética dental',
    enMensaje: 'la estética dental',
    descripcion:
      'Una conversación sobre cómo te sientes con tu sonrisa y qué alternativas podrían ser adecuadas para ti.',
    icono: 'estetica',
    foto: { src: unsplash('1677026010083-78ec7f1b84ed', 640), alt: 'Primer plano de una sonrisa' },
  },
  {
    nombre: 'Otros tratamientos odontológicos',
    enMensaje: 'otros tratamientos odontológicos',
    descripcion:
      '¿Buscas otra atención? Escríbenos y te contamos si está disponible o cómo podemos orientarte.',
    icono: 'otros',
    foto: { src: unsplash('1643916800611-1302e8d27c38', 640), alt: 'Sillón odontológico en un consultorio con luz natural' },
  },
];

/**
 * Perfil de la doctora («Sobre mí»).
 * Escribe el texto entre comillas cuando esté confirmado. Mientras sea null, aparece como
 * «Por confirmar» (si MOSTRAR_PENDIENTES es true) o no se muestra (si es false).
 */
export const PERFIL: { etiqueta: string; valor: string | null }[] = [
  { etiqueta: 'Especialidad', valor: ESPECIALIDAD },
  { etiqueta: 'Horario de atención', valor: `${HORARIO.dias}, de ${HORARIO.horas} (${HORARIO.nota.toLowerCase()})` },
  { etiqueta: 'Formación académica', valor: null },
  { etiqueta: 'Experiencia', valor: null },
  { etiqueta: 'Ubicación del consultorio', valor: UBICACION },
];

export const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Cómo puedo solicitar una cita?',
    respuesta:
      'Puedes llenar el formulario de esta página o escribir directamente por WhatsApp. En ambos casos se abre una conversación con la doctora, que te responderá con la disponibilidad.',
  },
  {
    pregunta: '¿Cuál es el horario de atención?',
    respuesta: `La atención es de ${HORARIO.dias.toLowerCase()}, de ${HORARIO.horas}, y siempre con cita previa. Así cada paciente cuenta con su propio tiempo, sin esperas largas.`,
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
