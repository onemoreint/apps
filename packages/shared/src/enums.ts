/**
 * Enumeraciones del dominio compartidas por API, base de datos y frontend.
 * Fuente única de verdad: si cambia un valor aquí, debe cambiar la migración SQL.
 */

export const ROLES = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'INGENIERO', 'VENDEDOR', 'CONSULTA'] as const;
export type Role = (typeof ROLES)[number];

export const CLIENT_TYPES = ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'RURAL', 'INSTITUCIONAL', 'OTRO'] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const PROJECT_STATUSES = [
  'BORRADOR',
  'DIAGNOSTICO',
  'DIMENSIONAMIENTO',
  'PRESUPUESTO',
  'PROPUESTA',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'INSTALACION',
  'FINALIZADO',
  'CANCELADO',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Estado de cada dato extraído de una factura (§12). Un dato ausente NUNCA es cero. */
export const EXTRACTION_STATUSES = ['EXTRAIDO', 'CONFIRMADO', 'REVISAR', 'NO_DISPONIBLE'] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

/** Estados de validación de cálculos (§42). */
export const VALIDATION_STATUSES = ['OK', 'WARNING', 'ERROR', 'REVIEW_REQUIRED'] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const REGULATION_STATUSES = ['BORRADOR', 'VIGENTE', 'REEMPLAZADA', 'ARCHIVADA'] as const;
export type RegulationStatus = (typeof REGULATION_STATUSES)[number];

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'GENERATE_PDF',
  'APPROVE',
  'REJECT',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const PRODUCT_STATUSES = ['ACTIVO', 'INACTIVO'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Origen de un dato (trazabilidad, igual que en OBRAIA). */
export const DATA_SOURCES = [
  'USER_INPUT',
  'BILL_EXTRACTION',
  'CATALOG',
  'OFFICIAL',
  'TECHNICAL',
  'COMMERCIAL',
  'ESTIMATE',
  'PROFESSIONAL_VERIFIED',
] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const LABOR_UNITS = ['UNIDAD', 'METRO', 'HORA', 'GLOBAL', 'KM'] as const;
export type LaborUnit = (typeof LABOR_UNITS)[number];

export const BOM_CATEGORIES = [
  'PANELES',
  'INVERSOR',
  'BATERIAS',
  'ESTRUCTURA',
  'RIELES',
  'GRAPAS',
  'TORNILLERIA',
  'CABLE_DC',
  'CABLE_AC',
  'CONECTORES',
  'PROTECCIONES_DC',
  'PROTECCIONES_AC',
  'TABLEROS',
  'BREAKERS',
  'DPS',
  'PUESTA_A_TIERRA',
  'CANALIZACIONES',
  'TUBERIA',
  'ETIQUETADO',
  'MEDICION',
  'COMUNICACIONES',
  'MONITOREO',
  'OTROS',
] as const;
export type BomCategory = (typeof BOM_CATEGORIES)[number];

export const COST_CATEGORIES = [
  'MATERIALES',
  'MANO_DE_OBRA',
  'TRANSPORTE',
  'INGENIERIA',
  'COSTOS_INDIRECTOS',
  'OTROS',
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

/** Etiquetas visibles en español para enums con tildes/espacios. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  BORRADOR: 'Borrador',
  DIAGNOSTICO: 'Diagnóstico',
  DIMENSIONAMIENTO: 'Dimensionamiento',
  PRESUPUESTO: 'Presupuesto',
  PROPUESTA: 'Propuesta',
  EN_REVISION: 'En revisión',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  INSTALACION: 'Instalación',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};
