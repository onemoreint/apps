#!/usr/bin/env python3
"""Generador estático de Luxury Bijoux.

Lee  site/data/products.json, categories.json, collections.json, settings.json
Crea site/index.html, catalogo/, colecciones/, novedades/, c/<categoria>/, col/<coleccion>/,
     p/<producto>/ (una URL por producto), data/catalog.json (índice ligero para el buscador),
     sitemap.xml, robots.txt y 404.html.

Uso:  python3 tools/build.py            (desde la raíz del proyecto o de la carpeta del sitio)
Sin dependencias externas: solo la librería estándar de Python 3.8+.
"""
import json, os, re, shutil, html, datetime
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# El sitio vive en <raíz>/site o, si tools/ está dentro del propio sitio, en <raíz>
SITE = os.environ.get('LB_SITE') or (os.path.join(ROOT, 'site') if os.path.isdir(os.path.join(ROOT, 'site', 'data')) else ROOT)
D = os.path.join(SITE, 'data')
BUILD_ID = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M')


def load(name, default=None):
    p = os.path.join(D, name)
    if not os.path.exists(p): return default
    with open(p, encoding='utf-8') as f: return json.load(f)


S = load('settings.json', {})
T = S.get('textos', {})
BRAND = S.get('marca') or 'Luxury Bijoux'
SITE_URL = (S.get('siteUrl') or '').rstrip('/')
CATS = sorted([c for c in load('categories.json', [])], key=lambda c: c.get('orden', 99))
COLS = load('collections.json', {})
ALL = load('products.json', [])
PRODUCTS = [p for p in ALL if not p.get('oculto')]
CAT_BY = {c['id']: c for c in CATS}
VISIBLE_CATS = [c for c in CATS if c.get('visible', True) and any(p['categoria'] == c['id'] for p in PRODUCTS)]

e = lambda s: html.escape(str(s or ''), quote=True)


def write(rel, content):
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f: f.write(content)


def num(n):
    return f'{int(n):,}'.replace(',', '.')


def fmt_price(n):
    return '$' + f'{int(n):,}'.replace(',', '.')


def describe(p):
    """Descripción breve basada SOLO en datos verificados del catálogo."""
    if p.get('descripcion'): return p['descripcion']
    col = COLS.get(p['coleccion'], {}).get('nombre', '')
    parts = [f"Pieza del catálogo {col}." if col else 'Pieza del catálogo.']
    if p.get('medidas'): parts.append(f"Medida aprox. {p['medidas'][0]}.")
    if p.get('referencia'): parts.append(f"Referencia {p['referencia']}.")
    return ' '.join(parts)


PRICE_RX = re.compile(r'(precios?\s*:?\s*)?\$\s?\d[\d.,]*', re.I)


def detail_text(p):
    """Texto original del catálogo; sin precios cuando están ocultos."""
    d = (p.get('detalle') or '').strip()
    if not S.get('mostrarPrecios'):
        d = PRICE_RX.sub('', d)
        d = re.sub(r'\s{2,}', ' ', d).strip(' -·:|')
    if not re.search(r'[A-Za-z0-9]', d) or d.lower() == p['nombre'].lower(): return ''
    return d


def price_text(p):
    pr = p.get('precios') or []
    if not pr: return ''
    return fmt_price(pr[0]) if len(pr) == 1 else 'Desde ' + fmt_price(min(pr))


def cover_of(prods):
    for p in prods:
        if p.get('imagenes'): return p['imagenes'][0]['src']
    return 'assets/img/og-default.jpg'


def by_cat(cid): return [p for p in PRODUCTS if p['categoria'] == cid]
def by_col(cid): return [p for p in PRODUCTS if p['coleccion'] == cid or cid in p.get('colecciones', [])]
def prod(pid): return next((p for p in PRODUCTS if p['id'] == pid), None)


def sort_featured(lst):
    return sorted(lst, key=lambda p: (not p.get('destacado'), not p.get('novedad'), p.get('orden', 0)))


ICON = {
 'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
 'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 8h18M3 16h18"/></svg>',
 'close': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
 'wa': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.93 9.93 0 0 0-8.5 15.06L2 22l5.07-1.5A9.94 9.94 0 1 0 12.04 2zm0 18.1a8.14 8.14 0 0 1-4.15-1.14l-.3-.18-3.01.89.9-2.93-.2-.3a8.16 8.16 0 1 1 6.76 3.66zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.42l-.75-1.82c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.04 4.78 4.78 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.56.67 2.17.73 2.95.61.47-.07 1.45-.59 1.66-1.17.2-.57.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28z"/></svg>',
 'link': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>',
 'share': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
 'prev': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 'next': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
}
LOGO = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M8 34V18a12 12 0 0 1 24 0v16" stroke="currentColor" stroke-width="1.1"/><path d="M12 34V19a8 8 0 0 1 16 0v15" stroke="#B89B64" stroke-width="1.1"/><path d="M5 34h30" stroke="currentColor" stroke-width="1.1"/><circle cx="20" cy="22" r="2.2" fill="#B89B64"/></svg>'

