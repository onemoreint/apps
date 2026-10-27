#!/usr/bin/env python3
"""Microapps «con tu marca»: genera en minutos la copia personalizada de un cliente.

Uso:
  python3 microapps/src/marca.py cliente.json            # genera y deja la copia en microapps/clientes/<carpeta>/
  python3 microapps/src/marca.py cliente.json --zip x.zip  # además empaca la copia para entregarla como archivo
  python3 microapps/src/marca.py cliente.json --entrega dir # escribe ENTREGA-<licencia>.pdf (con QR) y .txt en dir

cliente.json (solo "nombre" y "pack" son obligatorios):
{
  "nombre": "Ferretería El Tornillo",
  "pack": "tienda",                      # nomina | tienda | receta | civil | finanzas | o lista de apps
  "logo": "logo.png",                    # PNG, JPG o WEBP; sin logo se crea un monograma con las iniciales
  "color": "#0F5C8C",                    # opcional; si falta se toma del logo
  "doc": "NIT 900.123.456-7", "tel": "+57 300 000 0000", "email": "ventas@ejemplo.com",
  "dir": "Calle 10 # 5-20", "ciudad": "La Estrella", "moneda": "COP",
  "carpeta": "ferreteria-el-tornillo-a1b2c3"   # opcional: para regenerar una copia ya entregada con el mismo enlace
}

Cada copia: logo y colores del cliente, nombre en títulos, ícono propio al instalarla, datos en un espacio
separado de la demo pública, pie con número de licencia, botón de soporte y noindex para buscadores.
"""
import base64, colorsys, html, io, json, re, secrets, shutil, sys, unicodedata, zipfile
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build as B
from seguridad import endurecer

PACKS = {
    "nomina":   ("Nómina y personal", ["nomina", "horas-extras", "asistencia-vacaciones"]),
    "tienda":   ("Sistema administrativo", ["kardex-inventario", "control-caja", "cuentas-cobrar-pagar", "facturador"]),
    "receta":   ("Costos y precios", ["costo-receta", "punto-equilibrio", "precios-multimoneda"]),
    "civil":    ("Ingeniería civil", ["ingenieria-civil", "proyectos"]),
    "finanzas": ("Finanzas del negocio", ["flujo-caja", "estados-financieros", "plan-negocio", "punto-equilibrio", "comisiones-ventas"]),
}
SALIDA = B.OUT / "clientes"


# ---------- color ----------
def hex2rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def rgb2hex(c): return "#" + "".join(f"{round(max(0, min(1, x)) * 255):02X}" for x in c)
def lum(c):
    f = lambda x: x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = map(f, c); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contraste(a, b): la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)

def ajustar(c, objetivo, fondo, oscurecer=True):
    """Mueve la luminosidad (HLS) hasta lograr el contraste pedido contra el fondo."""
    h, l, s = colorsys.rgb_to_hls(*c)
    for _ in range(60):
        if contraste(colorsys.hls_to_rgb(h, l, s), fondo) >= objetivo: break
        l = l - 0.02 if oscurecer else l + 0.02
    return colorsys.hls_to_rgb(h, max(0, min(1, l)), s)

def paleta(color):
    c = hex2rgb(color)
    acc = ajustar(c, 4.6, (1, 1, 1))                 # texto blanco legible sobre botones
    h, l, s = colorsys.rgb_to_hls(*acc)
    ink = colorsys.hls_to_rgb(h, l * 0.8, s)
    dark = ajustar(colorsys.hls_to_rgb(h, max(l, .5), min(1, s * 1.05)), 6, hex2rgb("#0E151C"), oscurecer=False)
    return rgb2hex(acc), rgb2hex(ink), rgb2hex(dark)

def color_de_logo(img):
    sm = img.convert("RGBA").resize((64, 64))
    cuenta = {}
    px = sm.load()
    for r, g, b, a in (px[x, y] for y in range(64) for x in range(64)):
        if a < 128: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if l > .92 or l < .08 or s < .25: continue          # ignora blancos, negros y grises
        k = (r // 24, g // 24, b // 24); cuenta[k] = cuenta.get(k, 0) + 1
    if not cuenta: return "#1D4F91"
    r, g, b = max(cuenta, key=cuenta.get)
    return rgb2hex(((r * 24 + 12) / 255, (g * 24 + 12) / 255, (b * 24 + 12) / 255))


# ---------- logo e íconos ----------
def fuente(tam):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        if Path(f).exists(): return ImageFont.truetype(f, tam)
    return ImageFont.load_default()

def monograma(nombre, color):
    pal = [w for w in re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+", nombre) if w.lower() not in {"de", "del", "la", "el", "los", "las", "y", "e"}]
    ini = "".join(w[0] for w in pal[:2]).upper() or "N"
    im = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 511, 511), 110, fill=color)
    f = fuente(230 if len(ini) == 1 else 190)
    d.text((256, 262), ini, font=f, fill="white", anchor="mm")
    return im

