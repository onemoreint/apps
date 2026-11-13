# Auditoría de catálogos — Luxury Bijoux

Fecha de la auditoría: 12 de noviembre de 2026.

## Fuentes analizadas

- **Carpeta de Google Drive «CATALOGOS»** (propietario: chaquirasybisuteria1@gmail.com): 41 archivos PDF, todos diseñados en Canva, más una subcarpeta vacía («Carpeta sin título»). Se descargaron como ZIP y se analizaron página por página.
- **Google Site «Catalogo Chaquiras y Bisutería»** (sites.google.com/view/catalogo-chaquiras-y-bisutera): 30 páginas. 12 tienen productos con foto, nombre y precio; las otras 18 (Placas, Acrílico, Sharms, Hilos, Mostacilla chaquira, Dijes deportivos, Madera, Delica Premium, Miyuki, Murano, Piedra facetada, Perla shell, Perla vidrio, Herrajes acero, Piedra natural, Swarovski, Fósil, Herrajes de rodio y golfied) están vacías en el sitio publicado.

## Método

1. Para cada página de cada PDF se detectó la **región visible** de cada foto (Canva recorta las fotos con máscaras) y se extrajo de la **imagen original incrustada**, sin capturas de pantalla ni texto superpuesto. Así se conservan la calidad y la proporción originales.
2. Se descartaron **543 elementos decorativos** (manchas de color, franjas, fondos lisos) y las portadas de cada catálogo.
3. El texto impreso junto a cada foto (referencia, precio, medida, nombre, «agotado») se asoció a la foto más cercana por posición en la página.
4. Las fotos con la misma referencia dentro de un catálogo se agruparon en un solo producto con galería.
5. Se eliminaron **227 fotos duplicadas** (huella perceptual: la misma foto repetida en uno o varios catálogos). Cuando una foto aparece en dos catálogos, el producto conserva ambas colecciones.
6. Las fotos se exportaron a **WebP** (1000 px máx. y miniatura de 440 px), sin deformarlas.

## Resultado

- **8,063 productos** con foto original, **8,617 fotografías**.
- 1,434 con referencia del proveedor · 2,754 con medida · 6,303 con precio en el catálogo.
- 13 categorías, 52 colecciones (una por catálogo de origen).

### Reglas aplicadas (no se inventó nada)

- **Nombres:** la mayoría de los PDF no ponen nombre a cada pieza. En esos casos el nombre es «Catálogo · Pieza 012» o «Catálogo · Ref. X». Cuando el PDF o el Google Site traen un nombre (p. ej. «Sodalita», «Aretes 14», «Pinza punta redonda») se usa ese.
- **Descripciones:** se generan solo con datos del catálogo («Pieza del catálogo Dijes Rodinado. Medida aprox. 22x11 mm.»). Desde el panel se puede escribir una descripción propia.
- **Precios:** se guardaron tal como aparecen, pero **están ocultos** en el sitio (también se quitan del texto original mostrado y del buscador). Se activan en Panel → Ajustes → «Mostrar los precios».
- **Novedades:** productos de los 4 catálogos actualizados más recientemente en Drive (abril–mayo 2026): Cadena Rodinada x Metro, Catálogo Hilo, Cajas Organizadoras y Catálogo Mamá. «Más recientes» ordena por la fecha de modificación de cada PDF.
- **Categorías:** solo las que existen en los documentos. No hay productos de «Conjuntos», «Tobilleras» ni «Bisutería para ocasiones especiales», por eso no se crearon. «Collares» se representa con la categoría **Cadenas** (los catálogos las llaman cadenas).

### Puntos para revisar antes de publicar

- El Google Site lista un producto como **«Aretes Gucci»** y hay un catálogo titulado **«Swarosky»**. Se conservaron tal como están en las fuentes; conviene confirmar que el uso de esas marcas es correcto.
- En algunos PDF la etiqueta de precio quedó junto a dos fotos; la asociación automática puede haber asignado una medida o precio al vecino. El texto original de cada pieza se muestra en su ficha («Según el catálogo») para poder verificarlo, y se corrige desde el panel.
- Los catálogos con varias tallas o precios por producto (herrajes, hilos, madera) muestran todas las opciones en el texto original.
- El número de WhatsApp está vacío a propósito: configúralo en Panel → Ajustes.

## Detalle por colección