NAV = [('Colecciones', 'colecciones/'), ('Aretes', 'c/aretes/'), ('Anillos', 'c/anillos/'), ('Pulseras', 'c/pulseras/'),
       ('Cadenas', 'c/cadenas/'), ('Dijes', 'c/dijes/'), ('Catálogo', 'catalogo/'), ('Novedades', 'novedades/'), ('Contacto', '#contacto')]


def head(root, title, desc, url_rel, image=None, extra='', jsonld=None, og_type='website'):
    full_title = f'{title} | {BRAND}' if title != BRAND else BRAND
    canon = f'{SITE_URL}/{url_rel}' if SITE_URL else ''
    img = image or 'assets/img/og-default.jpg'
    img_abs = f'{SITE_URL}/{img}' if SITE_URL else root + img
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ''
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="root" content="{root}">
<meta name="theme-color" content="#101010">
{f'<link rel="canonical" href="{e(canon)}">' if canon else ''}
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{e(BRAND)}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(img_abs)}">
{f'<meta property="og:url" content="{e(canon)}">' if canon else ''}
<meta property="og:locale" content="es_CO">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preload" href="{root}assets/fonts/cormorant-garamond-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/jost-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/main.css?v={BUILD_ID}">
{extra}{ld}
</head>
'''


def header(root, light=False, current=''):
    links = ''.join(f'<a href="{root}{h}"{" aria-current=page" if h == current else ""}>{e(n)}</a>' for n, h in NAV)
    dlinks = ''.join(f'<a href="{root}{h}">{e(n)}</a>' for n, h in [('Inicio', '')] + NAV)
    return f'''<a class="skip" href="#main">Ir al contenido</a>
<header class="site-header{' on-light' if light else ''}" data-light="{1 if light else 0}">
 <div class="wrap">
  <a class="logo" href="{root}" aria-label="{e(BRAND)}, inicio">{LOGO}<b>{e(BRAND.upper())}</b></a>
  <nav class="nav" aria-label="Principal">{links}</nav>
  <div class="tools">
   <button class="icon-btn" data-open-search aria-label="Buscar">{ICON['search']}</button>
   <a class="icon-btn" data-wa href="#contacto" aria-label="Escribir por WhatsApp">{ICON['wa']}</a>
   <button class="icon-btn menu-btn" data-open-menu aria-label="Abrir menú" aria-expanded="false">{ICON['menu']}</button>
  </div>
 </div>
</header>
<div class="drawer" id="drawer" aria-hidden="true">
 <button class="icon-btn close" data-close-menu aria-label="Cerrar menú">{ICON['close']}</button>
 {dlinks}
 <small>Consulta disponibilidad de cualquier pieza por WhatsApp.</small>
</div>
<div class="search-layer" id="search" aria-hidden="true" role="dialog" aria-label="Buscar en el catálogo">
 <div class="search-panel"><div class="wrap">
  <div class="search-field">{ICON['search']}<input type="search" id="q" placeholder="Busca aretes, perla, FB-1143…" autocomplete="off" aria-label="Buscar"><button class="icon-btn" data-close-search aria-label="Cerrar búsqueda">{ICON['close']}</button></div>
  <p class="search-hint" id="q-hint">Busca por nombre, referencia, categoría, colección o característica.</p>
  <div class="search-results" id="q-results"></div>
 </div></div>
</div>
'''


def footer(root):
    cats = ''.join(f'<a href="{root}c/{c["id"]}/">{e(c["nombre"])}</a>' for c in VISIBLE_CATS[:7])
    cats2 = ''.join(f'<a href="{root}c/{c["id"]}/">{e(c["nombre"])}</a>' for c in VISIBLE_CATS[7:])
    social = ''.join(f'<a href="{e(S[k])}" rel="noopener" target="_blank">{n}</a>' for k, n in
                     [('instagram', 'Instagram'), ('facebook', 'Facebook'), ('tiktok', 'TikTok')] if S.get(k))
    year = datetime.date.today().year
    return f'''<footer class="site-footer">
 <div class="wrap">
  <div class="cols">
   <div><h4>{e(BRAND)}</h4><p>Showroom digital de bisutería. Explora, compara y consulta disponibilidad de cada pieza directamente por WhatsApp.</p>{social}</div>
   <div><h4>Piezas</h4>{cats}</div>
   <div><h4>Insumos</h4>{cats2}</div>
   <div><h4>Explora</h4><a href="{root}catalogo/">Catálogo completo</a><a href="{root}colecciones/">Colecciones</a><a href="{root}novedades/">Novedades</a><a href="{root}#contacto">Contacto</a><a data-wa href="#contacto">WhatsApp</a></div>
  </div>
  <div class="legal"><span>© {year} {e(BRAND)}</span><span>Imágenes y referencias tomadas de los catálogos originales. Disponibilidad y precios sujetos a confirmación.</span></div>
 </div>