def recortar(img):
    img = img.convert("RGBA")
    # recorta márgenes transparentes o blancos
    fondo = Image.new("RGBA", img.size, (255, 255, 255, 0))
    alfa = img.getchannel("A")
    caja = alfa.getbbox() if alfa.getextrema()[0] < 250 else None
    if not caja:
        gris = img.convert("L").point(lambda v: 255 if v < 245 else 0); caja = gris.getbbox()
    return img.crop(caja) if caja else img

def png_data(img, max_lado=256):
    img = img.copy(); img.thumbnail((max_lado, max_lado), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def icono(logo, lado, acento):
    """Ícono cuadrado para instalar: logo centrado sobre fondo blanco, con margen seguro (maskable)."""
    im = Image.new("RGB", (lado, lado), "white")
    l = logo.copy(); l.thumbnail((int(lado * .66), int(lado * .66)), Image.LANCZOS)
    im.paste(l, ((lado - l.width) // 2, (lado - l.height) // 2), l)
    return im


# ---------- utilidades ----------
def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40] or "cliente"


def generar(cfg, base_dir=Path(".")):
    nombre = cfg["nombre"].strip()
    pack = cfg.get("pack", "tienda")
    titulo_pack, apps = (PACKS[pack] if isinstance(pack, str) else ("Herramientas", list(pack)))
    for a in apps:
        if not (B.SRC / "apps" / a).is_dir(): raise SystemExit(f"No existe la app «{a}»")
    carpeta = cfg.get("carpeta") or f"{slugify(nombre)}-{secrets.token_hex(3)}"
    out = SALIDA / carpeta
    lic_id = cfg.get("licencia") or f"JL-{date.today():%y%m}-{secrets.token_hex(2).upper()}"
    fecha = cfg.get("fecha") or date.today().strftime("%d/%m/%Y")

    if cfg.get("logo"):
        logo = recortar(Image.open(base_dir / cfg["logo"]))
        color = cfg.get("color") or color_de_logo(logo)
    else:
        color = cfg.get("color") or "#1D4F91"
        logo = monograma(nombre, paleta(color)[0])
    acc, ink, dark = paleta(color)
    logo_url = png_data(logo)

    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    shutil.copytree(B.OUT / "fonts", out / "fonts")
    i512, i192 = icono(logo, 512, acc), icono(logo, 192, acc)

    def iconos(dst):
        i512.save(dst / "icon-512.png", optimize=True); i192.save(dst / "icon-192.png", optimize=True)
        b = io.BytesIO(); i192.save(b, "PNG")
        (dst / "icon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 192 192">'
                                      f'<image width="192" height="192" href="data:image/png;base64,{base64.b64encode(b.getvalue()).decode()}"/></svg>', encoding="utf-8")

    negocio = {k: cfg.get(k, "") for k in ("doc", "tel", "email", "dir", "ciudad")}
    negocio.update(nombre=nombre, moneda=cfg.get("moneda", "COP"), logo=logo_url)
    url = B.BASE_URL + "clientes/" + carpeta + "/"
    marca = {"out": out, "url": url, "ns": "c-" + carpeta, "accent": acc, "accentInk": ink, "accentDark": dark,
             "logo": logo_url, "negocio": negocio, "iconos": iconos,
             "licencia": {"id": lic_id, "cliente": nombre, "fecha": fecha, "legal": B.BASE_URL}}
    metas = [B.build(a, marca) for a in apps]
    iconos(out)
    inicio(out, metas, marca, titulo_pack)
    entrega = texto_entrega(nombre, lic_id, fecha, url, metas, titulo_pack, carpeta)
    if cfg.get("_entrega"):
        d = Path(cfg["_entrega"]); d.mkdir(parents=True, exist_ok=True)
        buf = io.BytesIO(); logo.save(buf, "PNG"); buf.seek(0)
        pdf_entrega(d / f"ENTREGA-{lic_id}.pdf", nombre, lic_id, fecha, url, metas, titulo_pack, buf, acc)
        (d / f"ENTREGA-{lic_id}.txt").write_text(entrega, encoding="utf-8")
    return out, url, lic_id, carpeta, entrega


def inicio(out, metas, mk, titulo_pack):
    t = html.escape; n = mk["negocio"]
    cards = "".join(f"""<a class="c-card" href="{m['id']}/"><span class="c-ic">{B.mark_svg(m)}</span>
      <span><b>{t(m['name'])}</b><small>{t(m['tagline'])}</small></span><span class="c-go" aria-hidden="true">›</span></a>""" for m in metas)
    cfg = json.dumps({"id": "hub", "name": titulo_pack, "ns": mk["ns"], "marca": n, "licencia": mk["licencia"]}, ensure_ascii=False)
    page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t(n['nombre'])} | {t(titulo_pack)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="{mk['accent']}">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
{B.fuentes_css('fonts/')}
<script>try{{var t=localStorage.getItem('ma:tema');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>{B.CORE_CSS}
:root{{--accent:{mk['accent']};--accent-ink:{mk['accentInk']};--accent-dark:{mk['accentDark']}}}
.c-top{{background:var(--accent);color:#fff;padding:38px 16px 70px}}
.c-top-in{{max-width:860px;margin:0 auto;display:flex;gap:18px;align-items:center}}
.c-logo{{width:84px;height:84px;flex:none;border-radius:20px;background:#fff;padding:8px;object-fit:contain;box-shadow:0 10px 30px -12px rgba(0,0,0,.45)}}
.c-top small{{display:block;opacity:.85;font-size:.9rem}}
.c-top h1{{font-size:clamp(1.6rem,5vw,2.4rem);line-height:1.05;letter-spacing:-.02em}}
.c-main{{max-width:860px;margin:-40px auto 0;padding:0 16px 40px;width:100%;flex:1;display:grid;gap:12px}}
.c-card{{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;background:var(--paper);border:1px solid var(--line);
  border-radius:var(--r-l);padding:16px 18px;text-decoration:none;color:var(--ink);box-shadow:var(--shadow);transition:transform .15s}}
.c-card:hover{{transform:translateY(-2px)}}
.c-ic{{width:48px;height:48px;border-radius:14px;background:var(--accent);color:var(--on-accent);display:grid;place-items:center}}
.c-ic svg{{width:26px;height:26px}}
.c-card b{{display:block;font-family:var(--f-head);font-size:1.1rem}}
.c-card small{{color:var(--ink-2);font-size:.9rem}}
.c-go{{font-size:1.8rem;color:var(--ink-3)}}
.c-tip{{color:var(--ink-3);font-size:.88rem;text-align:center;margin-top:6px}}
</style>
</head>
<body>
<header class="c-top"><div class="c-top-in">
  <img class="c-logo" src="{mk['logo']}" alt="Logo de {t(n['nombre'])}">
  <div><small>{t(titulo_pack)}</small><h1>{t(n['nombre'])}</h1></div>
</div></header>
<main class="c-main">
{cards}
<p class="c-tip">Consejo: abre cada herramienta y usa «Instalar en el dispositivo» del menú para tenerla como app en tu celular.</p>
</main>
<footer id="firma"></footer>
<script>window.MA_APP={cfg};</script>
<script>{B.CORE_JS}</script>
</body>
</html>
"""
    (out / "index.html").write_text(endurecer(page), encoding="utf-8")


def pdf_entrega(ruta, nombre, lic, fecha, url, metas, titulo_pack, logo, acento):
    """PDF de una página para adjuntar en la mensajería de la venta: enlace, QR y primeros pasos."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from reportlab.graphics.barcode import qr
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics import renderPDF
    W, H = letter; c = canvas.Canvas(str(ruta), pagesize=letter)
    c.setTitle(f"Entrega {titulo_pack} - {nombre}"); c.setAuthor("José Lugo")
    a = HexColor(acento)
    c.setFillColor(a); c.rect(0, H - 150, W, 150, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF")); c.roundRect(48, H - 122, 92, 92, 16, fill=1, stroke=0)
    c.drawImage(ImageReader(logo), 56, H - 114, 76, 76, preserveAspectRatio=True, mask="auto")
    c.setFont("Helvetica", 12); c.drawString(160, H - 62, titulo_pack)
    c.setFont("Helvetica-Bold", 24); c.drawString(160, H - 92, nombre[:38])
    c.setFont("Helvetica", 11); c.drawString(160, H - 114, f"Licencia N.º {lic}  ·  {fecha}")
    y = H - 200
    c.setFillColor(HexColor("#13191F")); c.setFont("Helvetica-Bold", 18); c.drawString(48, y, "Tu sistema ya está listo")
    c.setFont("Helvetica", 12); c.setFillColor(HexColor("#4A5561"))
    c.drawString(48, y - 22, "Escanea el código con la cámara del celular o escribe la dirección en el navegador.")
    q = qr.QrCodeWidget(url); b = q.getBounds(); s_ = 170
    d = Drawing(s_, s_, transform=[s_ / (b[2] - b[0]), 0, 0, s_ / (b[3] - b[1]), 0, 0]); d.add(q)
    renderPDF.draw(d, c, 40, y - 220)
    c.setFillColor(HexColor("#13191F")); c.setFont("Helvetica-Bold", 11); c.drawString(230, y - 70, "Dirección de tu sistema:")
    c.setFont("Helvetica", 10); c.setFillColor(a)
    for i in range(0, len(url), 62): c.drawString(230, y - 88 - (i // 62) * 14, url[i:i + 62])
    c.linkURL(url, (230, y - 110, 560, y - 76), relative=0)
    c.setFillColor(HexColor("#13191F")); c.setFont("Helvetica-Bold", 11); c.drawString(230, y - 130, "Incluye:")
    c.setFont("Helvetica", 11)
    for i, m in enumerate(metas): c.drawString(240, y - 148 - i * 16, "• " + m["name"])
    y -= 270
    c.setFont("Helvetica-Bold", 14); c.drawString(48, y, "Primeros pasos")
    pasos = ["Abre la dirección y entra a cada herramienta.",
             "En el menú de tres puntos (...) toca «Instalar en el dispositivo» para tenerla como app en el celular o el PC.",
             "Revisa «Datos del negocio» en el menú: tu logo y datos ya están cargados; puedes ajustarlos.",
             "Tus datos se guardan solo en ese equipo: descarga una copia de seguridad cada semana.",
             "Para pasar la información a otro equipo, usa «Restaurar copia de seguridad» allí."]
    c.setFont("Helvetica", 11)
    for i, t in enumerate(pasos): c.drawString(48, y - 24 - i * 20, f"{i + 1}.  {t}")
    y -= 150
    c.setFillColor(HexColor("#F3F5F7")); c.roundRect(48, y - 56, W - 96, 64, 10, fill=1, stroke=0)
    c.setFillColor(HexColor("#4A5561")); c.setFont("Helvetica", 9.5)
    for i, t in enumerate(["Licencia de uso para un negocio: no se permite su reventa ni distribución. Incluye 30 días de soporte.",
                           "Funciona sin internet después de abrirla la primera vez. Los cálculos legales son de referencia: valídalos con tu contador.",
                           "Desarrollado por José Lugo."]):
        c.drawString(60, y - 14 - i * 14, t)
    c.showPage(); c.save()


def texto_entrega(nombre, lic, fecha, url, metas, titulo_pack, carpeta):
    apps = "\n".join(f"• {m['name']}: {url}{m['id']}/" for m in metas)
    return f"""ENTREGA DE LICENCIA «CON TU MARCA»
Cliente: {nombre}
Licencia: {lic}  ·  Fecha: {fecha}  ·  Paquete: {titulo_pack}
Carpeta: microapps/clientes/{carpeta}/  (para regenerar con el mismo enlace, usa "carpeta": "{carpeta}" y "licencia": "{lic}")

Enlace principal: {url}
{apps}

--- Mensaje para enviar al cliente ---
¡Hola! Ya está lista tu herramienta personalizada de {nombre} 🎉
Entra aquí: {url}
1. Abre cada herramienta y en el menú (⋯) toca «Instalar en el dispositivo» para tenerla como app.
2. Tus datos se guardan solo en tu equipo: descarga una copia de seguridad cada semana desde el mismo menú.
3. Tu licencia es la N.º {lic}. Incluye 30 días de soporte por este mismo medio.
Gracias por tu compra. José Lugo
"""


if __name__ == "__main__":
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    ruta = Path(sys.argv[1])
    cfg = json.loads(ruta.read_text(encoding="utf-8"))
    if "--entrega" in sys.argv: cfg["_entrega"] = sys.argv[sys.argv.index("--entrega") + 1]
    out, url, lic, carpeta, entrega = generar(cfg, ruta.parent)
    print(entrega)
    if "--zip" in sys.argv:
        z = Path(sys.argv[sys.argv.index("--zip") + 1])
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in out.rglob("*"):
                if f.is_file(): zf.write(f, Path(carpeta) / f.relative_to(out))
        print("ZIP:", z)
