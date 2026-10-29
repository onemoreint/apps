// Opciones exactas del cuestionario (no cambiar el texto sin revisar logica.ts)

export const OTRO = 'Otro';
export const OTRO_OBJETIVO = 'Otro objetivo';
export const SI = 'Sí';
export const NO = 'No';
export const PREFIERO_NO = 'Prefiero no responder';

export const ACTIVIDAD_LABORAL = [
  'Empleado',
  'Trabajador independiente',
  'Pensionado o jubilado',
  'Me dedico al hogar',
  'Estudiante',
  'Desempleado',
  OTRO,
];

export const NO_ACTIVIDAD_FISICA = 'No realizo actividad física';
export const ACTIVIDAD_FISICA = [
  'Sí, todos los días',
  'Sí, entre 3 y 5 veces por semana',
  'Sí, 1 o 2 veces por semana',
  'Ocasionalmente',
  NO_ACTIVIDAD_FISICA,
];

export const EVACUACION = [
  'Menos de una vez al día',
  'Una vez al día',
  'Dos veces al día',
  'Tres o más veces al día',
  'Es variable',
  PREFIERO_NO,
];

export const AGUA = [
  'Menos de 500 ml',
  'Entre 500 ml y 1 litro',
  'Más de 1 litro y hasta 1,5 litros',
  'Más de 1,5 litros y hasta 2 litros',
  'Más de 2 litros',
  'No estoy seguro',
];

export const COMIDAS = ['Una vez', 'Dos veces', 'Tres veces', 'Cuatro veces', 'Cinco o más veces'];

export const HORAS_SUENO = [
  'Menos de 4 horas',
  'Entre 4 y 5 horas',
  'Entre 6 y 7 horas',
  'Aproximadamente 8 horas',
  'Más de 8 horas',
];

export const INTERRUPCIONES = [NO, 'Sí, una vez', 'Sí, dos veces', 'Sí, tres o más veces'];

export const VOLVER_DORMIR = [
  'Menos de 10 minutos',
  'Entre 10 y 30 minutos',
  'Entre 31 y 60 minutos',
  'Más de una hora',
  'Me cuesta mucho volver a dormir',
  'No estoy seguro',
];

export const CONDICION = [SI, NO, 'No estoy seguro', PREFIERO_NO];
export const MEDICAMENTOS = [SI, NO, 'No estoy seguro'];
export const ALERGIAS = [SI, NO, 'No estoy seguro', PREFIERO_NO];

export const OBJETIVOS = [
  'Mejorar mis hábitos saludables',
  'Controlar mi peso',
  'Mejorar mi alimentación',
  'Mejorar mi descanso',
  'Sentirme con más energía',
  'Mejorar mi bienestar general',
  OTRO_OBJETIVO,
];
