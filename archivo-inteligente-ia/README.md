# Archivo Inteligente IA

**Prototipo demostrativo independiente — Datos ficticios.**

Microaplicación web que muestra cómo una alcaldía colombiana puede pasar de hojas de cálculo, correos y registros físicos a un flujo digital centralizado de gestión documental, con un asistente de clasificación (ARCHI IA). Está pensada para presentarse en Girardota y La Estrella (Antioquia) y se adapta a cualquier municipio.

> No es un sistema oficial, no reemplaza plataformas gubernamentales y no está avalada por ninguna alcaldía. No cumple integralmente los requisitos de un SGDEA. Los códigos de series y subseries son **de demostración**; no provienen de ninguna TRD ni CCD aprobada.

## Cómo ejecutarla

No requiere instalación, compilación ni dependencias.

**Opción A: doble clic.** Abre `index.html` en Chrome, Edge o Safari.

**Opción B: servidor local (recomendado para pruebas).**
```bash
cd archivo-inteligente-ia
python3 -m http.server 8765
# abrir http://localhost:8765
```

Al abrirla por primera vez se generan **72 expedientes ficticios** de 7 dependencias y **7 transferencias** en distintos estados. Los datos se guardan en el navegador (IndexedDB). Para volver al estado inicial: **Configuración › Restaurar base de demostración**.

## Módulos

| # | Pantalla | Qué hace |
|---|----------|----------|
| 1 | Inicio | Indicadores calculados en vivo, evolución mensual, distribución y actividades por dependencia, últimos movimientos |
| 2 | Expedientes | Registro con validaciones, código autogenerado, búsqueda, filtros, edición, cierre y reapertura |
| 3 | Inventario | Tabla con búsqueda instantánea, filtros avanzados, ordenamiento, CSV, impresión y registro de cambios |
| 4 | Transferencias | Borrador → En revisión → Pendiente de aprobación → Aprobada → Completada (o Devuelta para corrección), con historial y comprobante |
| 5 | ARCHI IA | Sugerencias de serie y subserie, metadatos, campos incompletos, nombre normalizado, resumen y razones. Ninguna se aplica sin la validación de un funcionario |
| 6 | Alertas | Reglas configurables, filtros, responsables y registro de acciones correctivas |
| 7 | Informes | 6 informes con exportación CSV y vista imprimible (Guardar como PDF) |
| 8 | Productividad | Simulador hipotético: proceso tradicional frente a proceso digital |
| 9 | Configuración | Municipio, perfil demo, reglas, modo de IA, catálogo, respaldo JSON y restauración |

## Datos institucionales por municipio

El selector de municipio carga una **ficha pública de referencia**: departamento, subregión, código DANE, población proyectada 2026 por el DANE y sitio web oficial. También pone los nombres reales de las dependencias que aparecen en documentos públicos (SIGEP, decretos e informes de gestión), con sus fuentes visibles en **Configuración**. Antes de una presentación formal, verifique estos datos con la estructura administrativa vigente.

**Logo:** la app no incluye escudos ni logotipos oficiales. Si la alcaldía autoriza por escrito el uso de su imagen, se puede cargar en **Configuración › Identidad visual institucional**. El logo queda solo en ese navegador, no se publica y la leyenda de prototipo se mantiene.

## Estructura

```
archivo-inteligente-ia/
├── index.html            # Shell, iconos SVG y CSP
├── css/styles.css        # Diseño responsive e impresión
├── js/
│   ├── util.js           # Plantilla HTML con escape automático, CSV seguro, modal
│   ├── catalog.js        # Catálogo DEMO, municipios, estados y reglas por defecto
│   ├── db.js             # IndexedDB (con respaldo en memoria)
│   ├── seed.js           # Generador determinista de datos ficticios
│   ├── store.js          # Reglas de negocio, validaciones, auditoría y alertas
│   ├── archi.js          # ARCHI IA: modo demostración por reglas y modo IA real (backend)
│   ├── charts.js         # Gráficos SVG sin librerías
│   ├── views-*.js        # Pantallas
│   └── app.js            # Navegación y eventos
├── tests/                # Pruebas Playwright (e2e + capturas)
└── docs/                 # Guía de demo, limitaciones y evolución
```

## Pruebas

Requiere Python 3, Playwright y Chrome.
```bash
python3 -m http.server 8765 &
python3 tests/e2e.py http://localhost:8765/index.html 1366   # escritorio
python3 tests/e2e.py http://localhost:8765/index.html 390    # móvil
python3 tests/smoke.py                                       # capturas de las 9 pantallas
```
`e2e.py` hace 37 verificaciones: creación, validación, edición, búsqueda, filtros, ordenamiento, cambios de estado, flujo de transferencias completo, alertas y acciones correctivas, los 6 informes, exportaciones CSV/JSON, importación, escape de HTML (anti-XSS), simulación de clasificación, calculadora, persistencia tras recargar, selector de municipio y restauración.

## Despliegue en GitHub Pages (cuando se autorice)

La aplicación es estática y funciona en GitHub Pages sin compilar. Una vez autorizado, basta con publicar la carpeta `archivo-inteligente-ia/`. Recuerde: GitHub Pages e IndexedDB **solo** son adecuados para esta demostración con datos ficticios. No sirven para alojar información documental institucional.

## Documentación

- [Guía de demostración de 10 minutos](docs/GUIA-DEMO-10-MIN.md)
- [Funcionalidades implementadas y limitaciones del MVP](docs/FUNCIONALIDADES-Y-LIMITACIONES.md)
- [Propuesta de evolución hacia una versión institucional](docs/EVOLUCION-INSTITUCIONAL.md)