</footer>
<a class="wa-float" data-wa href="#contacto" aria-label="Escribir por WhatsApp">{ICON['wa']}</a>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
'''


def scripts(root, *names):
    s = f'<script>window.__SETTINGS__={json.dumps(public_settings(), ensure_ascii=False)};</script>\n'
    s += ''.join(f'<script src="{root}assets/js/{n}.js?v={BUILD_ID}" defer></script>\n' for n in ('app',) + names)
    return s


def public_settings():
    return {k: S.get(k) for k in ('marca', 'whatsapp', 'email', 'mostrarPrecios', 'mensajeWhatsapp', 'mensajeWhatsappGeneral', 'siteUrl')}


def card(p, root, i=0, reveal=True):
    imgs = p.get('imagenes') or []
    if not imgs: return ''
    a = imgs[0]; alt2 = imgs[1] if len(imgs) > 1 else None
    cat = CAT_BY.get(p['categoria'], {}).get('nombre', '')
    badge = '<span class="badge out">Consultar reposición</span>' if p.get('agotado') else ('<span class="badge">Nuevo</span>' if p.get('novedad') else '')
    pr = price_text(p) if S.get('mostrarPrecios') else ''
    url = f'{root}p/{p["id"]}/'
    alt = f'{p["nombre"]} — {cat}'
    img2 = f'<img class="alt" src="{root}{alt2["thumb"]}" alt="" loading="lazy" decoding="async" width="{alt2["w"]}" height="{alt2["h"]}">' if alt2 else ''
    return f'''<article class="card{' reveal' if reveal else ''}" style="--i:{i % 8}">
 <a class="stretch" href="{url}" aria-label="Ver detalles de {e(p['nombre'])}"></a>
 <div class="ph">{badge}<img src="{root}{a['thumb']}" alt="{e(alt)}" loading="lazy" decoding="async" width="{a['w']}" height="{a['h']}">{img2}</div>
 <div class="body"><span class="cat">{e(cat)}</span><h3>{e(p['nombre'])}</h3><p class="desc">{e(describe(p))}</p>{f'<span class="price">{e(pr)}</span>' if pr else ''}
 <div class="acts"><a href="{url}">VER DETALLES</a><a class="wa" data-wa-product="{e(p['id'])}" data-name="{e(p['nombre'])}" data-ref="{e(p.get('referencia') or '')}" href="{url}">CONSULTAR DISPONIBILIDAD</a></div></div>
