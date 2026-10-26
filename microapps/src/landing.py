"""Landing tipo vitrina de las microapps: fondo negro, ilustraciones grandes y un botón por app.

La genera build.py en microapps/index.html con todas las apps disponibles.
"""
import html

A = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
F = 'fill="currentColor" fill-opacity=".14"'
FS = 'fill="currentColor" fill-opacity=".32" stroke="none"'

ILL = {
"punto-equilibrio": f'''<path d="M26 92V26M26 92h74"/>
<path d="M26 66h72" stroke-dasharray="4 5" opacity=".5"/><path d="M26 66L98 44" opacity=".6"/><path d="M71.5 52L98 30L98 44Z" {FS}/>
<path d="M26 90L98 30"/><circle cx="71.5" cy="52" r="10" opacity=".35"/><circle cx="71.5" cy="52" r="4.5" fill="currentColor"/>''',
"precios-multimoneda": f'''<path d="M18 58L54 22h32a6 6 0 0 1 6 6v32L56 96a6 6 0 0 1-8.5 0L18 66.5a6 6 0 0 1 0-8.5z" {F}/><circle cx="78" cy="36" r="5"/>
<path d="M58 46v4M58 74v4M64 54c-1.5-3-10-4-10 1.5 0 6 11 3 11 9.5 0 5.5-9 5-11 1"/>
<circle cx="90" cy="88" r="15" {F}/><path d="M95 82a7 7 0 1 0 0 12M82 86h9M82 90h9"/><circle cx="104" cy="66" r="10" {F}/><path d="M101 62v8h3a2 2 0 0 0 0-4h-3 3a2 2 0 0 0 0-4z" stroke-width="1.8"/>''',
"comisiones-ventas": f'''<rect x="16" y="68" width="27" height="32" rx="3"/><rect x="46.5" y="50" width="27" height="50" rx="3" {F}/><rect x="77" y="76" width="27" height="24" rx="3"/>
<path d="M60 18l4.5 9 10 1.4-7.2 7 1.7 9.9L60 40.6l-9 4.7 1.7-9.9-7.2-7 10-1.4z" {FS}/><path d="M60 18l4.5 9 10 1.4-7.2 7 1.7 9.9L60 40.6l-9 4.7 1.7-9.9-7.2-7 10-1.4z"/>
<circle cx="55" cy="66" r="3"/><circle cx="65" cy="80" r="3"/><path d="M67 64L53 82"/><path d="M10 100h100"/>''',
"facturador": f'''<path d="M30 12h42l18 18v74a5 5 0 0 1-5 5H30a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5z" {F}/><path d="M72 12v18h18"/>
<path d="M36 44h28M36 54h38M36 64h32" opacity=".7"/><path d="M36 80h20" stroke-width="4"/><path d="M62 80h14"/>
<circle cx="88" cy="94" r="15" fill="#000" stroke="currentColor"/><circle cx="88" cy="94" r="15" {F}/><path d="M81 94l5 5 9-10"/>''',
"control-caja": f'''<path d="M30 60V40a5 5 0 0 1 5-5h50a5 5 0 0 1 5 5v20"/><rect x="40" y="43" width="40" height="10" rx="2" {FS}/>
<path d="M44 35V18h32v17" {F}/><circle cx="60" cy="26" r="4"/><path d="M16 60h88v36a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" {F}/>
<path d="M16 80h88"/><path d="M52 91h16" stroke-width="4"/><path d="M30 68h4M42 68h4M54 68h4M66 68h4M78 68h4M90 68h4" opacity=".6"/>''',
"kardex-inventario": f'''<rect x="22" y="62" width="34" height="32" rx="3" {F}/><rect x="60" y="62" width="34" height="32" rx="3"/><rect x="41" y="27" width="34" height="32" rx="3" {F}/>
<path d="M39 62v10M77 62v10M58 27v10"/><path d="M12 98h96"/><path d="M4 44h14M12 38l6 6-6 6" opacity=".8"/><path d="M98 44h16M108 38l6 6-6 6" opacity=".8"/>''',
"cuentas-cobrar-pagar": f'''<circle cx="60" cy="60" r="22" {F}/><path d="M60 47v4M60 69v4M66 54c-1.5-3-12-4-12 1.5 0 6.5 13 3.5 13 10 0 5.5-11 5.5-13 1.5"/>
<path d="M22 48a40 40 0 0 1 60-27"/><path d="M76 13l8 8-11 3"/><path d="M98 72a40 40 0 0 1-60 27"/><path d="M44 107l-8-8 11-3"/>''',
"flujo-caja": f'''<path d="M12 80h96" opacity=".5"/><rect x="18" y="62" width="12" height="18" rx="2" {FS}/><rect x="36" y="50" width="12" height="30" rx="2" {FS}/>
<rect x="54" y="80" width="12" height="16" rx="2" fill="currentColor" fill-opacity=".14"/><rect x="72" y="56" width="12" height="24" rx="2" {FS}/><rect x="90" y="38" width="12" height="42" rx="2" {FS}/>
<path d="M24 46C36 38 42 30 48 32s10 26 18 24 14-18 20-22 10-12 14-16"/><circle cx="24" cy="46" r="3" fill="currentColor"/><circle cx="100" cy="18" r="3" fill="currentColor"/>''',
"estados-financieros": f'''<path d="M60 22v74"/><path d="M40 100h40"/><path d="M22 34h76"/><circle cx="60" cy="22" r="4.5" fill="currentColor"/>
<path d="M22 34l-11 28M22 34l11 28"/><path d="M9 62h26a13 13 0 0 1-26 0z" {F}/><path d="M98 34l-11 28M98 34l11 28"/><path d="M85 62h26a13 13 0 0 1-26 0z" {F}/>
<path d="M16 58v-6M22 58v-10M28 58v-4" stroke-width="2"/><circle cx="98" cy="54" r="4" stroke-width="2"/>''',
"plan-negocio": f'''<path d="M60 12c15 11 21 30 19 49l-8 12H49l-8-12c-2-19 4-38 19-49z" {F}/><circle cx="60" cy="43" r="7.5"/>
<path d="M41 58L29 74l14 2M79 58l12 16-14 2"/><path d="M52 75c0 11 8 21 8 28 0-7 8-17 8-28" {FS}/>
<path d="M18 28h4M20 26v4M100 40h4M102 38v4M96 96h3M14 86h3" stroke-width="2"/>''',
"nomina": f'''<rect x="12" y="26" width="64" height="46" rx="7" {F}/><circle cx="31" cy="44" r="7.5"/><path d="M20 63a11 11 0 0 1 22 0"/><path d="M50 42h18M50 52h13" opacity=".7"/>
<rect x="52" y="56" width="56" height="42" rx="7" fill="#000"/><rect x="52" y="56" width="56" height="42" rx="7" {F}/><path d="M80 64v4M80 86v4M86 71c-1.5-3-12-4-12 1.5 0 6 12 3 12 9.5 0 5-10.5 5-12 1"/>''',
"horas-extras": f'''<circle cx="54" cy="64" r="37" {F}/><path d="M54 40v24l15 10"/><circle cx="54" cy="64" r="3.5" fill="currentColor"/>
<path d="M54 31v5M54 92v5M21 64h5M82 64h5" opacity=".7"/><path d="M99 14a13 13 0 1 0 8 23 15 15 0 0 1-8-23z" {FS}/><path d="M99 14a13 13 0 1 0 8 23 15 15 0 0 1-8-23z"/>
<path d="M14 22h8M18 18v8" stroke-width="2"/>''',
"asistencia-vacaciones": f'''<rect x="14" y="22" width="92" height="82" rx="9" {F}/><path d="M14 42h92"/><path d="M38 14v16M82 14v16"/>
<path d="M26 56l4 4 7-8M51 56l4 4 7-8M76 56l4 4 7-8M26 76l4 4 7-8M76 76l4 4 7-8"/><rect x="49" y="70" width="16" height="14" rx="3" {FS}/>
<path d="M26 96h10M51 96h10" opacity=".5"/>''',
"costo-receta": f'''<path d="M42 50c-4-6 4-10 0-17M60 50c-4-6 4-10 0-17M78 50c-4-6 4-10 0-17" opacity=".75"/><path d="M18 62h84"/><path d="M54 56h12" stroke-width="4"/>
<path d="M22 62h76v22a16 16 0 0 1-16 16H38a16 16 0 0 1-16-16z" {F}/><path d="M22 70h-9M98 70h9"/><path d="M40 78h40" opacity=".4"/>''',
"proyectos": f'''<rect x="10" y="18" width="100" height="86" rx="9" {F}/><path d="M43 18v86M77 18v86" opacity=".5"/>
<rect x="16" y="30" width="22" height="14" rx="3" {FS}/><rect x="16" y="50" width="22" height="14" rx="3"/><rect x="49" y="30" width="22" height="14" rx="3" {FS}/>
<rect x="82" y="30" width="22" height="14" rx="3"/><rect x="82" y="50" width="22" height="14" rx="3"/><path d="M86 57l3 3 6-6M86 37l3 3 6-6"/>
<path d="M16 84h30M30 94h40M58 84h30" stroke-width="5" opacity=".75"/>''',
"ingenieria-civil": f'''<path d="M8 104h104"/><path d="M28 104V24"/><path d="M28 32l9 8-9 8 9 8-9 8 9 8-9 8 9 8" opacity=".6"/><path d="M37 24v80"/>
<path d="M18 24h80"/><path d="M28 24l9-10 9 10" /><path d="M84 24v28"/><rect x="77" y="52" width="14" height="10" rx="2" {FS}/>
<rect x="58" y="70" width="44" height="34" rx="2" {F}/><path d="M66 80h9M85 80h9M66 92h9M85 92h9"/>'''
}

