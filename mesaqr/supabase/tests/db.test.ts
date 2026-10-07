// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, errorOf } from './harness';

let db: PGlite;
let businessId: string;
const SLUG = 'lorenz-express';
const ADMIN = '11111111-1111-4111-8111-111111111111';
const INTRUDER = '22222222-2222-4222-8222-222222222222';

type Menu = {
  business: { name: string; whatsapp: string; exchange_rate: number; payment_methods: string[]; order_types: string[] };
  categories: { id: string; name: string }[];
  products: { id: string; name: string; available: boolean; price_usd: number; image_url: string; group_ids: string[] }[];
  option_groups: { id: string; name: string; options: { id: string; name: string; price_delta_usd: number }[] }[];
};

const PICKUP = { name: 'Ana', type: 'pickup', payment: 'Pago móvil' };

async function menu(slug = SLUG): Promise<Menu> {
  const rows = await as<{ m: Menu }>(db, 'anon', 'select public.get_public_menu($1) as m', [slug]);
  return rows[0]!.m;
}
function order(items: unknown, customer: unknown = PICKUP, notes: string | null = null, slug = SLUG) {
  return as<{ o: Record<string, unknown> }>(db, 'anon', 'select public.create_public_order($1, $2::jsonb, $3::jsonb, $4) as o', [
    slug,
    JSON.stringify(items),
    JSON.stringify(customer),
    notes,
  ]).then((r) => r[0]!.o);
}
const product = (m: Menu, name: string) => m.products.find((p) => p.name === name)!;
/** Opción por nombre dentro de los grupos que aplican a ese producto. */
const option = (m: Menu, productName: string, name: string) =>
  m.option_groups.filter((g) => product(m, productName).group_ids.includes(g.id)).flatMap((g) => g.options).find((o) => o.name === name)!;

beforeAll(async () => {
  db = await createDb();
  businessId = (await db.query<{ id: string }>(`select id from public.businesses where slug = $1`, [SLUG])).rows[0]!.id;
  await db.query(`insert into auth.users (id, email) values ($1, 'admin@demo.test'), ($2, 'otro@demo.test')`, [ADMIN, INTRUDER]);
  await db.query(`insert into public.business_members (business_id, user_id, role) values ($1, $2, 'owner')`, [businessId, ADMIN]);
  await db.query(`update public.products set available = false where name = 'Granjero 35 cm'`);
});

describe('Menú por enlace', () => {
  it('devuelve el menú real completo con fotos, pagos y tipos de pedido', async () => {
    const m = await menu();
    expect(m.business.name).toBe('Lorenz Express');
    expect(m.business.whatsapp).toBe('+584243230113');
    expect(Number(m.business.exchange_rate)).toBe(900);
    expect(m.business.payment_methods).toContain('Pago móvil');
    expect(m.business.order_types).toEqual(['pickup', 'delivery', 'dine_in']);
    expect(m.categories.map((c) => c.name)).toEqual([
      'Hamburguesas', 'Pepitos', 'Terneritos', 'Polacos', 'Salchipapas', 'Shawarmas',
      'Club House', 'Granjeros', 'Ensaladas', 'Raciones', 'Menú Kids',
    ]);
    expect(m.products).toHaveLength(32);
    expect(m.products.every((p) => p.image_url.startsWith('https://images.unsplash.com/'))).toBe(true);
    expect(product(m, 'Hamburguesa con Queso').group_ids).toHaveLength(2);
    expect(product(m, 'Shawarma Clásico').group_ids).toHaveLength(2);
    expect(product(m, 'Shawarma de la Casa (Falafel)').group_ids).toHaveLength(1);
  });

  it('negocio inexistente o identificador manipulado → BUSINESS_NOT_FOUND', async () => {
    for (const bad of ['no-existe', 'LORENZ', "x' or 1=1 --", '', 'a']) {
      expect((await errorOf(menu(bad))).message).toBe('BUSINESS_NOT_FOUND');
    }
  });

  it('las funciones por mesa ya no son accesibles para el público', async () => {
    expect((await errorOf(as(db, 'anon', `select public.get_menu('abcdefghij')`))).message).toMatch(/permission denied/);
  });
});

describe('Seguridad del público (anon)', () => {
  it('no puede leer ninguna tabla', async () => {
    for (const table of ['businesses', 'products', 'orders', 'business_members', 'options']) {
      expect((await errorOf(as(db, 'anon', `select * from public.${table}`))).message).toMatch(/permission denied/);
    }
  });
  it('no puede modificar precios ni ejecutar funciones internas', async () => {
    expect((await errorOf(as(db, 'anon', 'update public.products set price_usd = 0'))).message).toMatch(/permission denied/);
    expect((await errorOf(as(db, 'anon', `select public.product_group_ids(gen_random_uuid(), gen_random_uuid())`))).message).toMatch(
      /permission denied/,
    );
  });
});

