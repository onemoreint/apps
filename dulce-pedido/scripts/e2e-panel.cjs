/**
 * Prueba del modo con servidor y del panel, simulando las respuestas de Supabase
 * (la red se intercepta en el navegador; no toca ninguna base de datos real).
 *
 *   VITE_SUPABASE_URL=https://ejemplo.supabase.co VITE_SUPABASE_ANON_KEY=x npx vite build --outDir /tmp/dps
 *   npx vite preview --outDir /tmp/dps --port 4174
 *   CHROMIUM=/ruta/chrome URL=http://localhost:4174/ SUPABASE=https://ejemplo.supabase.co node scripts/e2e-panel.cjs
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const URL_APP = process.env.URL ?? 'http://localhost:4174/';
const SUPA = process.env.SUPABASE ?? 'https://ejemplo.supabase.co';
const CAPTURAS = process.env.CAPTURAS;
const catalogo = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'demo', 'catalogo.json'), 'utf8'));
const TIENDA_ID = '00000000-0000-4000-8000-000000000001';
const USUARIO = '00000000-0000-4000-8000-0000000000aa';

const tienda = {
  id: TIENDA_ID,
  ...catalogo.tienda,
  activa: true,
  meses_retencion: 12,
};
const productos = catalogo.productos.map((p) => ({
  ...p,
  tienda_id: TIENDA_ID,
  activo: true,
  dp_variantes: p.variantes.map((v, i) => ({ ...v, orden: i + 1 })),
}));
const categorias = catalogo.categorias.map((c) => ({ ...c, tienda_id: TIENDA_ID, activa: true }));
const pedidos = [
  {
    id: 'p1', codigo: 'DP-0001', estado: 'solicitud_recibida', cliente_nombre: 'María Pérez', cliente_telefono: '3001234567',
    fecha_entrega: '2026-11-07', franja: 'Tarde (2:00 – 6:00 p. m.)', modalidad: 'domicilio', zona_nombre: 'Sabaneta e Itagüí',
    direccion: 'Calle 75 Sur # 40-20', barrio: 'Calle Larga', observaciones: 'Feliz día, mamá', subtotal: 150000, domicilio: 9000,
    domicilio_pendiente: false, total: 159000, notas_internas: '', datos_anonimizados: false, creado_en: '2026-10-29T15:00:00Z',
    dp_pedido_items: [
      { nombre: 'Torta de chocolate', detalle: '1 libra · 20 porciones', cantidad: 1, precio_unitario: 115000, subtotal: 115000, producto_id: productos[0].id },
      { nombre: 'Brownie artesanal', detalle: 'Arequipe, Nutella', cantidad: 7, precio_unitario: 5000, subtotal: 35000, producto_id: productos[4]?.id },
    ],
  },
  {
    id: 'p2', codigo: 'DP-0002', estado: 'confirmado', cliente_nombre: 'Juan Gómez', cliente_telefono: '3109876543',
    fecha_entrega: '2026-11-03', franja: 'Mañana (9:00 a. m. – 12:00 m.)', modalidad: 'recogida', zona_nombre: '',
    direccion: '', barrio: '', observaciones: '', subtotal: 45000, domicilio: 0, domicilio_pendiente: false, total: 45000,
    notas_internas: 'Abonó 50%', datos_anonimizados: false, creado_en: '2026-10-28T15:00:00Z',
    dp_pedido_items: [{ nombre: 'Caja de regalo dulce', detalle: 'Caja x 6 unidades · Alfajor', cantidad: 1, precio_unitario: 45000, subtotal: 45000, producto_id: null }],
  },
];

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROMIUM,
    args: (process.env.CHROMIUM_ARGS ?? '').split(' ').filter(Boolean),
    headless: true,
  });
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CO' });
  const enviados = [];
  const cambios = [];

  await ctx.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const responder = (cuerpo, estado = 200) =>
      route.fulfill({ status: estado, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(cuerpo) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const ruta = u.pathname;
    if (ruta.endsWith('/rpc/dp_tienda_publica')) return responder(catalogo);
    if (ruta.endsWith('/rpc/dp_crear_pedido')) {
      const cuerpo = req.postDataJSON();
      enviados.push(cuerpo);
      if (cuerpo.p_pedido.cliente.nombre === 'Error') return responder({ code: 'P0001', message: 'Esa fecha no está disponible.' }, 400);
      return responder({
        codigo: 'DP-0003',
        items: [{ nombre: 'Torta de chocolate', detalle: '1/2 libra · 10 porciones', cantidad: 1, precio_unitario: 65000, subtotal: 65000 }],
        subtotal: 65000, domicilio: null, domicilio_pendiente: false, total: 65000,
      });
    }
    if (ruta.endsWith('/rpc/dp_aceptar_invitaciones')) return responder(0);
    if (ruta.includes('/auth/v1/')) return responder({});
    const tabla = ruta.split('/rest/v1/')[1];
    if (req.method() !== 'GET') {
      cambios.push({ tabla, metodo: req.method(), cuerpo: req.postData() });
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }
    const datos = {
      dp_miembros: [{ rol: 'propietaria', tienda }],
      dp_pedidos: pedidos,
      dp_productos: productos,
      dp_categorias: categorias,
      dp_zonas: catalogo.zonas.map((z, i) => ({ ...z, tienda_id: TIENDA_ID, activa: true, orden: i + 1 })),
      dp_fechas_bloqueadas: [{ fecha: '2026-12-24', motivo: 'Nochebuena' }],
      dp_invitaciones: [],
      dp_cotizaciones: [
        { id: 'c1', codigo: 'CT-0001', estado: 'nueva', cliente_nombre: 'Laura Díaz', cliente_telefono: '3115550000', tipo_evento: 'Cumpleaños',
          fecha_evento: '2026-11-21', personas: 40, presupuesto: 400000, descripcion: 'Torta de dos pisos temática de unicornio.', notas_internas: '',
          datos_anonimizados: false, creado_en: '2026-10-29T15:00:00Z' },
      ],
    }[tabla];
    return responder(datos ?? []);
  });

  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errores.push(m.text()));
  const foto = async (n) => CAPTURAS && p.screenshot({ path: `${CAPTURAS}/${n}.png` });

  // --- Tienda con servidor: registra la solicitud y solo manda ids y cantidades
  await p.goto(URL_APP);
  await p.getByRole('link', { name: 'Ver catálogo' }).first().waitFor();
  await p.goto(URL_APP + `#/p/${productos[0].id}`);
  await p.getByRole('button', { name: /Agregar ·/ }).click();
  await p.getByRole('link', { name: /Continuar con mis datos/ }).click();
  await p.getByLabel('Nombre').fill('Error');
  await p.getByLabel('Celular / WhatsApp').fill('3001234567');
  await p.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button').first().click();
  await p.getByText('Mañana (9:00 a. m. – 12:00 m.)').click();
  await p.locator('input[type="checkbox"]').check();
  await p.getByRole('button', { name: 'Preparar pedido para WhatsApp' }).click();
  await p.getByText('Esa fecha no está disponible.').waitFor();
  await p.getByLabel('Nombre').fill('Ana Ruiz');
  await p.getByRole('button', { name: 'Preparar pedido para WhatsApp' }).click();
  await p.getByText('Tu solicitud').waitFor();
  await p.locator('strong', { hasText: 'DP-0003' }).waitFor({ timeout: 5000 });
  const item = enviados.at(-1).p_pedido.items[0];
  assert.deepEqual(Object.keys(item).sort(), ['cantidad', 'producto_id', 'sabores', 'variante_id'], 'No se envían precios desde el navegador');
  const href = await p.getByRole('link', { name: /Abrir WhatsApp/ }).getAttribute('href');
  assert.ok(new URL(href).searchParams.get('text').includes('Solicitud N.º DP-0003'), 'El mensaje incluye el código');
  await foto('20-listo-servidor');

  // --- Panel: sesión simulada
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USUARIO, exp, role: 'authenticated', email: 'duena@demo.test' })}.firma`;
  await p.evaluate(
    ([t, e, uid]) => {
      localStorage.setItem(
        'dulce-pedido-panel',
        JSON.stringify({ access_token: t, refresh_token: 'r', expires_at: e, expires_in: 3600, token_type: 'bearer', user: { id: uid, email: 'duena@demo.test', aud: 'authenticated', role: 'authenticated' } }),
      );
    },
    [token, exp, USUARIO],
  );

  await p.goto(URL_APP + '#/admin/pedidos');
  await p.getByRole('heading', { name: 'Pedidos' }).waitFor();
  assert.ok(await p.getByText('María Pérez').isVisible());
  await foto('21-panel-pedidos');
  await p.getByText('María Pérez').click();
  await p.getByRole('dialog').waitFor();
  await p.getByRole('dialog').locator('select').selectOption('confirmado');
  await foto('22-panel-detalle');
  await p.getByRole('button', { name: 'Guardar cambios' }).click();
  await p.getByText('Pedido DP-0001: Confirmado').waitFor();
  const cambioEstado = cambios.find((c) => c.tabla.startsWith('dp_pedidos'));
  assert.deepEqual(JSON.parse(cambioEstado.cuerpo), { estado: 'confirmado', notas_internas: '' }, 'Solo se actualizan estado y notas');

  for (const [seccion, titulo] of [
    ['cotizaciones', 'Cotizaciones'],
    ['productos', 'Productos'],
    ['categorias', 'Categorías'],
    ['entregas', 'Entregas y calendario'],
    ['negocio', 'Mi negocio'],
    ['estadisticas', 'Estadísticas'],
  ]) {
    await p.goto(URL_APP + `#/admin/${seccion}`);
    await p.getByRole('heading', { name: titulo, level: 1 }).waitFor();
    await p.waitForTimeout(300);
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(ancho <= 390, `${titulo}: desborde horizontal (${ancho}px)`);
    await foto(`23-panel-${seccion}`);
  }

  // Editor de producto
  await p.goto(URL_APP + '#/admin/productos');
  await p.getByRole('button', { name: 'Editar' }).first().click();
  await p.getByRole('heading', { name: 'Editar producto' }).waitFor();
  await foto('24-panel-editor');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await p.getByText('Producto guardado').waitFor();

  assert.deepEqual(errores, [], `Errores en consola: ${errores.join(' | ')}`);
  await navegador.close();
  console.log('E2E servidor y panel: todo correcto');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