CATS = [("ventas", "Ventas y precios"), ("finanzas", "Dinero y finanzas"), ("personal", "Personal"), ("operacion", "Operación y obra")]
INFO = {
 "punto-equilibrio": ("finanzas", "Cuánto vender para no perder dinero.", ["Uno o varios productos", "Meta de utilidad y margen de seguridad", "Gráfico y escenarios guardados"]),
 "precios-multimoneda": ("ventas", "Tu lista de precios en pesos, dólares y bolívares.", ["Tasas y redondeo propios", "Margen o recargo por producto", "Lista lista para WhatsApp"]),
 "comisiones-ventas": ("ventas", "Liquida comisiones por vendedor sin hacer cuentas.", ["Porcentaje fijo o por tramos", "Metas, bonos y ranking", "Liquidación imprimible"]),
 "facturador": ("ventas", "Cotizaciones, facturas y recibos con tu logo.", ["IVA, descuentos y valor en letras", "PDF y envío por WhatsApp", "Control de pagados y vencidos"]),
 "control-caja": ("finanzas", "Apertura, movimientos y cierre de caja.", ["Medios de pago separados", "Arqueo por billetes y monedas", "Resumen mensual por categoría"]),
 "kardex-inventario": ("operacion", "Existencias valorizadas y alertas de reorden.", ["Promedio ponderado o PEPS", "Alertas de stock mínimo", "Utilidad bruta por venta"]),
 "cuentas-cobrar-pagar": ("finanzas", "Quién te debe, a quién le debes y desde cuándo.", ["Abonos y días de mora", "Antigüedad de cartera", "Estados de cuenta por WhatsApp"]),
 "flujo-caja": ("finanzas", "Anticipa los meses en que te va a faltar dinero.", ["Proyección de 12 meses", "Saldo mínimo y meses en rojo", "Financiamiento sugerido"]),
 "estados-financieros": ("finanzas", "Estado de resultados, balance e indicadores.", ["Dos periodos comparados", "Balance que se verifica solo", "12 indicadores financieros"]),
 "plan-negocio": ("finanzas", "Saber si tu idea es rentable antes de invertir.", ["Inversión y crédito", "VPN, TIR y recuperación", "Escenarios de ventas y costos"]),
 "nomina": ("personal", "Nómina para Colombia y Venezuela.", ["Seguridad social y aportes", "Prestaciones sociales", "Comprobantes de pago"]),
 "horas-extras": ("personal", "De la hora de entrada y salida al valor a pagar.", ["Clasificación automática", "Nocturnas, dominicales y festivos", "Alertas de límites legales"]),
 "asistencia-vacaciones": ("personal", "Asistencia diaria y saldo de vacaciones.", ["Calendario por empleado", "Faltas, permisos e incapacidades", "Programación de vacaciones"]),
 "costo-receta": ("ventas", "Cuánto cuesta cada plato y a cuánto venderlo.", ["Insumos con merma", "Precio sugerido con impuesto", "Ficha técnica y análisis del menú"]),
 "proyectos": ("operacion", "Tareas, responsables y fechas bajo control.", ["Tablero Kanban", "Cronograma Gantt con dependencias", "Plantillas listas para usar"]),
 "ingenieria-civil": ("operacion", "Materiales de obra y predimensionamiento.", ["Concreto, muros y acero", "Zapatas, columnas y excavación", "Lista de materiales con costos"]),
}

