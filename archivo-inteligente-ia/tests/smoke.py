"""Prueba rápida: carga cada pantalla, captura errores de consola y screenshots."""
import sys, os
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/shots'
os.makedirs(OUT, exist_ok=True)
routes = ['dashboard','expedientes','inventario','transferencias','asistente','alertas','informes','productividad','configuracion']
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for name, vp in [('desk', {'width':1440,'height':900}), ('mob', {'width':390,'height':844})]:
        ctx = b.new_context(viewport=vp, device_scale_factor=1)
        pg = ctx.new_page()
        pg.on('console', lambda m: errors.append(f'{name} console {m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errors.append(f'{name} pageerror: {e}'))
        pg.goto(URL); pg.wait_for_selector('.kpis', timeout=10000)
        for r in routes:
            pg.evaluate(f"location.hash='#/{r}'"); pg.wait_for_timeout(350)
            pg.screenshot(path=f'{OUT}/{name}-{r}.png', full_page=(name=='desk'))
            txt = pg.inner_text('#view')
            if 'error' in txt.lower() and 'Ocurrió' in txt: errors.append(f'{name} {r}: render error {txt[:200]}')
        ctx.close()
    b.close()
print('\n'.join(errors) or 'SIN ERRORES')