| Colección | Categoría | Fuente | Actualizado | Fotos detectadas | Productos | Con referencia | Con medida | Con precio |
|---|---|---|---|---|---|---|---|---|
| Aretas Rodinado | Aretes | PDF: `Aretas Rodinado.pdf` | 2025-09-19 | 532 | 455 | 0 | 0 | 455 |
| Aretas Plastimetal | Aretes | PDF: `Aretas plastimetal.pdf` | 2025-07-08 | 253 | 218 | 0 | 0 | 1 |
| Earcuff | Aretes | PDF: `EARCUFF.pdf` | 2025-08-12 | 209 | 179 | 0 | 0 | 110 |
| Catálogo Anillos | Anillos | PDF: `CATALOGO ANILLOS.pdf` | 2025-12-22 | 335 | 176 | 176 | 0 | 176 |
| Pulsera Rodinado | Pulseras | PDF: `PULSERA  RODINADO.pdf` | 2025-12-04 | 120 | 108 | 0 | 1 | 104 |
| Cadenas Acero Terminadas | Cadenas | PDF: `CADENAS ACERO TERMINADAS.pdf` | 2025-08-13 | 163 | 146 | 0 | 111 | 146 |
| Cadena Rodinado Terminado | Cadenas | PDF: `CADENA RODINADO TERMINADO .pdf` | 2025-12-19 | 165 | 157 | 0 | 0 | 157 |
| Cadena Acero | Cadenas | PDF: `Cadena acero .pdf` | 2025-09-03 | 415 | 235 | 193 | 10 | 235 |
| Cadena Aluminio | Cadenas | PDF: `CADENA ALUMINIO.pdf` | 2025-04-30 | 23 | 22 | 9 | 0 | 22 |
| Cadena Rodinada x Metro | Cadenas | PDF: `CADENA RODINADA X METRO.pdf` | 2026-05-12 | 204 | 199 | 144 | 12 | 197 |
| Dijes Acero | Dijes | PDF: `DIJES ACERO.pdf` | 2026-01-28 | 425 | 415 | 0 | 250 | 407 |
| Dijes Rodinado 2 | Dijes | PDF: `DIJES RODINADO 2 ..pdf` | 2026-02-26 | 139 | 118 | 0 | 117 | 118 |
| Dijes Rodinado Mar | Dijes | PDF: `DIJES RODINADO MAR.pdf` | 2025-12-05 | 345 | 295 | 0 | 295 | 295 |
| Dijes Rodinado Nuevo | Dijes | PDF: `DIJES RODINADO NUEVO.pdf` | 2025-12-05 | 823 | 701 | 0 | 700 | 697 |
| Sharms Rodinado | Dijes | PDF: `SHARMS RODINADO.pdf` | 2025-08-12 | 132 | 120 | 0 | 0 | 119 |
| Catálogo Mamá | Dijes | PDF: `CATALOGO MAMÁ.pdf` | 2026-04-27 | 71 | 71 | 0 | 0 | 71 |
| Escudos Nacionales | Dijes | PDF: `ESCUDOS NACIONALES .pdf` | 2025-12-09 | 34 | 28 | 0 | 28 | 28 |
| Escudos Importados | Dijes | PDF: `ESCUDOS IMPORTADOS.pdf` | 2025-12-09 | 64 | 54 | 0 | 53 | 52 |
| Catálogo Acrílico | Chaquiras y cuentas | PDF: `CATALOGO ACRILICO .pdf.pdf` | 2026-01-29 | 64 | 64 | 0 | 24 | 63 |
| Catálogo Placas | Placas | PDF: `_CATALOGO PLACAS.pdf..pdf` | 2026-02-26 | 405 | 389 | 0 | 291 | 323 |
| Catálogo Religioso | Religiosos | PDF: `catalogo religioso actualizado .pdf (1) (1).pdf` | 2026-01-21 | 219 | 212 | 0 | 207 | 50 |
| Dijes Rodinado Religiosos | Religiosos | PDF: `Dijes RODINADO Religiosos (9).pdf` | 2026-03-16 | 329 | 269 | 0 | 266 | 263 |
| Crucifijos Zamak | Religiosos | PDF: `catalogo crucifijos zamak  nuevos.pdf` | 2026-01-03 | 64 | 64 | 63 | 61 | 63 |
| Piedra Natural | Piedras y perlas | PDF: `Piedra natural.pdf` | 2025-09-15 | 823 | 733 | 1 | 47 | 729 |
| Piedra Facetada | Piedras y perlas | PDF: `PIEDRA FACETADA_.pdf` | 2024-10-09 | 94 | 91 | 0 | 0 | 0 |
| Perla Cultivada | Piedras y perlas | PDF: `PERLA CULTIVADA.pdf` | 2024-10-09 | 29 | 27 | 0 | 2 | 0 |
| Perla Shell | Piedras y perlas | PDF: `PERLA SHELL.pdf` | 2024-10-09 | 24 | 21 | 0 | 0 | 0 |
| Perla de Vidrio | Piedras y perlas | PDF: `PERLA DE VIDRIO.pdf` | 2024-10-09 | 173 | 131 | 127 | 0 | 0 |
| Fósil | Piedras y perlas | PDF: `FOSIL_.pdf` | 2024-10-09 | 110 | 110 | 0 | 0 | 0 |
| Murano Chino | Cristales | PDF: `MURANO CHINO_.pdf` | 2024-10-09 | 233 | 232 | 0 | 0 | 0 |
| Swarosky | Cristales | PDF: `SWAROSKY.pdf` | 2024-10-09 | 103 | 43 | 35 | 15 | 15 |
| Chaquiras Checa | Chaquiras y cuentas | PDF: `CHAQUIRAS CHECA.pdf` | 2025-03-26 | 296 | 177 | 121 | 0 | 0 |
| Miyuki | Chaquiras y cuentas | PDF: `MIYUKI_.pdf` | 2025-09-20 | 369 | 364 | 340 | 0 | 336 |
| Delica Premium | Chaquiras y cuentas | PDF: `DELICA PREMIUM.pdf` | 2025-03-26 | 141 | 117 | 114 | 0 | 0 |
| Madera | Chaquiras y cuentas | PDF: `MADERA CATALOGO .pdf` | 2026-01-28 | 13 | 12 | 0 | 4 | 12 |
| Herraje Acero | Herrajes | PDF: `HERRAJE ACERO.pdf` | 2025-10-21 | 520 | 514 | 0 | 109 | 481 |
| Herraje de Golfied | Herrajes | PDF: `HERRAJE DE GOLFIED.pdf` | 2025-08-13 | 33 | 30 | 0 | 23 | 30 |
| Herrajes de Rodio | Herrajes | PDF: `HERRAJES DE RODIO.pdf` | 2025-05-20 | 84 | 75 | 0 | 0 | 75 |
| Catálogo Hilo | Hilos | PDF: `CATALOGO HILO .pdf (5).pdf` | 2026-05-05 | 191 | 164 | 82 | 2 | 49 |
| Catálogo Herramienta | Herramientas y cajas | PDF: `CATALOGO HERRAMIENTA.pdf` | 2025-12-02 | 98 | 60 | 0 | 0 | 39 |
| Cajas Organizadoras | Herramientas y cajas | PDF: `CAJAS ORGANIZADORAS.pdf` | 2026-05-05 | 128 | 120 | 26 | 55 | 40 |
| Aretes · catálogo web | Aretes | Google Site: `aretes` | — | 56 | 55 | 0 | 0 | 55 |
| Topos rodinados · catálogo web | Aretes | Google Site: `topos-rodinados` | — | 24 | 22 | 0 | 0 | 22 |
| Topos acero · catálogo web | Aretes | Google Site: `topos-acero` | — | 29 | 29 | 0 | 0 | 29 |
| Anillos · catálogo web | Anillos | Google Site: `anillos` | — | 44 | 32 | 0 | 0 | 32 |
| Pulseras · catálogo web | Pulseras | Google Site: `pulseras` | — | 53 | 51 | 0 | 0 | 51 |
| Herramientas · catálogo web | Herramientas y cajas | Google Site: `herramientas` | — | 44 | 44 | 0 | 0 | 44 |
| Cajas Organizadoras · catálogo web | Herramientas y cajas | Google Site: `cajas-organizadoras` | — | 64 | 43 | 0 | 43 | 41 |
| Dijes Acrílico · catálogo web | Dijes | Google Site: `dijes-acrilico` | — | 12 | 12 | 0 | 0 | 12 |
| Dijes Religiosos · catálogo web | Religiosos | Google Site: `dijes-religiosos` | — | 24 | 23 | 0 | 0 | 23 |
| Cadenas por metro · catálogo web | Cadenas | Google Site: `cadenas-por-metro` | — | 3 | 3 | 3 | 0 | 3 |
| Perla Cultivada · catálogo web | Piedras y perlas | Google Site: `perla-cultivada` | — | 40 | 33 | 0 | 28 | 33 |