WA = "573126387467"
MAIL = "jose.lugocdv@gmail.com"


def svg(slug, size=None):
    body = ILL.get(slug, '<circle cx="60" cy="60" r="40"/>')
    sz = f' width="{size}" height="{size}"' if size else ''
    return f'<svg viewBox="0 0 120 120"{sz} {A} aria-hidden="true">{body}</svg>'


def build_landing(metas, out_path, base_url, fonts_unused=None):
    t = html.escape
    metas = [m for m in metas if m["id"] in INFO]
    n = len(metas)
    nums = {16: "Dieciséis", 15: "Quince", 14: "Catorce", 12: "Doce", 10: "Diez"}
    cards = []
    for m in metas:
        cat, frase, feats = INFO[m["id"]]
        catn = dict(CATS)[cat]
        cards.append(f'''<article class="app" data-cat="{cat}" style="--c:{m['accentDark']};--c2:{m['accent']}">
  <a class="app-ill" href="{m['id']}/" tabindex="-1" aria-hidden="true">{svg(m['id'])}</a>
  <div class="app-body">
    <span class="app-cat">{t(catn)}</span>
    <h3>{t(m['name'])}</h3>
    <p>{t(frase)}</p>
    <ul>{''.join(f'<li>{t(f)}</li>' for f in feats)}</ul>
    <a class="btn-app" href="{m['id']}/">Abrir aplicación<span class="sr"> {t(m['name'])}</span></a>
  </div>
</article>''')
    mosaic_ids = ["facturador", "nomina", "plan-negocio", "costo-receta", "ingenieria-civil", "estados-financieros"]
    by = {m["id"]: m for m in metas}
    mosaic = "".join(f'<a class="tile t{i}" href="{s}/" style="--c:{by[s]["accentDark"]}" aria-label="{t(by[s]["name"])}">{svg(s)}<span>{t(by[s]["short"])}</span></a>'
                     for i, s in enumerate(mosaic_ids) if s in by)
    chips = '<button type="button" class="chip" data-f="all" aria-pressed="true">Todas</button>' + "".join(
        f'<button type="button" class="chip" data-f="{k}" aria-pressed="false">{t(v)} <small>{sum(1 for m in metas if INFO[m["id"]][0]==k)}</small></button>' for k, v in CATS)
    wa_msg = html.escape("Hola José, vi tus microapps y quiero más información.")
    page = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Microapps para Negocios | José Lugo</title>
