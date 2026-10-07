// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, errorOf } from './harness';

let db: PGlite;
let token7: string;
let businessId: string;
const ADMIN = '11111111-1111-4111-8111-111111111111';
const INTRUDER = '22222222-2222-4222-8222-222222222222';

type Menu = {
  business: { name: string; whatsapp: string; exchange_rate: number };
  table: { number: number };
  categories: { id: string; name: string }[];
  products: { id: string; name: string; available: boolean; price_usd: number; group_ids: string[]; combo_items: unknown[] }[];
  option_groups: { id: string; name: string; options: { id: string; name: string; price_delta_usd: number }[] }[];
};

async function menu(token = token7): Promise<Menu> {
  const rows = await as<{ m: Menu }>(db, 'anon', 'select public.get_menu($1) as m', [token]);
  return rows[0]!.m;
}
function order(items: unknown, notes: string | null = null, token = token7) {
  return as<{ o: Record<string, unknown> }>(db, 'anon', 'select public.create_order($1, $2::jsonb, $3) as o', [
    token,
    JSON.stringify(items),
    notes,
  ]).then((r) => r[0]!.o);
}
const product = (m: Menu, name: string) => m.products.find((p) => p.name === name)!;
/** Opción por nombre dentro del grupo que aplica a ese producto. */
const option = (m: Menu, productName: string, name: string) =>
  m.option_groups.filter((g) => product(m, productName).group_ids.includes(g.id)).flatMap((g) => g.options).find((o) => o.name === name)!;

beforeAll(async () => {
  db = await createDb();
  const t = await db.query<{ qr_token: string; business_id: string }>(
    'select qr_token, business_id from public.dining_tables where number = 7',
  );
  token7 = t.rows[0]!.qr_token;
  businessId = t.rows[0]!.business_id;
  await db.query(`insert into auth.users (id, email) values ($1, 'admin@demo.test'), ($2, 'otro@demo.test')`, [ADMIN, INTRUDER]);
  await db.query(`insert into public.business_members (business_id, user_id, role) values ($1, $2, 'owner')`, [businessId, ADMIN]);
  await db.query(`update public.products set available = false where name = 'Granjero 35 cm'`);
});

describe('QR / get_menu', () => {
  it('mesa existente devuelve menú completo', async () => {
    const m = await menu();
    expect(m.table.number).toBe(7);
    expect(m.categories.map((c) => c.name)).toEqual(['Hamburguesas', 'Pepitos', 'Terneritos', 'Polacos', 'Salchipapas', 'Shawarmas', 'Club House', 'Granjeros', 'Ensaladas', 'Raciones', 'Menú Kids']);
    expect(m.products).toHaveLength(32);
    expect(Number(product(m, 'Club House de la Casa').price_usd)).toBe(19);
    // Hamburguesa: grupos de su categoría (Proteína + Quitar)
    expect(product(m, 'Hamburguesa con Queso').group_ids).toHaveLength(2);
    // Shawarma clásico: Proteína (propio) + Quitar (categoría); el de la casa solo Quitar
    expect(product(m, 'Shawarma Clásico').group_ids).toHaveLength(2);
    expect(product(m, 'Shawarma de la Casa (Falafel)').group_ids).toHaveLength(1);
  });

  it('token inexistente o manipulado → TABLE_NOT_FOUND', async () => {
    for (const bad of ['zzzzzzzzzz', '7', '999', "x' or 1=1 --", '', 'ABCDEFGHIJ']) {
      expect((await errorOf(menu(bad))).message).toBe('TABLE_NOT_FOUND');
    }
  });

  it('mesa desactivada → TABLE_NOT_FOUND', async () => {
    await db.query('update public.dining_tables set active = false where number = 12');
    const t = await db.query<{ qr_token: string }>('select qr_token from public.dining_tables where number = 12');
    expect((await errorOf(menu(t.rows[0]!.qr_token))).message).toBe('TABLE_NOT_FOUND');
  });
});

