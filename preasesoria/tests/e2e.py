"""Recorrido completo en un teléfono (390x844) con datos ficticios.

Uso:  python3 tests/e2e.py [url]   (por defecto sirve app/ en http://127.0.0.1:8765)
Requiere: pip install playwright && playwright install chromium
"""
import http.server
import os
import sys
import threading
from functools import partial
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURAS = os.environ.get("CAPTURAS", os.path.join(RAIZ, "tests", "capturas"))
os.makedirs(CAPTURAS, exist_ok=True)


def servidor():
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=os.path.join(RAIZ, "app"))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def opcion(page, campo, texto):
    page.locator(f'[data-campo="{campo}"]').get_by_role("radio", name=texto, exact=True).click()


def campo(page, nombre):
    return page.locator(f'[data-campo="{nombre}"]')


def captura(page, nombre):
    page.screenshot(path=os.path.join(CAPTURAS, f"{nombre}.png"), full_page=True)


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else None
    srv = None if url else servidor()
    url = url or "http://127.0.0.1:8765/index.html"

    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="es-CO",
        )
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=url.split("/index")[0])
        page = ctx.new_page()
        errores_js = []
        page.on("pageerror", lambda e: errores_js.append(str(e)))
        # Captura los enlaces que la app intenta abrir (no abre WhatsApp de verdad)
        page.add_init_script("window.__abiertos=[];window.open=(u)=>{window.__abiertos.push(u);return {opener:null};};")
        page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
        page.goto(url)

        # Bienvenida
        expect(page.get_by_role("heading", name="Antes de tu valoración, quiero conocerte")).to_be_visible()
        expect(page.get_by_role("img", name="Jaqueline Cataño, especialista en pérdida de peso")).to_be_visible()
        captura(page, "01-bienvenida")
        page.get_by_role("button", name="Comenzar").click()

        # A. Datos personales: validaciones
        page.get_by_role("button", name="Continuar").click()
        expect(page.locator('[data-error-de]')).to_have_count(4)
        expect(page.get_by_text("Escribe tu nombre completo.")).to_be_visible()
        captura(page, "02-errores")
        campo(page, "nombre").fill("Ana Prueba Ficticia")
        campo(page, "edad").fill("-3")  # el signo se descarta: solo dígitos
        expect(campo(page, "edad")).to_have_value("3")
        campo(page, "edad").fill("34")
        campo(page, "peso").fill("72,5")
        campo(page, "estatura").fill("168")
        page.get_by_role("button", name="Continuar").click()
        expect(page.get_by_text("Parece que escribiste centímetros")).to_be_visible()
        campo(page, "estatura").fill("1.68")
        page.get_by_role("button", name="Continuar").click()

        # B. Hábitos: condicionales
        expect(page.get_by_role("heading", name="Actividad y hábitos")).to_be_visible()
        expect(campo(page, "actividadLaboralOtro")).to_have_count(0)
        opcion(page, "actividadLaboral", "Otro")
        expect(campo(page, "actividadLaboralOtro")).to_be_visible()
        page.get_by_role("button", name="Continuar").click()
        expect(page.get_by_text("Cuéntanos cuál es tu actividad.")).to_be_visible()
        campo(page, "actividadLaboralOtro").fill("Artesana")
        opcion(page, "actividadFisica", "No realizo actividad física")
        expect(campo(page, "tipoEjercicio")).to_have_count(0)
        opcion(page, "actividadFisica", "Sí, entre 3 y 5 veces por semana")
        expect(campo(page, "tipoEjercicio")).to_be_visible()
        campo(page, "tipoEjercicio").fill("Caminar y natación")
        opcion(page, "evacuacion", "Una vez al día")
        opcion(page, "agua", "Más de 1,5 litros y hasta 2 litros")
        opcion(page, "comidas", "Tres veces")
        expect(page.locator('[data-campo="comidas"] [aria-checked="true"]')).to_have_text("Tres veces")
        captura(page, "03-habitos")

        # Volver atrás conserva respuestas
        page.get_by_role("button", name="Anterior").click()
        expect(campo(page, "nombre")).to_have_value("Ana Prueba Ficticia")
        expect(campo(page, "estatura")).to_have_value("1.68")
        page.get_by_role("button", name="Continuar").click()
        expect(campo(page, "tipoEjercicio")).to_have_value("Caminar y natación")
        page.get_by_role("button", name="Continuar").click()

        # C. Sueño
        expect(campo(page, "volverDormir")).to_have_count(0)
        opcion(page, "horasSueno", "Entre 6 y 7 horas")
        opcion(page, "interrupciones", "Sí, una vez")
        expect(campo(page, "volverDormir")).to_be_visible()
        opcion(page, "volverDormir", "Entre 10 y 30 minutos")
        captura(page, "04-sueno")
        page.get_by_role("button", name="Continuar").click()

        # D. Salud
        opcion(page, "tieneCondicion", "Sí")
        campo(page, "condiciones").fill("Condición ficticia de prueba")
        opcion(page, "tomaMedicamentos", "Sí")
        expect(page.locator("[data-medicamento]")).to_have_count(1)
        campo(page, "med-dosis-0").fill("160 mg")
        page.get_by_role("button", name="Continuar").click()
        expect(page.get_by_text("Escribe el nombre del producto 1")).to_be_visible()
        campo(page, "med-nombre-0").fill("Producto ficticio A")
        campo(page, "med-frecuencia-0").fill("Cada 12 horas")
        page.locator('[data-accion="anadir-medicamento"]').click()
        expect(page.locator("[data-medicamento]")).to_have_count(2)
        campo(page, "med-nombre-1").fill("Vitamina ficticia B")
        page.locator('[data-accion="anadir-medicamento"]').click()
        page.get_by_role("button", name="Eliminar producto 3").click()
        expect(page.locator("[data-medicamento]")).to_have_count(2)
        opcion(page, "tieneAlergias", "No")
        expect(campo(page, "alergias")).to_have_count(0)
        captura(page, "05-salud")
        page.get_by_role("button", name="Continuar").click()

        # E. Objetivos
        opcion(page, "objetivo", "Otro objetivo")
        campo(page, "objetivoOtro").fill("Dormir mejor y tener energía")
        campo(page, "observaciones").fill("Prefiero que me contacten en la tarde.\nGracias & saludos 🙂")
        page.get_by_role("button", name="Continuar").click()

        # F. Privacidad
        expect(page.get_by_role("heading", name="Autorización y privacidad")).to_be_visible()
        expect(campo(page, "autorizaDatos")).not_to_be_checked()
        expect(campo(page, "autorizaSensibles")).not_to_be_checked()
        page.locator('[data-accion="ver-politica"]').click()
        politica = page.locator("dialog.politica")
        expect(politica).to_be_visible()
        for t in ["Jaqueline Cataño", "diosjake86@gmail.com", "no almacena tus datos en ninguna parte",
                  "No se usarán para ningún otro fin"]:
            expect(politica).to_contain_text(t, ignore_case=True)
        captura(page, "06a-politica")
        politica.get_by_role("button", name="Entendido").click()
        expect(politica).to_be_hidden()
        page.get_by_role("button", name="Revisar respuestas").click()
        expect(page.locator(".casilla--error")).to_have_count(2)
        captura(page, "06-privacidad-errores")
        page.locator('label:has-text("el tratamiento de mis datos personales para mi valoración")').click()
        page.locator('label:has-text("Autorizo de forma expresa")').click()
        page.get_by_role("button", name="Revisar respuestas").click()

        # Revisión
        expect(page.get_by_role("heading", name="Revisa tus respuestas")).to_be_visible()
        expect(page.locator(".destinataria")).to_contain_text("Jaqueline Cataño")
        resumen = page.locator(".resumen")
        for t in ["Ana Prueba Ficticia", "72.5 kg", "1.68 m", "Otro: Artesana", "Caminar y natación",
                  "Entre 10 y 30 minutos", "Producto ficticio A", "Otro: Dormir mejor y tener energía"]:
            expect(resumen).to_contain_text(t)
        captura(page, "07-revision")

        # Editar desde la revisión y volver
        page.get_by_role("button", name="Editar datos personales").click()
        campo(page, "nombre").fill("Ana María Prueba Ficticia")
        page.get_by_role("button", name="Guardar y revisar").click()
        expect(page.get_by_role("heading", name="Revisa tus respuestas")).to_be_visible()
        expect(resumen).to_contain_text("Ana María Prueba Ficticia")

        # Envío
        page.get_by_role("button", name="ENVIAR MIS RESPUESTAS POR WHATSAPP").click()
        expect(page.get_by_role("heading", name="Tu formulario está listo")).to_be_visible()
        expect(page.get_by_text("Revisa el mensaje que se abrió en WhatsApp y pulsa")).to_be_visible()
        expect(page.get_by_text("Formulario recibido")).to_have_count(0)
        abiertos = page.evaluate("window.__abiertos")
        assert len(abiertos) == 1, abiertos
        u = urlparse(abiertos[0])
        assert u.scheme == "https" and u.netloc == "wa.me" and u.path == "/573022917846", abiertos[0]
        texto = parse_qs(u.query)["text"][0]
        for t in ["📋 *NUEVA SOLICITUD DE ASESORÍA*", "Nombre: Ana María Prueba Ficticia", "Edad: 34 años",
                  "Peso: 72.5 kg", "Frecuencia de evacuación: Una vez al día", "Consumo de agua: Más de 1,5 litros y hasta 2 litros", "Estatura: 1.68 m", "Actividad laboral: Otro: Artesana",
                  "Tipo de ejercicio: Caminar y natación", "Tiempo para volver a dormir: Entre 10 y 30 minutos",
                  "Condiciones de salud declaradas: Sí — Condición ficticia de prueba",
                  "1. Producto ficticio A\n   Dosis: 160 mg\n   Frecuencia: Cada 12 horas",
                  "2. Vitamina ficticia B", "Alergias o restricciones: No",
                  "Objetivo principal: Otro: Dormir mejor y tener energía",
                  "Gracias & saludos 🙂",
                  "✅ Autorizó de forma expresa el tratamiento de sus datos de salud"]:
            assert t in texto, f"Falta en el mensaje: {t!r}"
        assert "Producto 3" not in texto
        enlace = page.locator('[data-accion="abrir-whatsapp"]')
        assert enlace.get_attribute("href") == abiertos[0]
        captura(page, "08-listo")

        # Copiar
        page.locator('[data-accion="copiar"]').click()
        expect(page.get_by_text("Respuestas copiadas")).to_be_visible()
        copiado = page.evaluate("navigator.clipboard.readText()")
        assert copiado == texto, "El texto copiado no coincide con el mensaje"

        # Volver a corregir
        page.get_by_role("button", name="Volver al formulario para corregir un dato").click()
        expect(page.get_by_role("heading", name="Revisa tus respuestas")).to_be_visible()

        # Sin desbordamiento horizontal en el teléfono
        ancho = page.evaluate("document.documentElement.scrollWidth")
        assert ancho <= 390, f"Desborde horizontal: {ancho}px"
        assert not errores_js, errores_js
        nav.close()
    if srv:
        srv.shutdown()
    print("E2E OK — capturas en", CAPTURAS)


if __name__ == "__main__":
    main()
