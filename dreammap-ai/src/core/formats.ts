import type { DocumentFormat, Orientation, PrintFormat, PrintQuality, Unit, FormatCategory } from './types';

/* ───────────── Catálogo ───────────── */

export const FORMAT_CATALOG: PrintFormat[] = [
  // Digitales (px)
  { id: 'dig-wallpaper', category: 'digital', label: 'Fondo de pantalla vertical', hint: 'Celular', width: 1080, height: 1920, unit: 'px' },
  { id: 'dig-ig-vertical', category: 'digital', label: 'Instagram vertical', width: 1080, height: 1350, unit: 'px' },
  { id: 'dig-square', category: 'digital', label: 'Cuadrado', width: 1080, height: 1080, unit: 'px' },
  { id: 'dig-fhd', category: 'digital', label: 'Pantalla horizontal', hint: 'Full HD', width: 1920, height: 1080, unit: 'px' },
  { id: 'dig-qhd', category: 'digital', label: 'QHD', width: 2560, height: 1440, unit: 'px' },
  { id: 'dig-4k', category: 'digital', label: '4K', width: 3840, height: 2160, unit: 'px' },
  // Impresión estándar (cm)
  { id: 'imp-carta', category: 'impresion', label: 'Carta', width: 21.59, height: 27.94, unit: 'cm' },
  { id: 'imp-a4', category: 'impresion', label: 'A4', width: 21, height: 29.7, unit: 'cm' },
  { id: 'imp-a3', category: 'impresion', label: 'A3', width: 29.7, height: 42, unit: 'cm' },
  { id: 'imp-a2', category: 'impresion', label: 'A2', width: 42, height: 59.4, unit: 'cm' },
  { id: 'imp-a1', category: 'impresion', label: 'A1', width: 59.4, height: 84.1, unit: 'cm' },
  { id: 'imp-a0', category: 'impresion', label: 'A0', width: 84.1, height: 118.9, unit: 'cm' },
  // Póster
  { id: 'pos-30x40', category: 'poster', label: 'Póster 30 × 40', width: 30, height: 40, unit: 'cm' },
  { id: 'pos-40x60', category: 'poster', label: 'Póster 40 × 60', width: 40, height: 60, unit: 'cm' },
  { id: 'pos-50x70', category: 'poster', label: 'Póster 50 × 70', width: 50, height: 70, unit: 'cm' },
  { id: 'pos-60x90', category: 'poster', label: 'Póster 60 × 90', width: 60, height: 90, unit: 'cm' },
  { id: 'pos-70x100', category: 'poster', label: 'Póster 70 × 100', width: 70, height: 100, unit: 'cm' },
  // Pendón / banner
  { id: 'pen-60x160', category: 'pendon', label: 'Pendón 60 × 160', width: 60, height: 160, unit: 'cm' },
  { id: 'pen-80x180', category: 'pendon', label: 'Pendón 80 × 180', width: 80, height: 180, unit: 'cm' },
  { id: 'pen-80x200', category: 'pendon', label: 'Pendón 80 × 200', width: 80, height: 200, unit: 'cm' },
  { id: 'pen-100x200', category: 'pendon', label: 'Pendón 100 × 200', width: 100, height: 200, unit: 'cm' },
  { id: 'pen-120x200', category: 'pendon', label: 'Pendón 120 × 200', width: 120, height: 200, unit: 'cm' },
  { id: 'pen-150x200', category: 'pendon', label: 'Pendón 150 × 200', width: 150, height: 200, unit: 'cm' },
];

export const CATEGORY_LABELS: Record<FormatCategory, string> = {
  digital: '📱 Digital',
  impresion: '🖨️ Impresión',
  poster: '🖼️ Póster',
  pendon: '🏷️ Pendón / Banner',
  personalizado: '✏️ Personalizado',
};

export const QUALITY_DPI: Record<PrintQuality, number> = {
  estandar: 150,
  alta: 200,
  profesional: 300,
};

export const QUALITY_LABELS: Record<PrintQuality, string> = {
  estandar: 'Estándar',
  alta: 'Alta',
  profesional: 'Profesional',
};

/** Píxeles de referencia por pulgada para formatos digitales (solo para convertir px ↔ mm). */
export const SCREEN_PPI = 96;

/* ───────────── Conversión de unidades ───────────── */

