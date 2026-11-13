# Tienda Jaqueline Cataño · Set de 4 Almohadas Siliconadas

Tienda de una sola página con pago anticipado, pedidos por WhatsApp y panel administrativo.
Es un único archivo `index.html` (HTML5 + CSS3 + JavaScript, sin dependencias ni compilación) más la imagen `og-image.jpg`.

---

## 1. Arquitectura

```
index.html
 ├─ <script id="store-config">  ← TODOS los datos editables (JSON): producto, precios,
 │                                 galería, beneficios, ficha, FAQ, contacto, pago, envío…
 ├─ Tienda pública              ← se dibuja a partir de esa configuración
 ├─ Checkout en 5 pasos         ← cantidad → datos → dirección → resumen → pago → comprobante
 └─ Panel #admin                ← edita la configuración, gestiona pedidos, exporta el index.html
og-image.jpg                    ← vista previa al compartir en WhatsApp / redes
```

**Cómo fluye un pedido**

1. El cliente elige la cantidad de sets y el sistema calcula el total.
2. Completa nombre, WhatsApp, departamento, ciudad, dirección, barrio, referencia y observaciones (con validación de los obligatorios).
3. Revisa el resumen y acepta la política de tratamiento de datos (Ley 1581 de 2012).
4. Ve los datos bancarios (solo en este paso), con botones para copiar la cuenta y la llave Bre-B.
5. Pulsa **ENVIAR COMPROBANTE POR WHATSAPP**: se abre el chat con el pedido completo y su código `JC-XXXXXX`, y el cliente adjunta allí la captura.
6. El pedido queda como **PENDIENTE DE VERIFICACIÓN**. La tienda nunca marca un pago como confirmado por su cuenta.
7. Jaqueline pega el mensaje recibido en **Panel → Pedidos → Registrar pedido**. El pedido entra como *Pago pendiente de verificación*.
8. Solo después de ver el dinero en la cuenta cambia el estado a **Pago confirmado**. El panel le pide confirmar esa verificación antes de aplicar el cambio.

Estados disponibles: Nuevo pedido · Pendiente de pago · Pago pendiente de verificación · Pago confirmado · Preparando pedido · Enviado · Entregado · Cancelado. Cada pedido tiene un botón **Avisar al cliente** con un mensaje de WhatsApp listo según el estado.

---

## 2. Publicar en GitHub Pages (gratis)

1. En tu repositorio (por ejemplo `onemoreint/apps`), crea la carpeta `almohadas/`.
2. Sube `index.html` y `og-image.jpg` a esa carpeta.
3. Si GitHub Pages ya está activo en el repositorio, la tienda quedará en
   `https://onemoreint.github.io/apps/almohadas/` en uno o dos minutos.
   Si no está activo: **Settings → Pages → Deploy from a branch → main / root**.
4. Abre el panel con `…/almohadas/#admin` y crea tu PIN.
5. En **Panel → Marketing → URL pública** pega la dirección final. Para que la vista previa de WhatsApp muestre la imagen, cambia en el `<head>` del index.html la línea `og:image` por la URL absoluta, por ejemplo `https://onemoreint.github.io/apps/almohadas/og-image.jpg`.

También sirve cualquier hosting estático: Netlify, Vercel, Cloudflare Pages o Hostinger (arrastrar y soltar).

---

## 3. Cambiar imágenes, precios y datos

Todo se hace desde el panel, sin tocar código:

| Qué cambiar | Dónde |
|---|---|
| Nombre, frase comercial, descripción, etiqueta | Producto y precios |
| Precio normal y precio promocional (el % de descuento se calcula solo) | Producto y precios |
| Disponibilidad, texto de stock, máximo de sets por pedido | Producto y precios |
| Fotos (se convierten a WebP de máx. 1400 px), orden, video de YouTube o .mp4 | Imágenes y video |
| Beneficios, bloques de presentación, ficha técnica, cuidado, testimonios | Contenido |
| Preguntas frecuentes | Preguntas |
| WhatsApp principal y secundario, mensaje predeterminado, datos bancarios, número que recibe los comprobantes | Contacto y pago |
| Costo de envío (por confirmar / tarifa fija / gratis), cobertura, barra de anuncios | Envío y anuncios |
| Meta Pixel, Google Analytics 4, URL pública | Marketing |

**Importante: los cambios se guardan en tu navegador.** Para que los vean tus clientes:

1. Pulsa **Guardar cambios**.
2. Ve a **Publicar → Descargar index.html**. Si la descarga no arranca, usa *Copiar HTML completo* y pégalo en un archivo `index.html`.
3. Sube ese archivo al hosting reemplazando el anterior.

