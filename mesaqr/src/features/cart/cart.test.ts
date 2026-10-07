import { beforeEach, describe, expect, it } from 'vitest';
import { useCart } from './cartStore';
import { cartTotals, lineKey } from './cartMath';

const queso = { id: 'o-queso', name: 'Extra queso', groupName: 'Extras', deltaCents: 100 };
const tocineta = { id: 'o-toci', name: 'Extra tocineta', groupName: 'Extras', deltaCents: 150 };
const sinCebolla = { id: 'o-cebolla', name: 'Sin cebolla', groupName: 'Quitar', deltaCents: 0 };
const especial = { productId: 'p-esp', name: 'Hamburguesa Especial', baseCents: 700 };
const coca = { productId: 'p-coca', name: 'Coca-Cola', baseCents: 150 };

const s = () => useCart.getState();

beforeEach(() => {
  sessionStorage.clear();
  useCart.setState({ token: null, lines: [], notes: '' });
  s().bindToken('mesa7token');
});

describe('Carrito', () => {
  it('agrega productos y calcula el total', () => {
    s().add({ ...especial, options: [queso], quantity: 2 });
    s().add({ ...coca, options: [], quantity: 1 });
    const t = cartTotals(s().lines);
    expect(t.subtotalCents).toBe(2 * 700 + 150);
    expect(t.extrasCents).toBe(2 * 100);
    expect(t.totalCents).toBe(1750);
    expect(t.count).toBe(3);
  });

  it('misma combinación se suma en una línea (sin importar el orden de opciones)', () => {
    s().add({ ...especial, options: [queso, sinCebolla], quantity: 1 });
    s().add({ ...especial, options: [sinCebolla, queso], quantity: 1 });
    expect(s().lines).toHaveLength(1);
    expect(s().lines[0]!.quantity).toBe(2);
  });

  it('distinta personalización = otra línea', () => {
    s().add({ ...especial, options: [queso], quantity: 1 });
    s().add({ ...especial, options: [tocineta], quantity: 1 });
    expect(s().lines).toHaveLength(2);
  });

  it('cambia cantidad dentro de 1..20 y elimina', () => {
    s().add({ ...coca, options: [], quantity: 1 });
    const key = s().lines[0]!.key;
    s().setQty(key, 50);
    expect(s().lines[0]!.quantity).toBe(20);
    s().setQty(key, 0);
    expect(s().lines[0]!.quantity).toBe(1);
    s().remove(key);
    expect(s().lines).toHaveLength(0);
  });

  it('editar personalización reemplaza la línea en su lugar', () => {
    s().add({ ...coca, options: [], quantity: 1 });
    s().add({ ...especial, options: [queso], quantity: 1 });
    s().add({ ...especial, options: [], quantity: 1 });
    const key = lineKey(especial.productId, [queso.id]);
    s().replace(key, { ...especial, options: [tocineta], quantity: 3 });
    expect(s().lines.map((l) => l.key)).toEqual([lineKey('p-coca', []), lineKey('p-esp', ['o-toci']), lineKey('p-esp', [])]);
    expect(cartTotals(s().lines).totalCents).toBe(150 + 3 * 850 + 700);
  });

  it('editar hacia una combinación existente las fusiona', () => {
    s().add({ ...especial, options: [queso], quantity: 1 });
    s().add({ ...especial, options: [], quantity: 2 });
    s().replace(lineKey('p-esp', ['o-queso']), { ...especial, options: [], quantity: 1 });
    expect(s().lines).toHaveLength(1);
    expect(s().lines[0]!.quantity).toBe(3);
  });

  it('producto agotado: purge quita la línea y devuelve el nombre', () => {
    s().add({ ...especial, options: [queso], quantity: 1 });
    s().add({ ...coca, options: [], quantity: 1 });
    expect(s().purge(new Set(['p-coca']))).toEqual(['Coca-Cola']);
    expect(s().lines).toHaveLength(1);
  });

  it('opción agotada también quita la línea', () => {
    s().add({ ...especial, options: [queso], quantity: 1 });
    expect(s().purge(new Set(['o-queso']))).toEqual(['Hamburguesa Especial']);
  });

  it('observaciones limitadas a 280 caracteres', () => {
    s().setNotes('x'.repeat(400));
    expect(s().notes).toHaveLength(280);
  });

  it('otra mesa = carrito nuevo; misma mesa conserva el carrito', () => {
    s().add({ ...coca, options: [], quantity: 1 });
    s().bindToken('mesa7token');
    expect(s().lines).toHaveLength(1);
    s().bindToken('otramesa99');
    expect(s().lines).toHaveLength(0);
  });

  it('persiste en sessionStorage', () => {
    s().add({ ...coca, options: [], quantity: 2 });
    const saved = JSON.parse(sessionStorage.getItem('mesaqr-cart')!);
    expect(saved.state.lines[0].quantity).toBe(2);
  });
});
