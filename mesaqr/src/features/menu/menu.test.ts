import { beforeEach, describe, expect, it } from 'vitest';
import { loadCustomer, saveCustomer } from './session';
import { groupRule, groupsFor, indexMenu, needsChoice, unavailableIn } from './menuIndex';
import type { Menu, MenuProduct } from '@/shared/types/menu';
import { comboFor, cravingMatches, economicCeilingCents, favorites, normalize, offers, savingsCents, searchProducts, suggestions } from './catalog';

const prod = (p: Partial<MenuProduct> & Pick<MenuProduct, 'id' | 'name' | 'price_usd'>): MenuProduct => ({
  category_id: 'c1', type: 'simple', description: null, image_url: null, available: true, featured: false, upsell: false,
  badges: [], cravings: [], compare_at_price_usd: null, combo_upgrade_id: null, group_ids: [], combo_items: [], ...p,
});

describe('Datos del cliente recordados', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y recupera nombre, dirección y preferencias', () => {
    saveCustomer({ name: 'Ana', phone: '0412', type: 'delivery', address: 'Calle 1', payment: 'Pago móvil' });
    expect(loadCustomer()).toEqual({ name: 'Ana', phone: '0412', type: 'delivery', address: 'Calle 1', payment: 'Pago móvil' });
  });

  it('ignora datos manipulados en el almacenamiento', () => {
    localStorage.setItem('mesaqr-customer', JSON.stringify({ name: 'x'.repeat(500), type: 'helicoptero', payment: 42 }));
    const c = loadCustomer();
    expect(c.name).toHaveLength(60);
    expect(c.type).toBeUndefined();
    expect(c.payment).toBe('');
    localStorage.setItem('mesaqr-customer', '{roto');
    expect(loadCustomer()).toEqual({});
  });
});

const menu: Menu = {
  business: { id: 'b', name: 'X', description: null, logo_url: null, address: null, phone: null, whatsapp: '+584121234567', instagram: null, show_bs: true, exchange_rate: 100, primary_color: '#D62828', payment_methods: ['Pago móvil'], order_types: ['pickup'] },
  categories: [{ id: 'c1', name: 'Bebidas', emoji: null, image_url: null }],
  products: [
    prod({ id: 'p1', name: 'Pepsi', price_usd: 1.5, group_ids: ['g1', 'g-empty'] }),
    prod({ id: 'p2', name: 'Agua', price_usd: 1, available: false }),
  ],
  option_groups: [
    { id: 'g1', name: 'Tamaño', selection: 'single', min_select: 1, max_select: 1, options: [{ id: 'o1', name: 'Regular', price_delta_usd: 0 }] },
    { id: 'g-empty', name: 'Vacío', selection: 'multiple', min_select: 0, max_select: 3, options: [] },
  ],
};

describe('Índice del menú', () => {
  const idx = indexMenu(menu);
  it('grupos aplicables omiten los vacíos', () => {
    expect(groupsFor(idx, menu.products[0]!).map((g) => g.id)).toEqual(['g1']);
    expect(needsChoice(idx, menu.products[0]!)).toBe(true);
  });
  it('detecta productos agotados, desaparecidos y opciones inexistentes', () => {
    const bad = unavailableIn(idx, ['p1', 'p2', 'p-borrado'], ['o1', 'o-borrada']);
    expect([...bad].sort()).toEqual(['o-borrada', 'p-borrado', 'p2']);
  });
  it('describe la regla del grupo', () => {
    expect(groupRule(menu.option_groups[0]!)).toBe('Elige 1');
    expect(groupRule(menu.option_groups[1]!)).toBe('Opcional, hasta 3');
  });
});

