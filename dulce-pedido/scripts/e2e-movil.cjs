/**
 * Prueba de punta a punta en tamaño celular (390 × 844) contra una compilación local.
 *
 *   npx vite build --outDir /tmp/dp && npx vite preview --outDir /tmp/dp --port 4173
 *   CHROMIUM=/ruta/a/chrome URL=http://localhost:4173/ CAPTURAS=/tmp/capturas node scripts/e2e-movil.cjs
 *
 * Requiere playwright-core (npm i -D playwright-core) y un Chromium instalado.
 * Recorre: inicio → catálogo → búsqueda → ficha → carrito → datos → mensaje de WhatsApp.
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

const URL_APP = process.env.URL ?? 'http://localhost:4173/';
const CAPTURAS = process.env.CAPTURAS;

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROMIUM,
    args: (process.env.CHROMIUM_ARGS ?? '').split(' ').filter(Boolean),
    headless: true,
  });
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  });
  // Opcional: FOTO_LOCAL sustituye las fotos externas (para entornos sin acceso a internet).
  if (process.env.FOTO_LOCAL) {
    const img = require('node:fs').readFileSync(process.env.FOTO_LOCAL);
    await ctx.route('https://images.unsplash.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: img }));
    await ctx.route('https://www.google.com/maps**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body style="background:#cfe3d0;margin:0;display:grid;place-items:center;height:100vh;font:14px sans-serif">Mapa (simulado en pruebas)</body>' }));
  }
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  const foto = async (n) => CAPTURAS && p.screenshot({ path: `${CAPTURAS}/${n}.png`, fullPage: false });
  const sinDesbordeHorizontal = async (donde) => {
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(ancho <= 390, `${donde}: la página se desborda horizontalmente (${ancho}px)`);
  };

  // 1. Inicio
  await p.goto(URL_APP);
  await p.getByRole('link', { name: 'Ver catálogo' }).first().waitFor();
  await foto('01-inicio');
  await sinDesbordeHorizontal('Inicio');
  assert.ok(await p.getByText('Tienda de demostración.').isVisible(), 'Debe anunciar la tienda de demostración');
  assert.ok((await p.getByText('Foto de referencia').count()) > 0, 'Las fotos de la demo deben estar marcadas como referencia');
  assert.equal(await p.locator('svg[aria-label="Imagen ilustrativa"]').count(), 0, 'No debe haber ilustraciones');
  const fotos = await p.locator('main img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
  assert.ok(fotos.length >= 5 && fotos.every((s) => s.startsWith('https://')), `Fotos reales esperadas, se vio: ${fotos.join(', ')}`);
  assert.equal(await p.getByText('Lo que dicen nuestros clientes').count(), 0, 'Sin testimonios reales no se muestra la sección');
  // Categorías con foto real
  const fotosCategorias = await p.locator('section[aria-label="Categorías"] img').count();
  assert.ok(fotosCategorias >= 9, `Cada categoría debe tener foto (${fotosCategorias})`);
  await foto('02-inicio-categorias');

  // Ubicación con mapa
  await p.getByRole('heading', { name: 'Dónde estamos' }).scrollIntoViewIfNeeded();
  assert.ok(await p.getByText('Urbanización Felicity, La Estrella, Antioquia').first().isVisible(), 'Muestra la dirección');
  const mapa = await p.locator('iframe[title^="Mapa"]').getAttribute('src');
  assert.ok(mapa.includes('q=6.1526068,-75.6518412'), `Mapa con las coordenadas: ${mapa}`);
  const llegar = await p.getByRole('link', { name: 'Cómo llegar' }).getAttribute('href');
  assert.ok(llegar.includes('destination=6.1526068,-75.6518412'));
  await foto('02b-ubicacion');

  // Cotización
  await p.getByRole('heading', { name: 'Cotiza tu pedido especial' }).scrollIntoViewIfNeeded();
  const cot = p.getByRole('form', { name: 'Solicitar cotización' });
  await cot.getByRole('button', { name: 'Solicitar cotización' }).click();
  assert.ok(await cot.getByText('Cuéntanos qué necesitas (mínimo 10 caracteres).').isVisible(), 'Valida la descripción');
  await cot.getByLabel('Nombre').fill('Laura Díaz');
  await cot.getByLabel('Celular / WhatsApp').fill('311 555 0000');
  await cot.getByLabel('Ocasión').selectOption('Cumpleaños');
  await cot.getByLabel('Número de personas (opcional)').fill('40');
  await cot.getByLabel('¿Qué quieres?').fill('Torta de dos pisos temática de unicornio y 30 cupcakes.');
  await cot.locator('input[type="checkbox"]').check();
  await foto('02c-cotizacion');
  await cot.getByRole('button', { name: 'Solicitar cotización' }).click();
  const hrefCot = await p.getByRole('link', { name: 'Abrir WhatsApp y enviar' }).getAttribute('href');
  const textoCot = new URL(hrefCot).searchParams.get('text');
  for (const f of ['Hola, quiero solicitar una cotización.', 'Ocasión: Cumpleaños', 'Personas: 40', 'Torta de dos pisos temática de unicornio']) {
    assert.ok(textoCot.includes(f), `Falta en la cotización: ${f}`);
  }
  await foto('02d-cotizacion-lista');
  await p.getByText('Preguntas frecuentes').scrollIntoViewIfNeeded();

  // 2. Catálogo y búsqueda
  await p.getByRole('link', { name: 'Ver catálogo' }).first().click();
  await p.getByRole('heading', { name: 'Catálogo', level: 1 }).waitFor();
  await sinDesbordeHorizontal('Catálogo');
  await foto('03-catalogo');
  await p.getByPlaceholder(/Buscar/).fill('zanahória');
  await p.waitForTimeout(500);
  const tarjetas = await p.locator('a[href^="#/p/"]').count();
  assert.equal(tarjetas, 1, 'La búsqueda (sin importar tildes) debe dejar un producto');
  await p.getByPlaceholder(/Buscar/).fill('');
  await p.waitForTimeout(400);
  assert.ok((await p.locator('[role="tablist"] img').count()) >= 9, 'Los filtros del catálogo muestran foto');
  await p.getByRole('tab', { name: 'Galletas' }).click();
  await p.waitForTimeout(300);
  assert.ok(await p.getByText('Agotado').first().isVisible(), 'El producto agotado se marca');
  await foto('04-filtro-galletas');

  // 3. Ficha con presentaciones
  await p.getByRole('tab', { name: 'Tortas' }).click();
  await p.locator('a[href^="#/p/"]', { hasText: 'Torta de chocolate' }).click();
  await p.getByRole('heading', { name: 'Torta de chocolate' }).waitFor();
  await p.getByText('1 libra · 20 porciones').click();
  await foto('05-ficha-torta');
  await p.getByRole('button', { name: /Agregar ·/ }).click();
  await p.getByRole('heading', { name: 'Tu pedido' }).waitFor();

  // 4. Brownies: mínimo 6 y sabores
  await p.goto(URL_APP + '#/catalogo?q=brownie');
  await p.locator('a[href^="#/p/"]', { hasText: 'Brownie artesanal' }).click();
  await p.getByRole('heading', { name: 'Brownie artesanal' }).waitFor();
  await p.getByRole('button', { name: /Agregar ·/ }).click();
  assert.ok(await p.getByText('Elige al menos un sabor.').isVisible(), 'Exige elegir sabor');
  await p.getByRole('button', { name: 'Nutella' }).click();
  await p.getByRole('button', { name: 'Arequipe' }).click();
  await p.getByRole('button', { name: 'Clásico' }).click(); // tercer sabor: se ignora (máximo 2)
  assert.equal(await p.locator('button[aria-pressed="true"]').count(), 2, 'Máximo 2 sabores');
  assert.equal(await p.getByRole('button', { name: 'Quitar uno' }).isDisabled(), true, 'No baja del mínimo de 6');
  await p.getByRole('button', { name: 'Agregar uno' }).click(); // 7 unidades
  await foto('06-ficha-brownie');
  await p.getByRole('button', { name: /Agregar ·/ }).click();

  // 5. Carrito
  await p.getByRole('heading', { name: 'Tu pedido' }).waitFor();
  await sinDesbordeHorizontal('Carrito');
  const subtotal = await p.locator('text=Subtotal').locator('..').innerText();
  assert.match(subtotal, /\$150\.000/, `Subtotal esperado $150.000 (115.000 + 7 × 5.000), se vio: ${subtotal}`);
  await foto('07-carrito');
  await p.getByRole('link', { name: /Continuar con mis datos/ }).click();

  // 6. Formulario: errores y luego datos completos
  await p.getByRole('heading', { name: 'Datos del pedido' }).waitFor();
  await p.getByRole('button', { name: 'Preparar pedido para WhatsApp' }).click();
  assert.ok(await p.getByText('Escribe tu nombre.').isVisible(), 'Valida el nombre');
  assert.ok(await p.getByText('Necesitamos tu autorización para gestionar el pedido.').isVisible(), 'Exige autorización de datos');
  await foto('08-errores');
  await p.getByLabel('Nombre').fill('María Pérez');
  await p.getByLabel('Celular / WhatsApp').fill('300 123 4567');
  const fechaDisponible = p.getByRole('group', { name: 'Fechas disponibles' }).getByRole('button').first();
  await fechaDisponible.click();
  await p.getByText('Tarde (2:00 – 6:00 p. m.)').click();
  await p.getByRole('button', { name: /Domicilio/ }).click();
  await p.getByLabel('Zona').selectOption({ label: 'Sabaneta e Itagüí — $9.000' });
  await p.getByLabel('Dirección').fill('Calle 75 Sur # 40-20, apto 502');
  await p.getByLabel('Barrio').fill('Calle Larga');
  await p.getByLabel('Observaciones').fill('Escribir "Feliz día, mamá" & velas #5');
  const resumen = await p.locator('aside').innerText();
  assert.match(resumen, /Total estimado\s*\$159\.000/, `Total esperado $159.000 con domicilio de $9.000, se vio: ${resumen}`);
  await p.locator('input[type="checkbox"]').check();
  await foto('09-datos');
  await p.getByRole('button', { name: 'Preparar pedido para WhatsApp' }).click();

  // 7. Mensaje listo para WhatsApp
  await p.getByRole('heading', { name: /Falta un paso/ }).waitFor();
  await foto('10-listo');
  const href = await p.getByRole('link', { name: /Abrir WhatsApp/ }).getAttribute('href');
  assert.ok(href.startsWith('https://wa.me/573126387467?text='), `Enlace de WhatsApp inesperado: ${href}`);
  const texto = new URL(href).searchParams.get('text');
  for (const fragmento of [
    'Hola, quiero realizar un pedido.',
    'Nombre: María Pérez',
    'Entrega: Domicilio',
    'Dirección: Calle 75 Sur # 40-20, apto 502, barrio Calle Larga, Sabaneta e Itagüí',
    '- Torta de chocolate (1 libra · 20 porciones) x 1 = $115.000 COP',
    '- Brownie artesanal (Arequipe, Nutella) x 7 = $35.000 COP',
    'Subtotal: $150.000 COP',
    'Domicilio: $9.000 COP',
    'Total estimado: $159.000 COP',
    'Observaciones: Escribir "Feliz día, mamá" & velas #5',
    'Por favor, confírmame la disponibilidad y las instrucciones para finalizar mi pedido.',
  ]) {
    assert.ok(texto.includes(fragmento), `Falta en el mensaje: ${fragmento}\n---\n${texto}`);
  }
  // El carrito queda vacío después de preparar el pedido.
  await p.goto(URL_APP + '#/carrito');
  await p.getByRole('heading', { name: 'Tu pedido está vacío' }).waitFor();

  // 8. Privacidad y panel (sin servidor muestra aviso, no un formulario falso)
  await p.goto(URL_APP + '#/privacidad');
  await p.getByRole('heading', { name: 'Política de privacidad' }).waitFor();
  await p.goto(URL_APP + '#/admin');
  await p.getByRole('heading', { name: /Panel no disponible|Panel de la tienda/ }).waitFor();
  await foto('11-admin');

  // 9. Escritorio
  await p.setViewportSize({ width: 1280, height: 860 });
  await p.goto(URL_APP);
  await p.getByRole('link', { name: 'Ver catálogo' }).first().waitFor();
  await foto('12-escritorio');

  assert.deepEqual(errores, [], `Errores en consola: ${errores.join(' | ')}`);
  await navegador.close();
  console.log('E2E móvil: todo correcto');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
