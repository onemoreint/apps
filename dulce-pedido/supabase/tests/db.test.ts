// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, errorOf } from './harness';
import { fechasDisponibles, sumarDias, diaSemana } from '../../src/core/fechas';
import type { Catalogo } from '../../src/core/tipos';

let db: PGlite;
let tiendaId: string;
let otraId: string;
const SLUG = 'dulce-pedido-demo';
const DUENA = '11111111-1111-4111-8111-111111111111';
const INTRUSA = '22222222-2222-4222-8222-222222222222';
const INVITADA = '33333333-3333-4333-8333-333333333333';
const SIN_VERIFICAR = '44444444-4444-4444-8444-444444444444';

async function catalogo(slug = SLUG): Promise<Catalogo> {
  const r = await as<{ c: Catalogo }>(db, 'anon', 'select public.dp_tienda_publica($1) as c', [slug]);
  return r[0]!.c;
}
const prod = (c: Catalogo, nombre: string) => c.productos.find((p) => p.nombre === nombre)!;

function crear(pedido: unknown, slug = SLUG) {
  return as<{ r: Record<string, unknown> }>(db, 'anon', 'select public.dp_crear_pedido($1, $2::jsonb) as r', [
    slug,
    JSON.stringify(pedido),
  ]).then((x) => x[0]!.r);
}

let c: Catalogo;
let fechaTorta: string;
let telefono = 3001000000;

function pedidoBase(extra: Record<string, unknown> = {}) {
  const brownie = prod(c, 'Brownie artesanal');
  return {
    items: [{ producto_id: brownie.id, variante_id: null, sabores: ['Nutella'], cantidad: 6 }],
    cliente: { nombre: 'Ana Gómez', telefono: String(telefono++) },
    entrega: { fecha: fechaTorta, franja: c.tienda.franjas[0], modalidad: 'recogida', zona_id: '', direccion: '', barrio: '' },
    observaciones: '',
    acepta_datos: true,
    ...extra,
  };
}

