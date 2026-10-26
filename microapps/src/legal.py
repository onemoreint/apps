"""Páginas legales de las microapps: política de privacidad y términos de uso (Colombia y Venezuela)."""
import html

ACTUALIZADO = "25 de octubre de 2026"
RESP = {"nombre": "José Lugo", "ciudad": "La Estrella, Antioquia, Colombia", "email": "jose.lugocdv@gmail.com",
        "tel": "+57 312 638 7467", "wa": "573126387467", "sitio": "https://onemoreint.github.io/apps/microapps/"}

PRIVACIDAD = [
("Quién es el responsable", f"""<p>El responsable de este sitio y de las microapps publicadas en <a href="{RESP['sitio']}">{RESP['sitio']}</a> es <b>{RESP['nombre']}</b>, con domicilio en {RESP['ciudad']}.</p>
<p>Canales de atención: correo <a href="mailto:{RESP['email']}">{RESP['email']}</a> y WhatsApp <a href="https://wa.me/{RESP['wa']}" target="_blank" rel="noopener noreferrer">{RESP['tel']}</a>.</p>"""),
("Qué datos guardan las microapps", """<p>Las microapps funcionan dentro de tu navegador. Todo lo que escribes en ellas (clientes, empleados, ventas, inventario, documentos, logo de tu negocio) se guarda en el almacenamiento local de tu dispositivo (<i>localStorage</i>). <b>Esa información no se envía a ningún servidor y el responsable no tiene acceso a ella.</b></p>
<p>Las copias de seguridad, los PDF y los archivos de Excel que generas se descargan directamente a tu dispositivo.</p>"""),
("Qué datos sí podemos recibir", """<p>Solo recibimos datos personales cuando tú nos contactas por WhatsApp o correo: tu nombre, número de teléfono, correo electrónico y el contenido de tu mensaje.</p>
<p>Los usamos para responder tu solicitud, enviarte información o una cotización sobre aplicaciones a la medida y, si lo autorizas, mantenerte informado de nuevas herramientas. No vendemos ni cedemos tus datos a terceros.</p>"""),
("Datos de terceros que registras", """<p>Si en las microapps registras datos de otras personas (empleados, clientes, proveedores), tú decides para qué los usas y eres el responsable de su tratamiento frente a ellas. Debes contar con su autorización cuando la ley lo exija y protegerlos con medidas razonables: bloquea tu dispositivo, guarda tus respaldos en un lugar seguro y no compartas archivos exportados con quien no debe verlos.</p>"""),
("Cookies, almacenamiento local y terceros", """<p>Este sitio <b>no usa cookies de publicidad, analítica ni rastreadores</b>. El almacenamiento local se usa solo para que las microapps funcionen: guardar tus datos, tus preferencias (como el modo claro u oscuro) y si ya viste el aviso de privacidad. Las fuentes tipográficas se sirven desde este mismo sitio.</p>
<p>Los archivos se alojan en GitHub Pages (GitHub, Inc.), que puede registrar datos técnicos de la conexión, como la dirección IP, según su propia declaración de privacidad. Los botones de WhatsApp te llevan a un servicio de Meta, que se rige por sus propias políticas.</p>
<p>Puedes borrar en cualquier momento todo lo guardado: en la configuración de tu navegador, elimina los datos del sitio <i>onemoreint.github.io</i>. Ten en cuenta que así también se borran los datos de las microapps; descarga antes una copia de seguridad si la necesitas.</p>"""),
("Tus derechos", """<p><b>En Colombia</b>, según la Ley 1581 de 2012 y su reglamentación (Decreto 1074 de 2015), como titular tienes derecho a conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización que otorgaste; ser informado sobre el uso que se les ha dado; revocar la autorización o pedir que se supriman cuando no se respeten tus derechos; acceder a ellos gratuitamente y presentar quejas ante la Superintendencia de Industria y Comercio.</p>
<p><b>En Venezuela</b>, el artículo 28 de la Constitución reconoce el derecho de toda persona a acceder a la información sobre sí misma, conocer su uso y finalidad, y solicitar su actualización, rectificación o destrucción cuando sea errónea o afecte ilegítimamente sus derechos (habeas data).</p>"""),
("Cómo ejercer tus derechos", f"""<p>Escribe a <a href="mailto:{RESP['email']}">{RESP['email']}</a> indicando tu nombre, tu solicitud y un medio de respuesta. Atendemos las consultas en un máximo de <b>diez (10) días hábiles</b> y los reclamos en un máximo de <b>quince (15) días hábiles</b>, conforme a los artículos 14 y 15 de la Ley 1581 de 2012. Si no es posible responder en ese plazo, te informaremos el motivo y la nueva fecha.</p>"""),
("Seguridad", """<p>El sitio se sirve solo por conexión cifrada (HTTPS) y aplica una política de seguridad de contenido que impide ejecutar código que no sea el propio de las microapps. Como no existe un servidor que almacene la información que registras, esos datos no pueden filtrarse desde nuestro lado; su protección depende también del cuidado de tu dispositivo.</p>"""),
("Transferencia internacional", """<p>Los mensajes que nos envías por WhatsApp o correo pueden almacenarse en servidores de esos proveedores fuera de Colombia o Venezuela. Al escribirnos por esos medios aceptas esa transferencia, que se limita a lo necesario para atenderte.</p>"""),
("Menores de edad", """<p>Las microapps están dirigidas a emprendedores, negocios y profesionales. No recolectamos de forma intencional datos de menores de edad.</p>"""),
("Cambios a esta política", f"""<p>Podemos actualizar esta política cuando cambie la ley o el funcionamiento del sitio. Publicaremos aquí la versión vigente con su fecha. Última actualización: {ACTUALIZADO}.</p>"""),
]

