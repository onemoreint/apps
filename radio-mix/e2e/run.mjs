// Pruebas de extremo a extremo de Radio Mix Online en Chromium sin interfaz.
// La red externa (archive.org, Spotify) se sustituye por respuestas locales con la misma forma que las reales,
// porque este entorno no puede salir a esos dominios. El audio es un MP3 real decodificado por el navegador.
import chromium from '@sparticuz/chromium';
import { chromium as pw, devices } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/';
const mp3 = readFileSync(new URL('./tone.mp3', import.meta.url));
mkdirSync('shots', { recursive: true });

const files = [
  ['Bach_GoldbergVariations/JohannSebastianBach-01-GoldbergVariationsBwv.988-Aria.mp3', 'Johann Sebastian Bach - 01 - Goldberg Variations, BWV. 988 - Aria', 'Shelley Katz'],
  ['Bach_GoldbergVariations/JohannSebastianBach-02-GoldbergVariationsBwv.988-Variation1.mp3', 'Johann Sebastian Bach - 02 - Goldberg Variations, BWV. 988 - Variation 1', 'Shelley Katz'],
  ['Schubert_SonataInAMinorD.959/FranzSchubert-01-Allegro.mp3', 'Franz Schubert - Sonata in A Minor, D. 959 - 01 - Allegro', 'Paul Pitman'],
  ['Kevin MacLeod/Calming/Kevin MacLeod - 01 - Autumn Day.mp3'],
  ['Kevin MacLeod/Healing/Kevin MacLeod - 01 - Aretes.mp3'],
  ['Kevin MacLeod/Organic Meditations/Kevin MacLeod - 01 - Organic Meditations One.mp3'],
  ['Kevin MacLeod/Light Electronic/Kevin MacLeod - 01 - Chipper Doodle.mp3'],
  ['Kevin MacLeod/Hard Electronic/Kevin MacLeod - 01 - Blipotron.mp3'],
  ['Kevin MacLeod/Latinesque/Kevin MacLeod - 01 - As I Figure.mp3'],
].map(([name, title, creator]) => ({ name, title, creator, length: '88.5', format: 'VBR MP3' }));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await pw.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args.filter((a) => a !== '--single-process'), '--autoplay-policy=user-gesture-required'],
  headless: true,
});
const ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'allow' });

let downloads = 0;
await ctx.route('https://archive.org/metadata/**', (r) => {
  const id = decodeURIComponent(new URL(r.request().url()).pathname.split('/')[2]);
  const own = files.filter((f) => (id.startsWith('KevinMacLeod') ? f.name.startsWith('Kevin MacLeod/') : !f.name.startsWith('Kevin MacLeod/')));
  return r.fulfill({ json: { result: own } });
});
await ctx.route('https://archive.org/download/**', (r) => {
  downloads++;
  return r.fulfill({ status: 200, contentType: 'audio/mpeg', body: mp3, headers: { 'accept-ranges': 'none' } });
});
await ctx.route('https://stream.radio-prueba.com/**', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: mp3 }));
await ctx.route('https://caida.radio-prueba.com/**', (r) => r.abort('connectionrefused'));
await ctx.route('https://open.spotify.com/**', (r) => r.abort());

// Registra cada elemento de audio que crea la app para inspeccionar su estado real.
await ctx.addInitScript(() => {
  const Native = window.Audio;
  window.__audios = [];
  window.Audio = function (...a) {
    const el = new Native(...a);
    window.__audios.push(el);
    return el;
  };
  window.Audio.prototype = Native.prototype;
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
});

const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const engineAudio = () =>
  page.evaluate(() => {
    // El motor es el único elemento con preload="none" (los de «Probar conexión» usan "auto").
    const a = window.__audios.find((x) => x.preload === 'none');
    return a ? { src: a.src, paused: a.paused, t: a.currentTime, vol: a.volume, rs: a.readyState, err: a.error?.code ?? null, count: window.__audios.length } : null;
  });
