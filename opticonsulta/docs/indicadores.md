# Definiciones de indicadores y reportes

Todas las cifras se calculan en la base de datos (funciones `dashboard_indicators`, `report_sales_summary`, `report_by_seller` y `report_by_product`, migración 0012). La interfaz no recalcula: muestra lo que la base devuelve. Las pruebas `tests/integration/reports-privacy.test.ts` comprueban estas definiciones con un escenario conocido.

## Periodos

- Un día es el día calendario en la **zona horaria de la óptica** (por defecto `America/Bogota`), no en UTC.
- «Del mes» va desde el día 1 del mes en curso, a las 00:00 locales, hasta el momento de la consulta.
- En reportes, el periodo incluye ambos extremos (desde las 00:00 del día inicial hasta las 23:59:59 del final) y no puede superar 366 días.

## Ventas

| Indicador | Definición |
| --- | --- |
| Ventas | Número de ventas **confirmadas** creadas en el periodo. Las anuladas no cuentan. |
| Venta bruta | Σ (cantidad × precio unitario) de las ventas confirmadas del periodo. |
| Descuentos | Σ descuentos por línea de esas ventas. |
| Venta neta | Venta bruta − descuentos = Σ total de esas ventas. |
| Anulaciones | Número y Σ total de las ventas **anuladas dentro del periodo** (por fecha de anulación, no de creación). |
| Por vendedor | Ventas confirmadas agrupadas por quien las registró. |
| Por producto | Líneas de ventas confirmadas agrupadas por producto: cantidad, bruto, descuentos y neto. |

Una venta creada en el mes y anulada en el mismo mes **no** suma en venta neta y **sí** aparece en anulaciones.

## Pagos y cartera

| Indicador | Definición |
| --- | --- |
| Pagos recibidos | Σ pagos registrados en el periodo − Σ valor de los pagos **revertidos** en el periodo (por fecha de reversión). |
| Por medio de pago | Lo mismo, separado por medio (efectivo, tarjeta, transferencia…). |
| Saldo por cobrar | Σ (total − pagos vigentes) de **todas** las ventas confirmadas con saldo, a la fecha (no depende del periodo). |
| Ventas con saldo | Número de ventas confirmadas con saldo mayor que cero. |

Un pago revertido no se borra: el pago y su reversión quedan registrados y el recibo impreso lo muestra como «REVERTIDO».

## Caja

- **Esperado por medio de pago** de una caja = pagos registrados en esa caja − reversiones hechas desde esa caja. Para el efectivo se suman además la base inicial y las entradas, y se restan las salidas registradas en la caja.
- **Diferencia al cierre** = contado − esperado, por medio de pago. Se guarda al cerrar y no se puede modificar.
- La pantalla de cierre no muestra el esperado a quien no tiene `cash.read_all` (por ejemplo, el cajero), para que cuente sin sesgo; el administrador ve el esperado y la diferencia. Es una medida de la interfaz, no de seguridad: la base permite a cada quien consultar el esperado y el resultado de su propia caja.

## Operación

| Indicador | Definición |
| --- | --- |
| Citas de hoy | Citas de hoy programadas, confirmadas o atendidas. «Por atender»: programadas o confirmadas. |
| Consultas en borrador | Consultas sin finalizar (solo para quien tiene `clinical.read`). |
| Órdenes de laboratorio | Órdenes por enviar, en proceso, recibidas o rechazadas en calidad. «Para entregar»: control de calidad aprobado. «Atrasadas»: por enviar o en proceso con fecha prometida anterior a hoy. |
| Productos bajo mínimo | Productos activos con control de existencias cuya existencia total (todas las sedes) es menor o igual a su mínimo. |
| Garantías abiertas | Casos abiertos o en gestión. |

## Quién ve qué

`dashboard_indicators` solo devuelve las claves que el rol puede ver: financieras con `reports.financial`, clínicas con `clinical.read`, agenda con `agenda.read`, laboratorio con `lab.read`, inventario con `inventory.read` y garantías con `warranty.read`. Ocultar una tarjeta en la pantalla no es el control: la base no envía el dato.
