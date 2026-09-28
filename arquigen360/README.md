# ARQUIGEN 360 — Generador Inteligente de Planos Arquitectónicos

MVP paramétrico: el proyecto es un JSON con terreno, programa y geometría. Todo lo
que se ve (plano, cotas, 2.5D, lámina, exportaciones) se calcula a partir de él.
La arquitectura completa está en [ARQUITECTURA.md](./ARQUITECTURA.md).

## Requisitos

- Node.js 20 o superior

## Uso

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
npm test             # pruebas del motor de distribución y del intérprete
npm run build        # HTML autocontenido en dist/index.html
npm run check        # tipos, lint, pruebas, build y verificación del HTML
```

## Qué hace el MVP

1. **Terreno**: ancho, largo, pisos, acceso (frontal, posterior, laterales), norte,
   ocupación máxima y retiros.
2. **Programa**: ambientes con ancho, largo y área mínimos, prioridad y relaciones;
   preferencias de zona social, cocina abierta y garaje (0, 1 o 2 vehículos).
3. **Generar distribución**: motor determinista por bandas y columnas, con pasillo,
   puertas, ventanas (nunca sobre medianeras) y mobiliario automático.
4. **Editor**: mover ambientes (con imán y sin solapes), mover muros compartidos,
   editar medidas, agregar/mover puertas y ventanas, agregar/rotar muebles,
   duplicar, eliminar, deshacer/rehacer.
5. **Cotas automáticas**: generales, parciales (incluyen retiros), por ambiente y de vanos.
6. **Validación y cuadro de áreas**: solapes, límites, mínimos, ocupación,
   accesibilidad desde la entrada, iluminación natural y reglas de relación.
7. **Estilos**: técnico, inmobiliario, moderno y cálido.
8. **Vista 2.5D** derivada de la misma geometría, con giro, inclinación y corte de muros.
9. **Lámina A3** con plano, áreas, norte y escala gráfica.
10. **Exportar**: PNG, JPG, PDF, SVG y proyecto .json. Guardar, abrir, duplicar y
    eliminar proyectos (almacenados en el navegador).
11. **Asistente**: convierte una descripción en español en terreno + programa.

## Actualización 2.0 (Fase A de la Actualización Maestra 2026)

- **Modelo versionado**: `schemaVersion: "2.0.0"`, migraciones explícitas desde 1.x, JSON Schema en `schema/project.schema.json`.
- **La IA propone comandos, no edita**: pestaña «Asistente IA → Editar el plano con texto». Cada comando pasa por JSON → esquema → permiso → objeto existe → límites → geometría → colisiones → ocupación.
- **Normativa y cumplimiento**: vista «Normativa» con estados PASS / WARNING / FAIL / NOT_EVALUATED / NOT_APPLICABLE / UNVERIFIED, fuente y versión de cada regla, jurisdicción (Colombia → Antioquia → Valle de Aburrá) y matriz de referencia. Nada se marca como cumplido sin fuente verificada.
- **Historial**: vista «Historial» con versiones nombradas (guardar, restaurar, duplicar, comparar), estado del documento y registro de auditoría.
- **IndexedDB** para proyectos, respaldo completo y restauración; importaciones validadas.
- **Calidad**: 53 pruebas (incluye seguridad y 300 casos aleatorios), verificación del HTML y CI en GitHub Actions. Trazabilidad en `quality/fase-a.md`.

## Estructura

```
src/
  geometry/       modelo de datos, rectángulos, muros, cotas, marco del lote
  layout-engine/  catálogo, reglas, motor, aberturas, validación (+ pruebas)
  furniture/      biblioteca a escala real y amoblado automático
  render/         estilos, plano SVG, vista 2.5D, lámina
  export/         SVG, PNG, JPG, PDF
  ai/             intérprete local y contrato para un proveedor LLM
  projects/       valores por defecto, persistencia (IndexedDB), versiones, textos legales
  schema/         JSON Schema, validador, migraciones y validación de dominio
  commands/       comandos declarativos y su pipeline de validación
  normative-engine/ reglas con fuente y versión, jurisdicciones, matriz, adaptadores
  components/     interfaz
  store.ts        estado global con historial
```

## Siguientes fases sugeridas

- Varios pisos (el campo ya existe) y escaleras vinculadas entre plantas.
- Proveedor LLM real detrás de un backend propio (`src/ai/provider.ts`).
- Render 3D con React Three Fiber a partir de `computeWalls` y el mobiliario.
- Estilos premium, tropical, minimalista y contemporáneo.
- Cotas editables arrastrando y unidades en pies.

## Versión publicada

`app/index.html` es la aplicación ya compilada en un solo archivo (no necesita
instalar nada). Es la que abre GitHub Pages:
https://onemoreint.github.io/apps/arquigen360/app/

El `index.html` de esta carpeta es solo el punto de entrada de desarrollo
(`npm run dev`) y no funciona abierto directamente en el navegador.

Para actualizar la versión publicada después de cambiar el código:

```bash
npm install
npm run publish:app   # tipos + lint + pruebas + build + verificación + copia a app/index.html
```

Luego haz commit de `app/index.html` y súbelo a `main`.
