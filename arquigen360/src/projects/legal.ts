import type { DocStatus } from '../geometry/types';

/** Pie legal para todas las salidas técnicas (especificación 2026, §35) */
export const LEGAL_NOTICE =
  'ARQUIGEN 360 genera propuestas y prevalidaciones automatizadas a partir de los datos suministrados por el usuario. ' +
  'Los resultados no sustituyen estudios, diseños, cálculos, licencias, certificaciones ni la revisión y aprobación de profesionales competentes. ' +
  'La aplicabilidad de normas urbanísticas y técnicas depende de la jurisdicción, vigencia normativa y características específicas del proyecto.';

/** Estados del documento (§28). "Aprobado para construcción" no existe como estado automático. */
export const STATUS_TEXT: Record<DocStatus, string> = {
  BORRADOR: 'Borrador',
  PREVALIDACION: 'Prevalidación',
  REVISION_PROFESIONAL: 'Revisión profesional',
  APROBADO_POR_USUARIO: 'Aprobado por el usuario',
};

export const STATUS_HELP: Record<DocStatus, string> = {
  BORRADOR: 'Trabajo en curso.',
  PREVALIDACION: 'Revisado con las verificaciones automáticas de ARQUIGEN.',
  REVISION_PROFESIONAL: 'Entregado a un profesional para revisión.',
  APROBADO_POR_USUARIO: 'El usuario aprueba la propuesta. No es una aprobación para construcción.',
};
