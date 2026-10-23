# José Lugo · Bienestar ONE MORE (landing de embudo)

Página de distribuidor independiente con productos ONE MORE International, en un solo `index.html`. Estilo oscuro premium (negro y naranja) con fotos de estilo de vida del catálogo oficial.

**Embudo:** Atención (hero) → Problema → Cómo funciona → Oferta (paquete PNG $150) → Asesor rápido → Catálogo (12 productos con foto real y ficha) → Video → Elige tu camino (cliente o socio) + plan de carrera de 17 rangos → Sobre José → Preguntas → Llamado final.

- La compra y la afiliación van a `STORE` (enlace de afiliado).
- Los pedidos y las dudas van por WhatsApp a `WA`.
- Fotos en `img/` (catálogo oficial ONE MORE).

**Configurar:** al inicio del `<script>`:
- `WA`
- `STORE`
- `VIDEO_ID`
- `SHIP`
- productos en `P`
- rangos en `RANKS`

**Captura de leads:**
- Formulario de 3 pasos en la sección `#asesoria` (después del video).
- Pop-up de salida, que aparece una vez por sesión.
- Cada lead llega por correo a través de FormSubmit (`LEAD_EMAIL_ENDPOINT`) y además se abre un mensaje de WhatsApp a `WA` con los datos.
- La primera vez, FormSubmit envía un correo de activación que hay que confirmar.
