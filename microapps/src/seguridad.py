"""Endurecimiento de seguridad para las páginas generadas (GitHub Pages no permite cabeceras HTTP propias).

- Fuentes servidas desde el mismo sitio: ninguna petición a terceros al abrir una página.
- Content-Security-Policy por <meta>, con hash SHA-256 de cada script en línea: solo se ejecuta el código propio.
- Referrer-Policy estricta y enlaces externos con rel="noopener noreferrer".
"""
import base64, hashlib, re


def fuentes_css(prefijo):
    """@font-face de las tres fuentes alojadas en microapps/fonts/ (licencia OFL)."""
    rango = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
    def ff(fam, arch, pesos):
        return (f"@font-face{{font-family:'{fam}';font-style:normal;font-display:swap;font-weight:{pesos};"
                f"src:url({prefijo}{arch}.woff2) format('woff2-variations'),url({prefijo}{arch}.woff2) format('woff2');unicode-range:{rango}}}")
    return "<style>" + ff("Bricolage Grotesque", "bricolage-grotesque", "200 800") + ff("Instrument Sans", "instrument-sans", "400 700") + ff("Bodoni Moda", "bodoni-moda", "400 900") + "</style>"


SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)


def csp(page):
    hashes = sorted({"'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode() + "'" for m in SCRIPT_RE.finditer(page)})
    directivas = [
        "default-src 'self'",
        "script-src 'self' " + " ".join(hashes),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "upgrade-insecure-requests",
    ]
    return "; ".join(directivas)


def endurecer(page):
    """Inserta CSP y Referrer-Policy en el <head> y protege los enlaces externos."""
    # enlaces que abren en otra pestaña: sin acceso a window.opener ni envío del referer
    page = re.sub(r'rel="noopener"', 'rel="noopener noreferrer"', page)
    pol = csp(page)
    metas = (f'<meta http-equiv="Content-Security-Policy" content="{pol}">\n'
             '<meta name="referrer" content="strict-origin-when-cross-origin">\n')
    return page.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + metas, 1)
