export interface Medicamento {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  observaciones: string;
}

export interface Respuestas {
  // A. Datos personales
  nombre: string;
  edad: string;
  peso: string;
  estatura: string;
  // B. Actividad y hábitos
  actividadLaboral: string;
  actividadLaboralOtro: string;
  actividadFisica: string;
  tipoEjercicio: string;
  evacuacion: string;
  agua: string;
  comidas: string;
  // C. Sueño
  horasSueno: string;
  interrupciones: string;
  volverDormir: string;
  // D. Salud
  tieneCondicion: string;
  condiciones: string;
  tomaMedicamentos: string;
  medicamentos: Medicamento[];
  tieneAlergias: string;
  alergias: string;
  // E. Objetivos
  objetivo: string;
  objetivoOtro: string;
  observaciones: string;
  // F. Autorizaciones
  autorizaDatos: boolean;
  autorizaSensibles: boolean;
  autorizaRepresentante: boolean;
}

export type Errores = Partial<Record<string, string>>;

export const RESPUESTAS_VACIAS: Respuestas = {
  nombre: '',
  edad: '',
  peso: '',
  estatura: '',
  actividadLaboral: '',
  actividadLaboralOtro: '',
  actividadFisica: '',
  tipoEjercicio: '',
  evacuacion: '',
  agua: '',
  comidas: '',
  horasSueno: '',
  interrupciones: '',
  volverDormir: '',
  tieneCondicion: '',
  condiciones: '',
  tomaMedicamentos: '',
  medicamentos: [],
  tieneAlergias: '',
  alergias: '',
  objetivo: '',
  objetivoOtro: '',
  observaciones: '',
  autorizaDatos: false,
  autorizaSensibles: false,
  autorizaRepresentante: false,
};
