import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetTable, isValidTokenFormat, loadTable, saveTable } from './tableSession';
import { groupRule, groupsFor, indexMenu, needsChoice, unavailableIn } from './menuIndex';
import type { Menu } from '@/shared/types/menu';

describe('QR / mesa en sesión', () => {
  beforeEach(() => localStorage.clear());

  it('acepta solo tokens con formato válido', () => {
    expect(isValidTokenFormat('a1b2c3d4e5')).toBe(true);
    for (const bad of ['7', '999', 'ABCDEFGHIJ', 'a1b2c3d4e5; drop', '', null, undefined]) {
      expect(isValidTokenFormat(bad)).toBe(false);
    }
  });

  it('recuerda la mesa y caduca a las 4 horas', () => {
    vi.useFakeTimers();
    saveTable('a1b2c3d4e5');
    expect(loadTable()).toBe('a1b2c3d4e5');
    vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1);
    expect(loadTable()).toBeNull();
    vi.useRealTimers();
  });

  it('ignora un valor manipulado en el almacenamiento', () => {
    localStorage.setItem('mesaqr-table', JSON.stringify({ token: '../../x', at: Date.now() }));
    expect(loadTable()).toBeNull();
    saveTable('a1b2c3d4e5');
    forgetTable();
    expect(loadTable()).toBeNull();
  });
});

const menu: Menu = {
  business: { id: 'b', name: 'X', description: null, logo_url: null, address: null, phone: null, whatsapp: '+584121234567', instagram: null, show_bs: true, exchange_rate: 100, primary_color: '#D62828' },
  table: { number: 7, label: null },
  categories: [{ id: 'c1', name: 'Bebidas', emoji: null, image_url: null }],
  products: [
    { id: 'p1', category_id: 'c1', type: 'simple', name: 'Pepsi', description: null, image_url: null, price_usd: 1.5, available: true, featured: false, upsell: false, group_ids: ['g1', 'g-empty'], combo_items: [] },
    { id: 'p2', category_id: 'c1', type: 'simple', name: 'Agua', description: null, image_url: null, price_usd: 1, available: false, featured: false, upsell: false, group_ids: [], combo_items: [] },
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
