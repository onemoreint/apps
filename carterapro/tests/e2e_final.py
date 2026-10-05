"""Etapa 5 — caso de la especificación (sección 44), accesibilidad básica y rendimiento.
Carlos Pérez · $1.000.000 · 10% sobre capital · 20 cuotas diarias, con pago completo, parcial y atrasado.
Uso: python3 tests/e2e_final.py [carpeta_capturas]  (servidor en :8080)"""
import sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8080/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
errores = []
iso = lambda d: d.isoformat()

def vigilar(page):
    page.on('console', lambda m: m.type == 'error' and errores.append(m.text))
    page.on('pageerror', lambda e: errores.append(str(e)))

def pagar(page, monto, fecha):
    page.click('.credito-acciones >> text=Registrar pago'); page.wait_for_selector('#f-monto')
    page.fill('#f-monto', monto); page.fill('#f-fecha', fecha)
    page.click('button:has-text("Guardar pago")'); page.wait_for_selector('h1:has-text("Pago registrado")')
    texto = page.inner_text('.recibo-datos')
    page.click('text=Ver crédito'); page.wait_for_selector('text=Pagos recibidos')
    return texto

def sin_etiqueta(page):
    return page.evaluate("""[...document.querySelectorAll('main input, main select, main textarea')]
      .filter(e => e.type !== 'hidden' && !e.closest('.oculto') && !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'))
      .map(e => e.name || e.id)""")

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = ctx.new_page(); vigilar(page)
    page.goto(URL); page.wait_for_selector('text=Bienvenido a CarteraPro')
    hoy = date.fromisoformat(page.evaluate("import('./js/core/dates.js').then(m => m.hoy())"))
    inicio = hoy - timedelta(days=10)

    # Negocio, cliente y crédito
    page.click('text=Comenzar'); page.fill('#f-nombreNegocio', 'Créditos JL'); page.click('button:has-text("Continuar")')
    page.wait_for_selector('#f-nombreCompleto'); assert sin_etiqueta(page) == [], sin_etiqueta(page)
    page.fill('#f-nombreCompleto', 'Carlos Pérez'); page.fill('#f-telefono', '3001234567')
    page.click('button:has-text("Guardar cliente")'); page.click('dialog button:has-text("Guardar")')
    page.wait_for_selector('#f-monto'); assert sin_etiqueta(page) == [], sin_etiqueta(page)
    page.fill('#f-monto', '1.000.000'); page.fill('#f-tasa', '10'); page.fill('#f-numeroCuotas', '20')
    page.fill('#f-fechaInicio', iso(inicio)); page.dispatch_event('#f-fechaInicio', 'change'); page.wait_for_timeout(150)
    assert page.input_value('#f-fechaPrimerVencimiento') == iso(inicio + timedelta(days=1))
    page.click('button:has-text("Crear crédito")'); page.click('dialog button:has-text("Crear crédito")')
    page.wait_for_selector('text=Pagos recibidos')
    assert 'cuotas vencidas' in page.inner_text('.credito-cabeza')  # 9 cuotas ya vencidas

    # 1. Pago completo, a tiempo (cuota 1)
    r = pagar(page, '55.000', iso(inicio + timedelta(days=1)))
    assert '1.045.000' in r, r
    # 2. Pago parcial (cuota 2)
    r = pagar(page, '30.000', iso(inicio + timedelta(days=2)))
    assert '1.015.000' in r, r
    # 3. Pago atrasado, hoy: completa la 2 y paga la 3 y la 4
    r = pagar(page, '135.000', iso(hoy))
    assert '880.000' in r and '2, 3, 4' in r, r

    cab = page.inner_text('.credito-cabeza').replace('\xa0', ' ')
    assert '880.000' in cab and '4 de 20' in cab and '5 cuotas vencidas por $ 275.000' in cab, cab
    cuotas = page.inner_text('.cuotas')
    assert 'días tarde' in cuotas  # cuota 3 quedó pagada con atraso
    assert page.locator('.cuota-vencido').count() == 5 and page.locator('.cuota-pagado').count() == 4
    page.screenshot(path=f'{OUT}/30-final-credito.png', full_page=True)

    # Dashboard
    page.goto(URL + '#/'); page.wait_for_selector('text=Capital prestado')
    kp = page.inner_text('.kpis')
    for v in ['880.000', '275.000', '200.000', '20.000']: assert v in kp, (v, kp)
    assert '1 cuota vence hoy' in page.inner_text('.alertas')

    # Historial y perfil del cliente
    page.goto(URL + '#/clientes'); page.click('text=Carlos Pérez'); page.wait_for_selector('text=Historial de créditos')
    perfil = page.inner_text('main')
    assert '4/20 cuotas' in perfil and 'Alto riesgo' in perfil and 'no constituye una evaluación crediticia oficial' in perfil

    # Reportes
    page.goto(URL + f'#/reportes?periodo=PERSONALIZADO&desde={iso(hoy - timedelta(days=30))}&hasta={iso(hoy)}'); page.wait_for_timeout(300)
    rep = page.inner_text('main')
    assert '220.000' in rep and '3 pagos' in rep and 'Carlos Pérez' in page.inner_text('.tabla')

    # Cobranzas y calendario
    page.goto(URL + '#/cobranzas?tab=VENCIDOS'); page.wait_for_timeout(200)
    assert page.locator('article.cobro').count() == 5
    page.goto(URL + f'#/calendario?mes={iso(inicio)[:7]}&dia={iso(inicio + timedelta(days=5))}'); page.wait_for_timeout(200)
    assert page.locator('.cal-celda.sel.cal-rojo').count() == 1

    # Analista IA y ayuda
    page.goto(URL + '#/analista'); page.wait_for_selector('.hallazgos')
    assert 'Morosidad alta' in page.inner_text('.hallazgos') and 'Carlos' not in page.inner_text('.pre-codigo')
    page.screenshot(path=f'{OUT}/31-analista.png', full_page=True)
    page.goto(URL + '#/ayuda'); page.wait_for_selector('text=Aviso legal')

    # Etiquetas en formularios principales
    for ruta in ['#/configuracion', '#/pagos/nuevo?cliente=x', '#/copia', '#/seguridad']:
        page.goto(URL + ruta); page.wait_for_timeout(250)
        assert sin_etiqueta(page) == [], (ruta, sin_etiqueta(page))

    # Navegación con teclado en escritorio: el primer Tab muestra "Saltar al contenido"
    ctx2 = b.new_context(viewport={'width': 1366, 'height': 900}); pg = ctx2.new_page(); vigilar(pg)
    pg.goto(URL); pg.click('text=Ver demo'); pg.wait_for_selector('text=Capital prestado', timeout=15000)
    pg.reload(); pg.wait_for_selector('text=Capital prestado')
    pg.keyboard.press('Tab')
    assert pg.evaluate("document.activeElement.className") == 'saltar'

    # Rendimiento: 300 clientes y 300 créditos más
    t0 = time.time()
    pg.evaluate("""async () => {
      const cli = await import('./js/services/clientes.js'); const cre = await import('./js/services/creditos.js');
      const d = await import('./js/core/dates.js');
      for (let i = 0; i < 300; i++) {
        const c = await cli.guardar({ nombreCompleto: 'Cliente Prueba ' + i, telefono: String(3100000000 + i) });
        await cre.crear({ clienteId: c.id, montoPrestado: 500000 + i * 1000, tipoInteres: 'PCT_CAPITAL', tasaBp: 1000, interesFijo: 0,
          numeroCuotas: 24, frecuencia: 'SEMANAL', fechaInicio: d.sumarDias(d.hoy(), -(i % 90)), fechaPrimerVencimiento: d.sumarDias(d.hoy(), 7 - (i % 90)),
          excluirDomingos: false, diasGracia: 0, notas: '' });
      }
    }""")
    carga = time.time() - t0
    tiempos = {}
    for ruta in ['#/', '#/clientes', '#/creditos', '#/cobranzas', '#/reportes', '#/calendario']:
        t1 = time.time(); pg.goto(URL + ruta); pg.wait_for_selector('main h1'); pg.wait_for_timeout(50)
        tiempos[ruta] = round(time.time() - t1, 2)
    print(f'Carga de 300 clientes + 300 créditos (7.200 cuotas): {carga:.1f}s')
    print('Tiempo por pantalla (s):', tiempos)
    assert max(tiempos.values()) < 2.0, tiempos
    pg.goto(URL + '#/'); pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/32-dashboard-300.png', full_page=False)
    ctx2.close(); ctx.close(); b.close()

reales = [e for e in errores if 'favicon' not in e]
print('ERRORES CONSOLA:', reales or 'ninguno')
print('E2E FINAL OK' if not reales else 'E2E CON ERRORES')