const catalogMenu: Menu = {
  ...menu,
  categories: [
    { id: 'burger', name: 'Hamburguesas', emoji: '🍔', image_url: null },
    { id: 'sides', name: 'Raciones', emoji: '🍟', image_url: null },
  ],
  products: [
    prod({ id: 'b1', category_id: 'burger', name: 'Hamburguesa Clásica', description: 'Lechuga y tomate', price_usd: 7.5, featured: true, combo_upgrade_id: 'combo' }),
    prod({ id: 'b2', category_id: 'burger', name: 'Hamburguesa con Queso y Tocineta', price_usd: 8.5, featured: true, badges: ['especial'], cravings: ['queso', 'tocineta'] }),
    prod({ id: 'b3', category_id: 'burger', name: 'Doble Champiñón', price_usd: 12, available: false, cravings: ['queso'] }),
    prod({ id: 'combo', category_id: 'burger', type: 'combo', name: 'Combo Clásico', price_usd: 10, compare_at_price_usd: 12 }),
    prod({ id: 's1', category_id: 'sides', name: 'Papas Fritas', price_usd: 4.5, upsell: true, cravings: ['compartir'] }),
    prod({ id: 's2', category_id: 'sides', name: 'Papas con Queso', price_usd: 6, upsell: true }),
    prod({ id: 's3', category_id: 'sides', name: 'Tequeños', price_usd: 5, upsell: true, compare_at_price_usd: 5 }),
    prod({ id: 's4', category_id: 'sides', name: 'Aros de cebolla', price_usd: 5, upsell: true }),
  ],
};

describe('Mesero digital (catálogo)', () => {
  const idx = indexMenu(catalogMenu);
  const ids = (list: MenuProduct[]) => list.map((p) => p.id);

  it('búsqueda sin acentos por nombre, descripción, categoría y etiquetas; agotados al final', () => {
    expect(normalize('  Champiñón ÉXITO ')).toBe('champinon exito');
    expect(ids(searchProducts(idx, 'champinon'))).toEqual(['b3']);
    expect(ids(searchProducts(idx, 'tomate'))).toEqual(['b1']);
    expect(ids(searchProducts(idx, 'raciones'))).toEqual(['s1', 's2', 's3', 's4']);
    expect(ids(searchProducts(idx, 'especial'))).toEqual(['b2']);
    expect(searchProducts(idx, 'queso')[0]!.id).not.toBe('b3');
    expect(ids(searchProducts(idx, 'queso')).at(-1)).toBe('b3');
    expect(searchProducts(idx, '   ')).toEqual([]);
    expect(searchProducts(idx, 'sushi')).toEqual([]);
  });

  it('ahorro solo cuando el precio anterior es mayor', () => {
    expect(savingsCents(catalogMenu.products[3]!)).toBe(200);
    expect(savingsCents(catalogMenu.products[6]!)).toBeNull(); // mismo precio
    expect(savingsCents(catalogMenu.products[0]!)).toBeNull(); // sin precio anterior
  });

  it('ofertas y favoritos salen de datos del restaurante, no de estadísticas', () => {
    expect(ids(offers(idx))).toEqual(['combo']);
    expect(ids(favorites(idx))).toEqual(['b1', 'b2']);
  });

  it('combo sugerido solo si existe y está disponible', () => {
    expect(comboFor(idx, catalogMenu.products[0]!)?.id).toBe('combo');
    expect(comboFor(idx, catalogMenu.products[1]!)).toBeNull();
    const agotado = indexMenu({ ...catalogMenu, products: catalogMenu.products.map((p) => (p.id === 'combo' ? { ...p, available: false } : p)) });
    expect(comboFor(agotado, catalogMenu.products[0]!)).toBeNull();
  });

  it('sugerencias: máximo 3, fuera del pedido y de otra categoría', () => {
    expect(ids(suggestions(idx, new Set(), catalogMenu.products[0]))).toEqual(['s1', 's2', 's3']);
    expect(ids(suggestions(idx, new Set(['s1', 's2'])))).toEqual(['s3', 's4']);
    expect(suggestions(idx, new Set(), catalogMenu.products[4])).toEqual([]); // ya es una ración
  });

  it('¿No sabes qué pedir?: por antojo (sin agotados) y económico por precio', () => {
    expect(ids(cravingMatches(idx, 'queso'))).toEqual(['b2']);
    expect(cravingMatches(idx, 'picante')).toEqual([]);
    // 7 disponibles → el tercio más barato son 3: 4.50, 5, 5
    expect(economicCeilingCents(idx)).toBe(500);
    expect(ids(cravingMatches(idx, 'economico'))).toEqual(['s1', 's3', 's4']);
  });
});