</article>'''


# ------------------------------------------------------------------ páginas
def page_home():
    root = ''
    h = S.get('home', {})
    def pick(ids, fallback_cat, n):
        out = [prod(i) for i in (ids or []) if prod(i)]
        if len(out) < n:
            pool = sort_featured(by_cat(fallback_cat))
            out += [p for p in pool if p not in out][:n - len(out)]
        return out[:n]
    hero = pick(h.get('hero'), 'aretes', 3)
    ed1 = pick(h.get('editorial1'), 'anillos', 2)
    ed2 = pick(h.get('editorial2'), 'dijes', 2)
    macro = prod(h.get('macro')) or (sort_featured(by_cat('piedras-perlas')) or PRODUCTS)[0]
    # novedades: alternar colecciones para que el carrusel sea variado
    buckets = {}
    for p in sort_featured([p for p in PRODUCTS if p.get('novedad')]): buckets.setdefault(p['coleccion'], []).append(p)
    nov = []
    while len(nov) < 12 and any(buckets.values()):
        for k in list(buckets):
            if buckets[k]: nov.append(buckets[k].pop(0))
    nov = nov[:12]
    dest = sort_featured([p for p in PRODUCTS if p.get('destacado')])[:12]
    def im(p, k=0, size='src'): return root + p['imagenes'][k][size]
    total = len(PRODUCTS)
    arches = ''
    for c in VISIBLE_CATS:
        prods = sort_featured(by_cat(c['id']))
        cover = c.get('portada') or cover_of(prods)
        arches += f'<a class="cat-card reveal" href="c/{c["id"]}/"><div class="frame"><img src="{root}{cover}" alt="{e(c["nombre"])}" loading="lazy"></div><h3>{e(c["nombre"])}</h3><span>{len(prods)} piezas</span></a>'
    # índice de colecciones agrupado por categoría
    groups = ''
    for c in VISIBLE_CATS:
        rows = ''
        cols = [k for k, v in COLS.items() if v.get('categoria') == c['id'] and by_col(k)]
        for k in cols:
            ps = by_col(k)
            rows += f'<a class="index-row" href="col/{k}/" data-peek="{root}{cover_of(sort_featured(ps))}"><span class="nm">{e(COLS[k]["nombre"])}</span><span class="ct">{len(ps)} piezas</span></a>'
        if rows: groups += f'<div class="index-group reveal"><h3>{e(c["nombre"])}</h3><div class="index-list">{rows}</div></div>'
    # repartir el titular en 3 líneas: la combinación con la línea más larga más corta
    words = T.get('heroTitulo', '').split()
    best = [' '.join(words)]
    if len(words) >= 3:
        cands = []
        for i in range(1, len(words) - 1):
            for j in range(i + 1, len(words)):
                ls = [' '.join(words[:i]), ' '.join(words[i:j]), ' '.join(words[j:])]
                cands.append((max(map(len, ls)), -len(ls[0]), ls))
        best = min(cands)[2]
    lines = best
    h1 = ''.join(f'<span class="ln"><span>{e(l)}</span></span>' for l in lines if l)
    rail = lambda lst: ''.join(card(p, root, i) for i, p in enumerate(lst))
    jsonld = {"@context": "https://schema.org", "@type": "Store", "name": BRAND, "description": T.get('seoDescripcion'),
              **({"url": SITE_URL} if SITE_URL else {})}
    body = f'''<body class="intro">
<div class="loader" id="loader" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="1"/></svg></div>
{header(root)}
<main id="main">
<section class="hero" aria-label="Bienvenida">
 <div class="wrap">
  <div>
   <h1>{h1}</h1>
   <p class="lead">{e(T.get('heroSubtitulo'))}</p>
   <div class="actions"><a class="btn btn--light" href="catalogo/">{e(T.get('heroBoton1'))}</a><a class="btn btn--ghost" href="novedades/">{e(T.get('heroBoton2'))}</a></div>
   <div class="meta"><span><strong>{num(total)}</strong>piezas en vitrina</span><span><strong>{len(VISIBLE_CATS)}</strong>categorías</span><span><strong>{sum(1 for k in COLS if by_col(k))}</strong>colecciones</span></div>
  </div>
  <div class="vitrine" aria-hidden="true">
   <div class="arch a2"><img src="{im(hero[1])}" alt="" data-speed="-0.06"></div>
   <div class="arch a1"><img src="{im(hero[0])}" alt="" data-speed="-0.12" fetchpriority="high"></div>
   <div class="arch a3"><img src="{im(hero[2])}" alt="" data-speed="-0.04"></div>
   <span class="plinth"></span>
  </div>
 </div>
 <span class="scroll-cue" aria-hidden="true"></span>
</section>

<section class="section" id="categorias">
 <div class="wrap">
  <div class="sec-head reveal"><h2>Explora la vitrina</h2><p>Cada categoría reúne las piezas tal como aparecen en nuestros catálogos, con su referencia y sus medidas.</p></div>
  <div class="arches">{arches}</div>
 </div>
</section>

<section class="section section--paper">
 <div class="wrap editorial">
  <div class="ed-img reveal"><img src="{im(ed1[0])}" alt="{e(ed1[0]['nombre'])}" loading="lazy"><img class="float" src="{im(ed1[1], 0, 'thumb')}" alt="{e(ed1[1]['nombre'])}" loading="lazy"></div>
  <div class="ed-text reveal"><h2>{e(T.get('editorial1Titulo'))}</h2><p>{e(T.get('editorial1Texto'))}</p><a class="link" href="c/{ed1[0]['categoria']}/">Ver {e(CAT_BY[ed1[0]['categoria']]['nombre'].lower())}</a></div>
 </div>
</section>

{f"""<section class="section" id="novedades">
 <div class="wrap">
  <div class="sec-head reveal"><h2>Novedades</h2><a class="link" href="novedades/">Ver todas las novedades</a></div>
  <div class="rail">{rail(nov)}</div>
 </div>
</section>""" if nov else ''}

<section class="macro" aria-label="{e(T.get('macroTitulo'))}">
 <img src="{im(macro)}" alt="" data-speed="-0.1" loading="lazy">
 <div class="wrap reveal"><h2>{e(T.get('macroTitulo'))}</h2><p>{e(T.get('macroTexto'))}</p></div>
</section>

