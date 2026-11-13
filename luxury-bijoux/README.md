# Luxury Bijoux — showroom digital de bisutería

Publicado en **https://onemoreint.github.io/apps/luxury-bijoux/** · Panel: **/luxury-bijoux/admin/**

8.063 productos con sus fotos originales, extraídos de los 41 PDF de la carpeta «CATALOGOS» y del Google Site «Catalogo Chaquiras y Bisutería» (ver `AUDITORIA.md`).

## Cómo está organizado

- `data/` — la base de datos: `products.json`, `categories.json`, `collections.json`, `settings.json`.
- `assets/products/` — fotos originales en WebP (y miniaturas en `thumb/`).
- `assets/css`, `assets/js`, `assets/fonts` — diseño y comportamiento, sin dependencias.
- `admin/` — panel administrativo.
- `tools/build.py` — genera `index.html`, `catalogo/`, `p/<producto>/`, `c/<categoría>/`, `col/<colección>/`, `data/catalog.json` y `sitemap.xml` a partir de `data/`. Solo necesita Python 3.8+.

```bash
python3 luxury-bijoux/tools/build.py
```

## Panel administrativo

Entra a `/luxury-bijoux/admin/` con el repositorio `onemoreint/apps`, rama `main` y un token personal de grano fino con **Contents: Read and write** solo sobre este repositorio. El token vive únicamente en la pestaña abierta.

Al pulsar «Publicar cambios» el panel guarda un commit en `luxury-bijoux/data/` (y las fotos nuevas). La Action **«Luxury Bijoux · regenerar catálogo»** vuelve a generar las páginas y GitHub Pages publica el resultado en pocos minutos. Si una ficha no se actualiza, ejecuta la Action a mano desde la pestaña *Actions* o corre `tools/build.py` localmente y sube el resultado.

Cambiar el número de WhatsApp se aplica al instante, sin regenerar.

## Pendiente

- Configurar el número de WhatsApp (Panel → Ajustes).
- Revisar los nombres de marca que vienen en las fuentes: «Aretes Gucci» y el catálogo «Swarosky».
- Los precios están ocultos; se activan en Panel → Ajustes.