const wait = (ms) => page.waitForTimeout(ms);

// 1. Arranque
await page.goto(BASE);
await page.waitForSelector('text=¿Qué quieres');
check('La app se inicia', true, await page.title());
check('Códec MP3 disponible en el navegador', await page.evaluate(() => document.createElement('audio').canPlayType('audio/mpeg') !== ''));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('Sin desbordamiento horizontal en pantalla de celular (412 px)', overflow <= 0, `exceso ${overflow}px`);
await wait(1200);
await page.screenshot({ path: 'shots/1-inicio.png' });

// 2. Categorías
await page.getByRole('navigation', { name: 'Principal' }).last().getByRole('button', { name: 'Categorías' }).click();
const cards = await page.locator('main button[aria-label]').filter({ hasText: /emisora|Pendiente/ }).count();
const pending = await page.locator('main').getByText('Pendiente de configuración').count();
check('Aparecen las 19 categorías', cards === 19, `${cards} tarjetas`);
check('Las categorías sin fuente se marcan como pendientes', pending === 16, `${pending} pendientes, ${19 - pending} en vivo`);
await wait(600);
await page.screenshot({ path: 'shots/2-categorias.png', fullPage: false });

await page.getByRole('button', { name: /^Salsa clásica y romántica/ }).click();
const salsaPlay = await page.getByRole('button', { name: /^Escuchar / }).count();
check('Una categoría pendiente no ofrece reproducir ni simula señal', salsaPlay === 0);

// 3. Reproducción de un programa
await page.goto(`${BASE}#/categoria/instrumental`);
await page.getByRole('button', { name: 'Escuchar Clásica Musopen' }).click();
await page.waitForFunction(() => navigator.mediaSession?.playbackState === 'playing', null, { timeout: 15000 });
const a1 = await engineAudio();
await wait(2500);
const a2 = await engineAudio();
check('Al pulsar reproducir suena audio real (el tiempo avanza)', a2 && !a2.paused && a2.t > a1.t + 1.5, `de ${a1.t.toFixed(1)} s a ${a2.t.toFixed(1)} s`);
check('Descarga la pista de la fuente configurada', a2.src.startsWith('https://archive.org/download/MusopenCollectionAsFlac/'));
const mini = await page.locator('[aria-label="Abrir reproductor ampliado"]').innerText();
check('Muestra obra e intérprete reales de la pista', /Goldberg|Sonata/.test(mini) && /Katz|Pitman/.test(mini), mini.replace(/\n+/g, ' | '));
await page.screenshot({ path: 'shots/3-sonando.png' });

// 4. Reproductor ampliado, volumen
await page.getByRole('button', { name: 'Abrir reproductor ampliado' }).click();
await page.waitForSelector('[role=dialog]');
const p1 = await page.locator('[aria-label="Avance de la pista actual"]').innerText();
await wait(2200);
const p2 = await page.locator('[aria-label="Avance de la pista actual"]').innerText();
check('El reproductor ampliado muestra el avance real', p1 !== p2, `${p1.split('\n')[0]} → ${p2.split('\n')[0]}`);
await page.screenshot({ path: 'shots/4-ampliado.png' });
await page.getByRole('slider', { name: 'Volumen' }).fill('0.35');
check('El control de volumen cambia el volumen del audio', Math.abs((await engineAudio()).vol - 0.35) < 0.01);
await page.getByRole('button', { name: 'Cerrar reproductor ampliado' }).click();

// 5. Pausa y reanudación
await page.locator('.fixed').getByRole('button', { name: 'Pausar' }).click();
await wait(400);
check('Pausa', (await engineAudio()).paused && (await page.evaluate(() => navigator.mediaSession.playbackState)) === 'paused');
await page.locator('.fixed').getByRole('button', { name: 'Reproducir' }).click();
await page.waitForFunction(() => navigator.mediaSession?.playbackState === 'playing', null, { timeout: 15000 });
check('Reanuda (vuelve al momento en vivo)', !(await engineAudio()).paused);

