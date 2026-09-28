/**
 * DREAMMAP AI — Modelo de dominio.
 *
 * El sistema separa cinco capas independientes:
 *   CONTENIDO  → Dream, BoardContent
 *   DISEÑO     → DesignTemplate (templates.ts)
 *   FORMATO    → PrintFormat / CustomFormat / DocumentFormat
 *   FUENTE     → ImageSource / ImageAsset / *Provider
 *   EXPORTACIÓN→ ExportSettings
 * Cada capa puede cambiar sin reconstruir las demás.
 */

/* ───────────────────────── FUENTE DE IMAGEN ───────────────────────── */

export type ImageSource = 'device' | 'library' | 'web' | 'ai' | 'pinterest';

export type LicenseInfo = {
  /** Nombre corto de la licencia (p. ej. "CC BY 4.0"), o "desconocida". */
  name: string;
  url?: string;
  /** true solo cuando la licencia permite expresamente uso comercial. */
  commercialUse: boolean | 'unknown';
  attribution?: string;
};

/** Imagen utilizable dentro del mapa (incorporada). */
export type ImageAsset = {
  id: string;
  source: ImageSource;
  /** URL local (blob: o data:) lista para dibujar en canvas. */
  src: string;
  thumb?: string;
  title: string;
  /** Dimensiones reales en píxeles. Para vectores: null (escalan sin pérdida). */
  width: number;
  height: number;
  vector?: boolean;
  tags: string[];
  category?: string;
  /** Origen externo (web/IA): dónde se encontró o cómo se generó. */
  origin?: { provider: string; pageUrl?: string; prompt?: string; creator?: string };
  license?: LicenseInfo;
  createdAt: number;
};

/** Referencia visual: NO se incorpora al mapa, solo inspira (p. ej. Pinterest). */
export type ImageReference = {
  id: string;
  provider: 'pinterest' | 'web' | 'otro';
  url: string;
  note?: string;
  createdAt: number;
};

/** Resultado de búsqueda externa, aún no incorporado. */
export type SearchResult = {
  id: string;
  providerId: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  title: string;
  sourceName: string;
  pageUrl: string;
  license: LicenseInfo;
  creator?: string;
};

export interface ImageSearchProvider {
  readonly id: string;
  readonly name: string;
  search(query: string, opts?: { page?: number; orientation?: Orientation }): Promise<SearchResult[]>;
  /** Descarga la imagen como Blob local para incorporarla (puede fallar por CORS/licencia). */
  fetchAsset(result: SearchResult): Promise<ImageAsset>;
}

export interface LocalImageProvider {
  list(): ImageAsset[];
  search(query: string, category?: string): ImageAsset[];
  add(asset: ImageAsset): void;
  remove(id: string): void;
  categories(): string[];
}

export type AIStyle = 'fotorealista' | 'cinematografico' | 'editorial' | 'luxury' | 'minimalista' | 'inspiracional';

export type AIImageRequest = {
  prompt: string;
  style: AIStyle;
  width: number;
  height: number;
};

export interface AIImageProvider {
  readonly id: string;
  readonly name: string;
  /** false = modo demostración (no genera imágenes reales). */
  readonly isReal: boolean;
  generate(req: AIImageRequest): Promise<ImageAsset>;
}

export interface PinterestReferenceProvider {
  /** URL de búsqueda pública en Pinterest (se abre en pestaña nueva; sin scraping). */
  searchUrl(query: string): string;
  isValidReference(url: string): boolean;
}

/* ───────────────────────── CONTENIDO ───────────────────────── */

export type Dream = {
  id: string;
  title: string;
  /** Frase del usuario: "Quiero un Toyota Fortuner negro 2027". */
  description: string;
  category: string;
  location?: string;
  imageId?: string;
  /** Encuadre: punto focal 0..1 */
  focusX: number;
  focusY: number;
  references: ImageReference[];
};

export type BoardContent = {
  projectName: string;
  title: string;
  subtitle: string;
  /** Palabras de poder / afirmaciones cortas (1 a 3 palabras). */
  words?: string[];
  dreams: Dream[];
};

/* ───────────────────────── FORMATO ───────────────────────── */

export type Unit = 'mm' | 'cm' | 'in' | 'px';
export type Orientation = 'vertical' | 'horizontal' | 'cuadrado';
export type FormatCategory = 'digital' | 'impresion' | 'poster' | 'pendon' | 'personalizado';
export type PrintQuality = 'estandar' | 'alta' | 'profesional';

/** Formato predefinido del catálogo. Dimensiones en orientación natural. */
export type PrintFormat = {
  id: string;
  category: FormatCategory;
  label: string;
  hint?: string;
  width: number;
  height: number;
  unit: Unit;
};

/** Formato definido por el usuario. */
export type CustomFormat = {
  width: number;
  height: number;
  widthUnit: Unit;
  heightUnit: Unit;
  keepRatio: boolean;
};

/** Formato completo del documento: lo que realmente se renderiza. */
export type DocumentFormat = {
  formatId: string; // id del catálogo o 'custom'
  category: FormatCategory;
  label: string;
  /** Tamaño final (corte) en milímetros; para digital se deriva de px a 96ppi solo como referencia. */
  widthMm: number;
  heightMm: number;
  /** Para formatos digitales: píxeles exactos. */
  pixelWidth?: number;
  pixelHeight?: number;
  orientation: Orientation;
  quality: PrintQuality;
  bleedMm: number;
  safeMm: number;
  showGuides: boolean;
};

/* ───────────────────────── DISEÑO / CANVAS ───────────────────────── */

export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutCell = { dreamId: string; rect: Rect; /** radianes, alrededor del centro */ rotation?: number };

/** Resultado del motor de distribución en coordenadas de píxeles del documento. */
export type VisionBoardCanvas = {
  /** Tamaño total incluyendo sangrado. */
  canvasW: number;
  canvasH: number;
  trim: Rect;
  safe: Rect;
  /** Área de composición (zona segura + aire de diseño). */
  area: Rect;
  header: Rect;
  headerMode: 'top' | 'side';
  cells: LayoutCell[];
  gap: number;
  pxPerMm: number;
};

/* ───────────────────────── EXPORTACIÓN / VALIDACIÓN ───────────────────────── */

export type ExportFileType = 'png' | 'jpg' | 'pdf';

export type ExportSettings = {
  fileType: ExportFileType;
  jpgQuality: number;
  includeBleed: boolean;
  /** DPI efectivo tras aplicar límites del navegador. */
  dpi: number;
  pixelWidth: number;
  pixelHeight: number;
  /** true si el DPI se redujo por límite de memoria del navegador. */
  capped: boolean;
  requestedDpi: number;
};

export type QualityLevel = 'excelente' | 'aceptable' | 'insuficiente' | 'vector';

export type ImageQualityReport = {
  dreamId: string;
  effectivePpi: number;
  level: QualityLevel;
};

export type AlertSeverity = 'ok' | 'info' | 'warning' | 'error';

export type PrintAlert = {
  id: string;
  severity: AlertSeverity;
  message: string;
  dreamId?: string;
};

export type PrintValidation = {
  ready: boolean;
  alerts: PrintAlert[];
  images: ImageQualityReport[];
};
