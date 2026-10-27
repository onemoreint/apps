"""Versión 2 en Chromium: entrada con logo, ruta, caja, multas, renovación y usura.
Uso: python3 tests/e2e_v2.py [carpeta-capturas] (con servidor en :8080)."""
import sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8080/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
errores = []

def vigilar(page):
    page.on('console', lambda m: m.type == 'error' and errores.append(m.text))
    page.on('pageerror', lambda e: errores.append(str(e)))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = ctx.new_page(); vigilar(page)

    # ---- Pantalla de entrada: aparece al abrir y se retira sola ----
    page.goto(URL)
    assert page.locator('#splash').count() == 1
    page.wait_for_timeout(800); page.screenshot(path=f'{OUT}/v2-01-entrada.png')
    page.wait_for_selector('#splash', state='detached', timeout=5000)

    page.click('text=Ver demo'); page.wait_for_selector('text=Capital prestado', timeout=20000)
    assert 'Ruta de hoy' in page.inner_text('main')

    # ---- Ruta: registrar "no pagó" con promesa y cobrar desde la ruta ----
    page.goto(URL + '#/ruta'); page.wait_for_selector('.parada')
    pendientes = page.locator('#ruta > .parada').count()
    page.locator('#ruta > .parada').first.locator('[data-accion="noPago"]').click()
    page.click('dialog label:has-text("Prometió pagar")'); page.click('dialog button:has-text("Guardar visita")')
    page.wait_for_timeout(400)
    assert page.locator('#ruta > .parada').count() == pendientes - 1
    assert 'Visitado sin pago' in page.inner_text('.ruta-hechas')
    page.locator('#ruta > .parada').first.locator('a.btn-pri').click()
    page.wait_for_selector('#f-monto'); page.click('button:has-text("Guardar pago")')
    page.wait_for_selector('h1:has-text("Pago registrado")'); page.click('text=Seguir con la ruta')
    page.wait_for_selector('.ruta-avance'); page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/v2-02-ruta.png', full_page=True)

    # Ordenar la ruta: mover la primera parada al final y guardar.
    page.goto(URL + '#/ruta?ordenar=1'); page.wait_for_selector('[data-accion="bajar"]')
    primero = page.locator('#ruta > .parada').first.get_attribute('data-id')
    for _ in range(page.locator('#ruta > .parada').count()): page.locator(f'.parada[data-id="{primero}"] [data-accion="bajar"]').click()
    page.click('button:has-text("Guardar orden")'); page.wait_for_timeout(400)
    page.goto(URL + '#/ruta?ordenar=1'); page.wait_for_selector('#ruta > .parada')
    assert page.locator('#ruta > .parada').last.get_attribute('data-id') == primero

    # ---- Caja: gasto, cierre con faltante del cobrador ----
    page.goto(URL + '#/caja'); page.wait_for_selector('.liquidacion')
    page.select_option('#cobrador', label='Pedro Gil'); page.wait_for_timeout(400)
    assert 'Base entregada' in page.inner_text('.liquidacion')
    page.click('[data-accion="gasto"]'); page.fill('dialog #f-monto', '8.000'); page.fill('dialog #f-descripcion', 'Parqueadero')
    page.click('dialog button:has-text("Guardar gasto")'); page.wait_for_timeout(400)
    assert 'Parqueadero' in page.inner_text('main')
    page.click('[data-accion="cerrar"]'); page.fill('dialog #f-entregado', '1000'); page.click('dialog button:has-text("Guardar cierre")')
    page.wait_for_timeout(400)
    assert 'faltante' in page.inner_text('.liquidacion')
    page.screenshot(path=f'{OUT}/v2-03-caja.png', full_page=True)
    page.goto(URL + '#/gastos'); page.wait_for_timeout(300)
    assert 'Parqueadero' in page.inner_text('main') and 'Por categoría' in page.inner_text('main')

    # ---- Multa: cobrarla junto con la cuota y verla en el recibo ----
    page.goto(URL + '#/clientes'); page.click('text=Ana Torres'); page.locator('a.fila').first.click()
    page.wait_for_selector('text=Cobro y mora')
    assert 'Cobrar multa' in page.inner_text('main')
    page.click('.credito-acciones >> text=Registrar pago'); page.wait_for_selector('.tarjeta-multa')
    page.check('input[name="cobrarMulta"]'); page.fill('#f-multa', '10.000')
    assert 'Total recibido' in page.inner_text('#total-recibido')
    page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    assert 'Multa cobrada' in page.inner_text('main')
    page.click('text=Ver recibo'); page.wait_for_selector('.recibo')
    assert 'Multa por mora' in page.inner_text('.recibo')

    # ---- Renovación: el saldo pasa al crédito nuevo y solo se entrega la diferencia ----
    page.goto(URL + '#/clientes'); page.click('text=Carlos Pérez'); page.locator('a.fila').first.click()
    page.wait_for_selector('text=Pagos recibidos'); page.click('text=Renovar')
    page.wait_for_selector('h1:has-text("Renovar crédito")')
    page.fill('#f-monto', '1.500.000'); page.wait_for_timeout(200)
    assert 'Entregas en efectivo' in page.inner_text('#neto')
    page.click('button:has-text("Renovar crédito")'); page.click('dialog button:has-text("Renovar")')
    page.wait_for_selector('text=Renovación del crédito')
    page.screenshot(path=f'{OUT}/v2-04-renovacion.png', full_page=True)
    page.click('.aviso-azul a'); page.wait_for_selector('text=se renovó')
    assert 'Renovación' in page.inner_text('.pagos-lista')

    # ---- Usura: alerta al superar el tope configurado ----
    page.goto(URL + '#/configuracion'); page.fill('#f-tasaUsura', '26,5'); page.click('button:has-text("Guardar cambios")')
    page.wait_for_timeout(400)
    page.goto(URL + '#/creditos/nuevo'); page.wait_for_selector('#f-monto')
    page.select_option('#f-clienteId', index=1); page.fill('#f-monto', '1.000.000'); page.fill('#f-tasa', '10'); page.wait_for_timeout(300)
    assert 'por encima del tope' in page.inner_text('#resumen')

    # ---- Pantallas nuevas sin errores (escritorio) ----
    ctx.close()
    ctx = b.new_context(viewport={'width': 1366, 'height': 900}); page = ctx.new_page(); vigilar(page)
    page.goto(URL); page.click('text=Ver demo'); page.wait_for_selector('text=Capital prestado', timeout=20000)
    for ruta in ['#/ruta', '#/caja', '#/gastos', '#/cobradores', '#/configuracion', '#/mas']:
        page.goto(URL + ruta); page.wait_for_timeout(300)
        assert page.locator('text=No pudimos mostrar esta pantalla').count() == 0, ruta
    page.screenshot(path=f'{OUT}/v2-05-caja-escritorio.png', full_page=True)
    b.close()

print('ERRORES CONSOLA:', errores or 'ninguno')
assert not errores
print('E2E V2 OK')