// 6. Cambio de categoría y emisora sin duplicar el reproductor
await page.goto(`${BASE}#/categoria/electronica`);
await page.getByRole('button', { name: 'Escuchar Pulso Electrónico' }).click();
await page.waitForFunction(() => window.__audios.find((x) => x.preload === 'none')?.src.includes('Electronic') && !window.__audios.find((x) => x.preload === 'none').paused, null, { timeout: 15000 });
const a3 = await engineAudio();
const miniCount = await page.locator('[aria-label="Abrir reproductor ampliado"]').count();
check('Cambia de emisora al navegar entre categorías', a3.src.includes('Electronic'));
check('El reproductor no se duplica', a3.count === 1 && (await page.evaluate(() => window.__audios.filter((x) => x.preload === 'none').length)) === 1 && miniCount === 1, `${a3.count} elemento de audio, ${miniCount} mini reproductor`);
check('Atribución CC BY visible en el reproductor', await (async () => {
  await page.getByRole('button', { name: 'Abrir reproductor ampliado' }).click();
  const t = await page.locator('[role=dialog]').innerText();
  await page.getByRole('button', { name: 'Cerrar reproductor ampliado' }).click();
  return t.includes('Kevin MacLeod (incompetech.com)') && t.includes('CC BY 4.0');
})());

// 7. Favoritos tras recargar
await page.getByRole('button', { name: 'Añadir Pulso Electrónico a favoritos' }).first().click();
await page.reload();
await page.goto(`${BASE}#/favoritos`);
check('Los favoritos se conservan después de recargar', (await page.getByRole('heading', { name: 'Pulso Electrónico' }).count()) === 1);

// 8. Stream en directo y fuente caída (añadidos con el panel como borrador en vista previa)
await page.evaluate(() => {
  const pub = JSON.parse(localStorage.getItem('radiomix:draft') || 'null');
  return pub;
});
await page.goto(`${BASE}#/admin`);
await page.getByRole('button', { name: 'Nueva emisora' }).click();
await page.getByLabel('Nombre').fill('Directo de prueba');
await page.getByLabel('Categoría').selectOption('salsa');
await page.getByLabel(/URL del stream/).fill('https://stream.radio-prueba.com/live.mp3');
await page.getByLabel(/^Licencia/).fill('Autorización de prueba');
await page.getByLabel(/Notas/).fill('Solo para la prueba automática');
await page.getByRole('button', { name: 'Probar conexión' }).click();
await page.waitForSelector('text=La fuente entrega audio', { timeout: 20000 });
check('Panel: «Probar conexión» comprueba que la fuente entrega audio', true);
await page.getByRole('button', { name: 'Aplicar cambios' }).click();
await page.getByRole('button', { name: 'Nueva emisora' }).click();
await page.getByLabel('Nombre').fill('Fuente caída');
await page.getByLabel('Categoría').selectOption('salsa');
await page.getByLabel(/URL del stream/).fill('https://caida.radio-prueba.com/live.mp3');
await page.getByLabel(/^Licencia/).fill('Autorización de prueba');
await page.getByRole('button', { name: 'Probar conexión' }).click();
await page.waitForSelector('text=/no entrega audio|no respondió/', { timeout: 20000 });
check('Panel: detecta una fuente caída', true);
await page.getByRole('button', { name: 'Aplicar cambios' }).click();
await page.getByLabel('URL del stream', { exact: false }).count();
check('Panel: rechaza URLs http o locales', await (async () => {
  await page.getByRole('button', { name: 'Nueva emisora' }).click();
  await page.getByLabel(/URL del stream/).fill('http://192.168.1.5:8000/radio');
  const t = await page.locator('form').innerText();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  return /https/.test(t);
})());
await page.getByRole('button', { name: 'Guardar borrador' }).click();
await page.getByRole('button', { name: 'Publicar' }).click();
await page.getByLabel(/Ver el borrador/).check();

