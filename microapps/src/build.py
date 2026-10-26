#!/usr/bin/env python3
"""Genera cada microapp como carpeta autocontenida en microapps/<slug>/.

Uso: python3 microapps/src/build.py [slug ...]
Cada app vive en src/apps/<slug>/ con meta.json, body.html, app.js y app.css (opcional).
"""
import json, sys, html
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
BASE_URL = "https://onemoreint.github.io/apps/microapps/"
VERSION = "1.0.0"

CORE_CSS = (SRC / "core/core.css").read_text(encoding="utf-8")
CORE_JS = (SRC / "core/core.js").read_text(encoding="utf-8")

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:wght@400..700&display=swap" rel="stylesheet">')


def icon_svg(m, size=512, rounded=True):
    r = 112 if rounded else 0
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="{size}" height="{size}">'
            f'<rect width="512" height="512" rx="{r}" fill="{m["accent"]}"/>'
            f'<g transform="translate(96 96) scale(13.333)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{m["icon"]}</g></svg>')


def mark_svg(m):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{m["icon"]}</svg>'


def build(slug):
    d = SRC / "apps" / slug
    m = json.loads((d / "meta.json").read_text(encoding="utf-8"))
    body = (d / "body.html").read_text(encoding="utf-8")
    js = (d / "app.js").read_text(encoding="utf-8")
    css = (d / "app.css").read_text(encoding="utf-8") if (d / "app.css").exists() else ""
    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    url = BASE_URL + slug + "/"
    tabs = "".join(f'<button class="tab" role="tab" data-tab="{t[0]}">{html.escape(t[1])}</button>' for t in m.get("tabs", []))
    tabs_html = f'<nav class="tabs" role="tablist" aria-label="Secciones">{tabs}</nav>' if tabs else ""
    cfg = json.dumps({"id": m["id"], "name": m["name"], "version": VERSION}, ensure_ascii=False)
    t = html.escape
    page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t(m['name'])} | Microapps José Lugo</title>
