"""Versión de prueba y activación con licencia, de punta a punta.
Uso: python3 tests/e2e_licencia.py RUTA-CLAVE-PRIVADA.json [carpeta-capturas]
Necesita el servidor en la carpeta raíz del repositorio (python3 -m http.server 8090 desde apps/),
porque usa la app y el generador de licencias. La clave privada NO se guarda en el repositorio."""
import sys
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print('Falta la ruta de la clave privada: se omite la prueba.'); sys.exit(0)
CLAVE = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else '.'
BASE = 'http://localhost:8090/'
APP = BASE + 'carterapro/'
errores = []

def vigilar(page):
    page.on('console', lambda m: m.type == 'error' and errores.append(m.text))
    page.on('pageerror', lambda e: errores.append(str(e)))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    # En localhost la app es completa; esta bandera simula un teléfono real (versión de prueba).
    ctx.add_init_script("localStorage.setItem('carterapro-forzar-prueba', '1')")
    page = ctx.new_page(); vigilar(page)

    # ---- Versión de prueba: aviso, límites y funciones bloqueadas ----
    page.goto(APP); page.click('text=Comenzar')
    page.fill('#f-nombreNegocio', 'Prueba Licencia'); page.click('button:has-text("Continuar")')
    for i in range(5):
        page.goto(APP + '#/clientes/nuevo'); page.wait_for_selector('#f-nombreCompleto')
        page.fill('#f-nombreCompleto', f'Cliente Prueba {i + 1}'); page.fill('#f-telefono', f'30012345{i:02d}')
        page.click('button:has-text("Guardar cliente")'); page.click('dialog button:has-text("Guardar")')
        page.wait_for_selector('text=Historial de créditos')
    page.goto(APP + '#/'); page.wait_for_selector('text=Versión de prueba')
    assert '5/5 clientes' in page.inner_text('main')
    page.goto(APP + '#/clientes/nuevo'); page.wait_for_timeout(300)
    assert 'Llegaste a los 5 clientes' in page.inner_text('main')
    page.screenshot(path=f'{OUT}/lic-01-limite.png')
    page.goto(APP + '#/copia'); page.wait_for_selector('text=Exportar copia completa')
    page.click('button:has-text("Exportar copia completa")'); page.wait_for_selector('.toast:has-text("versión completa")')
    page.goto(APP + '#/activar'); page.wait_for_selector('text=Activar versión completa')
    page.fill('textarea[name="codigo"]', 'CP1.falso.falso'); page.click('button:has-text("Activar")'); page.wait_for_timeout(300)
    assert 'no es válida' in page.inner_text('main') or 'formato' in page.inner_text('main')

    # ---- Generador: cargar clave y emitir licencia ----
    gen = ctx.new_page(); vigilar(gen)
    gen.goto(BASE + 'carterapro-licencias/'); gen.set_input_files('#archivo-clave', CLAVE)
    gen.wait_for_selector('#generar:not(.oculto)')
    gen.fill('input[name="nombre"]', 'Carlos Pérez'); gen.fill('input[name="ref"]', 'Venta ML 123')
    gen.click('button:has-text("Generar licencia")'); gen.wait_for_selector('#resultado:not(.oculto)')
    enlace = gen.input_value('#res-enlace'); codigo = gen.input_value('#res-codigo')
    assert enlace.startswith('https://onemoreint.github.io/apps/carterapro/#/activar?l=CP1.') and codigo in enlace
    assert 'Carlos Pérez' in gen.inner_text('#historial')
    gen.screenshot(path=f'{OUT}/lic-02-generador.png', full_page=True)

    # ---- Activar con el enlace (misma ruta, en el servidor local) ----
    page.goto(APP + '#/activar?l=' + codigo); page.wait_for_selector('text=Versión completa activa')
    assert 'Carlos Pérez' in page.inner_text('main')
    page.screenshot(path=f'{OUT}/lic-03-activada.png')
    page.goto(APP + '#/clientes/nuevo'); page.wait_for_selector('#f-nombreCompleto')  # sin límite
    page.goto(APP + '#/'); page.wait_for_timeout(300)
    assert 'Versión de prueba' not in page.inner_text('main')
    # Sigue activa al volver a abrir la app.
    page.reload(); page.wait_for_timeout(2500); page.goto(APP + '#/mas'); page.wait_for_timeout(300)
    assert 'Versión completa · Carlos Pérez' in page.inner_text('main')
    b.close()

print('ERRORES CONSOLA:', errores or 'ninguno')
assert not [e for e in errores if 'favicon' not in e]
print('E2E LICENCIA OK')
