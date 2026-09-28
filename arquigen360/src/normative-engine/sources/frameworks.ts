/*
 * Matriz de referencia (especificación 2026, §9).
 * Son marcos de diseño y gestión del producto. Ninguno implica certificación de
 * ARQUIGEN 360 ni cumplimiento legal de un proyecto.
 */

export interface FrameworkRef {
  name: string;
  area: string;
  use: string;
  versionNote: string;
}

const VERIFY = 'Versión indicada en la especificación; verificar vigencia antes de citarla.';

export const FRAMEWORKS: FrameworkRef[] = [
  { name: 'ISO 9001:2026', area: 'Gestión de calidad', use: 'Trazabilidad requisito → prueba → aceptación (carpeta quality/).', versionNote: VERIFY },
  { name: 'ISO/IEC 25010:2023', area: 'Calidad del producto de software', use: 'Criterios de calidad: adecuación, fiabilidad, usabilidad, seguridad.', versionNote: VERIFY },
  { name: 'ISO/IEC 27001:2022', area: 'Seguridad de la información', use: 'Referencia para controles cuando exista backend multiusuario.', versionNote: VERIFY },
  { name: 'ISO/IEC 27701:2025', area: 'Gestión de privacidad', use: 'Referencia para tratamiento de datos personales.', versionNote: VERIFY },
  { name: 'ISO/IEC 42001:2023', area: 'Gestión de sistemas de IA', use: 'Gobernanza de IA: la IA propone, el motor valida, el profesional decide.', versionNote: VERIFY },
  { name: 'OWASP Top 10:2025', area: 'Seguridad de aplicaciones web', use: 'Revisión de riesgos del frontend y de la futura API.', versionNote: VERIFY },
  { name: 'OWASP ASVS', area: 'Verificación de seguridad de aplicaciones', use: 'Lista de verificación para pruebas de seguridad.', versionNote: VERIFY },
  { name: 'NTC-ISO 19650', area: 'Gestión de información BIM', use: 'IDs estables y propiedades consistentes antes de exportar IFC.', versionNote: VERIFY },
  { name: 'NSR-10 y modificaciones vigentes', area: 'Construcción sismo resistente (Colombia)', use: 'Solo prevalidación estructural; no hay diseño ni cálculo.', versionNote: VERIFY },
  { name: 'RETIE vigente', area: 'Instalaciones eléctricas (Colombia)', use: 'Solo prevalidación eléctrica; no hay diseño eléctrico.', versionNote: VERIFY },
  { name: 'RETILAP vigente', area: 'Iluminación y alumbrado (Colombia)', use: 'Solo prevalidación de iluminación.', versionNote: VERIFY },
  { name: 'Ley 1581 de 2012', area: 'Protección de datos personales (Colombia)', use: 'Privacidad desde el diseño; sin datos personales reales en pruebas.', versionNote: VERIFY },
  { name: 'Decreto 1074 de 2015', area: 'Reglamentación de datos personales (Colombia)', use: 'Política de tratamiento y derechos del titular (futuro backend).', versionNote: VERIFY },
  { name: 'POT / PBOT / EOT municipal', area: 'Norma urbanística', use: 'Depende del municipio y la zona; se evalúa solo con reglas verificadas.', versionNote: 'Específico de cada municipio.' },
];
