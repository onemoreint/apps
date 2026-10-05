# CarteraPro — Arquitectura y cómo extenderla

## Capas

```
UI          js/views/ (una pantalla por archivo)  ·  js/ui/ (componentes, diálogos, bloqueo)
SERVICIOS   js/services/  → orquestan: validan, calculan, guardan y avisan con eventos
DOMINIO     js/domain/    → reglas puras sin DOM ni base de datos (se prueban con node --test)
DATOS       js/data/db.js → única puerta a IndexedDB
NÚCLEO      js/core/      → router, fechas, dinero, eventos, errores, idiomas
```

Reglas que mantienen el sistema consistente:

1. **La interfaz nunca toca IndexedDB.** Llama a un servicio.
2. **Los cálculos viven en `domain/`** y reciben datos como argumentos (incluida la fecha de hoy). Así se prueban sin navegador.
3. **Dinero en enteros** (unidad mínima de la moneda) y **fechas como `YYYY-MM-DD`**. Usa `core/money.js` y `core/dates.js`.
4. **Lo derivado no se guarda**: estados, saldos, días de atraso y riesgo se calculan en `domain/estados.js` y `domain/metricas.js`.
5. **Operaciones de varios registros en una transacción** (`transaccion()` de `db.js`): o se guarda todo o nada.
6. **Cada servicio que escribe llama a `cambio()`** (`services/datos.js`), que invalida la caché y emite `datos:cambiaron`.
7. **Todo texto interpolado pasa por `html```** (`ui/html.js`), que escapa el contenido y evita inyección de HTML.

## Flujo de un pago

`views/pago-form.js` → `services/pagos.registrar()` → transacción: lee cuotas → `domain/pagos.distribuirPago()` (cascada + prorrateo capital/interés) → guarda cuotas y pago con recibo consecutivo → `cambio('pago:registrado')` → la vista muestra el recibo.

## Cómo añadir funciones

### Una pantalla nueva
1. Crea `js/views/mi-pantalla.js` con `export async function render(el, params, query) { ... }`. Puede devolver una función de limpieza.
2. Regístrala en `definirRutas()` de `js/app.js`: `router.ruta('/mi-ruta', v('mi-pantalla'), { seccion: 'mas' })`.
3. Agrega un acceso en `views/mas.js` o en `NAV_EXTRA`.
4. Ejecuta `node tools/actualizar-sw.mjs` y sube `VERSION` en `service-worker.js`.

### Un campo nuevo en una tabla
- Campo opcional (por ejemplo, `cliente.email`): agrégalo al formulario y al servicio; los registros viejos simplemente no lo tienen.
- Campo que necesita índice o transformar datos existentes: sube `VERSION` en `js/data/db.js` y añade `if (anterior < 2) { ... }` en `migrar()`.
- Si cambia el formato de la copia, sube `VERSION_FORMATO` en `domain/copia.js` y acepta las copias viejas en `validarCopia()`.

### Un tipo de interés nuevo (por ejemplo, cuota fija francesa)
1. Añádelo a `TIPOS_INTERES` en `domain/interes.js` con nombre, explicación y ejemplo.
2. En amortización decreciente el interés de cada cuota es distinto: genera el reparto en `domain/cuotas.js` (hoy `repartir()` divide en partes iguales). `distribuirPago()` ya trabaja con el capital e interés propios de cada cuota, así que no necesita cambios.
3. Agrega pruebas en `tests/dominio.test.mjs`.

### Sincronización en la nube y varios dispositivos
Todos los registros ya tienen `id` UUID, `creadoEn` y `actualizadoEn`, y los pagos se anulan en lugar de borrarse; eso permite sincronizar sin conflictos destructivos. Pasos sugeridos:
1. Backend con autenticación (Supabase, Firebase o API propia).
2. Un módulo `js/data/sync.js` que escuche `datos:cambiaron`, guarde en una cola (store `pendientes`) y suba cuando haya conexión; al iniciar, descargue cambios por `actualizadoEn`.
3. Regla de conflicto: gana el `actualizadoEn` más reciente por registro; los pagos nunca se sobrescriben.
4. Las vistas no cambian: siguen leyendo de IndexedDB.

### Analista IA conectado
`services/ia.js` define el punto de extensión. Crea un endpoint propio (que guarde la clave del proveedor de IA en el servidor, nunca en la PWA) y regístralo al iniciar:

```js
import { registrarProveedor } from './services/ia.js';
registrarProveedor({ nombre: 'Servidor', analizar: async prompt =>
  (await fetch('https://tu-servidor/api/analizar', { method: 'POST', body: prompt })).text() });
```

Luego, en `views/analista-ia.js`, muestra una caja de pregunta cuando `proveedorActual()` exista. Usa siempre `resumenAnonimo()`: no envía nombres, teléfonos ni documentos.

### Otro idioma
Los textos traducibles usan `t('clave')` de `core/i18n.js`. Hoy están traducidos la navegación, la barra superior y la bienvenida (`locales/en.js`, `locales/pt.js`); lo demás usa español. Para avanzar: reemplaza textos fijos de una vista por `t('...')`, añade las claves en los tres archivos y agrega el selector de idioma en Configuración (`config.idioma`).

## Pruebas

| Archivo | Qué cubre |
|---|---|
| `tests/dominio.test.mjs` | Interés, cuotas, fechas, pagos (completo, parcial, cascada, anulación), gracia, métricas, riesgo, validaciones, dinero, reportes, copias, CSV, service worker, diagnóstico, idiomas |
| `tests/e2e.py` | Recorrido completo en Chromium: demo, todas las pantallas, crédito real y pagos |
| `tests/e2e_etapa4.py` | Copia y restauración, copia dañada, importación CSV, apariencia, PIN, uso sin conexión |
| `tests/e2e_final.py` | Caso de la especificación (Carlos Pérez), etiquetas de formularios, teclado y rendimiento con 300 clientes |
