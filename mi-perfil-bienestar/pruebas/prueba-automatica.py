import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8765/'
results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond)))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra else ''))

async def fill_all(p, health=True):
    await p.check('[name=acepto_orientativo]'); await p.check('[name=acepto_local]')
    await p.click('#next-btn')
    await p.fill('[name=nombre]', 'Ana Prueba'); await p.fill('[name=ubicacion]', 'Medellín, Colombia')
    await p.select_option('[name=edad]', '35–44'); await p.click('#next-btn')
    for sel in ['[name=sueno_horas][value="5–6"]', '[name=sueno_calidad][value="2"]', '[name=energia][value="2"]',
                '[name=estres][value="4"]', '[name=actividad][value="Casi nunca"]', '[name=agua][value="Menos de 1 litro"]',
                '[name=alimentacion][value="Mixta"]']:
        await p.check(sel, force=True)
    await p.click('#next-btn')
    await p.check('[name=objetivos][value="Más energía"]', force=True)
    await p.check('[name=objetivos][value="Dormir mejor"]', force=True)
    await p.select_option('[name=prioridad]', 'Dormir mejor')
    await p.fill('[name=meta90]', 'Dormir 7 horas')
    await p.click('#next-btn')
    if health:
        await p.check('[name=salud_modo][value=responder]', force=True)
        await p.click('#next-btn')  # sin consentimiento -> error
        err = await p.is_visible('#health-error')
        check('Salud: exige consentimiento antes de registrar', err)
        await p.check('[name=acepto_salud]')
        await p.check('[name=medicamentos][value="Sí"]', force=True)
        await p.fill('[name=salud_notas]', 'NOTA-SENSIBLE-123')
    else:
        await p.check('[name=salud_modo][value=asesor]', force=True)
    await p.click('#next-btn')   # revisión
    await p.click('#next-btn')   # informe

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, permissions=['clipboard-read', 'clipboard-write'])
        errors, urls_requested = [], []
        ctx.on('request', lambda r: urls_requested.append(r.url))
        await ctx.route('https://wa.me/**', lambda r: r.fulfill(status=200, body='wa ok'))
        p = await ctx.new_page()
        p.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        p.on('pageerror', lambda e: errors.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))

        # 1) Primera visita con internet: se prepara el modo offline
        await p.goto(BASE); await p.wait_for_function('navigator.serviceWorker.controller !== null || true')
        await p.evaluate('navigator.serviceWorker.ready')
        await p.wait_for_timeout(800)
        st = await p.evaluate("""new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=e=>r(e.data);
            (navigator.serviceWorker.controller||navigator.serviceWorker.ready).postMessage
              ? navigator.serviceWorker.ready.then(reg=>reg.active.postMessage({type:'STATUS'},[c.port2])) : r(null)})""")
        check('SW: todos los archivos esenciales en caché', st and st['ready'], str(st))
        check('Pill muestra En línea', 'En línea' in await p.inner_text('#net-pill'))
        await p.reload(); await p.wait_for_timeout(500)  # ahora controlada por el SW

        # 2) Sin guardado: nada persistente
        await fill_all(p, health=True)
        dbs = await p.evaluate('indexedDB.databases().then(d=>d.map(x=>x.name))')
        check('Sin autorización no se crea IndexedDB', dbs == [], str(dbs))
        rep = await p.inner_text('#report-text')
        check('Informe generado con observaciones', 'OBSERVACIONES' in rep and 'Ana Prueba' in rep)
        check('Advertencia médica por medicamentos', 'consulta con tu médico' in rep)
        msg = await p.input_value('#advisor-msg')
        check('Mensaje al asesor excluye salud por defecto', 'NOTA-SENSIBLE-123' not in msg)
        await p.check('#include-health')
        msg2 = await p.input_value('#advisor-msg')
        check('Salud incluida solo al marcar consentimiento', 'NOTA-SENSIBLE-123' in msg2)
        await p.uncheck('#include-health')

        # 3) Sin conexión: recarga desde caché y flujo completo
        await ctx.set_offline(True)
        await p.reload(); await p.wait_for_timeout(600)
        check('Offline: la app abre desde caché', await p.is_visible('h1'))
        check('Offline: pill Sin conexión', 'Sin conexión' in await p.inner_text('#net-pill'))
        check('Offline: banner visible', await p.is_visible('#net-banner'))
        check('Offline: respuestas no persistidas se perdieron al recargar (sin borrador)',
              await p.input_value('[name=nombre]') == '')

        # 4) Activar borrador offline, completar, recargar -> recuperado
        await p.check('#draft-toggle-inline')
        await fill_all(p, health=False)
        check('Offline: aviso «todavía no se ha enviado»', await p.is_visible('#offline-send-note'))
        check('Offline: botones WhatsApp deshabilitados', await p.is_disabled('#wa-copy-open') and await p.is_disabled('#wa-prefill'))
        await p.click('#copy-report')
        clip = await p.evaluate('navigator.clipboard.readText()')
        check('Offline: copiar informe funciona', 'INFORME PRELIMINAR' in clip)
        await p.fill('#advisor-msg', 'Mensaje editado por Ana sin conexión')
        await p.wait_for_timeout(700)
        await p.reload(); await p.wait_for_timeout(800)
        check('Borrador: se recupera tras cerrar/recargar', 'Ana Prueba' in await p.inner_text('#report-text'))
        check('Borrador: conserva mensaje editado', await p.input_value('#advisor-msg') == 'Mensaje editado por Ana sin conexión')
        rec = await p.evaluate("""new Promise(r=>{const q=indexedDB.open('mpb-borradores');q.onsuccess=()=>{const g=q.result.transaction('borrador').objectStore('borrador').get('actual');g.onsuccess=()=>{q.result.close();r(g.result)}}})""")
        check('Borrador: tiene fecha de caducidad', rec and rec['expiresAt'] > rec['savedAt'])
        check('Borrador: modo asesor no guarda datos de salud', 'salud_notas' not in rec['answers'])

        # 5) Caché del SW solo con archivos de la app
        cached = await p.evaluate("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.open(k).then(c=>c.keys()).then(rs=>rs.map(r=>r.url))))).then(a=>a.flat())")
        check('Caché solo contiene archivos de la app', all(u.startswith(BASE) and '?' not in u for u in cached), str(len(cached)))

        # 6) Vuelve la conexión
        await ctx.set_offline(False)
        await p.evaluate("window.dispatchEvent(new Event('online'))")
        await p.wait_for_timeout(600)
        check('Online: banner «Conexión recuperada»', 'Conexión recuperada' in await p.inner_text('#net-banner'))
        check('Online: WhatsApp habilitado', not await p.is_disabled('#wa-copy-open'))
        async with ctx.expect_page() as pi:
            await p.click('#wa-copy-open')
        wa = await pi.value
        check('WhatsApp (copiar+abrir): URL sin datos del cliente', wa.url == 'https://wa.me/573126387467', wa.url)
        await wa.close()
        clip2 = await p.evaluate('navigator.clipboard.readText()')
        check('WhatsApp: mensaje copiado al portapapeles', clip2 == 'Mensaje editado por Ana sin conexión')
        status = await p.inner_text('#send-status')
        check('No se marca como enviado (pendiente de confirmar)', 'no puede confirmar' in status and 'enviado.' not in status.split('confirmar')[0], status[:80])
        async with ctx.expect_page() as pi:
            await p.click('#wa-prefill')
        wa2 = await pi.value
        check('WhatsApp (prellenado): número correcto y texto', wa2.url.startswith('https://wa.me/573126387467?text=Mensaje'), wa2.url[:60])
        await wa2.close()

        # 7) Eliminar todo
        await p.click('[data-open-delete] >> nth=0')
        await p.click('#confirm-delete')
        await p.wait_for_timeout(600)
        dbs = await p.evaluate('indexedDB.databases().then(d=>d.map(x=>x.name))')
        check('Eliminar: IndexedDB borrada', dbs == [], str(dbs))
        check('Eliminar: vuelve al inicio con formulario vacío', await p.is_visible('h1') and not await p.is_checked('[name=acepto_local]'))
        await p.reload(); await p.wait_for_timeout(500)
        check('Eliminar: tras recargar no hay datos', await p.input_value('[name=nombre]') == '')

        # 8) Privacidad de red: ninguna petición con datos
        leaked = [u for u in urls_requested if 'Ana' in u or 'NOTA' in u]
        external = [u for u in urls_requested if not u.startswith(BASE) and 'wa.me' not in u]
        check('Ninguna petición propia lleva respuestas', not [u for u in leaked if u.startswith(BASE)])
        check('Sin peticiones a terceros (salvo WhatsApp por acción del usuario)', not external, str(external[:3]))
        check('Sin errores de consola/CSP', not errors, str(errors[:3]))

        await p.screenshot(path=sys.argv[1] + '/inicio.png', full_page=True)
        await fill_all(p, health=False)
        await p.screenshot(path=sys.argv[1] + '/informe.png', full_page=True)
        await b.close()
    failed = [n for n, ok in results if not ok]
    print(f'\n{len(results)-len(failed)}/{len(results)} pruebas superadas')
    sys.exit(1 if failed else 0)

asyncio.run(main())
