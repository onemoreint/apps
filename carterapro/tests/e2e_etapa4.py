"""Etapa 4: copia/restauración, importación CSV, PIN, apariencia y funcionamiento sin conexión.
Uso: python3 tests/e2e_etapa4.py [carpeta_capturas]  (servidor en :8080)"""
import sys, os, json, tempfile
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8080/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
errores = []

def vigilar(page):
    page.on('console', lambda m: m.type == 'error' and errores.append(m.text))
    page.on('pageerror', lambda e: errores.append(str(e)))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, accept_downloads=True)
    page = ctx.new_page(); vigilar(page)
    page.goto(URL); page.click('text=Ver demo'); page.wait_for_selector('text=Capital prestado', timeout=15000)

    # --- Copia completa ---
    page.goto(URL + '#/copia'); page.wait_for_selector('text=Exportar copia completa')
    page.screenshot(path=f'{OUT}/20-copia-movil.png', full_page=True)
    with page.expect_download() as d:
        page.click('button:has-text("Exportar copia completa")')
    ruta = os.path.join(tempfile.gettempdir(), 'copia-e2e.json'); d.value.save_as(ruta)
    copia = json.load(open(ruta))
    assert copia['formato'] == 'carterapro-backup' and copia['resumen']['clientes'] == 10, copia['resumen']
    page.wait_for_timeout(300)
    assert 'Hiciste una copia hoy' in page.inner_text('main')

    # Borrar demo y restaurar
    page.goto(URL + '#/mas'); page.click('text=Eliminar datos de demostración'); page.click('dialog button:has-text("Eliminar")')
    page.wait_for_timeout(400)
    page.goto(URL + '#/clientes'); page.wait_for_timeout(300)
    assert 'Aún no tienes clientes' in page.inner_text('main')
    page.goto(URL + '#/copia'); page.wait_for_selector('#archivo-copia', state='attached')
    page.set_input_files('#archivo-copia', ruta)
    page.wait_for_selector('dialog >> text=Esta copia contiene')
    txt = page.inner_text('dialog')
    assert '10' in txt and 'clientes' in txt
    page.screenshot(path=f'{OUT}/21-restaurar-dialogo.png')
    page.click('dialog button:has-text("Restaurar")'); page.wait_for_timeout(600)
    assert 'Deshacer la última restauración' in page.inner_text('main')
    page.goto(URL + '#/clientes'); page.wait_for_timeout(300)
    assert page.locator('#lista a.fila').count() == 10
    page.goto(URL + '#/pagos/nuevo'); page.wait_for_timeout(200)
    page.locator('#lista a.fila').first.click(); page.wait_for_timeout(300)
    if page.locator('#lista a.fila').count(): page.locator('#lista a.fila').first.click()
    page.wait_for_selector('#f-monto'); page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    recibo = page.inner_text('.recibo-datos')
    assert 'R-000021' in recibo, recibo  # el consecutivo continúa tras restaurar

    # Copia dañada
    mala = os.path.join(tempfile.gettempdir(), 'mala.json')
    json.dump({'formato': 'carterapro-backup', 'version': 1, 'datos': {'clientes': [], 'creditos': [{'id': 'x', 'clienteId': 'no'}], 'cuotas': [], 'pagos': []}}, open(mala, 'w'))
    page.goto(URL + '#/copia'); page.set_input_files('#archivo-copia', mala)
    page.wait_for_selector('dialog >> text=No se puede restaurar'); page.click('dialog button:has-text("Cerrar")')

    # --- Importar clientes CSV ---
    csv = os.path.join(tempfile.gettempdir(), 'clientes.csv')
    open(csv, 'w', encoding='utf-8').write('Nombre;Teléfono;Cédula\nRosa Díaz;3115550001;5001\nCarlos Pérez;3001234567;\nX;;\n')
    page.set_input_files('#archivo-csv', csv)
    page.wait_for_selector('dialog >> text=Importar 1 cliente')
    assert 'Ya existe' in page.inner_text('dialog')
    page.click('dialog button:has-text("Importar")'); page.wait_for_timeout(400)
    page.goto(URL + '#/clientes'); page.wait_for_timeout(300)
    assert 'Rosa Díaz' in page.inner_text('main')

    # --- Apariencia ---
    page.goto(URL + '#/configuracion'); page.wait_for_selector('text=Apariencia')
    page.click('label.color[title="Azul"]'); page.select_option('#f-tema', 'oscuro')
    page.click('button:has-text("Guardar cambios")'); page.wait_for_timeout(400)
    assert page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--primario').trim().toLowerCase()") == '#1d4ed8'
    page.goto(URL + '#/'); page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/22-dashboard-oscuro.png')
    page.goto(URL + '#/configuracion'); page.wait_for_selector('text=Apariencia')
    page.click('label.color[title="Verde"]'); page.select_option('#f-tema', 'auto'); page.click('button:has-text("Guardar cambios")'); page.wait_for_timeout(300)

    # --- PIN ---
    page.goto(URL + '#/seguridad'); page.click('button:has-text("Activar PIN")')
    page.fill('#pin1', '2468'); page.fill('#pin2', '2468'); page.click('#pin-ok'); page.wait_for_timeout(1500)
    assert 'Activado' in page.inner_text('main')
    page.goto(URL + '#/'); page.wait_for_timeout(200)
    page.reload(); page.wait_for_selector('.bloqueo')
    assert page.evaluate("getComputedStyle(document.querySelector('.principal')).visibility") == 'hidden'
    page.screenshot(path=f'{OUT}/23-bloqueo.png')
    for t in '1111': page.click(f'.tecla[data-n="{t}"]')
    page.click('.bloqueo-caja button.btn-pri'); page.wait_for_timeout(1200)
    assert 'incorrecto' in page.inner_text('#pin-error')
    page.fill('#pin-entrada', '2468'); page.click('.bloqueo-caja button.btn-pri')
    page.wait_for_selector('.bloqueo', state='detached', timeout=5000)
    page.wait_for_selector('text=Capital prestado')
    cfg = page.evaluate("""new Promise(r => { const q = indexedDB.open('carterapro'); q.onsuccess = () => {
      const g = q.result.transaction('config').objectStore('config').get('principal'); g.onsuccess = () => r(g.result); }; })""")
    assert '2468' not in json.dumps(cfg) and len(cfg['pinHash']) == 64

    # --- Sin conexión ---
    page.evaluate("navigator.serviceWorker.ready")
    page.reload(); page.wait_for_selector('.bloqueo'); page.fill('#pin-entrada', '2468'); page.click('.bloqueo-caja button.btn-pri')
    page.wait_for_selector('text=Capital prestado')
    assert page.evaluate("!!navigator.serviceWorker.controller")
    ctx.set_offline(True)
    page.reload(); page.wait_for_selector('.bloqueo', timeout=10000); page.fill('#pin-entrada', '2468'); page.click('.bloqueo-caja button.btn-pri')
    page.wait_for_selector('text=Capital prestado', timeout=10000)
    for ruta in ['#/clientes', '#/reportes', '#/calendario', '#/copia', '#/instalar', '#/seguridad']:
        page.goto(URL + ruta); page.wait_for_timeout(300)
        assert page.locator('text=No pudimos mostrar esta pantalla').count() == 0, ruta
    page.goto(URL + '#/pagos/nuevo'); page.wait_for_timeout(200)
    page.locator('#lista a.fila').first.click(); page.wait_for_timeout(300)
    if page.locator('#lista a.fila').count(): page.locator('#lista a.fila').first.click()
    page.wait_for_selector('#f-monto'); page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    assert page.locator('.indicador-offline').is_visible()
    page.screenshot(path=f'{OUT}/24-pago-sin-conexion.png')
    ctx.set_offline(False)
    ctx.close(); b.close()

reales = [e for e in errores if 'favicon' not in e and 'ERR_INTERNET_DISCONNECTED' not in e]
print('ERRORES CONSOLA:', reales or 'ninguno')
print('E2E ETAPA 4 OK' if not reales else 'E2E CON ERRORES')
