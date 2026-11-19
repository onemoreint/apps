"""Pruebas funcionales de extremo a extremo (Playwright + Chrome).
Uso:  python3 -m http.server 8765  (desde la carpeta del proyecto)
      python3 tests/e2e.py [URL] [ancho]
Verifica los flujos obligatorios del MVP y termina con código 1 si algo falla."""
import sys, json, re
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
WIDTH = int(sys.argv[2]) if len(sys.argv) > 2 else 1366
results, errors = [], []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

def count(pg, js):
    return pg.evaluate(js)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': WIDTH, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.add_init_script("window.print = () => { window.__printed = (window.__printed||0) + 1; };")
    pg.goto(URL); pg.wait_for_selector('.kpis')
    go = lambda h: (pg.evaluate(f"location.hash='{h}'"), pg.wait_for_timeout(300))
    n0 = count(pg, 'AI.state.expedientes.length')
    check('Semilla con al menos 60 expedientes', n0 >= 60, n0)
    kpi = pg.inner_text('.kpis .kpi:first-child .val')
    check('KPI total calculado desde registros', kpi == str(n0), kpi)

    # 1. Validación + creación
    go('#/expedientes'); pg.click('[data-action="exp-new"]'); pg.wait_for_selector('#exp-form')
    pg.click('[data-action="exp-form-save"]'); pg.wait_for_timeout(200)
    check('Validación bloquea formulario vacío', pg.locator('#exp-form .field.invalid').count() >= 2, pg.locator('#exp-form .field.invalid').count())
    pg.select_option('#exp-form [name=dependencia]', 'HAC')
    pg.fill('#exp-form [name=nombre]', 'Acuerdo de pago de impuesto predial vigencia 2026 predio demo 900')
    pg.click('[data-action="exp-form-archi"]'); pg.wait_for_timeout(300)
    check('ARCHI sugiere serie dentro del formulario', pg.input_value('#exp-form [name=serie]') == 'S08', pg.input_value('#exp-form [name=serie]'))
    pg.click('[data-action="exp-gen-code"]')
    code = pg.input_value('#exp-form [name=codigo]')
    pg.fill('#exp-form [name=responsable]', 'Técnico de archivo HAC-09')
    pg.fill('#exp-form [name=ubicacion]', 'Archivo de gestión HAC · Estante 1 · Caja 2')
    pg.click('[data-action="exp-form-save"]'); pg.wait_for_timeout(400)
    created = pg.evaluate(f"AI.state.expedientes.find(e=>e.codigo==='{code}')")
    check('Creación de expediente', created and created['subserie'] == 'S08.3', code)
    # código duplicado
    pg.click('[data-action="exp-new"]'); pg.wait_for_selector('#exp-form')
    pg.select_option('#exp-form [name=dependencia]', 'HAC'); pg.fill('#exp-form [name=codigo]', code)
    pg.fill('#exp-form [name=nombre]', 'Otro expediente con el mismo código')
    pg.click('[data-action="exp-form-save"]'); pg.wait_for_timeout(200)
    check('Validación de código único', 'Ya existe' in pg.inner_text('#exp-form'))
    pg.keyboard.press('Escape')

    # 2. Edición
    eid = created['id']
    pg.evaluate(f"AI.expForm('{eid}')"); pg.wait_for_selector('#exp-form')
    pg.fill('#exp-form [name=responsable]', 'Profesional universitario HAC-03')
    pg.click('[data-action="exp-form-save"]'); pg.wait_for_timeout(300)
    check('Edición de registro', pg.evaluate(f"AI.store.expById('{eid}').responsable") == 'Profesional universitario HAC-03')
    check('Auditoría registra la edición', pg.evaluate(f"AI.state.auditoria.some(a=>a.entidadId==='{eid}' && a.accion==='Edición')"))

    # 3-4. Búsqueda y filtros en inventario
    go('#/inventario'); pg.fill('#inv-q', code); pg.wait_for_timeout(400)
    check('Búsqueda instantánea', pg.locator('#inv-table tbody tr').count() == 1 and code in pg.inner_text('#inv-table'))
    pg.fill('#inv-q', ''); pg.wait_for_timeout(300)
    pg.select_option('[data-f=estado]', 'Cerrado'); pg.wait_for_timeout(300)
    estados = pg.locator('#inv-table tbody td[data-label=Estado]').all_inner_texts()
    check('Filtro por estado', len(estados) > 0 and all(e.strip() == 'Cerrado' for e in estados), len(estados))
    pg.select_option('[data-f=estado]', ''); pg.select_option('[data-f=dep]', 'SAL'); pg.wait_for_timeout(300)
    deps = pg.locator('#inv-table tbody td[data-label=Dependencia]').all_inner_texts()
    check('Filtro por dependencia', len(deps) > 0 and all('Salud' in d for d in deps))
    pg.click('[data-action=inv-clear]'); pg.wait_for_timeout(200)
    pg.select_option('#inv-sort', 'fechaApertura:1'); pg.wait_for_timeout(200)
    fechas = pg.locator('#inv-table tbody td[data-label=Fecha]').all_inner_texts()
    iso = ['-'.join(reversed(f.split('/'))) for f in fechas]
    check('Ordenamiento por fecha', iso == sorted(iso))
    with pg.expect_download() as d: pg.click('[data-action=inv-csv]')
    path = d.value.path(); csv = open(path, encoding='utf-8-sig').read()
    check('Exportación CSV de inventario', csv.startswith('Código;Dependencia') and csv.count('\n') == n0 + 1, csv.count('\n'))
    pg.click('[data-action=inv-print]')
    check('Vista imprimible de inventario', pg.evaluate('window.__printed') == 1 and 'Inventario documental' in pg.inner_text('#print-area'))

    # 5. Cambio de estado
    act = pg.evaluate("AI.state.expedientes.find(e=>e.estado==='Activo' && e.serie && e.responsable && e.ubicacion && e.dependencia==='GA').id")
    pg.evaluate(f"AI.expDetail('{act}')"); pg.wait_for_selector('#modal-foot [data-action=exp-state]')
    pg.click('#modal-foot [data-action=exp-state]'); pg.wait_for_selector('[data-cd=si]'); pg.fill('#cd-nota', 'Cierre de prueba'); pg.click('[data-cd=si]'); pg.wait_for_timeout(400)
    e2 = pg.evaluate(f"AI.store.expById('{act}')")
    check('Cambio de estado (Activo → Cerrado con fecha)', e2['estado'] == 'Cerrado' and e2['fechaCierre'] != '')

    # 6. Transferencia completa
    go('#/transferencias'); pg.click('[data-action=tr-new]'); pg.wait_for_selector('#tr-form')
    pg.select_option('#tr-form [name=dependencia]', 'GA'); pg.wait_for_timeout(200)
    disabled = pg.locator('#tr-exps input:disabled').count()
    check('Expedientes no elegibles deshabilitados', disabled > 0, disabled)
    pg.check(f'#tr-exps input[value="{act}"]')
    pg.fill('#tr-form [name=responsable]', 'Profesional universitario GA-02')
    pg.click('[data-action=tr-save]'); pg.wait_for_timeout(400)
    tr = pg.evaluate(f"AI.state.transferencias.find(t=>t.expedientes.includes('{act}') && t.estado==='Borrador')")
    check('Creación de transferencia en Borrador', tr is not None)
    steps = ['En revisión', 'Devuelta para corrección', 'En revisión', 'Pendiente de aprobación', 'Aprobada', 'Completada']
    for to in steps:
        pg.evaluate(f"AI.actions['tr-view']({{dataset:{{id:'{tr['id']}'}}}})"); pg.wait_for_timeout(150)
        pg.click(f'[data-action=tr-advance][data-to="{to}"]'); pg.wait_for_selector('[data-cd=si]')
        if to == 'Devuelta para corrección':
            pg.click('[data-cd=si]'); pg.wait_for_timeout(100)
            check('Devolución exige motivo', pg.is_visible('#cd-err'))
            pg.fill('#cd-nota', 'Falta foliación')
        pg.click('[data-cd=si]'); pg.wait_for_timeout(350)
    t2 = pg.evaluate(f"AI.store.trById('{tr['id']}')")
    check('Flujo de transferencia hasta Completada', t2['estado'] == 'Completada' and len(t2['historial']) == 7, [h['estado'] for h in t2['historial']])
    e3 = pg.evaluate(f"AI.store.expById('{act}')")
    check('Expediente pasa a archivo central', e3['estado'] == 'Transferido' and e3['archivo'] == 'Central')
    pg.evaluate(f"AI.actions['tr-receipt']({{dataset:{{id:'{tr['id']}'}}}})")
    check('Comprobante de transferencia', 'Comprobante de transferencia' in pg.inner_text('#print-area') and tr['numero'] in pg.inner_text('#print-area'))

    # 7. Alertas + acción correctiva
    go('#/alertas')
    before = pg.evaluate("AI.store.computeAlertas().filter(a=>!a.atendida).length")
    pg.select_option('#al-dep', 'EDU'); pg.wait_for_timeout(200)
    check('Filtro de alertas por dependencia', all('Educación' in t for t in pg.locator('#al-list .list-item .m').all_inner_texts()))
    pg.locator('[data-action=al-accion]').first.click(); pg.wait_for_selector('#acc-form')
    pg.fill('#acc-form [name=descripcion]', 'Se completó la información con el responsable.'); pg.select_option('#acc-form [name=estado]', 'Resuelta')
    pg.click('[data-action=al-accion-save]'); pg.wait_for_timeout(300)
    after = pg.evaluate("AI.store.computeAlertas().filter(a=>!a.atendida).length")
    check('Registro de acción correctiva', after == before - 1, f'{before}->{after}')

    # 8. Informes
    go('#/informes')
    ok = True
    for tipo in ['general', 'dependencia', 'transferencias', 'incompletos', 'pendientes', 'ejecutivo']:
        pg.select_option('#rep-tipo', tipo); pg.click('[data-action=rep-gen]'); pg.wait_for_timeout(150)
        ok = ok and pg.locator('#report-doc tbody tr').count() > 0
    check('Generación de los 6 informes', ok)
    with pg.expect_download() as d: pg.click('[data-action=rep-csv]')
    check('Exportación CSV de informe', 'Indicador;Valor' in open(d.value.path(), encoding='utf-8-sig').read())
    pg.click('[data-action=rep-print]')
    check('Vista imprimible de informe', 'Resumen ejecutivo' in pg.inner_text('#print-area'))

    # 9. ARCHI IA
    go('#/asistente'); pg.click('[data-action=archi-example]'); pg.wait_for_timeout(300)
    txt = pg.inner_text('#archi-result')
    check('Simulación de clasificación', 'Peticiones, quejas y reclamos' in txt and 'Quejas y reclamos' in txt and 'no se usó un modelo de IA' in txt)
    pend0 = pg.evaluate('AI.state.expedientes.filter(AI.store.isPendienteClasif).length')
    pid = pg.evaluate('AI.state.expedientes.find(AI.store.isPendienteClasif).id')
    go(f'#/asistente?exp={pid}&run=1'); pg.wait_for_timeout(400)
    if pg.locator('[data-action=archi-apply]').count():
        pg.locator('[data-action=archi-apply]').first.click(); pg.wait_for_selector('[data-cd=si]'); pg.click('[data-cd=si]'); pg.wait_for_timeout(400)
        pend1 = pg.evaluate('AI.state.expedientes.filter(AI.store.isPendienteClasif).length')
        check('Validación humana aplica clasificación', pend1 == pend0 - 1 and pg.evaluate(f"AI.state.auditoria.some(a=>a.entidadId==='{pid}' && a.accion==='Clasificación validada')"))
    else:
        check('Validación humana aplica clasificación', False, 'sin sugerencias para ' + pid)

    # 10. Productividad
    go('#/productividad')
    pg.fill('[data-p=funcionarios]', '2'); pg.fill('[data-p=dias]', '20'); pg.wait_for_timeout(200)
    expected = sum(a['tradicional'] * a['diarias'] for a in pg.evaluate('AI.state.config.productividad.actividades')) * 2 * 20 / 60
    shown = pg.inner_text('#prod-out .kpi:first-child .val')
    num = float(shown.replace(' h', '').replace('.', '').replace(',', '.'))
    check('Calculadora de productividad', abs(num - round(expected, 1)) < 0.11, f'{shown} vs {expected}')
    check('Aviso de simulación hipotética', 'Simulación hipotética' in pg.inner_text('#view'))

    # 11. Persistencia
    pg.reload(); pg.wait_for_selector('#prod-out .kpi')
    check('Persistencia tras recargar (IndexedDB)', pg.evaluate(f"!!AI.state.expedientes.find(e=>e.codigo==='{code}')") and pg.evaluate("AI.state.config.productividad.funcionarios") == 2)

    # 12. Respaldo JSON export/import
    go('#/configuracion')
    with pg.expect_download() as d: pg.click('[data-action=cfg-export]')
    backup = json.load(open(d.value.path(), encoding='utf-8'))
    check('Exportación de respaldo JSON', backup['app'] == 'archivo-inteligente-ia' and len(backup['expedientes']) == n0 + 1)
    # inyección HTML: crear un expediente malicioso e importarlo
    backup['expedientes'][0]['nombre'] = '<img src=x onerror="window.__xss=1">Prueba'
    import tempfile, os
    tf = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(backup, tf); tf.close()
    pg.set_input_files('#cfg-import', tf.name); pg.wait_for_selector('[data-cd=si]'); pg.click('[data-cd=si]'); pg.wait_for_timeout(800)
    go('#/inventario'); pg.fill('#inv-q', 'Prueba'); pg.wait_for_timeout(400)
    check('Importación de respaldo JSON', pg.evaluate('AI.state.expedientes.length') == n0 + 1)
    check('Contenido HTML escapado (sin XSS)', pg.evaluate('!window.__xss') and pg.locator('#inv-table img').count() == 0)
    os.unlink(tf.name)

    # 13. Municipio
    pg.select_option('#muni-select', 'laestrella'); pg.wait_for_timeout(300)
    check('Selector de municipio', 'La Estrella' in pg.evaluate('document.title'))

    # 14. Restaurar demo
    go('#/configuracion'); pg.click('[data-action=cfg-reset]'); pg.wait_for_selector('[data-cd=si]'); pg.click('[data-cd=si]'); pg.wait_for_timeout(1000)
    check('Restauración de datos de demostración', pg.evaluate('AI.state.expedientes.length') == n0 and pg.evaluate("location.hash") == '#/dashboard')
    check('Leyenda permanente de prototipo', 'Datos ficticios' in pg.inner_text('.demo-banner'))
    b.close()

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    print(('OK   ' if ok else 'FALLA') + f'  {n}' + (f'  [{d}]' if (d != '' and not ok) else ''))
print(f'\n{len(results) - len(fails)}/{len(results)} verificaciones correctas (ancho {WIDTH}px)')
if errors: print('Errores de consola:', *errors[:10], sep='\n  ')
sys.exit(1 if fails or errors else 0)
