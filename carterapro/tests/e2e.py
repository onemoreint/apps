"""Prueba de extremo a extremo en Chromium. Uso: python3 tests/e2e.py (con servidor en :8080)."""
import sys, re
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8080/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
errores = []

def vigilar(page):
    page.on('console', lambda m: m.type == 'error' and errores.append(m.text))
    page.on('pageerror', lambda e: errores.append(str(e)))

def sin_error_vista(page, ruta):
    assert page.locator('text=No pudimos mostrar esta pantalla').count() == 0, f'Error de vista en {ruta}'

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- 1. Flujo demo y recorrido por todas las pantallas (celular) ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = ctx.new_page(); vigilar(page)
    page.goto(URL)
    page.wait_for_selector('text=Bienvenido a CarteraPro')
    page.screenshot(path=f'{OUT}/01-bienvenida.png')
    page.click('text=Ver demo')
    page.wait_for_selector('text=Capital prestado', timeout=15000)
    page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/02-dashboard-movil.png', full_page=True)
    for ruta in ['#/clientes', '#/creditos', '#/pagos', '#/mas', '#/configuracion', '#/pagos/nuevo', '#/creditos/nuevo']:
        page.goto(URL + ruta); page.wait_for_timeout(250); sin_error_vista(page, ruta)
    page.goto(URL + '#/clientes'); page.wait_for_timeout(250)
    page.screenshot(path=f'{OUT}/03-clientes-movil.png', full_page=True)
    page.click('text=Carlos Pérez'); page.wait_for_selector('text=Historial de créditos')
    page.screenshot(path=f'{OUT}/04-perfil-movil.png', full_page=True)
    page.locator('a.fila').first.click(); page.wait_for_selector('text=Pagos recibidos')
    page.screenshot(path=f'{OUT}/05-credito-movil.png', full_page=True)

    # ---- Etapa 3 ----
    for ruta in ['#/cobranzas?tab=HOY', '#/cobranzas?tab=VENCIDOS', '#/cobranzas?tab=PROXIMOS', '#/cobranzas?tab=PENDIENTES', '#/cobranzas?tab=PAGADOS',
                 '#/calendario', '#/reportes?periodo=HOY', '#/reportes?periodo=SEMANA', '#/reportes?periodo=MES_ANTERIOR',
                 '#/reportes?periodo=PERSONALIZADO&desde=2026-01-01&hasta=2026-12-31', '#/buscar?q=carlos']:
        page.goto(URL + ruta); page.wait_for_timeout(250); sin_error_vista(page, ruta)
    page.goto(URL + '#/cobranzas?tab=VENCIDOS'); page.wait_for_timeout(250)
    assert 'Ana Torres' in page.inner_text('main')
    page.screenshot(path=f'{OUT}/10-cobranzas-movil.png', full_page=True)
    page.goto(URL + '#/calendario'); page.wait_for_timeout(250)
    assert page.locator('.cal-rojo').count() >= 1 and page.locator('.cal-punto-azul').count() >= 1
    page.screenshot(path=f'{OUT}/11-calendario-movil.png', full_page=True)
    page.goto(URL + '#/reportes?periodo=PERSONALIZADO&desde=2026-01-01&hasta=2026-12-31'); page.wait_for_timeout(300)
    assert page.locator('.g-barra').count() >= 3 and 'Mora por cliente' in page.inner_text('main')
    page.goto(URL + '#/buscar?q=R-000001'); page.wait_for_timeout(250)
    page.locator('#resultados a.fila').first.click(); page.wait_for_selector('.recibo')
    assert 'R-000001' in page.inner_text('.recibo')
    page.screenshot(path=f'{OUT}/12-recibo-movil.png', full_page=True)
    page.goto(URL + '#/buscar?q=%230003'); page.wait_for_timeout(250)
    assert 'Luis Rodríguez' in page.inner_text('#resultados')
    ctx.close()

    ctx = b.new_context(viewport={'width': 1366, 'height': 900})
    page = ctx.new_page(); vigilar(page)
    page.goto(URL); page.click('text=Ver demo'); page.wait_for_selector('text=Capital prestado', timeout=15000)
    page.goto(URL + '#/reportes?periodo=PERSONALIZADO&desde=2026-07-01&hasta=2026-10-31'); page.wait_for_timeout(400)
    page.screenshot(path=f'{OUT}/13-reportes-desktop.png', full_page=True)
    page.goto(URL + '#/calendario'); page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/14-calendario-desktop.png', full_page=True)
    ctx.close()

    # ---- 2. Flujo real desde cero: Carlos Pérez $1.000.000 al 10% en 20 cuotas ----
    ctx = b.new_context(viewport={'width': 1366, 'height': 900})
    page = ctx.new_page(); vigilar(page)
    page.goto(URL); page.wait_for_selector('text=Bienvenido a CarteraPro')
    page.click('text=Comenzar')
    page.fill('#f-nombreNegocio', 'Créditos JL')
    page.click('button:has-text("Continuar")')
    page.wait_for_selector('h1:has-text("Nuevo cliente")')
    page.fill('#f-nombreCompleto', 'Carlos Pérez'); page.fill('#f-telefono', '300 123 4567'); page.fill('#f-documento', '1023456789')
    page.click('button:has-text("Guardar cliente")')
    page.click('dialog button:has-text("Guardar")')
    page.wait_for_selector('h1:has-text("Nuevo crédito")')
    page.fill('#f-monto', '1.000.000'); page.fill('#f-tasa', '10')
    page.fill('#f-numeroCuotas', '20')
    page.wait_for_timeout(200)
    resumen = page.inner_text('#resumen')
    assert '1.100.000' in resumen and '55.000' in resumen, resumen
    page.screenshot(path=f'{OUT}/06-credito-form-desktop.png', full_page=True)
    page.click('button:has-text("Crear crédito")'); page.click('dialog button:has-text("Crear crédito")')
    page.wait_for_selector('text=Pagos recibidos')
    assert '1.100.000' in page.inner_text('.credito-saldo')

    # Pago completo de la cuota 1
    page.click('.credito-acciones >> text=Registrar pago')
    page.wait_for_selector('#f-monto')
    assert page.input_value('#f-monto') == '55.000'
    page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    assert 'R-000001' in page.inner_text('.recibo-datos') and '1.045.000' in page.inner_text('.recibo-datos')
    # Pago parcial de 30.000
    page.click('text=Ver crédito'); page.click('.credito-acciones >> text=Registrar pago')
    page.fill('#f-monto', '30000'); page.wait_for_timeout(100)
    assert 'Abono parcial' in page.inner_text('#aplicacion')
    page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    # Pago que cubre varias cuotas: 100.000 → completa la 2 (25.000), paga la 3 y abona 20.000 a la 4
    page.click('text=Ver crédito'); page.click('.credito-acciones >> text=Registrar pago')
    page.fill('#f-monto', '100.000'); page.wait_for_timeout(100)
    ap = page.inner_text('#aplicacion')
    assert ap.count('Queda pagada') == 2 and 'Abono parcial' in ap, ap
    page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    page.screenshot(path=f'{OUT}/07-pago-exito-desktop.png')
    page.click('text=Ver crédito'); page.wait_for_selector('text=Pagos recibidos')
    txt = page.inner_text('.credito-saldo')
    assert '915.000' in txt and '3 de 20' in txt, txt
    # Pago mayor que el saldo: debe rechazarse
    page.click('.credito-acciones >> text=Registrar pago'); page.fill('#f-monto', '5.000.000')
    page.click('button:has-text("Guardar pago")'); page.wait_for_timeout(150)
    assert 'mayor que el saldo' in page.inner_text('form')
    # Anular el último pago
    page.goto(URL + '#/creditos'); page.click('a.tarjeta-credito'); page.wait_for_selector('text=Pagos recibidos')
    page.locator('[data-accion="anular"]').first.click()
    page.fill('dialog input', 'Registrado por error'); page.click('dialog button:has-text("Anular pago")')
    page.wait_for_timeout(400)
    assert '1.015.000' in page.inner_text('.credito-saldo'), page.inner_text('.credito-saldo')
    page.screenshot(path=f'{OUT}/08-credito-desktop.png', full_page=True)
    # Dashboard refleja todo
    page.goto(URL + '#/'); page.wait_for_selector('text=Capital prestado')
    kp = page.inner_text('.kpis')
    assert '1.015.000' in kp or '1 M' in kp, kp
    page.screenshot(path=f'{OUT}/09-dashboard-desktop.png', full_page=True)
    # Ocultar valores
    page.click('#btn-ocultar'); page.wait_for_timeout(250)
    assert '••••••' in page.inner_text('.kpis')
    # Duplicado
    page.goto(URL + '#/clientes/nuevo'); page.fill('#f-nombreCompleto', 'Carlos Perez'); page.fill('#f-telefono', '3001234567')
    page.click('button:has-text("Guardar cliente")'); page.wait_for_selector('text=Posible cliente repetido')
    ctx.close()
    b.close()

reales = [e for e in errores if 'favicon' not in e and 'manifest' not in e]
print('ERRORES CONSOLA:', reales or 'ninguno')
print('E2E OK' if not reales else 'E2E CON ERRORES')
