# Organizador de Finanzas — microapp con perfiles y datos cifrados en el dispositivo

Reconstrucción funcional de la plantilla de Excel **"Organizador – Plantilla Finanzas Personales Mensual"** que aparece en el video `mapaexcell.mp4` (29 s, analizado fotograma a fotograma). Se conservan sus funciones, cálculos y flujo de trabajo, con mejoras para usarla en computadora y en el teléfono.

---

**App publicada:** https://onemoreint.github.io/apps/organizador-finanzas/app/

## 1. Ejecutar

| Opción | Cómo |
|---|---|
| **Usarla** | Abre el enlace de arriba en el celular o la computadora, crea tu perfil y, si quieres, instálala como app (Perfil y datos → Instalar). Funciona sin internet. |
| **Desarrollo** | `npm install` → `npm run dev` (http://localhost:5173) |
| **Verificación completa** | `npm run check` ejecuta tipos, 40 pruebas, compilación y verificación del HTML |
| **Publicar** | `npm run build` regenera `app/` (un único `index.html` más el manifiesto, el service worker y los íconos). Haz commit de `app/` en `main` y GitHub Pages la sirve. |
| **Versión para claude.ai** | `npm run artifact` genera `artifact.html` (sin CSP propia ni PWA) |

Requisitos para desarrollar: Node 20 o superior. Para usarla no hace falta servidor, API ni claves.

### Estructura

```
organizador-finanzas/
  index.html          redirige a app/
  app/                ← lo publicado: index.html autocontenido, sw.js, manifest, íconos
  web/index.html      entrada de desarrollo de Vite
  public/             manifiesto, service worker e íconos (se copian a app/)
  src/                código fuente (React + TypeScript)
  scripts/            verify-bundle.mjs y to-artifact.mjs
```

## Seguridad y control en el dispositivo

Todo vive en el celular o la computadora donde se usa la app. **No hay servidor ni base de datos en internet.**

- **Perfiles con usuario y contraseña.** Un mismo dispositivo puede tener varios perfiles, y cada uno ve solo sus finanzas.
- **Cifrado.** Los datos de cada perfil se cifran con AES-GCM de 256 bits mediante Web Crypto. La clave de datos es aleatoria y se protege con la contraseña (PBKDF2-SHA256, 600.000 iteraciones, sal única). Las contraseñas no se guardan, y en IndexedDB solo queda texto cifrado.
- **Código de recuperación.** Se muestra una sola vez al crear el perfil y sirve para entrar si olvidas la contraseña. Al usarlo se genera uno nuevo. Sin la contraseña ni el código, los datos no se pueden recuperar: nadie, ni el desarrollador, puede abrirlos.
- **Bloqueo por intentos.** Tras 5 contraseñas incorrectas hay que esperar 30 s, 1 min, 2 min y así sucesivamente, hasta 15 min.
- **Bloqueo por inactividad.** Configurable en 2, 5, 15 o 60 minutos (15 por defecto). Recargar la página también cierra la sesión.
- **Política de seguridad de contenido (CSP).** La página no puede cargar scripts externos ni enviar datos a otros sitios; solo puede descargar las fuentes de Google.
- **Desde Perfil y datos:** cambiar la contraseña, generar un nuevo código de recuperación, ajustar el bloqueo, eliminar el perfil (pide la contraseña), descargar o importar un respaldo e instalar la app.
- **Para pasar los datos a otro dispositivo:** descarga el respaldo (.json) en uno y, en el otro, ve a Importar respaldo. El respaldo **no** va cifrado: guárdalo con cuidado.
- **Datos de la versión anterior:** si este navegador tenía datos de la versión sin perfiles, el primer perfil que se cree los importa cifrados y borra la copia sin cifrar.

Límites: protege contra otra persona que use el mismo dispositivo o copie sus archivos, pero no contra un virus que capture lo que escribes. Si borras los datos del sitio en el navegador, se pierden (descarga respaldos de vez en cuando).

## 2. Especificación funcional

**Propósito.** Llevar las finanzas personales mes a mes: registrar ingresos, gastos y ahorros; compararlos con un presupuesto; y ver en un tablero cuánto queda por gastar y en qué se va el dinero.

**Usuarios.** Personas o parejas que hoy usan la plantilla de Excel y quieren usarla desde el celular.

**Problema que resuelve.** En el Excel las tablas dinámicas se desactualizan (en el video, el gráfico "Detalle de gastos por" muestra Ropa $500.000 aunque el registro dice $543.090), no hay validación de datos y en el teléfono es incómodo.

### Módulos (pestañas del Excel → pantallas)

| Excel | Microapp | Estado |
|---|---|---|
| Instrucciones | *Datos e instrucciones* | Reconstruida. El contenido original no se ve en el video, así que el texto es nuevo. |
| Registro de movimientos: 6 catálogos y tabla de movimientos | *Registro de movimientos* y *Catálogos* | Fiel al original |
| Mar – Arma tu presupuesto | *Arma tu presupuesto*, una por mes | **Hipótesis**: la hoja no se abre en el video |
| Mar – Dashboard | *Dashboard* | Fiel al original, con 11 tarjetas y gráficos |

### Campos del registro

| Campo | Tipo | Validación | Por defecto |
|---|---|---|---|
| Fecha | fecha | Obligatoria y válida | Hoy, si estás en el mes actual; si no, el día 1 del mes elegido |
| Detalle | texto | Máximo 120 caracteres; opcional | — |
| Tipo | Ingreso / Gasto / Ahorro | Obligatorio | Gasto |
| Grupo | lista dependiente del Tipo | Ingreso: Fijo o Variable. Gasto: Obligatorio, Necesario o NoEsencial. Ahorro: Ahorros | Se autocompleta cuando el tipo tiene un solo grupo |
| Categoría | lista dependiente del Grupo (tabla `Tipo_Grupo`) | Debe estar en la lista | — |
| Importe | número | Mayor o igual a 0. Acepta 250000, 250.000, 250,000 y $80,000.00. **Vacío está permitido y cuenta como $0**, igual que en el Excel ("Comida" sin importe) | — |

Catálogos originales: Ingreso_Fijo, Ingreso_Variable, Ahorro_Ahorros, Gasto_Obligatorios, Gasto_Necesario y Gasto_NoEsencial, con exactamente las categorías que se ven en el video.

### Catálogo de fórmulas

Notación: `M` son los movimientos del mes y `P` es el presupuesto del mes.

| Tarjeta | Fórmula | Estado |
|---|---|---|
| Gasto total | `G = Σ importe(m), m ∈ M, tipo = Gasto` | ✔ Confirmada (2.326.090) |
| Tus ingresos | `I = Σ importe, tipo = Ingreso`, desglosado por categoría | ✔ (5.000.000) |
| Vas ahorrando | `A = Σ importe, tipo = Ahorro` | ✔ (1.000.000) |
| Puedes gastar | `ΣP_categorías − G` | **H1**, cuadra con 3.240.410 si ΣP = 5.566.500 |
| En total | `SaldoInicial + I − G` | **H2**, cuadra con 12.673.910 si SaldoInicial = 10.000.000 |
| Meta de ahorro | `avance = A / Meta`; `te faltan = máx(0, Meta − A)` | ✔ (33 %, faltan 2.000.000, Meta = 3.000.000) |
| 5 gastos NoEsencial | Top 5 de `Σ importe` por categoría NoEsencial | ✔ (Rappi 1.110.000, Ropa 543.090, Zapatillas 243.000) |
| Gastos presupuesto vs real | Por grupo de gasto: `ΣP_grupo` frente a `Σ real_grupo` | ✔ forma: real 180.000 / 250.000 / 1.896.090 |
| Detalle de tus finanzas | Barra apilada de I, G y A | ✔ proporciones |
| Seguimiento x día | `Σ importe` por fecha, filtrable por Tipo y Grupo | ✔ |
| Detalle de gastos por grupo y categoría | `Σ importe` por categoría, filtrable por Tipo y Grupo | ✔ (reemplaza la tabla dinámica sin actualizar) |

### Posibles errores del Excel original (documentados, no copiados a ciegas)

1. **Top 5 con empates.** El Excel muestra "Restaurantes $0.00" dos veces porque busca la *primera* categoría con cada valor de K.ESIMO.MAYOR. La app muestra cinco categorías distintas. En *Datos e instrucciones → Top 5 idéntico al Excel* puedes reproducir el comportamiento original; ese modo está probado (caso V7).
2. **Tabla dinámica sin actualizar.** El gráfico "Detalle de gastos por" muestra Ropa $500.000 y "Otros $200.000", cifras que no coinciden con el registro. La app recalcula siempre.
3. **Leyenda "$0.00".** La leyenda de "Tus ingresos" incluye un elemento con el texto "$0.00". La app muestra solo nombres de categoría.

---

## 3. Arquitectura

```
src/
  lib/finance.ts      Lógica de negocio pura: fórmulas, validaciones, CSV, respaldo
  lib/ejemplo.ts      Catálogos originales, 14 movimientos del video y presupuesto de ejemplo
  lib/format.ts       Formatos: moneda ($3,240,410.00 o $ 3.240.410), fechas y meses
  lib/seguridad.ts    Perfiles, contraseñas, cifrado AES-GCM, recuperación, bloqueo e IndexedDB
  lib/storage.ts      Guardado cifrado del perfil activo y descargas
  Raiz.tsx            Control de acceso: sin sesión no se descifra ni se muestra nada
  lib/finance.test.ts Pruebas (Vitest)
  components/         Dashboard, Movimientos, Presupuesto, Catálogos, Ajustes, gráficos SVG
  App.tsx             Estado global, selector de mes, pestañas, autoguardado, deshacer
```

- **React 18 + TypeScript + Vite**, compilado en un solo HTML con `vite-plugin-singlefile`, más un PWA (manifiesto y service worker).
- **Sin librería de gráficos**: los gráficos son SVG propios, más livianos y fáciles de modificar.
- **Datos**: un único objeto `Estado` con `movimientos`, `catalogo`, `meses` (presupuesto, meta y saldo inicial por mes) y `ajustes`. Se guarda cifrado en IndexedDB (`organizador-finanzas` → `kv`): `perfil:<id>` guarda las claves envueltas y la configuración del perfil; `datos:<id>` guarda las finanzas cifradas.
- **Autoguardado** 0,7 s después del último cambio, con indicador "Guardando…" o "Guardado".

## 4. Mejoras

**A. Esenciales (implementadas)**
- Recalcular siempre en lugar de depender de tablas dinámicas que hay que actualizar a mano.
- Top 5 sin repeticiones, con la opción de replicar el comportamiento del Excel.

**B. Recomendadas (implementadas)**
- Selector de mes: un solo registro sirve para todos los meses, como el filtro "Meses" del Excel.
- Validaciones con mensajes claros y listas dependientes que se limpian al cambiar el tipo o el grupo.
- Edición y borrado con confirmación y botón **Deshacer**.
- Búsqueda, filtros por mes, tipo y grupo, orden por cualquier columna y totales al pie.
- Alertas: gasto por encima del presupuesto, categorías con gasto pero sin presupuesto, gastos más ahorro mayores que los ingresos, movimientos sin importe.
- Presupuesto con % de uso por categoría. Botones para copiar el presupuesto del mes anterior y traer su saldo de cierre.
- Catálogos editables. Renombrar una categoría actualiza los movimientos y presupuestos que la usan.
- Exportar a CSV (separador `;`, se abre bien en Excel en español), respaldo e importación en JSON.
- Formato de moneda colombiano opcional, diseño adaptable al móvil y modo oscuro.

**C. Opcionales (pendientes de decisión)**
- Exportar a .xlsx con formato o a PDF.
- Movimientos recurrentes automáticos (sueldo, arriendo).
- Varias metas de ahorro (Meta 1 y Meta 2 existen como categorías, pero el Excel muestra una sola meta).
- Cuentas compartidas en pareja (requiere decidir permisos).
- Gráfico de evolución entre meses.

## 5. Casos de prueba

### Lógica (Vitest, `npm test`): 25 de 25 aprobadas

| # | Entrada | Esperado según el video | Obtenido | Estado |
|---|---|---|---|---|
| V1 | 14 movimientos de marzo | Gasto total $2,326,090.00 | $2,326,090.00 | ✔ |
| V2 | — | Tus ingresos $5,000,000.00 | igual | ✔ |
| V3 | — | Vas ahorrando $1,000,000.00 | igual | ✔ |
| V4 | presupuesto de ejemplo (5.566.500) | Puedes gastar $3,240,410.00 | igual | ✔ (H1) |
| V5 | saldo inicial 10 M | En total $12,673,910.00 | igual | ✔ (H2) |
| V6 | meta 3 M | 33 %, te faltan 2.000.000 | igual | ✔ |
| V7 | modo Excel | Rappi, Ropa, Zapatillas, Restaurantes, Restaurantes | igual | ✔ |
| V8 | modo corregido | …, Restaurantes, Salidas | igual | ✔ |
| V9 | detalle por categoría | Rappi 1.110.000, Luz 80.000, Celular 100.000, Pasajes 10.000, Comida $- | igual | ✔ |
| V10 | real por grupo | 180.000 / 250.000 / 1.896.090 | igual | ✔ |
| V11 | forma de las barras amarillas | Obligatorio > NoEsencial > Necesario | igual | ✔ |
| V12 | por día | 18-Mar = 400.000 | igual | ✔ |
| B1–B13 | Bordes | Mes vacío sin errores; meta superada; decimales (0,1 + 0,2 = $0.30); formatos de importe; negativos, categoría fuera de lista y fecha vacía rechazados; importe vacío aceptado; grupo incoherente; alertas; cambio de año; CSV; respaldo de ida y vuelta; respaldo inválido; formato CO | — | ✔ |

### Seguridad (Vitest): 15 de 15 aprobadas

S1–S15:
- Entrar con la contraseña correcta.
- El mismo error para una contraseña incorrecta que para un usuario inexistente.
- La contraseña no se guarda en texto plano y los datos se guardan cifrados.
- Aislamiento entre dos perfiles y rechazo de usuarios duplicados.
- Bloqueo progresivo y desbloqueo cuando pasa el tiempo.
- Cambio de contraseña, recuperación con código y renovación del código.
- Eliminar el perfil exige contraseña.
- Se detecta si alguien altera los datos cifrados.
- Validación de usuario y contraseña, y formato del código.

### Acceso de punta a punta (Chromium, servido por HTTP): 23 de 24 aprobadas

Se probó:
- La creación del perfil, el rechazo de una contraseña débil y que el código sea obligatorio.
- Que los datos en IndexedDB estén cifrados y que no haya nada sensible en localStorage.
- Cerrar sesión, una contraseña errada, volver a entrar con los datos intactos y que recargar cierre la sesión.
- El aislamiento de un segundo perfil, la recuperación con código y el cambio de contraseña.
- El bloqueo por inactividad, el modo sin internet y la ausencia de scroll horizontal en el celular.

La única falla es la carga de Google Fonts, que el entorno de pruebas bloquea.

### Interfaz (navegador real, Chromium): 23 de 24 aprobadas

Se probaron:
- Los KPIs iniciales y el Top 5.
- Las listas dependientes y las validaciones (categoría vacía, importe negativo).
- Alta, edición, borrado y deshacer, con los KPIs recalculados después de cada cambio.
- El cambio de meta, el formato de Colombia y la persistencia al recargar.
- Que renombrar una categoría se refleje en el tablero, y el mes vacío.
- La exportación CSV, el respaldo JSON de ida y vuelta, y la ausencia de scroll horizontal a 390 px.

La única falla se debe a que el entorno de pruebas bloquea la descarga de Google Fonts; la app usa las fuentes del sistema como respaldo.

## 6. Limitaciones e incertidumbres

- **H1 y H2 son hipótesis.** Las fórmulas cuadran exactamente con las cifras del video, pero la hoja de presupuesto nunca se muestra. Los montos por categoría del presupuesto de ejemplo son inventados: se ajustaron a la suma de 5.566.500 y a la forma del gráfico.
- No se ve cómo calcula el Excel el "acumulado" entre meses. La app usa un saldo inicial por mes, con un botón para traer el cierre del mes anterior.
- El contenido de la hoja *Instrucciones* no aparece en el video.
- Los datos no se sincronizan entre dispositivos: es intencional, para que el control quede en cada equipo. Para pasarlos de uno a otro usa el respaldo.
- No se puede declarar que la app sea *idéntica* al Excel: se reprodujo todo lo observable en 29 segundos de video.

## 7. Mantener y ampliar

- **Cambiar una fórmula**: edita `src/lib/finance.ts` (función `resumen`) y añade su prueba en `finance.test.ts`.
- **Nuevas categorías iniciales**: `CATALOGO_ORIGINAL` en `src/lib/ejemplo.ts`.
- **Nuevo grupo** (por ejemplo, Gasto → Deudas): añádelo en `GRUPOS` y `NOMBRE_TABLA` (`finance.ts`) y en el catálogo.
- **Colores y tipografía**: variables `:root` al inicio de `src/styles.css`, con un bloque para modo claro y otro para oscuro.
- **Nueva tarjeta del tablero**: un `<article className="tarjeta">` en `components/Dashboard.tsx`, con los datos calculados en `finance.ts`.