<meta name="description" content="{nums.get(n, str(n))} aplicaciones web para emprendedores y pymes de Colombia y Venezuela: facturación, caja, inventario, nómina, finanzas, recetas, proyectos e ingeniería civil.">
<meta name="author" content="José Lugo">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="{base_url}">
<meta property="og:title" content="Microapps para Negocios de José Lugo">
<meta property="og:description" content="{nums.get(n, str(n))} herramientas para vender, cobrar, pagar nómina y controlar tu negocio desde el celular.">
<meta property="og:type" content="website">
<meta property="og:url" content="{base_url}">
<meta property="og:image" content="{base_url}facturador/icon-512.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23000'/%3E%3Ccircle cx='32' cy='32' r='29' fill='none' stroke='%23D9C08A' stroke-width='2'/%3E%3Ctext x='32' y='41' font-family='Georgia' font-size='24' text-anchor='middle' fill='%23D9C08A'%3EJL%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500..800;1,6..96,500&family=Instrument+Sans:wght@400..700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#000;--s1:#0d0d0f;--s2:#151518;--line:#26262b;--line2:#34343a;--tx:#f3f1ec;--tx2:#b9b6ae;--tx3:#85827b;--gold:#D9C08A;--gold2:#b89a5c;
  --serif:"Bodoni Moda",Didot,"Times New Roman",serif;--sans:"Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}}
