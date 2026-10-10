# Fases D a G — Comercio, laboratorio, indicadores y entrega

Fecha: 9 de octubre de 2026.

## Fase D · Ventas, inventario y caja (migración 0010)

- **Catálogo** de productos (montura, lente oftálmico, lente de contacto, accesorio, servicio, otro) con precio de catálogo o variable (0), costo, mínimo y control de existencias; proveedores; medios de pago por óptica.
- **Inventario por sede** derivado de movimientos (entrada, salida por venta, devolución por anulación, ajustes). La base impide existencias negativas. Ajustes con motivo.
- **Cotizaciones** con consecutivo, vigencia y versión. Descuento sobre el umbral de la óptica → pendiente de aprobación; aprobada, se convierte en venta sin volver a digitar.
- **Ventas** con consecutivo, precio tomado del catálogo en la base (el precio enviado por el navegador se ignora salvo en productos de precio variable), descuento por línea, paciente y fórmula vigente opcionales.
- **Pagos y abonos** con número de recibo interno, solo desde la propia caja abierta en la sede. Los pagos no se editan ni se borran: se **revierten** con motivo (el cajero solicita; el administrador revierte o rechaza).
- **Caja por persona**: apertura con base, entradas y salidas de efectivo con motivo, cierre con conteo por medio de pago y diferencia guardada; la pantalla de cierre no muestra el esperado a quien no tiene `cash.read_all` (conteo sin sesgo; no es un control de seguridad).
- **Recibo interno** imprimible: «Documento interno. No es una factura electrónica de venta».

## Fase E · Laboratorio, entrega y garantías (migración 0011)

- **Órdenes de laboratorio** desde la venta, con la **fórmula congelada** (valores, versión y sello) en el momento del pedido.
- Estados configurables (los del sistema se renombran, no se eliminan) e **historial inmutable** de cada cambio.
- **Control de calidad** con lista de verificación; para aprobar deben marcarse todas; rechazar exige motivo.
- **Entrega** con quien recibe; solo órdenes aprobadas en calidad; con saldo, solo autorizada por quien tiene `discount.approve`.
- **Garantías e incidencias** con eventos y cierre con resolución.
- **Anulación de venta** solo sin pagos vigentes, órdenes activas ni entregas; devuelve existencias.

## Fase F · Indicadores, reportes, exportación y privacidad (migración 0012)

- **Inicio** con indicadores calculados en la base, solo los que el rol puede ver. Definiciones: [indicadores.md](indicadores.md).
- **Reportes** por periodo: resumen, por medio de pago, por vendedor y por producto.
- **Exportación CSV** registrada antes de entregar (usuario, tipo, filas, motivo), con protección contra inyección de fórmulas y sin datos clínicos.
- **Solicitudes de titulares** (Ley 1581) con fecha límite en días hábiles y respuesta obligatoria para cerrar.
- **Roles y permisos**: pantalla para que el propietario ajuste los permisos de cada rol.

## Fase G · Demo, respaldo probado y documentación

- **Óptica de demostración** (`scripts/seed-demo.mjs`): cinco usuarios (uno por rol), pacientes, citas, fórmulas, ventas, pagos, cotización con descuento pendiente, órdenes de laboratorio y una solicitud de titular, **todo ficticio** (documentos 9999…, dominio `.test`) y marcado `is_demo`. Todo se crea a través de la API como cada usuario, con RLS y RPC; la clave `service_role` solo crea las cuentas y marca la demo.
- **Respaldo y restauración verificados** (`scripts/backup.mjs`, `scripts/restore.mjs`): ver [respaldo-y-restauracion.md](respaldo-y-restauracion.md).
- **Pila local sin Docker** para pruebas de extremo a extremo: ver [pruebas-e2e.md](pruebas-e2e.md).
- Documentación: [despliegue](despliegue.md), [guía del administrador](guia-administrador.md), [manual de uso](manual-usuario.md), [indicadores](indicadores.md), [matriz legal](matriz-legal.md), [riesgos](riesgos.md), [matriz de permisos](matriz-permisos.md).

## Decisiones técnicas

| Decisión | Motivo |
| --- | --- |
| Ventas, pagos, caja e inventario solo por RPC | Precio, existencias, caja abierta y permisos se validan juntos en una transacción |
| Existencias mantenidas por disparador a partir de movimientos | Una sola fuente de verdad; la base rechaza saldos negativos |
| Reversión en lugar de borrado | El historial de caja y los recibos impresos siguen siendo verificables |
| Fórmula congelada en la orden | Una versión nueva de la fórmula no altera lo pedido al laboratorio |
| Indicadores en funciones SQL | Una definición única para inicio, reportes y pruebas; la base no envía lo que el rol no puede ver |
| Exportación por ruta POST con verificación de origen | Descarga de archivo sin JavaScript, protegida contra CSRF, registrada antes de entregar |
| Tipos generados desde la base de pruebas (`npm run db:types`) | Insert/Update reflejan los privilegios reales por columna: una tabla de solo RPC queda con `Insert: never` |
| Respaldo de solo datos + restauración con disparadores en modo réplica | Restaurar no re-aplica movimientos ni duplica auditoría; filas e integridad se comparan con el manifiesto |

## Hallazgos durante la verificación

- La pila de pruebas no concedía `USAGE` sobre el esquema `extensions` (Supabase sí lo concede); PostgREST lo necesita para tipos `citext`. Se corrigió el shim de pruebas y la pila local para reproducir Supabase.
- En móvil, varias páginas con tablas desbordaban horizontalmente; se corrigió y la prueba de navegación lo verifica en cada página.
- Al pagar el total, el formulario desaparecía antes de mostrar la confirmación; ahora la venta muestra «Venta pagada por completo».

## Resultado de las pruebas (9 de octubre de 2026)

| Conjunto | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run test:unit` | 40 aprobadas |
| `npm run test:db` | 141 aprobadas (aislamiento, permisos, clínica, comercio, laboratorio, reportes, privacidad, respaldo y endurecimiento del esquema) |
| `npm run test:e2e` (pila sin Docker, compilación de producción) | 23 aprobadas, 2 omitidas (registro con correo: requiere Mailpit) |
| `npm run build` | Compilación de producción correcta |

Las pruebas de base de datos se comprobaron por mutación: al quitar la verificación de `export.data` o ampliar la política de lectura de cajas, fallan las pruebas correspondientes.

## Fuera de alcance (sin cambios)

Envío del RDA al Ministerio, RIPS, factura electrónica DIAN, integraciones con EPS, WhatsApp/SMS, diagnóstico asistido por IA, contabilidad, nómina, multisede avanzada y portal del paciente.