<meta name="description" content="{t(m['desc'])}">
<meta name="author" content="José Lugo">
<meta name="theme-color" content="{m['accent']}">
<link rel="canonical" href="{url}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{t(m['short'])}">
<meta property="og:title" content="{t(m['name'])}: {t(m['tagline'])}">
<meta property="og:description" content="{t(m['desc'])}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{url}icon-512.png">
<meta property="og:locale" content="es_CO">
{FONTS}
<script>try{{var t=localStorage.getItem('ma:tema');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>{CORE_CSS}
:root{{--accent:{m['accent']};--accent-ink:{m['accentInk']};--accent-dark:{m['accentDark']}}}
{css}</style>
</head>
<body>
<header class="app-bar">
  <div class="app-bar-in">
    <div class="app-mark">{mark_svg(m)}</div>
    <div class="app-title"><h1>{t(m['name'])}</h1><p>{t(m['tagline'])}</p></div>
    <a class="app-home" href="../">Todas las microapps</a>
  </div>
  {tabs_html}
</header>
<main class="app-main" id="app">
{body}
</main>
<footer id="firma"></footer>
<script>window.MA_APP={cfg};</script>
<script>{CORE_JS}</script>
<script>{js}</script>
</body>
</html>
"""
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "icon.svg").write_text(icon_svg(m), encoding="utf-8")
    manifest = {
        "name": m["name"] + " | José Lugo", "short_name": m["short"], "description": m["desc"],
        "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#F3F6F8",
        "theme_color": m["accent"], "lang": "es",
        "icons": [{"src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"},
                  {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
    }
    (out / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    sw = f"""// Service worker: abre la app sin conexión y se actualiza sola cuando hay internet.
const CACHE = '{slug}-v{VERSION}';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('{slug}-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {{
    e.respondWith(fetch(req).then(r => {{ const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; }})
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }} else if (url.hostname.endsWith('gstatic.com') || url.hostname === 'fonts.googleapis.com') {{
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {{ const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; }})));
  }}
}});
"""
    (out / "sw.js").write_text(sw, encoding="utf-8")
    return m


if __name__ == "__main__":
    slugs = sys.argv[1:] or sorted(p.name for p in (SRC / "apps").iterdir() if p.is_dir())
    metas = [build(s) for s in slugs]
    for m in metas:
        print("ok", m["id"])
    sys.argv = sys.argv[:1]


ROADMAP = [
    ("Nómina Colombia", "Salarios, prestaciones y seguridad social del mes.", 3),
    ("Horas Extras y Recargos", "Diurnas, nocturnas, dominicales y festivos.", 3),
    ("Asistencia y Vacaciones", "Control de asistencia, permisos y días de vacaciones.", 3),
    ("Costo de Receta", "Costo por plato y precio sugerido para restaurantes.", 3),
    ("Proyectos Gantt y Kanban", "Tareas, responsables y cronograma en un solo tablero.", 4),
    ("Calculadoras de Ingeniería Civil", "Mezclas de concreto, zapatas y columnas.", 4),
]


def build_hub(metas):
    t = html.escape
    cards = "".join(f"""<a class="hub-card" href="{m['id']}/" style="--c:{m['accent']};--cd:{m['accentDark']}">
      <span class="hub-ic">{mark_svg(m)}</span>
      <span class="hub-tx"><b>{t(m['name'])}</b><span>{t(m['desc'])}</span></span>
      <span class="hub-go">Abrir</span></a>""" for m in metas)
    soon = "".join(f"""<li><b>{t(n)}</b><span>{t(d)}</span><em>Oleada {w}</em></li>""" for n, d, w in ROADMAP)
    page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Microapps para Negocios | José Lugo</title>
<meta name="description" content="Herramientas web para emprendedores y pymes: precios, facturación, caja, inventario, cartera, flujo de caja, estados financieros y plan de negocio. Funcionan sin internet y se instalan en el celular.">
<meta name="author" content="José Lugo">
<meta name="theme-color" content="#17212B">
<link rel="canonical" href="{BASE_URL}">
<meta property="og:title" content="Microapps para Negocios de José Lugo">
<meta property="og:description" content="Herramientas prácticas para vender, cobrar y controlar tu negocio desde el celular.">
<meta property="og:type" content="website">
<meta property="og:url" content="{BASE_URL}">
<meta property="og:image" content="{BASE_URL}{metas[0]['id']}/icon-512.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%231B2836'/%3E%3Ctext x='32' y='41' font-family='Arial' font-weight='700' font-size='24' text-anchor='middle' fill='%23E9D9A6'%3EJL%3C/text%3E%3C/svg%3E">
{FONTS}
<script>try{{var t=localStorage.getItem('ma:tema');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>{CORE_CSS}
.hub-top{{background:linear-gradient(160deg,#1B2836,#22344A);color:#EEF2F6;padding:44px 16px 64px}}
.hub-top-in{{max-width:1080px;margin:0 auto;display:grid;gap:22px}}
.hub-brand{{display:flex;gap:14px;align-items:center}}
.hub-brand .firma-mono{{width:46px;height:46px;font-size:1rem}}
.hub-brand small{{display:block;color:#AFC0D2;font-size:.85rem}}
.hub-brand strong{{font-family:var(--f-head);font-size:1.1rem}}
.hub-top h1{{font-size:clamp(2rem,5.4vw,3.3rem);font-weight:750;letter-spacing:-.03em;max-width:15ch;line-height:1.02}}
.hub-top p.lead{{max-width:58ch;color:#C9D5E1;font-size:1.05rem}}
.hub-facts{{display:flex;flex-wrap:wrap;gap:8px}}
.hub-facts span{{border:1px solid rgba(233,217,166,.35);color:#E9D9A6;border-radius:999px;padding:5px 12px;font-size:.85rem}}
.hub-main{{max-width:1080px;margin:-36px auto 0;padding:0 16px 40px;width:100%;flex:1}}
.hub-grid{{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}
.hub-card{{display:grid;grid-template-columns:auto 1fr;gap:14px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-l);
  padding:18px;text-decoration:none;color:var(--ink);box-shadow:var(--shadow);border-top:4px solid var(--c);transition:transform .15s,box-shadow .15s}}
.hub-card:hover{{transform:translateY(-2px);box-shadow:0 14px 34px -14px rgba(23,33,43,.35)}}
.hub-ic{{width:46px;height:46px;border-radius:13px;background:var(--c);color:#fff;display:grid;place-items:center}}
.hub-ic svg{{width:25px;height:25px}}
.hub-tx b{{display:block;font-family:var(--f-head);font-size:1.12rem;margin-bottom:4px}}
.hub-tx span{{color:var(--ink-2);font-size:.9rem;line-height:1.45}}
.hub-go{{grid-column:2;justify-self:start;font-weight:650;font-size:.9rem;color:var(--c);margin-top:4px}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]) .hub-go{{color:var(--cd)}}}}
:root[data-theme="dark"] .hub-go{{color:var(--cd)}}
.hub-sec{{margin:38px 0 14px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}}
.hub-soon{{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}
.hub-soon li{{border:1.5px dashed var(--line-2);border-radius:var(--r);padding:14px 16px;display:grid;gap:2px}}
.hub-soon b{{font-family:var(--f-head);font-size:1rem}}
.hub-soon span{{color:var(--ink-3);font-size:.88rem}}
.hub-soon em{{font-style:normal;font-size:.78rem;color:var(--ink-3);margin-top:4px}}
.hub-cta{{margin-top:38px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-l);padding:22px;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}}
.hub-cta h2{{font-size:1.3rem;margin-bottom:4px}}
.hub-cta p{{color:var(--ink-2);max-width:60ch}}
</style>
</head>
<body>
<header class="hub-top"><div class="hub-top-in">
  <div class="hub-brand"><div class="firma-mono" aria-hidden="true">JL</div><div><small>Microapps para negocios</small><strong>José Lugo</strong></div></div>
  <h1>Herramientas para vender, cobrar y controlar tu negocio</h1>
  <p class="lead">Cada app resuelve una tarea concreta del día a día. Abren en el celular o el computador, funcionan sin internet y tus datos se quedan en tu dispositivo.</p>
  <div class="hub-facts"><span>Sin registro</span><span>Se instalan como app</span><span>Exportan a Excel y PDF</span><span>Pesos, dólares y bolívares</span></div>
</div></header>
<main class="hub-main">
  <div class="hub-grid">{cards}</div>
  <div class="hub-sec"><h2>En construcción</h2><span class="muted small">Próximas microapps, en orden de lanzamiento</span></div>
  <ul class="hub-soon">{soon}</ul>
  <div class="hub-cta"><div><h2>¿Necesitas una app a la medida de tu negocio?</h2><p>Adapto estas herramientas con tu marca, tus procesos y acceso para tu equipo.</p></div>
    <a class="btn primary" style="--accent:#1FA855;--accent-ink:#178A45" href="https://wa.me/573126387467?text={html.escape('Hola José, quiero una microapp para mi negocio.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a></div>
</main>
<footer id="firma"></footer>
<script>window.MA_APP={{"id":"hub","name":"Microapps para Negocios"}};</script>
<script>{CORE_JS}</script>
</body>
</html>
"""
    (OUT / "index.html").write_text(page, encoding="utf-8")
    print("ok hub")


ORDER = ["punto-equilibrio", "precios-multimoneda", "comisiones-ventas", "facturador", "control-caja", "kardex-inventario",
         "cuentas-cobrar-pagar", "flujo-caja", "estados-financieros", "plan-negocio"]
if __name__ == "__main__":
    allm = {p.name: json.loads((SRC / "apps" / p.name / "meta.json").read_text(encoding="utf-8")) for p in (SRC / "apps").iterdir() if p.is_dir()}
    build_hub([allm[s] for s in ORDER if s in allm] + [m for s, m in sorted(allm.items()) if s not in ORDER])