*,*::before,*::after{{box-sizing:border-box}}
html{{scroll-behavior:smooth;-webkit-text-size-adjust:100%}}
body{{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 var(--sans);overflow-x:hidden}}
a{{color:inherit}}
:focus-visible{{outline:2px solid var(--gold);outline-offset:3px;border-radius:6px}}
.sr{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.wrap{{max-width:1200px;margin:0 auto;padding:0 20px}}
h1,h2,h3{{font-family:var(--serif);font-weight:600;letter-spacing:-.01em;margin:0}}
p{{margin:0}}

/* Barra */
.top{{position:sticky;top:0;z-index:20;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(217,192,138,.12)}}
.top .wrap{{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px}}
.brand{{display:flex;align-items:center;gap:12px;text-decoration:none}}
.mono{{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--gold);color:var(--gold);font-family:var(--serif);font-weight:600;font-size:1rem;letter-spacing:.02em}}
.brand b{{display:block;font-weight:600;font-size:.98rem}}
.brand small{{display:block;color:var(--tx3);font-size:.78rem;margin-top:-2px}}
.top nav{{display:flex;gap:6px;align-items:center}}
.top nav a{{text-decoration:none;color:var(--tx2);font-size:.9rem;padding:8px 12px;border-radius:999px}}
.top nav a:hover{{color:var(--tx)}}
.top nav a.wa{{border:1px solid var(--line2);color:var(--tx)}}
@media(max-width:640px){{.top nav a:not(.wa){{display:none}}}}

