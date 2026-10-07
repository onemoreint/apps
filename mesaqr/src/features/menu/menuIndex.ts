import type { Menu, MenuOptionGroup, MenuProduct } from '@/shared/types/menu';

/** Índices de búsqueda rápida sobre el menú (se calculan una vez por carga). */
export interface MenuIndex {
  menu: Menu;
  productById: Map<string, MenuProduct>;
  groupById: Map<string, MenuOptionGroup>;
  byCategory: Map<string, MenuProduct[]>;
}

export function indexMenu(menu: Menu): MenuIndex {
  const productById = new Map(menu.products.map((p) => [p.id, p]));
  const groupById = new Map(menu.option_groups.map((g) => [g.id, g]));
  const byCategory = new Map<string, MenuProduct[]>();
  for (const p of menu.products) {
    const list = byCategory.get(p.category_id) ?? [];
    list.push(p);
    byCategory.set(p.category_id, list);
  }
  return { menu, productById, groupById, byCategory };
}

/** Grupos de opciones que aplican a un producto (solo los que tienen opciones disponibles). */
export function groupsFor(idx: MenuIndex, product: MenuProduct): MenuOptionGroup[] {
  return product.group_ids
    .map((id) => idx.groupById.get(id))
    .filter((g): g is MenuOptionGroup => !!g && g.options.length > 0);
}

/** ¿El producto exige elegir algo antes de agregarlo? */
export function needsChoice(idx: MenuIndex, product: MenuProduct): boolean {
  return groupsFor(idx, product).some((g) => g.min_select > 0);
}

export function groupRule(g: MenuOptionGroup): string {
  if (g.selection === 'single') return g.min_select > 0 ? 'Elige 1' : 'Opcional, elige 1';
  if (g.min_select > 0) return `Elige de ${g.min_select} a ${g.max_select}`;
  return `Opcional, hasta ${g.max_select}`;
}

/** Ids no disponibles: productos y opciones del carrito que ya no están en el menú. */
export function unavailableIn(idx: MenuIndex, productIds: string[], optionIds: string[]): Set<string> {
  const bad = new Set<string>();
  for (const id of productIds) {
    const p = idx.productById.get(id);
    if (!p || !p.available) bad.add(id);
  }
  const allOptions = new Set(idx.menu.option_groups.flatMap((g) => g.options.map((o) => o.id)));
  for (const id of optionIds) if (!allOptions.has(id)) bad.add(id);
  return bad;
}