describe('Pedido', () => {
  it('crea el pedido, recalcula precios en el servidor y guarda los datos del cliente', async () => {
    const m = await menu();
    const burger = 'Hamburguesa con Queso';
    const o = await order(
      [
        { product_id: product(m, burger).id, quantity: 2, option_ids: [option(m, burger, 'Pollo crispy').id, option(m, burger, 'Sin cebolla').id] },
        { product_id: product(m, 'Papas Fritas + 2 Salsas').id, quantity: 1, price_usd: 0.01 },
        { product_id: product(m, 'Pepito Clásico').id, quantity: 1, option_ids: [option(m, 'Pepito Clásico', 'Mixto').id] },
      ],
      { name: '  María Pérez ', phone: '0414 555 1234', type: 'delivery', address: 'Urb. La Esmeralda, calle 3, casa 12', payment: 'Pago móvil' },
      '  Una hamburguesa sin cebolla.  ',
    );
    expect(o.code).toBe('0001');
    // base: 2×8 + 4.5 + 15 = 35.5 ; extras: 2×2.5 + 2 = 7
    expect(Number(o.subtotal_usd)).toBe(35.5);
    expect(Number(o.extras_usd)).toBe(7);
    expect(Number(o.total_usd)).toBe(42.5);
    expect(Number(o.total_bs)).toBe(38250);
    expect(o.notes).toBe('Una hamburguesa sin cebolla.');
    expect(o.customer).toEqual({
      name: 'María Pérez', phone: '0414 555 1234', type: 'delivery', address: 'Urb. La Esmeralda, calle 3, casa 12', payment: 'Pago móvil',
    });
    const saved = await db.query<{ customer_name: string; order_type: string; n: number }>(
      `select o.customer_name, o.order_type,
              (select count(*)::int from public.order_items i join public.order_item_options x on x.order_item_id = i.id where i.order_id = o.id) as n
       from public.orders o where o.code = '0001'`,
    );
    expect(saved.rows[0]).toEqual({ customer_name: 'María Pérez', order_type: 'delivery', n: 3 });
  });

  it('numeración consecutiva; la dirección solo se guarda en delivery', async () => {
    const m = await menu();
    const o = await order(
      [{ product_id: product(m, 'Ternerito Clásico').id, quantity: 1, option_ids: [option(m, 'Ternerito Clásico', 'Mixto').id] }],
      { ...PICKUP, address: 'no aplica' },
    );
    expect(o.code).toBe('0002');
    expect(Number(o.total_usd)).toBe(5);
    expect((o.customer as { address: unknown }).address).toBeNull();
  });

  it('datos del cliente inválidos → INVALID_CUSTOMER', async () => {
    const m = await menu();
    const item = [{ product_id: product(m, 'Polaco Clásico').id, quantity: 1 }];
    const bad: unknown[] = [
      null,
      {},
      { ...PICKUP, name: '   ' },
      { ...PICKUP, name: 'x'.repeat(61) },
      { ...PICKUP, type: 'otro' },
      { ...PICKUP, type: 'delivery' }, // sin dirección
      { ...PICKUP, payment: 'Bitcoin' }, // no aceptado por el negocio
      { ...PICKUP, payment: undefined },
      { ...PICKUP, phone: 'llámame' },
    ];
    for (const c of bad) expect((await errorOf(order(item, c))).message).toBe('INVALID_CUSTOMER');
  });

  it('el negocio decide qué tipos de pedido acepta', async () => {
    const m = await menu();
    await db.query(`update public.businesses set delivery_enabled = false where slug = $1`, [SLUG]);
    expect((await menu()).business.order_types).toEqual(['pickup', 'dine_in']);
    const item = [{ product_id: product(m, 'Polaco Clásico').id, quantity: 1 }];
    expect((await errorOf(order(item, { ...PICKUP, type: 'delivery', address: 'Calle 1, casa 2' }))).message).toBe('INVALID_CUSTOMER');
    await db.query(`update public.businesses set delivery_enabled = true where slug = $1`, [SLUG]);
  });

  it('producto agotado → ITEMS_UNAVAILABLE con su id', async () => {
    const m = await menu();
    const agotado = product(m, 'Granjero 35 cm');
    expect(agotado.available).toBe(false);
    const e = await errorOf(order([{ product_id: agotado.id, quantity: 1 }]));
    expect(e.message).toBe('ITEMS_UNAVAILABLE');
    expect(e.detail).toContain(agotado.id);
  });

  it('opción de otro producto o grupo obligatorio vacío → INVALID_CART', async () => {
    const m = await menu();
    const pepito = product(m, 'Pepito Clásico');
    expect((await errorOf(order([{ product_id: pepito.id, quantity: 1, option_ids: [option(m, 'Hamburguesa Clásica', 'Pollo crispy').id] }]))).message).toBe('INVALID_CART');
    expect((await errorOf(order([{ product_id: pepito.id, quantity: 1 }]))).message).toBe('INVALID_CART');
    expect((await errorOf(order([{ product_id: pepito.id, quantity: 1, option_ids: [option(m, 'Pepito Clásico', 'Carne').id, option(m, 'Pepito Clásico', 'Pollo').id] }]))).message).toBe('INVALID_CART');
  });

  it('carritos malformados → INVALID_CART', async () => {
    const m = await menu();
    const id = product(m, 'Polaco Clásico').id;
    const bad: unknown[] = [
      [],
      {},
      [{ product_id: id, quantity: 0 }],
      [{ product_id: id, quantity: 21 }],
      [{ product_id: id, quantity: 1.5 }],
      [{ product_id: id, quantity: '2' }],
      [{ product_id: 'no-es-uuid', quantity: 1 }],
      Array.from({ length: 31 }, () => ({ product_id: id, quantity: 1 })),
    ];
    for (const items of bad) expect((await errorOf(order(items))).message).toBe('INVALID_CART');
    expect((await errorOf(order([{ product_id: id, quantity: 1 }], PICKUP, 'x'.repeat(281)))).message).toBe('INVALID_CART');
  });

  it('producto de otro negocio no se puede pedir', async () => {
    const other = await db.query<{ id: string }>(`
      with b as (insert into public.businesses (slug, name, whatsapp) values ('otro', 'Otro', '+584140000000') returning id),
      c as (insert into public.categories (business_id, name) select id, 'X' from b returning id, business_id)
      insert into public.products (business_id, category_id, name, price_usd) select business_id, id, 'Ajeno', 1 from c returning id`);
    expect((await errorOf(order([{ product_id: other.rows[0]!.id, quantity: 1 }]))).message).toBe('ITEMS_UNAVAILABLE');
  });

  it('límite de abuso por negocio → RATE_LIMITED', async () => {
    const m = await menu();
    const item = [{ product_id: product(m, 'Papas Fritas + 2 Salsas').id, quantity: 1 }];
    let last: { message: string } | null = null;
    for (let i = 0; i < 25 && !last; i++) {
      try {
        await order(item);
      } catch (e) {
        last = e as { message: string };
      }
    }
    expect(last?.message).toBe('RATE_LIMITED');
  });
});