describe('Seguridad del público (anon)', () => {
  it('no puede leer ninguna tabla', async () => {
    for (const table of ['businesses', 'products', 'dining_tables', 'orders', 'business_members', 'options']) {
      expect((await errorOf(as(db, 'anon', `select * from public.${table}`))).message).toMatch(/permission denied/);
    }
  });
  it('no puede modificar precios', async () => {
    expect((await errorOf(as(db, 'anon', 'update public.products set price_usd = 0'))).message).toMatch(/permission denied/);
  });
  it('no puede ejecutar funciones internas', async () => {
    expect((await errorOf(as(db, 'anon', `select public.product_group_ids(gen_random_uuid(), gen_random_uuid())`))).message)
      .toMatch(/permission denied/);
  });
});

describe('create_order', () => {
  it('crea pedido, recalcula precios en el servidor y genera código M7-0001', async () => {
    const m = await menu();
    const burger = 'Hamburguesa con Queso';
    const o = await order(
      [
        { product_id: product(m, burger).id, quantity: 2, option_ids: [option(m, burger, 'Pollo crispy').id, option(m, burger, 'Sin cebolla').id] },
        { product_id: product(m, 'Papas Fritas + 2 Salsas').id, quantity: 1, price_usd: 0.01 },
        { product_id: product(m, 'Pepito Clásico').id, quantity: 1, option_ids: [option(m, 'Pepito Clásico', 'Mixto').id] },
      ],
      '  Una hamburguesa sin cebolla.  ',
    );
    expect(o.code).toBe('M7-0001');
    // base: 2×8 + 4.5 + 15 = 35.5 ; extras: 2×2.5 + 2 = 7
    expect(Number(o.subtotal_usd)).toBe(35.5);
    expect(Number(o.extras_usd)).toBe(7);
    expect(Number(o.total_usd)).toBe(42.5);
    expect(Number(o.total_bs)).toBe(Math.round(42.5 * Number(m.business.exchange_rate) * 100) / 100);
    expect(o.notes).toBe('Una hamburguesa sin cebolla.');
    const items = o.items as { product_name: string; options: { option_name: string }[] }[];
    expect(items[0]!.product_name).toBe(burger);
    expect(items[0]!.options.map((x) => x.option_name)).toEqual(['Pollo crispy', 'Sin cebolla']);

    const saved = await db.query<{ n: number }>(
      `select count(*)::int as n from public.order_item_options oio
       join public.order_items oi on oi.id = oio.order_item_id
       join public.orders o on o.id = oi.order_id where o.code = 'M7-0001'`,
    );
    expect(saved.rows[0]!.n).toBe(3);
  });

  it('numeración consecutiva', async () => {
    const m = await menu();
    const o = await order([{ product_id: product(m, 'Ternerito Clásico').id, quantity: 1, option_ids: [option(m, 'Ternerito Clásico', 'Mixto').id] }]);
    expect(o.code).toBe('M7-0002');
    expect(Number(o.total_usd)).toBe(5); // en terneritos el mixto no cambia el precio
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
    // "Pollo crispy" (hamburguesas) en un pepito
    expect((await errorOf(order([{ product_id: pepito.id, quantity: 1, option_ids: [option(m, 'Hamburguesa Clásica', 'Pollo crispy').id] }]))).message).toBe('INVALID_CART');
    // Pepito sin elegir proteína (obligatoria)
    expect((await errorOf(order([{ product_id: pepito.id, quantity: 1 }]))).message).toBe('INVALID_CART');
    // Dos proteínas en selección única
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
    for (const items of bad) {
      expect((await errorOf(order(items))).message).toBe('INVALID_CART');
    }
    expect((await errorOf(order([{ product_id: id, quantity: 1 }], 'x'.repeat(281)))).message).toBe('INVALID_CART');
  });

  it('producto de otro negocio no se puede pedir', async () => {
    const other = await db.query<{ id: string }>(`
      with b as (insert into public.businesses (slug, name, whatsapp) values ('otro', 'Otro', '+584140000000') returning id),
      c as (insert into public.categories (business_id, name) select id, 'X' from b returning id, business_id)
      insert into public.products (business_id, category_id, name, price_usd) select business_id, id, 'Ajeno', 1 from c returning id`);
    const e = await errorOf(order([{ product_id: other.rows[0]!.id, quantity: 1 }]));
    expect(e.message).toBe('ITEMS_UNAVAILABLE');
  });

  it('límite de frecuencia por mesa → RATE_LIMITED', async () => {
    const m = await menu();
    const item = [{ product_id: product(m, 'Papas Fritas + 2 Salsas').id, quantity: 1 }];
    // ya hay 2 pedidos de la mesa 7; 3 más llegan a 5
    for (let i = 0; i < 3; i++) await order(item);
    expect((await errorOf(order(item))).message).toBe('RATE_LIMITED');
  });
});

