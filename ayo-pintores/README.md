# A y O Pintores del Oriente — página web

Landing de ventas para A y O Pintores del Oriente (Rionegro y Oriente Antioqueño).

**En línea:** https://onemoreint.github.io/apps/ayo-pintores/

## Qué incluye

- Portada con foto HD, titular animado y cifras
- Calculadora de arriendo perdido con el inmueble vacío
- 5 paquetes: Listo para Arrendar, Listo para Vender, Entrega de Inmueble, Adiós Humedad, Plan Inmobiliaria Aliada
- Revelado de pintura ligado al scroll y comparador antes/después
- Galería horizontal del oficio
- Herramientas con IA: cotizador por m², simulador de color (sala ilustrada, foto de muestra o foto propia) y diagnóstico de humedad con foto
- Asesor virtual flotante, formulario para inmobiliarias, testimonios, cobertura, checklist, preguntas frecuentes
- Todos los botones abren WhatsApp con el mensaje ya escrito

## Pendiente con el cliente

Todo está en el bloque `CONFIG` al inicio del `<script>` y en el HTML:

- [ ] Fotos reales de trabajos, sobre todo pares de antes y después del mismo ángulo
- [ ] Cifras reales (inmuebles entregados, m² pintados, meses de garantía)
- [ ] Testimonios reales con permiso del cliente
- [ ] Precios por m² del cotizador (`CONFIG.precios`)
- [ ] Confirmar qué número es para hogares y cuál para inmobiliarias (`CONFIG.wa`)
- [ ] Municipios que atienden y respuestas de las preguntas frecuentes
- [ ] Logo en alta calidad
- [ ] Cambiar `CONFIG.demo` a `false` para quitar el aviso de versión de muestra

## Activar la IA en el sitio público

Sin configuración, las herramientas funcionan en **modo básico** (reglas fijas). Para respuestas con IA:

1. Despliega esta carpeta en Netlify (la función está en `netlify/functions/ia.mjs`).
2. En Netlify, agrega la variable de entorno `ANTHROPIC_API_KEY` con tu clave de la API de Anthropic.
3. Si el sitio queda en otro dominio, agrega `ALLOWED_ORIGIN` con ese dominio.
4. En `index.html`, pon la URL de la función en `CONFIG.aiEndpoint`, por ejemplo `https://tu-sitio.netlify.app/api/ia`.

## Fotografías

Las imágenes son de [Unsplash](https://unsplash.com/license) (licencia libre para uso comercial) y se usan como referencia. Reemplazarlas por fotos reales de A y O: los trabajos propios venden más que cualquier foto de stock.
