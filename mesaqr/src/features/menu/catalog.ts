/**
 * Lógica del "mesero digital" sobre el catálogo: búsqueda, favoritos, ofertas,
 * combos, sugerencias y antojos. Todo es puro (sin React) y se prueba aparte.
 */
import type { MenuProduct } from '@/shared/types/menu';
import { BADGE_ORDER, EXPERIENCE, type CravingKey } from '@/shared/config/experience';
import { toCents } from '@/shared/lib/money';
import type { MenuIndex } from './menuIndex';

/** Minúsculas y sin acentos: "Ñame Café" → "name cafe". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda instantánea por nombre, descripción, categoría y etiquetas. */
export function searchProducts(idx: MenuIndex, query: string): MenuProduct[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const catName = new Map(idx.menu.categories.map((c) => [c.id, c.name]));
  const scored: { p: MenuProduct; score: number }[] = [];
  for (const p of idx.menu.products) {
    const name = normalize(p.name);
    const hay = normalize(
      [p.name, p.description ?? '', catName.get(p.category_id) ?? '', ...p.badges, ...p.cravings, ...p.combo_items.map((c) => c.label)].join(' '),
    );
    if (!terms.every((t) => hay.includes(t))) continue;
    // Coincidencias en el nombre primero; los agotados al final
    const score = (terms.every((t) => name.includes(t)) ? 2 : 0) + (name.startsWith(terms[0]!) ? 1 : 0) - (p.available ? 0 : 5);
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.p);
}

/** Ahorro en centavos, solo si el precio anterior existe y es mayor. */
export function savingsCents(p: Pick<MenuProduct, 'price_usd' | 'compare_at_price_usd'>): number | null {
  if (p.compare_at_price_usd === null || p.compare_at_price_usd === undefined) return null;
  const diff = toCents(p.compare_at_price_usd) - toCents(p.price_usd);
  return diff > 0 ? diff : null;
}

export function topBadge(p: MenuProduct) {
  return BADGE_ORDER.find((b) => p.badges.includes(b)) ?? null;
}

/** Favoritos de la casa: los destacados por el restaurante, disponibles primero. */
export function favorites(idx: MenuIndex): MenuProduct[] {
  return idx.menu.products
    .filter((p) => p.featured && p.available)
    .slice(0, EXPERIENCE.favoritesMax);
}

/** Ofertas: marcadas como oferta o con precio anterior mayor. */
export function offers(idx: MenuIndex): MenuProduct[] {
  return idx.menu.products.filter((p) => p.badges.includes('oferta') || savingsCents(p) !== null);
}

/** Combo configurado para un producto (si existe y está disponible). */
export function comboFor(idx: MenuIndex, p: MenuProduct): MenuProduct | null {
  if (!p.combo_upgrade_id) return null;
  const combo = idx.productById.get(p.combo_upgrade_id);
  return combo && combo.available && combo.id !== p.id ? combo : null;
}

/**
 * Sugerencias "Completa tu pedido": productos marcados como sugerencia por el
 * restaurante, disponibles, que no están en el pedido ni son de la misma
 * categoría que lo recién agregado. Máximo 3.
 */
export function suggestions(idx: MenuIndex, inCart: Set<string>, context?: MenuProduct): MenuProduct[] {
  return idx.menu.products
    .filter((p) => p.upsell && p.available && !inCart.has(p.id) && p.id !== context?.id && p.category_id !== context?.category_id)
    .slice(0, EXPERIENCE.suggestionsMax);
}

/** Tope de precio para "Algo económico": el tercio más barato del menú disponible. */
export function economicCeilingCents(idx: MenuIndex): number | null {
  const prices = idx.menu.products
    .filter((p) => p.available)
    .map((p) => toCents(p.price_usd))
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;
  return prices[Math.max(0, Math.ceil(prices.length * EXPERIENCE.economicShare) - 1)]!;
}

export function cravingMatches(idx: MenuIndex, key: CravingKey): MenuProduct[] {
  const available = idx.menu.products.filter((p) => p.available);
  if (key === 'economico') {
    const ceiling = economicCeilingCents(idx);
    if (ceiling === null) return [];
    return available.filter((p) => toCents(p.price_usd) <= ceiling).sort((a, b) => a.price_usd - b.price_usd);
  }
  return available.filter((p) => p.cravings.includes(key));
}