<section class="section section--paper">
 <div class="wrap editorial rev">
  <div class="ed-img reveal"><img src="{im(ed2[0])}" alt="{e(ed2[0]['nombre'])}" loading="lazy"><img class="float" src="{im(ed2[1], 0, 'thumb')}" alt="{e(ed2[1]['nombre'])}" loading="lazy"></div>
  <div class="ed-text reveal"><h2>{e(T.get('editorial2Titulo'))}</h2><p>{e(T.get('editorial2Texto'))}</p><a class="link" href="c/{ed2[0]['categoria']}/">Ver {e(CAT_BY[ed2[0]['categoria']]['nombre'].lower())}</a></div>
 </div>
</section>

{f"""<section class="section">
 <div class="wrap">
  <div class="sec-head reveal"><h2>Piezas destacadas</h2><a class="link" href="catalogo/">Ver el catálogo completo</a></div>
  <div class="grid">{rail(dest)}</div>
 </div>
</section>""" if dest else ''}

<section class="section section--dark" id="colecciones">
 <div class="wrap">
  <div class="sec-head reveal"><h2>{e(T.get('coleccionesTitulo'))}</h2><p>Cada colección corresponde a uno de nuestros catálogos originales.</p></div>
  <div class="index-cols">{groups}</div>
 </div>
 <div class="index-peek" id="peek" aria-hidden="true"><img alt=""></div>
</section>

<section class="section section--paper">
 <div class="wrap" style="text-align:center">
  <div class="reveal" style="max-width:720px;margin:0 auto"><h2 style="font-size:var(--t-2xl);margin-bottom:1.2rem">{e(T.get('cierreTitulo'))}</h2><p style="color:var(--warm);margin:0 auto 2rem">{e(T.get('cierreTexto'))}</p><button class="btn" data-open-search>BUSCAR EN EL CATÁLOGO</button></div>
 </div>
</section>

{contact_section(root)}
</main>
{footer(root)}
{scripts(root, 'home')}
</body></html>'''
    write('index.html', head(root, BRAND, T.get('seoDescripcion'), '', hero[0]['imagenes'][0]['src'], jsonld=jsonld) + body)


def contact_section(root):
    return f'''<section class="section section--dark" id="contacto">
 <div class="wrap contact">
  <div class="reveal"><h2>{e(T.get('contactoTitulo'))}</h2><p style="color:rgba(248,245,239,.66)">{e(T.get('contactoTexto'))}</p>
   <p style="margin-top:2rem"><a class="btn btn--light" data-wa href="#contacto">{ICON['wa']} ESCRIBIR POR WHATSAPP</a></p>
   {f'<p><a class="link" href="mailto:{e(S["email"])}">{e(S["email"])}</a></p>' if S.get('email') else ''}
  </div>
  <form class="form reveal" id="contact-form" novalidate>
   <label>Nombre<input name="nombre" required autocomplete="name"></label>
   <label>Ciudad<input name="ciudad" autocomplete="address-level2"></label>
   <label>¿Qué pieza o referencia te interesa?<input name="pieza"></label>
   <label>Mensaje<textarea name="mensaje" required></textarea></label>
   <p class="msg" id="form-msg" role="status"></p>
   <button class="btn btn--light" type="submit">ENVIAR POR WHATSAPP</button>
  </form>
 </div>
</section>'''


def catalog_shell(rel, root, title, desc, preset, intro='', crumbs='', items=None, image=None):
    """Página de listado: el JS carga data/catalog.json y aplica el filtro inicial (preset)."""
    seo = ''
    if items:
        seo = ''.join(card(p, root, i, reveal=False) for i, p in enumerate(items[:24]))
    cat_chips = ''.join(f'<button class="chip" data-cat="{c["id"]}" aria-pressed="false">{e(c["nombre"])}</button>' for c in VISIBLE_CATS)
    col_opts = ''.join(f'<option value="{k}">{e(v["nombre"])}</option>' for k, v in COLS.items() if by_col(k))
    body = f'''<body>
{header(root, light=True, current=preset.get('nav', ''))}
<main id="main">
 <div class="page-head"><div class="wrap">{crumbs}<h1>{e(title)}</h1>{f'<p>{e(intro)}</p>' if intro else ''}</div></div>
 <div class="filters"><div class="wrap">
  <div class="chips" role="group" aria-label="Filtrar por categoría"><button class="chip" data-cat="" aria-pressed="true">Todo</button>{cat_chips}</div>
  <label class="f-search">{ICON['search']}<input type="search" id="f-q" placeholder="Nombre, referencia, colección…" aria-label="Buscar en el catálogo"></label>
  <select class="f-select" id="f-col" aria-label="Colección"><option value="">Todas las colecciones</option>{col_opts}</select>
  <select class="f-select" id="f-sort" aria-label="Ordenar"><option value="dest">Destacados</option><option value="new">Más recientes</option><option value="az">Orden alfabético</option></select>
 </div></div>
 <div class="wrap">
  <div class="result-line"><span id="count" aria-live="polite"></span><button id="clear" hidden>Quitar filtros</button></div>
  <div class="grid" id="grid" data-preset='{e(json.dumps(preset, ensure_ascii=False))}'>{seo}</div>
  <div class="sentinel" id="sentinel"></div>
  <div class="loadmore"><button class="btn btn--ghost" id="more" hidden>CARGAR MÁS PIEZAS</button></div>
 </div>