> Consejo: las fotos subidas desde el panel quedan dentro del index.html, que crece unos 100–250 KB por foto. Si vas a usar más de 6 u 8 fotos, súbelas como archivos al repositorio (por ejemplo `almohadas/fotos/1.webp`) y agrégalas con **Agregar por enlace**. Así la página carga más rápido.

---

## 4. Antes de publicar: lista de verificación

- [ ] Poner los **precios reales** y marcar «Confirmo que estos precios son reales». Los precios actuales ($159.900 → $119.900) son de ejemplo. El precio anterior debe ser uno al que realmente hayas vendido el producto.
- [ ] Reemplazar las **ilustraciones** por fotos reales del producto. Mientras sean ilustraciones, la tienda muestra la etiqueta «Ilustración de referencia».
- [ ] Completar la **ficha técnica** (medidas, tela, color, peso) con los datos del proveedor. Las filas vacías no se muestran, y la tienda indica que se confirman por WhatsApp.
- [ ] Activar el beneficio **«Fácil mantenimiento»** solo si el proveedor confirma cómo se lava.
- [ ] Si haces envíos a todo el país, marcar **«Confirmo cobertura»** para que aparezca el anuncio «Envíos a Colombia».
- [ ] Definir el **costo de envío** (por defecto se confirma por WhatsApp antes del pago).
- [ ] Agregar **testimonios** solo de clientes reales que lo autoricen. Mientras no haya ninguno, la sección no aparece.
- [ ] Revisar el texto de **cambios y devoluciones**.

---

## 5. Limitaciones actuales (honestas)

- **Sin base de datos.** Los pedidos del panel viven en el navegador donde los registra Jaqueline. Si borra los datos del navegador o cambia de teléfono, se pierden. Por eso conviene usar **Respaldo → Copiar respaldo** o **Descargar CSV** con frecuencia.
- **El PIN no es seguridad de servidor.** Protege el panel en ese navegador, pero cualquiera que abra `#admin` en otro dispositivo puede crear su propio PIN. Aun así, esa persona no puede cambiar la tienda publicada, porque los cambios solo llegan a los clientes cuando subes un nuevo index.html al hosting.
- **El pedido llega por WhatsApp.** La tienda no recibe el formulario en un servidor. El cliente es quien envía el mensaje con el pedido y el comprobante.
- **El pago se verifica a mano.** No hay conexión con Bancolombia ni con Bre-B.

---

## 6. Funciones que requieren servicios externos

| Función | Servicio sugerido | Costo aproximado |
|---|---|---|
| Base de datos de pedidos compartida entre dispositivos | Supabase (Postgres) | Plan gratuito |
| Inicio de sesión real del panel | Supabase Auth (correo + contraseña o enlace mágico) | Plan gratuito |
| Recepción del formulario en servidor (sin depender de que el cliente envíe el WhatsApp) | Supabase Edge Function o Netlify Forms | Plan gratuito |
| Fotos y videos en la nube | Supabase Storage, Cloudinary o el mismo repositorio | Gratis / bajo |
| Notificación automática de pedido nuevo | WhatsApp Business Platform (Cloud API) o correo con Resend | Según uso |
| Pagos verificados automáticamente | Pasarela (Bold, Wompi, Mercado Pago) con webhook | Comisión por transacción |
| Medición de anuncios | Meta Pixel y GA4: solo pega los ID en el panel | Gratis |
| Dominio propio (`jaquelinecatano.com`) | Cualquier registrador + DNS hacia GitHub Pages | ~$50.000–$80.000 COP/año |

**Migración propuesta.** La configuración ya es un JSON único, así que el paso a backend no exige rehacer la tienda:

1. Tabla `settings` (una fila con el JSON de configuración) y tabla `orders` (código, datos del cliente, cantidad, total, estado, notas, fechas) en Supabase, con *Row Level Security*: el público solo puede **insertar** pedidos con estado `pendiente_pago`, y solo la administradora autenticada puede leerlos y cambiar su estado.
2. Reemplazar `lsGet/lsSet` del panel por llamadas a Supabase.
3. En el checkout, guardar el pedido en `orders` al confirmar el resumen (además del WhatsApp).
4. Agregar el inicio de sesión de Supabase Auth en lugar del PIN.

---

## 7. Analítica preparada

Al pegar los ID en **Panel → Marketing**, la tienda carga Meta Pixel y GA4 y envía estos eventos:

| Momento | Meta Pixel | GA4 |
|---|---|---|
| Ver el producto | ViewContent | view_item |
| Abrir el checkout | InitiateCheckout | begin_checkout |
| Confirmar el resumen | Lead | generate_lead |
| Contactar por WhatsApp | Contact | contact |
| Enviar el comprobante | SubmitApplication | proof_sent |

No se envía «Purchase», porque el pago se verifica manualmente. Si quieres optimizar campañas por compra, registra la conversión cuando confirmes el pago (requiere la Conversions API).

---

Desarrollado por José Lugo.