describe('Administración (RLS)', () => {
  it('el admin ve y edita su negocio; el cambio llega al menú público', async () => {
    const rows = await as(db, 'authenticated', `update public.products set price_usd = 7.25 where name = 'Hamburguesa con Queso' returning price_usd`, [], ADMIN);
    expect(rows).toHaveLength(1);
    expect(Number(product(await menu(), 'Hamburguesa con Queso').price_usd)).toBe(7.25);
  });

  it('el admin cambia tasa y formas de pago', async () => {
    const r = await as<{ exchange_rate: string; payment_methods: string[] }>(db, 'authenticated',
      `update public.businesses set exchange_rate = 950, payment_methods = array['Efectivo (USD)', 'Pago móvil'] where slug = '${SLUG}' returning exchange_rate, payment_methods`, [], ADMIN);
    expect(Number(r[0]!.exchange_rate)).toBe(950);
    expect(r[0]!.payment_methods).toEqual(['Efectivo (USD)', 'Pago móvil']);
  });

  it('el admin NO puede alterar el contador ni los totales de pedidos', async () => {
    expect((await errorOf(as(db, 'authenticated', `update public.businesses set next_order_number = 1`, [], ADMIN))).message).toMatch(/permission denied/);
    expect((await errorOf(as(db, 'authenticated', `update public.orders set total_usd = 0`, [], ADMIN))).message).toMatch(/permission denied/);
    expect(await as(db, 'authenticated', `update public.orders set status = 'confirmed' where code = '0001' returning status`, [], ADMIN)).toHaveLength(1);
  });

  it('un usuario sin membresía no ve nada ni puede editar', async () => {
    expect(await as(db, 'authenticated', 'select * from public.products', [], INTRUDER)).toHaveLength(0);
    expect(await as(db, 'authenticated', 'select * from public.orders', [], INTRUDER)).toHaveLength(0);
    expect(await as(db, 'authenticated', `update public.products set price_usd = 0 returning id`, [], INTRUDER)).toHaveLength(0);
  });

  it('no se puede asignar a una categoría de otro negocio', async () => {
    const other = await db.query<{ id: string }>(`select c.id from public.categories c join public.businesses b on b.id = c.business_id where b.slug = 'otro'`);
    const e = await errorOf(as(db, 'authenticated',
      `insert into public.products (business_id, category_id, name, price_usd) values ($1, $2, 'X', 1)`, [businessId, other.rows[0]!.id], ADMIN));
    expect(e.message).toMatch(/foreign key/);
  });
});