</main>
{footer(root)}
{scripts(root, 'catalog')}
</body></html>'''
    write(rel + 'index.html', head(root, title, desc, rel, image) + body)


def crumbs_html(root, items):
    parts = [f'<a href="{root}">Inicio</a>'] + [f'<a href="{root}{h}">{e(n)}</a>' if h else f'<span aria-current="page">{e(n)}</span>' for n, h in items]
    return '<nav class="crumbs" aria-label="Ruta">' + '<span aria-hidden="true">/</span>'.join(parts) + '</nav>'


def page_product(p):
    root = '../../'
    rel = f'p/{p["id"]}/'
    cat = CAT_BY.get(p['categoria'], {'nombre': '', 'id': p['categoria']})
    col = COLS.get(p['coleccion'], {})
    imgs = p.get('imagenes') or []
    rel_items = [x for x in sort_featured(by_col(p['coleccion'])) if x['id'] != p['id']][:4]
    rel_items += [x for x in sort_featured(by_cat(p['categoria'])) if x['id'] != p['id'] and x not in rel_items][:8 - len(rel_items)]
    desc = describe(p)
    pr = price_text(p) if S.get('mostrarPrecios') else ''
    facts = [('Categoría', f'<a class="link" href="{root}c/{cat["id"]}/">{e(cat["nombre"])}</a>'),
             ('Colección', f'<a class="link" href="{root}col/{p["coleccion"]}/">{e(col.get("nombre", ""))}</a>')]
    if p.get('referencia'): facts.append(('Referencia', e(p['referencia'])))
    if p.get('medidas'): facts.append(('Medidas aprox.', e(', '.join(p['medidas']))))
    if p.get('caracteristicas'): facts.append(('Características', e(p['caracteristicas'])))
    det = detail_text(p)
    if det: facts.append(('Según el catálogo', e(det)))
    if p.get('agotado'): facts.append(('Estado', 'Marcada como agotada en el catálogo. Consulta reposición.'))
    facts_html = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in facts)
    thumbs = ''.join(f'<button data-i="{i}" aria-label="Ver foto {i + 1}" aria-current="{str(i == 0).lower()}"><img src="{root}{im["thumb"]}" alt="" loading="lazy"></button>' for i, im in enumerate(imgs))
    main_img = imgs[0] if imgs else {'src': 'assets/img/og-default.jpg', 'w': 1000, 'h': 1000}
    name = p['nombre']
    h1name = re.sub(r' · Ref\. .*$', '', name) if p.get('referencia') else name
    pdata = {'id': p['id'], 'nombre': name, 'referencia': p.get('referencia'), 'imgs': [root + i['src'] for i in imgs]}
    jsonld = {"@context": "https://schema.org", "@type": "Product", "name": name, "description": desc,
              "image": [(SITE_URL + '/' if SITE_URL else '') + i['src'] for i in imgs], "category": cat['nombre'],
              **({"sku": p['referencia']} if p.get('referencia') else {}),
              "brand": {"@type": "Brand", "name": BRAND}}
    if SITE_URL: jsonld["url"] = f'{SITE_URL}/{rel}'
    crumbs = crumbs_html(root, [(cat['nombre'], f'c/{cat["id"]}/'), (name, '')])
    body = f'''<body>
{header(root, light=True)}
<main id="main" class="pdp">
 <div class="wrap">
  {crumbs}
  <div class="pdp-grid">
   <div class="gallery{' single' if len(imgs) < 2 else ''}">
    <div class="thumbs">{thumbs}</div>
    <div class="main" id="main-img" role="button" tabindex="0" aria-label="Ampliar foto"><img src="{root}{main_img['src']}" alt="{e(name)} — {e(cat['nombre'])}" width="{main_img['w']}" height="{main_img['h']}" fetchpriority="high"><span class="zoom-hint">Toca para ampliar</span></div>
   </div>
   <div class="pdp-info">
    <span class="cat">{e(cat['nombre'])}</span>
    <h1>{e(h1name)}</h1>
    {f'<p class="ref">Ref. {e(p["referencia"])}</p>' if p.get('referencia') else ''}
    {f'<p class="price">{e(pr)}</p>' if pr else ''}
    <p>{e(desc)}</p>
    <dl class="facts">{facts_html}</dl>
    <div class="pdp-actions">
     <a class="btn btn--wa" data-wa-product="{e(p['id'])}" data-name="{e(name)}" data-ref="{e(p.get('referencia') or '')}" href="#contacto">{ICON['wa']} CONSULTAR POR WHATSAPP</a>
    </div>
    <div class="share">
     <button data-share>{ICON['share']} Compartir</button>
     <button data-copy>{ICON['link']} Copiar enlace</button>
     <a data-share-to="whatsapp" href="#" target="_blank" rel="noopener">WhatsApp</a>
     <a data-share-to="facebook" href="#" target="_blank" rel="noopener">Facebook</a>
     <a data-share-to="pinterest" href="#" target="_blank" rel="noopener">Pinterest</a>
    </div>
    <p class="note">Foto original del catálogo. Disponibilidad y precio se confirman por WhatsApp.</p>
   </div>
  </div>
 </div>
 {f"""<section class="section"><div class="wrap"><div class="sec-head"><h2>También te puede gustar</h2><a class="link" href="{root}col/{p['coleccion']}/">Ver la colección {e(col.get('nombre', ''))}</a></div><div class="grid">{''.join(card(x, root, i) for i, x in enumerate(rel_items))}</div></div></section>""" if rel_items else ''}