TERMINOS = [
("Aceptación", """<p>Al usar este sitio y sus microapps aceptas estos términos. Si no estás de acuerdo con ellos, no uses las herramientas.</p>"""),
("Qué ofrecemos", """<p>Microapps web gratuitas para la gestión de negocios: precios, facturación, caja, inventario, cartera, finanzas, nómina, asistencia, recetas, proyectos y cálculos de obra. Se ofrecen <b>tal como están</b>, sin garantía de disponibilidad continua, y pueden cambiar o retirarse sin previo aviso.</p>"""),
("Los cálculos son de referencia", """<p>Los resultados de las microapps son estimaciones de apoyo y <b>no reemplazan la asesoría de un contador, abogado, asesor tributario o ingeniero</b>. En particular:</p>
<ul><li>Los valores legales de nómina, horas extra y prestaciones (Colombia y Venezuela) corresponden a la fecha indicada en cada app y cambian con la ley. Verifícalos antes de liquidar.</li>
<li>El Cotizador y Facturador genera documentos comerciales. <b>No es un sistema de facturación electrónica</b> autorizado por la DIAN ni por el SENIAT; cuando la ley te obligue a facturar electrónicamente, usa un proveedor habilitado.</li>
<li>Las calculadoras de ingeniería civil usan dosificaciones y criterios de predimensionamiento de referencia. El diseño estructural debe hacerlo y firmarlo un profesional competente según la NSR-10 (Colombia) o las normas COVENIN (Venezuela).</li></ul>"""),
("Tus responsabilidades", """<p>Eres responsable de la información que registras, de hacer copias de seguridad, de contar con la autorización de las personas cuyos datos ingresas y de usar las herramientas de forma lícita.</p>"""),
("Propiedad intelectual", f"""<p>El diseño, el código, los textos, las ilustraciones y la marca <b>JL Microapps</b> pertenecen a {RESP['nombre']} y están protegidos por las normas de derecho de autor (Ley 23 de 1982 y Decisión Andina 351 de 1993). Puedes usar las microapps para tu negocio, pero no copiarlas, modificarlas, revenderlas ni distribuirlas como propias sin autorización escrita.</p>
<p>Las fuentes tipográficas incluidas se distribuyen bajo la licencia SIL Open Font License.</p>"""),
("Limitación de responsabilidad", """<p>En la medida en que la ley lo permita, el responsable no responde por la pérdida de datos guardados en tu dispositivo, por fallas del navegador o del equipo, ni por decisiones tomadas con base en los cálculos de las microapps. Nada de lo anterior limita los derechos que te reconozca la ley de protección al consumidor aplicable (en Colombia, la Ley 1480 de 2011).</p>"""),
("Enlaces a terceros", """<p>Los enlaces a WhatsApp, correo u otros sitios llevan a servicios que no controlamos y que tienen sus propios términos y políticas.</p>"""),
("Ley aplicable", f"""<p>Estos términos se rigen por las leyes de la República de Colombia. Si usas las microapps desde Venezuela u otro país, también se respetan los derechos irrenunciables que te otorgue la ley de tu domicilio.</p>
<p>Contacto: <a href="mailto:{RESP['email']}">{RESP['email']}</a>. Última actualización: {ACTUALIZADO}.</p>"""),
]