await page.goto(`${BASE}#/categoria/salsa`);
check('Con una fuente configurada la categoría pasa a «en vivo»', (await page.getByText('Pendiente de configuración').count()) === 0);
await page.getByRole('button', { name: 'Escuchar Directo de prueba' }).click();
try {
  await page.waitForFunction(() => navigator.mediaSession?.playbackState === 'playing' && window.__audios.find((x) => x.preload === 'none')?.src.includes('stream.radio-prueba'), null, { timeout: 15000 });
} catch {
  console.log('DEBUG', JSON.stringify(await engineAudio()), await page.locator('[aria-label="Abrir reproductor ampliado"]').innerText());
}
const s1 = await engineAudio();
await wait(2000);
const s2 = await engineAudio();
check('Stream en directo: suena', !s2.paused && s2.t > s1.t + 1, `${s1.t.toFixed(1)} → ${s2.t.toFixed(1)} s`);
await page.getByRole('button', { name: 'Abrir reproductor ampliado' }).click();
check('Stream sin metadatos: no inventa canción', (await page.locator('[role=dialog]').innerText()).includes('no publica el nombre de la canción'));
await page.getByRole('button', { name: 'Cerrar reproductor ampliado' }).click();

await page.getByRole('button', { name: 'Escuchar Fuente caída' }).click();
await page.waitForSelector('text=/no está disponible|Error de red|no responde/', { timeout: 30000 });
const errText = await page.locator('[aria-label="Abrir reproductor ampliado"]').innerText();
check('Fuente caída: mensaje de error comprensible', true, errText.split('\n').pop());
check('Fuente caída: ofrece volver a conectar', (await page.getByRole('button', { name: 'Volver a conectar' }).count()) === 1);
await page.screenshot({ path: 'shots/5-error.png' });

// 9. PWA
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel=manifest]').href;
  const m = await fetch(href).then((r) => r.json());
  const icons = await Promise.all(m.icons.map(async (i) => [i.sizes, (await fetch(new URL(i.src, href))).status]));
  return { m, icons };
});
check('Manifiesto con nombre, start_url, scope y modo standalone', manifest.m.name && manifest.m.start_url && manifest.m.display === 'standalone');
check('Iconos 192×192 y 512×512 accesibles', ['192x192', '512x512'].every((s) => manifest.icons.some(([z, st]) => z === s && st === 200)), JSON.stringify(manifest.icons));
await page.reload();
await wait(1500);
const sw = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { active: !!r?.active, controlled: !!navigator.serviceWorker.controller };
});
check('Service worker activo y controlando la página', sw.active && sw.controlled);
// Arranque sin conexión: la interfaz abre desde la caché (sin prometer audio).
await page.goto(BASE);
await wait(500);
await ctx.setOffline(true);
await page.reload();
check('La interfaz abre sin conexión (desde caché)', (await page.getByText('¿Qué quieres').count()) === 1);
await ctx.setOffline(false);

// 10. Secretos
const bundle = await page.evaluate(async () => {
  const src = [...document.scripts].map((s) => s.src).filter(Boolean);
  const txt = (await Promise.all(src.map((u) => fetch(u).then((r) => r.text())))).join('');
  return { secret: /client_secret|sb_secret|service_role/i.test(txt), size: txt.length };
});
check('Sin secretos en el código del cliente', !bundle.secret);

const realErrors = consoleErrors.filter((e) => !/spotify|ERR_FAILED|caida\.radio|ERR_CONNECTION_REFUSED|ERR_INTERNET_DISCONNECTED|net::/i.test(e));
check('Sin errores de JavaScript en consola', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas`);
process.exit(failed.length ? 1 : 0);