</main>
<div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-label="Foto ampliada">
 <button class="icon-btn x" data-lb-close aria-label="Cerrar">{ICON['close']}</button>
 <button class="icon-btn prev" data-lb-prev aria-label="Foto anterior">{ICON['prev']}</button>
 <img alt="{e(name)}">
 <button class="icon-btn next" data-lb-next aria-label="Foto siguiente">{ICON['next']}</button>
 <span class="count"></span>
</div>
{footer(root)}
<script type="application/json" id="pdata">{json.dumps(pdata, ensure_ascii=False)}</script>
{scripts(root, 'product')}
</body></html>'''
    title = f"{name} — {cat['nombre']}"
    write(rel + 'index.html', head(root, title, desc, rel, main_img['src'], jsonld=jsonld, og_type='product') + body)


def page_collections():
    root = '../'
    blocks = ''
    for c in VISIBLE_CATS:
        cards = ''
        for k, v in COLS.items():
            if v.get('categoria') != c['id']: continue
            ps = by_col(k)
            if not ps: continue
            cards += f'<a class="cat-card reveal" href="{root}col/{k}/"><div class="frame"><img src="{root}{cover_of(sort_featured(ps))}" alt="{e(v["nombre"])}" loading="lazy"></div><h3>{e(v["nombre"])}</h3><span>{len(ps)} piezas</span></a>'
        if cards:
            blocks += f'<section class="section" style="padding-top:2.5rem;padding-bottom:2.5rem"><div class="wrap"><div class="sec-head"><h2>{e(c["nombre"])}</h2><p>{e(c.get("descripcion"))}</p></div><div class="arches">{cards}</div></div></section>'
    body = f'''<body>
{header(root, light=True, current='colecciones/')}
<main id="main">
 <div class="page-head"><div class="wrap">{crumbs_html(root, [('Colecciones', '')])}<h1>Colecciones</h1><p>Cada colección corresponde a uno de nuestros catálogos originales, agrupados por categoría.</p></div></div>
 {blocks}
