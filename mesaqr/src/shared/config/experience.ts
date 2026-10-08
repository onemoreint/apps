/**
 * Configuración central de la experiencia del menú.
 *
 * Los datos del negocio (nombre, WhatsApp, tasa, formas de pago, colores) vienen
 * de la base de datos y se editan en el panel. Aquí solo van textos y límites de
 * la interfaz que no dependen de cada restaurante.
 */
import type { Badge, Craving } from '@/shared/types/menu';

export const EXPERIENCE = {
  welcome: '¿Qué se te antoja hoy?',
  favoritesTitle: '🔥 Favoritos de la casa',
  categoriesTitle: '¿Qué quieres comer?',
  searchPlaceholder: '¿Qué estás buscando?',
  /** Productos en "Favoritos de la casa" (los marca el restaurante como destacados). */
  favoritesMax: 4,
  /** Sugerencias simultáneas como máximo (al agregar y dentro del carrito). */
  suggestionsMax: 3,
  /** Un carrito sin tocar por más de este tiempo se descarta al volver. */
  cartTtlMs: 6 * 60 * 60 * 1000,
  /** Largo máximo de la observación de un producto ("sin cebolla"). */
  itemNoteMax: 140,
  /** "Algo económico" = el tercio más barato del menú disponible. */
  economicShare: 1 / 3,
} as const;

/** Etiquetas editoriales: las elige el restaurante; nunca afirman cifras de ventas. */
export const BADGES: Record<Badge, { label: string; emoji: string; tone: 'brand' | 'mustard' | 'ink' | 'send' }> = {
  recomendado: { label: 'Recomendado', emoji: '👍', tone: 'ink' },
  especial: { label: 'Especial de la casa', emoji: '⭐', tone: 'mustard' },
  nuevo: { label: 'Nuevo', emoji: '✨', tone: 'send' },
  oferta: { label: 'Oferta', emoji: '🔥', tone: 'brand' },
  favorito: { label: 'Favorito', emoji: '❤️', tone: 'brand' },
};
export const BADGE_ORDER: Badge[] = ['oferta', 'especial', 'recomendado', 'nuevo', 'favorito'];

export type CravingKey = Craving | 'economico';

/** "¿No sabes qué pedir?": filtros simples por etiquetas del catálogo (sin IA). */
export const CRAVINGS: { key: CravingKey; label: string; emoji: string }[] = [
  { key: 'contundente', label: 'Algo contundente', emoji: '🍔' },
  { key: 'queso', label: 'Mucho queso', emoji: '🧀' },
  { key: 'tocineta', label: 'Algo con tocineta', emoji: '🥓' },
  { key: 'picante', label: 'Algo picante', emoji: '🌶️' },
  { key: 'economico', label: 'Algo económico', emoji: '💰' },
  { key: 'compartir', label: 'Algo para compartir', emoji: '👨‍👩‍👧' },
];