/* Portada */
.hero{{position:relative;padding:72px 0 64px;overflow:hidden}}
.hero::before{{content:"";position:absolute;inset:-20% -10% auto auto;width:720px;height:720px;background:radial-gradient(closest-side,rgba(217,192,138,.13),transparent 70%);pointer-events:none}}
.hero .wrap{{display:grid;gap:48px;align-items:center}}
@media(min-width:960px){{.hero .wrap{{grid-template-columns:1.05fr .95fr}}}}
.hero h1{{font-size:clamp(2.6rem,6.4vw,4.9rem);line-height:1.02;font-weight:600;max-width:12ch}}
.hero h1 em{{font-style:italic;font-weight:500;color:var(--gold)}}
.lead{{color:var(--tx2);font-size:1.12rem;max-width:52ch;margin-top:22px}}
.cta{{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}}
.btn{{display:inline-flex;align-items:center;gap:9px;text-decoration:none;font-weight:650;border-radius:999px;padding:14px 24px;font-size:1rem;transition:background .2s,color .2s,border-color .2s,transform .1s}}
.btn:active{{transform:translateY(1px)}}
.btn.gold{{background:var(--gold);color:#111}}
.btn.gold:hover{{background:#e8d3a3}}
.btn.line{{border:1px solid var(--line2);color:var(--tx)}}
.btn.line:hover{{border-color:var(--gold);color:var(--gold)}}
.btn svg{{width:19px;height:19px}}
.facts{{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:38px;padding-top:24px;border-top:1px solid var(--line);color:var(--tx2);font-size:.92rem}}
.facts b{{display:block;font-family:var(--serif);font-size:1.6rem;color:var(--tx);font-weight:600;line-height:1.1}}
.mosaic{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;position:relative}}
.tile{{aspect-ratio:1;border-radius:22px;background:radial-gradient(120% 90% at 30% 20%,color-mix(in srgb,var(--c) 20%,transparent),transparent 65%),var(--s1);
  border:1px solid var(--line);color:var(--c);display:grid;place-items:center;text-decoration:none;position:relative;transition:border-color .25s,transform .25s}}
.tile svg{{width:62%;height:62%}}
.tile span{{position:absolute;left:12px;bottom:10px;font-size:.74rem;color:var(--tx3)}}
.tile:hover{{border-color:color-mix(in srgb,var(--c) 55%,var(--line));transform:translateY(-3px)}}
.tile.t1,.tile.t4{{transform:translateY(22px)}}
.tile.t1:hover,.tile.t4:hover{{transform:translateY(19px)}}
@media(prefers-reduced-motion:no-preference){{
  .tile{{opacity:0;animation:aparece .7s cubic-bezier(.2,.7,.2,1) forwards}}
  .t0{{animation-delay:.05s}}.t1{{animation-delay:.15s}}.t2{{animation-delay:.25s}}.t3{{animation-delay:.35s}}.t4{{animation-delay:.45s}}.t5{{animation-delay:.55s}}
  @keyframes aparece{{from{{opacity:0;translate:0 14px}}to{{opacity:1;translate:0 0}}}}
}}

/* Catálogo */
.sec{{padding:72px 0}}
.sec-head{{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:28px}}
.sec-head h2{{font-size:clamp(2rem,4.2vw,3.1rem);line-height:1.05;max-width:16ch}}
.sec-head p{{color:var(--tx2);max-width:44ch}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}}
.chip{{font:inherit;font-size:.92rem;font-weight:600;color:var(--tx2);background:transparent;border:1px solid var(--line2);border-radius:999px;padding:9px 16px;cursor:pointer;transition:all .2s}}
.chip small{{color:var(--tx3);font-weight:500;margin-left:4px}}
.chip:hover{{color:var(--tx);border-color:var(--tx3)}}
.chip[aria-pressed="true"]{{background:var(--gold);border-color:var(--gold);color:#111}}
.chip[aria-pressed="true"] small{{color:#3a3322}}
.grid{{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}}
.app{{background:var(--s1);border:1px solid var(--line);border-radius:24px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .3s,transform .3s}}
.app:hover{{border-color:color-mix(in srgb,var(--c) 45%,var(--line));transform:translateY(-4px)}}
.app[hidden]{{display:none}}
.app-ill{{display:grid;place-items:center;height:210px;color:var(--c);position:relative;
  background:radial-gradient(60% 75% at 50% 45%,color-mix(in srgb,var(--c) 22%,transparent),transparent 72%),
             linear-gradient(180deg,color-mix(in srgb,var(--c2) 18%,#000),#000 90%);border-bottom:1px solid var(--line)}}
.app-ill svg{{width:132px;height:132px;filter:drop-shadow(0 0 18px color-mix(in srgb,var(--c) 35%,transparent));transition:transform .4s cubic-bezier(.2,.7,.2,1)}}
.app:hover .app-ill svg{{transform:scale(1.06)}}
.app-body{{padding:22px 22px 24px;display:flex;flex-direction:column;flex:1}}
.app-cat{{font-size:.8rem;color:var(--c);font-weight:600}}
.app h3{{font-size:1.55rem;line-height:1.12;margin:6px 0 8px}}
.app p{{color:var(--tx2);font-size:.96rem}}
.app ul{{list-style:none;margin:16px 0 22px;padding:0;display:grid;gap:7px;font-size:.9rem;color:var(--tx2)}}
.app li{{display:flex;gap:10px;align-items:baseline}}
.app li::before{{content:"";width:12px;height:1px;background:var(--gold);flex:none;transform:translateY(-4px)}}
.btn-app{{margin-top:auto;display:flex;justify-content:center;align-items:center;text-decoration:none;font-weight:650;border-radius:14px;padding:13px 16px;
  border:1px solid var(--gold2);color:var(--gold);transition:background .2s,color .2s}}
.btn-app:hover{{background:var(--gold);color:#111;border-color:var(--gold)}}

/* Por qué */
.why{{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--s1)}}
.why .wrap{{display:grid;gap:28px;padding-top:60px;padding-bottom:60px}}
@media(min-width:820px){{.why .wrap{{grid-template-columns:1fr 1fr 1fr 1fr}}}}
.why h2{{font-size:2rem;line-height:1.1}}
.why .it svg{{width:34px;height:34px;color:var(--gold)}}
.why .it h3{{font-family:var(--sans);font-size:1.05rem;font-weight:650;margin:10px 0 6px}}
.why .it p{{color:var(--tx2);font-size:.94rem}}

/* Llamado */
.final{{padding:84px 0}}
.final .box{{border:1px solid rgba(217,192,138,.35);border-radius:28px;padding:44px 32px;text-align:center;
  background:radial-gradient(80% 120% at 50% 0%,rgba(217,192,138,.12),transparent 60%),var(--s1)}}
.final h2{{font-size:clamp(2rem,4.6vw,3.2rem);line-height:1.08;max-width:20ch;margin:0 auto}}
.final p{{color:var(--tx2);max-width:56ch;margin:16px auto 0}}
.final .cta{{justify-content:center}}

/* Firma */
.foot{{border-top:1px solid var(--line);padding:40px 0 48px}}
.foot .wrap{{display:grid;gap:24px;align-items:center}}
@media(min-width:860px){{.foot .wrap{{grid-template-columns:auto 1fr auto}}}}
.sig{{display:flex;gap:16px;align-items:center}}
.sig .mono{{width:58px;height:58px;font-size:1.25rem;box-shadow:0 0 0 6px rgba(217,192,138,.07)}}
.sig small{{display:block;color:var(--tx3);font-size:.8rem}}
.sig strong{{display:block;font-family:var(--serif);font-size:1.5rem;font-weight:600;line-height:1.1}}
.sig em{{display:block;font-style:normal;color:var(--tx2);font-size:.9rem}}
.legal{{color:var(--tx3);font-size:.84rem}}
@media(min-width:860px){{.legal{{text-align:center}}}}
.contact{{display:flex;flex-wrap:wrap;gap:10px}}
.contact a{{display:inline-flex;align-items:center;gap:8px;text-decoration:none;border:1px solid var(--line2);border-radius:999px;padding:10px 16px;font-size:.92rem;font-weight:600}}
.contact a:hover{{border-color:var(--gold);color:var(--gold)}}
.contact svg{{width:17px;height:17px}}
@media(max-width:520px){{.hero{{padding-top:44px}}.mosaic{{gap:10px}}.tile{{border-radius:16px}}.tile span{{display:none}}.sec{{padding:56px 0}}.final .box{{padding:34px 20px}}}}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="#inicio"><span class="mono" aria-hidden="true">JL</span><span><b>José Lugo</b><small>Microapps para negocios</small></span></a>
  <nav aria-label="Secciones"><a href="#apps">Aplicaciones</a><a href="#por-que">Cómo funcionan</a>
    <a class="wa" href="https://wa.me/{WA}?text={wa_msg}" target="_blank" rel="noopener">WhatsApp</a></nav>
</div></header>

<main id="inicio">
<section class="hero"><div class="wrap">
  <div>
    <h1>Tu negocio en orden, desde el celular</h1>
    <p class="lead">{nums.get(n, str(n))} aplicaciones para cotizar, facturar, cobrar, pagar la nómina, controlar inventario y planear tu crecimiento. Se abren con un enlace, funcionan sin internet y tus datos se quedan en tu dispositivo.</p>
    <div class="cta"><a class="btn gold" href="#apps">Ver las aplicaciones</a>
      <a class="btn line" href="https://wa.me/{WA}?text={wa_msg}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>Escribir por WhatsApp</a></div>
    <div class="facts"><span><b>{n}</b>aplicaciones</span><span><b>2</b>países: Colombia y Venezuela</span><span><b>0</b>registros ni contraseñas</span></div>
  </div>
  <div class="mosaic" aria-label="Algunas aplicaciones">{mosaic}</div>
</div></section>

<section class="sec" id="apps"><div class="wrap">
  <div class="sec-head"><h2>Elige la herramienta que necesitas</h2><p>Cada aplicación resuelve una tarea concreta del día a día. Ábrela y empieza con datos de ejemplo.</p></div>
  <div class="chips" role="group" aria-label="Filtrar por categoría">{chips}</div>
  <div class="grid" id="grid">{''.join(cards)}</div>
</div></section>

<section class="why" id="por-que"><div class="wrap">
  <h2>Hechas para el día a día de un negocio real</h2>
  <div class="it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/></svg>
    <h3>Se instalan en el celular</h3><p>Ábrelas desde el enlace y agrégalas a la pantalla de inicio. Después funcionan sin internet.</p></div>
  <div class="it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
    <h3>Tus datos son tuyos</h3><p>Todo se guarda en tu dispositivo. Descarga una copia de seguridad cuando quieras.</p></div>
  <div class="it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14h8M8 18h5"/></svg>
    <h3>PDF, Excel y WhatsApp</h3><p>Imprime con tu logo, exporta a Excel y envía documentos a tus clientes en segundos.</p></div>
</div></section>

<section class="final"><div class="wrap"><div class="box">
  <h2>¿Necesitas una aplicación a la medida de tu negocio?</h2>
  <p>Adapto estas herramientas con tu marca, tus procesos y acceso para todo tu equipo. Cuéntame qué necesitas y te propongo una solución.</p>
  <div class="cta"><a class="btn gold" href="https://wa.me/{WA}?text={html.escape('Hola José, quiero una aplicación a la medida para mi negocio.')}" target="_blank" rel="noopener">Hablar con José por WhatsApp</a>
    <a class="btn line" href="mailto:{MAIL}?subject={html.escape('Aplicación a la medida')}">Escribir un correo</a></div>
</div></div></section>
</main>

<footer class="foot"><div class="wrap">
  <div class="sig"><span class="mono" aria-hidden="true">JL</span><div><small>Diseño y desarrollo</small><strong>José Lugo</strong><em>Soluciones digitales para emprendedores y empresas</em></div></div>
  <p class="legal">© <span id="y">2026</span> José Lugo. Todos los derechos reservados.</p>
  <div class="contact">
    <a href="https://wa.me/{WA}?text={wa_msg}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="#1FA855" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>+57 312 638 7467</a>
    <a href="mailto:{MAIL}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>{MAIL}</a>
  </div>
</div></footer>

<script>
document.getElementById('y').textContent = new Date().getFullYear();
const chips = document.querySelectorAll('.chip'), apps = document.querySelectorAll('.app');
chips.forEach(c => c.addEventListener('click', () => {{
  chips.forEach(x => x.setAttribute('aria-pressed', x === c ? 'true' : 'false'));
  apps.forEach(a => a.hidden = !(c.dataset.f === 'all' || a.dataset.cat === c.dataset.f));
}}));
</script>
</body>
</html>
'''
    out_path.write_text(page, encoding="utf-8")
    print("ok landing", n, "apps")