</main>
{footer(root)}
{scripts(root)}
</body></html>'''
    write('colecciones/index.html', head(root, 'Colecciones', 'Todas las colecciones del showroom, organizadas por categoría.', 'colecciones/') + body)


def page_404():
    root = '/'  # en hosting estático el 404 se sirve en cualquier ruta
    body = f'''<body>
{header('', light=True).replace('href="', 'href="/').replace('href="/#', 'href="#').replace('href="/http', 'href="http')}
<main id="main"><div class="page-head" style="min-height:70vh"><div class="wrap"><h1>Esta página no está en la vitrina</h1><p>Puede que la pieza haya cambiado de lugar. Vuelve al catálogo o búscala por su referencia.</p><p style="margin-top:2rem"><a class="btn" href="/catalogo/">IR AL CATÁLOGO</a></p></div></div></main>
</body></html>'''
    write('404.html', head('/', 'Página no encontrada', T.get('seoDescripcion'), '404.html') + body)


def catalog_index():
    """Índice ligero para búsqueda y filtros en el navegador."""
    rows = []
    for p in PRODUCTS:
        imgs = p.get('imagenes') or []
        if not imgs: continue
        col = COLS.get(p['coleccion'], {})
        rows.append([p['id'], p['nombre'], p.get('referencia') or '', p['categoria'], p['coleccion'],
                     imgs[0]['thumb'], imgs[1]['thumb'] if len(imgs) > 1 else '',
                     (1 if p.get('destacado') else 0) | (2 if p.get('novedad') else 0) | (4 if p.get('agotado') else 0),
                     col.get('fecha') or '', p.get('orden', 0),
                     ' '.join(filter(None, [', '.join(p.get('medidas') or []), p.get('caracteristicas') or '', detail_text(p)])),
                     (min(p['precios']) if p.get('precios') else 0) if S.get('mostrarPrecios') else 0, len(p.get('precios') or []) if S.get('mostrarPrecios') else 0,
                     describe(p)])
    data = {'v': BUILD_ID, 'cats': {c['id']: c['nombre'] for c in VISIBLE_CATS},
            'cols': {k: v['nombre'] for k, v in COLS.items() if by_col(k)}, 'p': rows}
    write('data/catalog.json', json.dumps(data, ensure_ascii=False, separators=(',', ':')))


def seo_files():
    urls = ['', 'catalogo/', 'colecciones/', 'novedades/'] + [f'c/{c["id"]}/' for c in VISIBLE_CATS] + \
           [f'col/{k}/' for k in COLS if by_col(k)] + [f'p/{p["id"]}/' for p in PRODUCTS]
    if SITE_URL:
        today = datetime.date.today().isoformat()
        sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
             ''.join(f'<url><loc>{SITE_URL}/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n'
        write('sitemap.xml', sm)
        write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: {SITE_URL}/sitemap.xml\n')
    else:
        write('robots.txt', 'User-agent: *\nAllow: /\nDisallow: /admin/\n# Configura "siteUrl" en data/settings.json para generar sitemap.xml\n')
    write('site.webmanifest', json.dumps({"name": BRAND, "short_name": BRAND, "start_url": "./", "display": "standalone",
                                          "background_color": "#101010", "theme_color": "#101010",
                                          "icons": [{"src": "assets/img/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, ensure_ascii=False))


def clean_generated():
    for d in ('p', 'c', 'col'):
        shutil.rmtree(os.path.join(SITE, d), ignore_errors=True)


def main():
    clean_generated()
    catalog_index()
    page_home()
    catalog_shell('catalogo/', '../', 'Catálogo completo', T.get('seoDescripcion'), {'nav': 'catalogo/'},
                  intro=f'{num(len(PRODUCTS))} piezas con sus fotografías originales. Filtra por categoría o colección, o busca por referencia.',
                  crumbs=crumbs_html('../', [('Catálogo', '')]), items=sort_featured(PRODUCTS))
    catalog_shell('novedades/', '../', 'Novedades', 'Las piezas más recientes del showroom.', {'nav': 'novedades/', 'nov': True},
                  intro='Las piezas más recientes de nuestros catálogos.', crumbs=crumbs_html('../', [('Novedades', '')]),
                  items=sort_featured([p for p in PRODUCTS if p.get('novedad')]))
    for c in VISIBLE_CATS:
        ps = sort_featured(by_cat(c['id']))
        catalog_shell(f'c/{c["id"]}/', '../../', c['nombre'], c.get('descripcion') or c['nombre'],
                      {'cat': c['id'], 'nav': f'c/{c["id"]}/'}, intro=c.get('descripcion'),
                      crumbs=crumbs_html('../../', [('Catálogo', 'catalogo/'), (c['nombre'], '')]), items=ps,
                      image=c.get('portada') or cover_of(ps))
    for k, v in COLS.items():
        ps = sort_featured(by_col(k))
        if not ps: continue
        cat = CAT_BY.get(v.get('categoria'), {'nombre': '', 'id': ''})
        src = v.get('fuente', {})
        intro = f'Colección tomada del catálogo «{src.get("archivo")}».' if src.get('tipo') == 'PDF' else 'Colección tomada del catálogo publicado en Google Sites.'
        catalog_shell(f'col/{k}/', '../../', v['nombre'], f'{v["nombre"]}: {len(ps)} piezas con fotografía original.',
                      {'col': k}, intro=intro,
                      crumbs=crumbs_html('../../', [('Colecciones', 'colecciones/'), (cat['nombre'], f'c/{cat["id"]}/'), (v['nombre'], '')]),
                      items=ps, image=cover_of(ps))
    for p in PRODUCTS: page_product(p)
    page_collections()
    page_404()
    seo_files()
    print(f'OK · {len(PRODUCTS)} productos visibles · {len(VISIBLE_CATS)} categorías · build {BUILD_ID}')


if __name__ == '__main__':
    main()