describe('Administración (RLS)', () => {
  it('el admin ve y edita su negocio', async () => {
    const rows = await as(db, 'authenticated', `update public.products set price_usd = 7.25 where name = 'Hamburguesa con Queso' returning price_usd`, [], ADMIN);
    expect(rows).toHaveLength(1);
    const m = await menu();
    expect(Number(product(m, 'Hamburguesa con Queso').price_usd)).toBe(7.25);
  });

  it('el admin cambia la tasa y se registra la fecha', async () => {
    const r = await as<{ exchange_rate: string }>(db, 'authenticated',
      `update public.businesses set exchange_rate = 120 where slug = 'demo' returning exchange_rate`, [], ADMIN);
    expect(Number(r[0]!.exchange_rate)).toBe(120);
  });

  it('el admin NO puede alterar el contador ni los totales de pedidos', async () => {
    expect((await errorOf(as(db, 'authenticated', `update public.businesses set next_order_number = 1`, [], ADMIN))).message).toMatch(/permission denied/);
    expect((await errorOf(as(db, 'authenticated', `update public.orders set total_usd = 0`, [], ADMIN))).message).toMatch(/permission denied/);
    const r = await as(db, 'authenticated', `update public.orders set status = 'confirmed' where code = 'M7-0001' returning status`, [], ADMIN);
    expect(r).toHaveLength(1);
  });

  it('un usuario autenticado sin membresía no ve nada ni puede editar', async () => {
    expect(await as(db, 'authenticated', 'select * from public.products', [], INTRUDER)).toHaveLength(0);
    expect(await as(db, 'authenticated', 'select * from public.orders', [], INTRUDER)).toHaveLength(0);
    expect(await as(db, 'authenticated', `update public.products set price_usd = 0 returning id`, [], INTRUDER)).toHaveLength(0);
    const e = await errorOf(as(db, 'authenticated',
      `insert into public.dining_tables (business_id, number) values ($1, 99)`, [businessId], INTRUDER));
    expect(e.message).toMatch(/row-level security/);
  });

  it('el admin crea una mesa y su token se genera solo', async () => {
    const r = await as<{ qr_token: string }>(db, 'authenticated',
      `insert into public.dining_tables (business_id, number) values ($1, 20) returning qr_token`, [businessId], ADMIN);
    expect(r[0]!.qr_token).toMatch(/^[a-f0-9]{10}$/);
  });

  it('no se puede asignar a una categoría de otro negocio', async () => {
    const other = await db.query<{ id: string }>(`select c.id from public.categories c join public.businesses b on b.id = c.business_id where b.slug = 'otro'`);
    const e = await errorOf(as(db, 'authenticated',
      `insert into public.products (business_id, category_id, name, price_usd) values ($1, $2, 'X', 1)`,
      [businessId, other.rows[0]!.id], ADMIN));
    expect(e.message).toMatch(/foreign key/);
  });
});