beforeAll(async () => {
  db = await createDb();
  tiendaId = (await db.query<{ id: string }>(`select id from public.dp_tiendas where slug = $1`, [SLUG])).rows[0]!.id;
  otraId = (
    await db.query<{ id: string }>(`insert into public.dp_tiendas (slug, nombre) values ('otra-tienda', 'Otra') returning id`)
  ).rows[0]!.id;
  await db.query(`insert into public.dp_categorias (tienda_id, nombre) values ($1, 'Secreta')`, [otraId]);
  await db.query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'duena@demo.test', now()), ($2, 'intrusa@demo.test', now()),
      ($3, 'invitada@demo.test', now()), ($4, 'pendiente@demo.test', null)`,
    [DUENA, INTRUSA, INVITADA, SIN_VERIFICAR],
  );
  await db.query(`insert into public.dp_miembros (tienda_id, user_id, rol) values ($1, $2, 'propietaria'), ($3, $4, 'propietaria')`, [
    tiendaId,
    DUENA,
    otraId,
    INTRUSA,
  ]);
  c = await catalogo();
  fechaTorta = fechasDisponibles({
    ahora: c.ahora,
    horasPreparacion: 48,
    diasAtencion: c.tienda.dias_atencion,
    diasMaxAnticipacion: c.tienda.dias_max_anticipacion,
    bloqueadas: c.fechas_bloqueadas,
  })[0]!;
});

describe('Catálogo público', () => {
  it('devuelve tienda, categorías con productos, variantes, zonas y hora local', () => {
    expect(c.tienda.nombre).toBe('Dulce Pedido');
    expect(c.tienda.demo).toBe(true);
    expect(c.tienda.whatsapp).toMatch(/^\+57\d{10}$/);
    expect(c.categorias.map((x) => x.nombre)).toEqual([
      'Tortas', 'Postres individuales', 'Brownies', 'Galletas', 'Cupcakes', 'Postres fríos',
      'Dulces tradicionales', 'Combos y cajas de regalo', 'Productos personalizados',
    ]);
    expect(prod(c, 'Torta de chocolate').variantes.map((v) => v.precio)).toEqual([65000, 115000, 210000]);
    expect(prod(c, 'Galletas de avena y pasas').disponible).toBe(false);
    expect(c.zonas.find((z) => z.nombre.startsWith('Otra'))!.tarifa).toBeNull();
    expect(c.ahora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
  it('no expone datos internos ni de otras tiendas', () => {
    const texto = JSON.stringify(c);
    expect(texto).not.toContain('consecutivo');
    expect(texto).not.toContain('limite_pedidos_hora');
    expect(texto).not.toContain('Secreta');
  });
  it('oculta productos inactivos y categorías vacías; tienda inexistente o inactiva = null', async () => {
    await db.query(`update public.dp_productos set activo = false where nombre = 'Arequipe casero'`);
    const c2 = await catalogo();
    expect(c2.productos.some((p) => p.nombre === 'Arequipe casero')).toBe(false);
    expect(c2.categorias.some((x) => x.nombre === 'Dulces tradicionales')).toBe(false);
    await db.query(`update public.dp_productos set activo = true where nombre = 'Arequipe casero'`);
    expect(await catalogo('no-existe')).toBeNull();
    await db.query(`update public.dp_tiendas set activa = false where id = $1`, [otraId]);
    expect(await catalogo('otra-tienda')).toBeNull();
    await db.query(`update public.dp_tiendas set activa = true where id = $1`, [otraId]);
  });
});

describe('Visitantes sin sesión', () => {
  it('no pueden leer tablas: ni pedidos, ni teléfonos, ni productos directamente', async () => {
    for (const tabla of ['dp_pedidos', 'dp_pedido_items', 'dp_tiendas', 'dp_productos', 'dp_miembros']) {
      expect(await errorOf(as(db, 'anon', `select * from public.${tabla}`))).toMatch(/permission denied/);
    }
  });
  it('no pueden escribir en tablas', async () => {
    expect(await errorOf(as(db, 'anon', `update public.dp_productos set precio = 1`))).toMatch(/permission denied/);
    expect(await errorOf(as(db, 'anon', `insert into public.dp_pedidos (tienda_id) values ($1)`, [tiendaId]))).toMatch(
      /permission denied/,
    );
  });
  it('no pueden crear tiendas', async () => {
    expect(await errorOf(as(db, 'anon', `select public.dp_crear_tienda('x-y-z', 'X', 'a@b.co')`))).toMatch(/permission denied/);
  });
});

describe('Crear pedido (precios recalculados en el servidor)', () => {
  it('registra la solicitud con precios de la base de datos aunque el navegador mande otros', async () => {
    const torta = prod(c, 'Torta de chocolate');
    const v = torta.variantes[1]!;
    const zona = c.zonas[0]!;
    const r = await crear(
      pedidoBase({
        items: [
          { producto_id: torta.id, variante_id: v.id, sabores: [], cantidad: 2, precio: 1 },
          { producto_id: prod(c, 'Brownie artesanal').id, sabores: ['Nutella', 'Arequipe'], cantidad: 6, subtotal: 0 },
        ],
        entrega: { fecha: fechaTorta, franja: c.tienda.franjas[1], modalidad: 'domicilio', zona_id: zona.id, direccion: 'Calle 80 # 60-20', barrio: 'Centro' },
        subtotal: 10,
        total: 10,
      }),
    );
    expect(r.codigo).toBe('DP-0001');
    expect(r.subtotal).toBe(2 * 115000 + 6 * 5000);
    expect(r.domicilio).toBe(6000);
    expect(r.total).toBe(2 * 115000 + 6 * 5000 + 6000);
    expect(r.domicilio_pendiente).toBe(false);
    const items = r.items as { detalle: string; precio_unitario: number }[];
    expect(items[0]).toMatchObject({ detalle: '1 libra · 20 porciones', precio_unitario: 115000 });
    expect(items[1]!.detalle).toBe('Arequipe, Nutella');

    const fila = (await db.query<Record<string, unknown>>(`select * from public.dp_pedidos where codigo = 'DP-0001'`)).rows[0]!;
    expect(fila.estado).toBe('solicitud_recibida');
    expect(fila.total).toBe(266000);
    expect(fila.zona_nombre).toBe(zona.nombre);
  });

  it('zona sin tarifa: domicilio pendiente y no se suma al total', async () => {
    const zona = c.zonas.find((z) => z.tarifa === null)!;
    const r = await crear(
      pedidoBase({
        entrega: { fecha: fechaTorta, franja: c.tienda.franjas[0], modalidad: 'domicilio', zona_id: zona.id, direccion: 'Vereda El Sol, casa 3', barrio: 'Vereda' },
      }),
    );
    expect(r.domicilio).toBeNull();
    expect(r.domicilio_pendiente).toBe(true);
    expect(r.total).toBe(r.subtotal);
  });

  it('el consecutivo avanza por tienda', async () => {
    const r = await crear(pedidoBase());
    expect(r.codigo).toBe('DP-0003');
  });

  it('rechaza productos agotados, variantes ajenas, sabores inventados y cantidades bajo el mínimo', async () => {
    const agotado = prod(c, 'Galletas de avena y pasas');
    const torta = prod(c, 'Torta de chocolate');
    const zanahoria = prod(c, 'Torta de zanahoria');
    const brownie = prod(c, 'Brownie artesanal');
    const item = (x: unknown) => crear(pedidoBase({ items: [x] }));
    expect(await errorOf(item({ producto_id: agotado.id, cantidad: 1 }))).toMatch(/agotado/);
    expect(await errorOf(item({ producto_id: torta.id, cantidad: 1 }))).toMatch(/Elige la presentación/);
    expect(await errorOf(item({ producto_id: torta.id, variante_id: zanahoria.variantes[0]!.id, cantidad: 1 }))).toMatch(
      /ya no está disponible/,
    );
    expect(await errorOf(item({ producto_id: brownie.id, sabores: ['Veneno'], cantidad: 6 }))).toMatch(/sabores/);
    expect(await errorOf(item({ producto_id: brownie.id, sabores: ['Clásico', 'Arequipe', 'Nutella'], cantidad: 6 }))).toMatch(
      /hasta 2 sabores/,
    );
    expect(await errorOf(item({ producto_id: brownie.id, sabores: [], cantidad: 6 }))).toMatch(/Elige el sabor/);
    expect(await errorOf(item({ producto_id: brownie.id, sabores: ['Clásico'], cantidad: 3 }))).toMatch(/mínimo/);
    expect(await errorOf(item({ producto_id: brownie.id, sabores: ['Clásico'], cantidad: 2.5 }))).toMatch(/Cantidad no válida/);
    expect(await errorOf(item({ producto_id: brownie.id, sabores: ['Clásico'], cantidad: -6 }))).toMatch(/Cantidad no válida/);
    expect(await errorOf(item({ producto_id: 'no-es-uuid', cantidad: 1 }))).toMatch(/ya no está en el catálogo/);
    expect(await errorOf(crear(pedidoBase({ items: [] })))).toMatch(/carrito está vacío/);
  });

  it('no deja pedir productos de otra tienda', async () => {
    const ajeno = (
      await db.query<{ id: string }>(`insert into public.dp_productos (tienda_id, nombre, precio) values ($1, 'Ajeno', 1000) returning id`, [otraId])
    ).rows[0]!.id;
    expect(await errorOf(crear(pedidoBase({ items: [{ producto_id: ajeno, cantidad: 1 }] })))).toMatch(/ya no está en el catálogo/);
  });

  it('valida fechas: pasadas, sin tiempo de preparación, días cerrados, bloqueadas y muy lejanas', async () => {
    const hoy = c.ahora.slice(0, 10);
    const fecha = (f: string) => crear(pedidoBase({ entrega: { fecha: f, franja: c.tienda.franjas[0], modalidad: 'recogida' } }));
    expect(await errorOf(fecha(sumarDias(hoy, -1)))).toMatch(/ya pasó/);
    expect(await errorOf(fecha(hoy))).toMatch(/No alcanzamos/); // el brownie necesita 24 h
    let domingo = sumarDias(hoy, 3);
    while (diaSemana(domingo) !== 0) domingo = sumarDias(domingo, 1);
    expect(await errorOf(fecha(domingo))).toMatch(/no atendemos/);
    expect(await errorOf(fecha(sumarDias(hoy, 400)))).toMatch(/Todavía no/);
    expect(await errorOf(fecha('2026-02-30'))).toMatch(/fecha válida/);
    await db.query(`insert into public.dp_fechas_bloqueadas (tienda_id, fecha) values ($1, $2)`, [tiendaId, fechaTorta]);
    expect(await errorOf(fecha(fechaTorta))).toMatch(/no está disponible/);
    await db.query(`delete from public.dp_fechas_bloqueadas where tienda_id = $1`, [tiendaId]);
  });

  it('valida datos del cliente, franja, zona, dirección y autorización de datos', async () => {
    expect(await errorOf(crear(pedidoBase({ cliente: { nombre: 'A', telefono: '3001234567' } })))).toMatch(/nombre/);
    expect(await errorOf(crear(pedidoBase({ cliente: { nombre: 'Ana', telefono: '12' } })))).toMatch(/número de contacto/);
    expect(await errorOf(crear(pedidoBase({ acepta_datos: false })))).toMatch(/autorización/);
    expect(await errorOf(crear(pedidoBase({ entrega: { fecha: fechaTorta, franja: 'A medianoche', modalidad: 'recogida' } })))).toMatch(
      /franja/,
    );
    expect(
      await errorOf(crear(pedidoBase({ entrega: { fecha: fechaTorta, franja: c.tienda.franjas[0], modalidad: 'domicilio', zona_id: c.zonas[0]!.id } }))),
    ).toMatch(/dirección/);
    expect(await errorOf(crear(pedidoBase({ entrega: { fecha: fechaTorta, franja: c.tienda.franjas[0], modalidad: 'domicilio', direccion: 'Calle 1 # 2-3', barrio: 'Centro' } })))).toMatch(
      /zona/,
    );
    expect(await errorOf(crear(pedidoBase({ entrega: { fecha: fechaTorta, franja: c.tienda.franjas[0], modalidad: 'avion' } })))).toMatch(
      /recogida o domicilio/,
    );
  });

  it('limita solicitudes repetidas desde el mismo teléfono', async () => {
    const tel = '3209998877';
    for (let i = 0; i < 5; i++) await crear(pedidoBase({ cliente: { nombre: 'Repetida', telefono: tel } }));
    expect(await errorOf(crear(pedidoBase({ cliente: { nombre: 'Repetida', telefono: tel } })))).toMatch(/varias solicitudes/);
  });
});

describe('Panel: aislamiento entre tiendas (RLS)', () => {
  it('la propietaria ve sus pedidos; la de otra tienda no ve ninguno', async () => {
    const mios = await as<{ codigo: string }>(db, 'authenticated', 'select codigo from public.dp_pedidos', [], DUENA);
    expect(mios.length).toBeGreaterThan(3);
    const ajenos = await as(db, 'authenticated', 'select * from public.dp_pedidos', [], INTRUSA);
    expect(ajenos).toHaveLength(0);
    const items = await as(db, 'authenticated', 'select * from public.dp_pedido_items', [], INTRUSA);
    expect(items).toHaveLength(0);
  });

  it('la intrusa no puede editar ni borrar productos de otra tienda', async () => {
    await as(db, 'authenticated', `update public.dp_productos set precio = 1 where tienda_id = $1`, [tiendaId], INTRUSA);
    await as(db, 'authenticated', `delete from public.dp_productos where tienda_id = $1`, [tiendaId], INTRUSA);
    const n = await db.query<{ n: number }>(`select count(*)::int n from public.dp_productos where tienda_id = $1 and precio = 1`, [tiendaId]);
    expect(n.rows[0]!.n).toBe(0);
    const total = await db.query<{ n: number }>(`select count(*)::int n from public.dp_productos where tienda_id = $1`, [tiendaId]);
    expect(total.rows[0]!.n).toBeGreaterThan(10);
  });

  it('no puede crear productos en otra tienda ni mover variantes a productos ajenos', async () => {
    expect(
      await errorOf(as(db, 'authenticated', `insert into public.dp_productos (tienda_id, nombre, precio) values ($1, 'Trampa', 1)`, [tiendaId], INTRUSA)),
    ).toMatch(/row-level security/);
    const torta = prod(c, 'Torta de chocolate');
    expect(
      await errorOf(
        as(db, 'authenticated', `insert into public.dp_variantes (tienda_id, producto_id, nombre) values ($1, $2, 'x')`, [otraId, torta.id], INTRUSA),
      ),
    ).toMatch(/no pertenece/);
  });

  it('la propietaria solo cambia estado y notas de un pedido; no precios ni datos del cliente', async () => {
    await as(db, 'authenticated', `update public.dp_pedidos set estado = 'confirmado', notas_internas = 'Pago recibido' where codigo = 'DP-0001'`, [], DUENA);
    const fila = (await db.query<{ estado: string; notas_internas: string }>(`select * from public.dp_pedidos where codigo = 'DP-0001'`)).rows[0]!;
    expect(fila).toMatchObject({ estado: 'confirmado', notas_internas: 'Pago recibido' });
    expect(await errorOf(as(db, 'authenticated', `update public.dp_pedidos set total = 1`, [], DUENA))).toMatch(/permission denied/);
    expect(await errorOf(as(db, 'authenticated', `update public.dp_pedidos set estado = 'inventado'`, [], DUENA))).toMatch(/check/);
    expect(await errorOf(as(db, 'authenticated', `delete from public.dp_pedidos`, [], DUENA))).toMatch(/permission denied/);
  });

  it('la propietaria no puede cambiar el consecutivo, el límite ni activar otra tienda', async () => {
    expect(await errorOf(as(db, 'authenticated', `update public.dp_tiendas set consecutivo = 0`, [], DUENA))).toMatch(/permission denied/);
    expect(await errorOf(as(db, 'authenticated', `update public.dp_tiendas set activa = false`, [], DUENA))).toMatch(/permission denied/);
    await as(db, 'authenticated', `update public.dp_tiendas set nombre = 'Mi Dulce' where id = $1`, [tiendaId], DUENA);
    await as(db, 'authenticated', `update public.dp_tiendas set nombre = 'Hackeada' where id = $1`, [otraId], DUENA);
    const nombres = (await db.query<{ nombre: string }>(`select nombre from public.dp_tiendas order by slug`)).rows.map((r) => r.nombre);
    expect(nombres).toEqual(['Mi Dulce', 'Otra']);
    await db.query(`update public.dp_tiendas set nombre = 'Dulce Pedido' where id = $1`, [tiendaId]);
  });

  it('fotos: solo se suben en la carpeta de la propia tienda', async () => {
    await as(db, 'authenticated', `insert into storage.objects (bucket_id, name) values ('dulce-pedido', $1)`, [`${tiendaId}/torta.webp`], DUENA);
    expect(
      await errorOf(as(db, 'authenticated', `insert into storage.objects (bucket_id, name) values ('dulce-pedido', $1)`, [`${tiendaId}/x.webp`], INTRUSA)),
    ).toMatch(/row-level security/);
    expect(
      await errorOf(as(db, 'authenticated', `insert into storage.objects (bucket_id, name) values ('dulce-pedido', 'sin-carpeta.webp')`, [], DUENA)),
    ).toMatch(/row-level security/);
  });
});

describe('Invitaciones y privacidad', () => {
  it('una invitación por correo verificado convierte a la usuaria en miembro', async () => {
    await db.query(`insert into public.dp_invitaciones (tienda_id, email) values ($1, 'invitada@demo.test'), ($1, 'pendiente@demo.test')`, [tiendaId]);
    const r = await as<{ n: number }>(db, 'authenticated', 'select public.dp_aceptar_invitaciones() as n', [], INVITADA);
    expect(r[0]!.n).toBe(1);
    const ve = await as(db, 'authenticated', 'select * from public.dp_pedidos', [], INVITADA);
    expect(ve.length).toBeGreaterThan(0);
    const sin = await as<{ n: number }>(db, 'authenticated', 'select public.dp_aceptar_invitaciones() as n', [], SIN_VERIFICAR);
    expect(sin[0]!.n).toBe(0);
  });

  it('anonimiza datos personales vencidos; solo la propietaria puede hacerlo', async () => {
    await db.query(`update public.dp_pedidos set creado_en = now() - interval '13 months' where codigo = 'DP-0001'`);
    expect(await errorOf(as(db, 'authenticated', 'select public.dp_anonimizar_pedidos($1)', [tiendaId], INTRUSA))).toMatch(/propietaria/);
    const r = await as<{ n: number }>(db, 'authenticated', 'select public.dp_anonimizar_pedidos($1) as n', [tiendaId], DUENA);
    expect(r[0]!.n).toBe(1);
    const f = (await db.query<Record<string, unknown>>(`select * from public.dp_pedidos where codigo = 'DP-0001'`)).rows[0]!;
    expect(f).toMatchObject({ cliente_telefono: '', direccion: '', datos_anonimizados: true, total: 266000 });
  });

  it('el alta de tienda crea la invitación de la propietaria', async () => {
    await db.query(`select public.dp_crear_tienda('postres-luz', 'Postres Luz', 'Luz@Correo.co', '+573001112233')`);
    const inv = await db.query<{ email: string }>(
      `select i.email from public.dp_invitaciones i join public.dp_tiendas t on t.id = i.tienda_id where t.slug = 'postres-luz'`,
    );
    expect(inv.rows[0]!.email).toBe('luz@correo.co');
  });
});

describe('Fotos de categoría y ubicación', () => {
  it('cada categoría de la demo trae su foto real y la tienda su ubicación', async () => {
    const cat = await catalogo();
    expect(cat.categorias.every((x) => /^https:\/\/images\.unsplash\.com\/photo-/.test(x.foto_url ?? ''))).toBe(true);
    expect(cat.productos.every((x) => x.fotos.length > 0)).toBe(true);
    expect(cat.tienda.contenido.mapa_lat).toBeCloseTo(6.1526068, 6);
    expect(cat.tienda.contenido.mapa_lng).toBeCloseTo(-75.6518412, 6);
    expect(cat.tienda.contenido.direccion).toContain('Felicity');
  });
});

describe('Cotizaciones', () => {
  const cotizar = (datos: unknown, slug = SLUG) =>
    as<{ r: { codigo: string } }>(db, 'anon', 'select public.dp_crear_cotizacion($1, $2::jsonb) as r', [slug, JSON.stringify(datos)]).then(
      (x) => x[0]!.r,
    );
  const base = (extra: Record<string, unknown> = {}) => ({
    nombre: 'Laura Díaz',
    telefono: '3115550000',
    tipo_evento: 'Cumpleaños',
    fecha_evento: sumarDias(c.ahora.slice(0, 10), 20),
    personas: '40',
    presupuesto: '400000',
    descripcion: 'Torta de dos pisos temática de unicornio y 30 cupcakes.',
    acepta_datos: true,
    ...extra,
  });

  it('registra la solicitud con código propio y campos opcionales', async () => {
    expect((await cotizar(base())).codigo).toBe('CT-0001');
    expect((await cotizar(base({ fecha_evento: '', personas: '', presupuesto: '', telefono: '3115550001' }))).codigo).toBe('CT-0002');
    const fila = (await db.query<Record<string, unknown>>(`select * from public.dp_cotizaciones where codigo = 'CT-0001'`)).rows[0]!;
    expect(fila).toMatchObject({ estado: 'nueva', personas: 40, presupuesto: 400000, cliente_telefono: '3115550000' });
  });

  it('valida descripción, contacto, fecha, personas y autorización', async () => {
    expect(await errorOf(cotizar(base({ descripcion: 'torta' })))).toMatch(/Cuéntanos/);
    expect(await errorOf(cotizar(base({ telefono: '12' })))).toMatch(/número de contacto/);
    expect(await errorOf(cotizar(base({ fecha_evento: '2020-01-01' })))).toMatch(/ya pasó/);
    expect(await errorOf(cotizar(base({ personas: '-3' })))).toMatch(/personas/);
    expect(await errorOf(cotizar(base({ acepta_datos: false })))).toMatch(/autorización/);
    expect(await errorOf(cotizar(base(), 'no-existe'))).toMatch(/no está disponible/);
  });

  it('visitantes no leen cotizaciones; cada tienda ve solo las suyas y solo cambia estado y notas', async () => {
    expect(await errorOf(as(db, 'anon', 'select * from public.dp_cotizaciones'))).toMatch(/permission denied/);
    expect(await as(db, 'authenticated', 'select * from public.dp_cotizaciones', [], INTRUSA)).toHaveLength(0);
    expect((await as(db, 'authenticated', 'select * from public.dp_cotizaciones', [], DUENA)).length).toBeGreaterThanOrEqual(2);
    await as(db, 'authenticated', `update public.dp_cotizaciones set estado = 'respondida', notas_internas = 'Enviada propuesta' where codigo = 'CT-0001'`, [], DUENA);
    expect(await errorOf(as(db, 'authenticated', `update public.dp_cotizaciones set descripcion = 'x'`, [], DUENA))).toMatch(/permission denied/);
    const fila = (await db.query<{ estado: string }>(`select estado from public.dp_cotizaciones where codigo = 'CT-0001'`)).rows[0]!;
    expect(fila.estado).toBe('respondida');
  });
});