def pagina(titulo, intro, secciones, otra, logo, fuentes):
    t = html.escape
    toc = "".join(f'<li><a href="#s{i+1}">{t(h)}</a></li>' for i, (h, _) in enumerate(secciones))
    cuerpo = "".join(f'<section id="s{i+1}"><h2>{i+1}. {t(h)}</h2>{c}</section>' for i, (h, c) in enumerate(secciones))
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t(titulo)} | JL Microapps</title>
<meta name="description" content="{t(titulo)} de JL Microapps, herramientas para negocios de José Lugo.">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#000000">
<link rel="icon" href="../logo.svg" type="image/svg+xml">
{fuentes}
<style>
:root{{--tx:#f3f1ec;--tx2:#bdb9b0;--tx3:#8a867e;--line:#26262b;--gold:#D9C08A;color-scheme:dark}}
*{{box-sizing:border-box}}body{{margin:0;background:#000;color:var(--tx);font:16px/1.7 "Instrument Sans",system-ui,sans-serif}}
a{{color:var(--gold);text-underline-offset:3px}}:focus-visible{{outline:2px solid var(--gold);outline-offset:3px}}
.top{{border-bottom:1px solid var(--line)}}.top div{{max-width:860px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px}}
.top a.home{{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--tx);font-weight:600}}
main{{max-width:860px;margin:0 auto;padding:48px 20px 60px}}
h1{{font-family:"Bodoni Moda",Georgia,serif;font-size:clamp(2.2rem,6vw,3.4rem);line-height:1.05;margin:0 0 12px;font-weight:600}}
.intro{{color:var(--tx2);font-size:1.08rem;max-width:62ch}}.fecha{{color:var(--tx3);font-size:.9rem;margin-top:10px}}
.toc{{border:1px solid var(--line);border-radius:18px;padding:18px 22px;margin:30px 0 10px;background:#0d0d0f}}
.toc b{{font-size:.9rem;color:var(--tx3);font-weight:600}}.toc ol{{margin:8px 0 0;padding-left:20px;columns:2 260px;column-gap:28px}}.toc li{{margin:3px 0}}.toc a{{color:var(--tx2);text-decoration:none}}.toc a:hover{{color:var(--gold)}}
section{{padding-top:26px;scroll-margin-top:16px}}h2{{font-family:"Bodoni Moda",Georgia,serif;font-size:1.5rem;font-weight:600;margin:0 0 8px}}
section p,section li{{color:var(--tx2);max-width:72ch}}section b{{color:var(--tx)}}ul{{padding-left:20px}}
.otra{{margin-top:40px;padding-top:22px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--tx3);font-size:.92rem}}
</style>
</head>
<body>
<header class="top"><div><a class="home" href="../">{logo}<span>JL Microapps</span></a><a href="../">Volver a las aplicaciones</a></div></header>
<main>
<h1>{t(titulo)}</h1>
<p class="intro">{intro}</p>
<p class="fecha">Última actualización: {ACTUALIZADO}</p>
<nav class="toc" aria-label="Contenido"><b>Contenido</b><ol>{toc}</ol></nav>
{cuerpo}
<div class="otra"><span>© 2026 {RESP['nombre']}. Todos los derechos reservados.</span>{otra}</div>
</main>
</body>
</html>
'''


def build_legal(out_dir, logo_mark, fuentes, endurecer):
    (out_dir / "privacidad").mkdir(exist_ok=True)
    (out_dir / "terminos").mkdir(exist_ok=True)
    priv = pagina("Política de privacidad y tratamiento de datos",
                  "Explica qué datos se guardan cuando usas las microapps, cuáles recibimos cuando nos contactas y cómo ejercer tus derechos en Colombia y Venezuela.",
                  PRIVACIDAD, '<a href="../terminos/">Ver los términos de uso</a>', logo_mark("pv", 34), fuentes)
    term = pagina("Términos y condiciones de uso",
                  "Las reglas para usar las microapps: qué ofrecemos, el alcance de los cálculos, la propiedad intelectual y la ley aplicable.",
                  TERMINOS, '<a href="../privacidad/">Ver la política de privacidad</a>', logo_mark("tm", 34), fuentes)
    (out_dir / "privacidad" / "index.html").write_text(endurecer(priv), encoding="utf-8")
    (out_dir / "terminos" / "index.html").write_text(endurecer(term), encoding="utf-8")
    print("ok legal")