export function toMm(value: number, unit: Unit, dpiForPx = SCREEN_PPI): number {
  switch (unit) {
    case 'mm': return value;
    case 'cm': return value * 10;
    case 'in': return value * 25.4;
    case 'px': return (value / dpiForPx) * 25.4;
  }
}

export function fromMm(mm: number, unit: Unit, dpiForPx = SCREEN_PPI): number {
  switch (unit) {
    case 'mm': return mm;
    case 'cm': return mm / 10;
    case 'in': return mm / 25.4;
    case 'px': return (mm / 25.4) * dpiForPx;
  }
}

export const UNIT_LABELS: Record<Unit, string> = { mm: 'mm', cm: 'cm', in: 'pulgadas', px: 'px' };

export function round(n: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function formatNumber(n: number, decimals = 1) {
  return round(n, decimals).toLocaleString('es-CO', { maximumFractionDigits: decimals });
}

/* ───────────── Orientación ───────────── */

export function applyOrientation(w: number, h: number, o: Orientation): [number, number] {
  const a = Math.min(w, h);
  const b = Math.max(w, h);
  if (o === 'vertical') return [a, b];
  if (o === 'horizontal') return [b, a];
  return [a, a];
}

export function orientationOf(w: number, h: number): Orientation {
  if (Math.abs(w - h) / Math.max(w, h) < 0.02) return 'cuadrado';
  return w > h ? 'horizontal' : 'vertical';
}

export function isPrintCategory(c: FormatCategory) {
  return c !== 'digital';
}

/* ───────────── Creación de DocumentFormat ───────────── */

export const DEFAULT_PRINT = { bleedMm: 3, safeMm: 10 };

export function defaultsForCategory(c: FormatCategory): { quality: PrintQuality; bleedMm: number; safeMm: number } {
  if (c === 'digital') return { quality: 'alta', bleedMm: 0, safeMm: 0 };
  if (c === 'pendon') return { quality: 'estandar', bleedMm: 5, safeMm: 20 };
  if (c === 'poster') return { quality: 'profesional', bleedMm: 3, safeMm: 10 };
  return { quality: 'profesional', bleedMm: 3, safeMm: 10 };
}

export function formatFromCatalog(f: PrintFormat, orientation?: Orientation, keep?: Partial<DocumentFormat>): DocumentFormat {
  const natural = orientationOf(f.width, f.height);
  const o = orientation ?? natural;
  const [w, h] = applyOrientation(f.width, f.height, o);
  const d = defaultsForCategory(f.category);
  const base: DocumentFormat = {
    formatId: f.id,
    category: f.category,
    label: f.label,
    widthMm: toMm(w, f.unit),
    heightMm: toMm(h, f.unit),
    orientation: orientationOf(w, h),
    quality: d.quality,
    bleedMm: d.bleedMm,
    safeMm: d.safeMm,
    showGuides: f.category !== 'digital',
  };
  if (f.unit === 'px') {
    base.pixelWidth = Math.round(w);
    base.pixelHeight = Math.round(h);
  }
  // Conserva preferencias del usuario sólo si el tipo de formato es compatible.
  if (keep && isPrintCategory(f.category) && keep.category && isPrintCategory(keep.category)) {
    base.quality = keep.quality ?? base.quality;
    base.bleedMm = keep.bleedMm ?? base.bleedMm;
    base.safeMm = keep.safeMm ?? base.safeMm;
    base.showGuides = keep.showGuides ?? base.showGuides;
  }
  return base;
}

export function customFormat(width: number, height: number, unit: Unit, prev?: DocumentFormat): DocumentFormat {
  const isPx = unit === 'px';
  const category: FormatCategory = isPx ? 'digital' : 'personalizado';
  const d = defaultsForCategory(category);
  const f: DocumentFormat = {
    formatId: 'custom',
    category,
    label: `Personalizado ${formatNumber(width)} × ${formatNumber(height)} ${UNIT_LABELS[unit]}`,
    widthMm: toMm(width, unit),
    heightMm: toMm(height, unit),
    orientation: orientationOf(width, height),
    quality: prev && isPrintCategory(prev.category) && !isPx ? prev.quality : d.quality,
    bleedMm: prev && isPrintCategory(prev.category) && !isPx ? prev.bleedMm : d.bleedMm,
    safeMm: prev && isPrintCategory(prev.category) && !isPx ? prev.safeMm : d.safeMm,
    showGuides: !isPx,
  };
  if (isPx) {
    f.pixelWidth = Math.round(width);
    f.pixelHeight = Math.round(height);
  }
  return f;
}

/** Cambia orientación conservando el resto del formato. */
export function reorient(f: DocumentFormat, o: Orientation): DocumentFormat {
  const catalog = FORMAT_CATALOG.find((c) => c.id === f.formatId);
  const baseW = catalog ? toMm(catalog.width, catalog.unit) : f.widthMm;
  const baseH = catalog ? toMm(catalog.height, catalog.unit) : f.heightMm;
  const [w, h] = applyOrientation(baseW, baseH, o);
  const next: DocumentFormat = { ...f, widthMm: w, heightMm: h, orientation: o };
  if (f.pixelWidth && f.pixelHeight) {
    const pw = catalog ? catalog.width : f.pixelWidth;
    const ph = catalog ? catalog.height : f.pixelHeight;
    const [a, b] = applyOrientation(pw, ph, o);
    next.pixelWidth = Math.round(a);
    next.pixelHeight = Math.round(b);
  }
  return next;
}

/* ───────────── Resolución del documento ───────────── */

export function targetDpi(f: DocumentFormat): number {
  return isPrintCategory(f.category) ? QUALITY_DPI[f.quality] : SCREEN_PPI;
}

export type DocumentResolution = {
  /** Sin sangrado */
  trimPxW: number;
  trimPxH: number;
  /** Con sangrado */
  totalPxW: number;
  totalPxH: number;
  dpi: number;
  bleedPx: number;
  megapixels: number;
};

export function documentResolution(f: DocumentFormat, dpiOverride?: number): DocumentResolution {
  if (!isPrintCategory(f.category) && f.pixelWidth && f.pixelHeight) {
    return {
      trimPxW: f.pixelWidth,
      trimPxH: f.pixelHeight,
      totalPxW: f.pixelWidth,
      totalPxH: f.pixelHeight,
      dpi: SCREEN_PPI,
      bleedPx: 0,
      megapixels: (f.pixelWidth * f.pixelHeight) / 1e6,
    };
  }
  const dpi = dpiOverride ?? targetDpi(f);
  const pxPerMm = dpi / 25.4;
  const trimPxW = Math.round(f.widthMm * pxPerMm);
  const trimPxH = Math.round(f.heightMm * pxPerMm);
  const bleedPx = Math.round(f.bleedMm * pxPerMm);
  const totalPxW = trimPxW + bleedPx * 2;
  const totalPxH = trimPxH + bleedPx * 2;
  return { trimPxW, trimPxH, totalPxW, totalPxH, dpi, bleedPx, megapixels: (totalPxW * totalPxH) / 1e6 };
}

/**
 * Límite práctico de píxeles de un canvas en el navegador actual.
 * Safari/iOS: ~16,7 MP. Otros móviles: conservador. Escritorio: 100 MP.
 */
export function maxCanvasPixels(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): number {
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
  if (isIOS || isSafari) return 16_777_216;
  if (/Android|Mobile/.test(ua)) return 33_000_000;
  return 100_000_000;
}

/** DPI que realmente se puede exportar en este navegador para el formato. */
export function exportableDpi(f: DocumentFormat, maxPixels = maxCanvasPixels()): { dpi: number; capped: boolean } {
  const wanted = targetDpi(f);
  const r = documentResolution(f, wanted);
  if (r.totalPxW * r.totalPxH <= maxPixels) return { dpi: wanted, capped: false };
  const totalWIn = (f.widthMm + f.bleedMm * 2) / 25.4;
  const totalHIn = (f.heightMm + f.bleedMm * 2) / 25.4;
  const dpi = Math.floor(Math.sqrt(maxPixels / (totalWIn * totalHIn)));
  return { dpi, capped: true };
}

/** Peso aproximado del archivo exportado (heurística). */
export function estimateFileBytes(pixels: number, type: 'png' | 'jpg' | 'pdf'): number {
  if (type === 'png') return pixels * 1.6; // fotos: PNG pesa ~1,5–2 bytes/píxel
  return pixels * 0.35; // JPG/PDF con JPG calidad ~0,92
}

export function humanBytes(b: number): string {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 * 1024 * 1024) return `${formatNumber(b / (1024 * 1024), 1)} MB`;
  return `${formatNumber(b / (1024 * 1024 * 1024), 2)} GB`;
}

/** Tamaño legible del formato en su unidad natural. */
export function describeSize(f: DocumentFormat): string {
  if (!isPrintCategory(f.category) && f.pixelWidth && f.pixelHeight) return `${f.pixelWidth} × ${f.pixelHeight} px`;
  return `${formatNumber(f.widthMm / 10)} × ${formatNumber(f.heightMm / 10)} cm`;
}

export function aspectRatioLabel(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const W = Math.round(w), H = Math.round(h);
  const g = gcd(W, H);
  const a = W / g, b = H / g;
  if (a <= 32 && b <= 32) return `${a}:${b}`;
  return `${formatNumber(w / h, 2)}:1`;
}

/* ───────────── Productos y recomendaciones (lenguaje sencillo) ───────────── */

export type Product = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  formatId: string;
  orientation: Orientation;
  quality: PrintQuality;
  bleedMm: number;
  safeMm: number;
  keywords: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: 'poster-grande', emoji: '🖼️', label: 'Póster grande', description: 'Para la pared de tu habitación u oficina',
    formatId: 'pos-50x70', orientation: 'vertical', quality: 'profesional', bleedMm: 3, safeMm: 10,
    keywords: ['grande', 'pared', 'habitación', 'habitacion', 'cuarto', 'póster', 'poster', 'sala', 'oficina'],
  },
  {
    id: 'cuadro', emoji: '🪟', label: 'Cuadro con marco', description: 'Tamaño mediano para enmarcar',
    formatId: 'pos-30x40', orientation: 'vertical', quality: 'profesional', bleedMm: 3, safeMm: 15,
    keywords: ['marco', 'cuadro', 'enmarcar', 'escritorio', 'mesa'],
  },
  {
    id: 'hoja-casa', emoji: '📄', label: 'Imprimir en casa', description: 'Hoja carta en tu impresora',
    formatId: 'imp-carta', orientation: 'vertical', quality: 'alta', bleedMm: 0, safeMm: 10,
    keywords: ['casa', 'impresora', 'hoja', 'carta', 'a4', 'barato', 'rápido'],
  },
  {
    id: 'pendon', emoji: '🏷️', label: 'Pendón para evento', description: 'Se ve de lejos: charlas, talleres, ferias',
    formatId: 'pen-80x200', orientation: 'vertical', quality: 'estandar', bleedMm: 5, safeMm: 20,
    keywords: ['pendón', 'pendon', 'banner', 'evento', 'taller', 'conferencia', 'feria', 'stand', 'roll'],
  },
  {
    id: 'celular', emoji: '📱', label: 'Fondo de celular', description: 'Míralo cada vez que desbloqueas',
    formatId: 'dig-wallpaper', orientation: 'vertical', quality: 'alta', bleedMm: 0, safeMm: 0,
    keywords: ['celular', 'teléfono', 'telefono', 'móvil', 'movil', 'fondo', 'wallpaper', 'bloqueo'],
  },
  {
    id: 'redes', emoji: '📸', label: 'Redes sociales', description: 'Publicación vertical para Instagram',
    formatId: 'dig-ig-vertical', orientation: 'vertical', quality: 'alta', bleedMm: 0, safeMm: 0,
    keywords: ['instagram', 'redes', 'publicar', 'post', 'facebook', 'compartir'],
  },
  {
    id: 'pantalla', emoji: '📺', label: 'Pantalla / TV', description: 'Monitor o televisor 4K',
    formatId: 'dig-4k', orientation: 'horizontal', quality: 'alta', bleedMm: 0, safeMm: 0,
    keywords: ['pantalla', 'tv', 'televisor', 'monitor', 'computador', 'computadora', 'escritorio digital', '4k'],
  },
];

export function productToFormat(p: Product): DocumentFormat {
  const cat = FORMAT_CATALOG.find((f) => f.id === p.formatId)!;
  const f = formatFromCatalog(cat, p.orientation);
  if (isPrintCategory(f.category)) {
    f.quality = p.quality;
    f.bleedMm = p.bleedMm;
    f.safeMm = p.safeMm;
  }
  return f;
}

/** Interpreta una frase del usuario ("Quiero imprimir un mapa grande para mi habitación"). */
export function recommendProduct(text: string): Product | null {
  const t = text.toLowerCase();
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of PRODUCTS) {
    const score = p.keywords.reduce((s, k) => (t.includes(k) ? s + (k.length > 5 ? 2 : 1) : s), 0);
    if (score > bestScore) { best = p; bestScore = score; }
  }
  if (!best && /imprim/.test(t)) return PRODUCTS[0];
  return best;
}
