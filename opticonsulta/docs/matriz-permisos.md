# Matriz de permisos

Fuente de verdad: `private.default_role_permissions` en `supabase/migrations/20261009000002_tenancy.sql`. Cada organización recibe una copia al crearse; el propietario ajusta los roles distintos de propietario en **Roles y permisos**. `clinical.configure` y `professionals.manage` se agregaron en la migración 0006 y `catalog.manage` en la 0010.

**Regla estructural:** los permisos marcados como clínicos (`clinical.read`, `clinical.write`, `prescription.write`, `export.clinical`) solo pueden asignarse al rol optómetra. Lo impone un trigger en `role_permissions`; cambiarlo exige una migración y la validación jurídica pendiente (pregunta de la sección 9 de la Fase A).

| Permiso | Propietario | Administrador | Optómetra | Asistente | Cajero |
| --- | :-: | :-: | :-: | :-: | :-: |
| agenda.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| agenda.write | ✓ | ✓ | ✓ | ✓ | |
| patients.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| patients.write | ✓ | ✓ | ✓ | ✓ | |
| clinical.read (clínico) | | | ✓ | | |
| clinical.write (clínico) | | | ✓ | | |
| prescription.write (clínico) | | | ✓ | | |
| prescription.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| prescription.external | ✓ | | ✓ | ✓ | |
| sales.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| sales.manage | ✓ | ✓ | | ✓ | ✓ |
| discount.request | ✓ | | | ✓ | ✓ |
| discount.approve | ✓ | ✓ | | | |
| payments.register | ✓ | ✓ | | ✓ | ✓ |
| payments.reverse | ✓ | ✓ | | | |
| payments.reverse_request | ✓ | | | | ✓ |
| cash.operate | ✓ | ✓ | | | ✓ |
| cash.read_all | ✓ | ✓ | | | |
| inventory.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory.receive | ✓ | ✓ | | ✓ | |
| inventory.adjust | ✓ | ✓ | | | |
| catalog.manage | ✓ | ✓ | | | |
| lab.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| lab.manage | ✓ | ✓ | | ✓ | |
| delivery.manage | ✓ | ✓ | ✓ | ✓ | |
| delivery.handover | ✓ | ✓ | ✓ | ✓ | ✓ |
| warranty.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| warranty.manage | ✓ | ✓ | ✓ | ✓ | |
| reports.financial | ✓ | ✓ | | | |
| reports.own_cash | ✓ | | | | ✓ |
| export.data | ✓ | ✓ | | | |
| export.clinical (clínico) | | | | | |
| users.manage | ✓ | ✓ | | | |
| roles.manage | ✓ | | | | |
| settings.manage | ✓ | ✓ | | | |
| audit.read | ✓ | ✓ | | | |
| clinical.configure | | | ✓ | | |
| professionals.manage | ✓ | ✓ | | | |
| privacy.manage | ✓ | ✓ | | | |
| privacy.register | ✓ | ✓ | | ✓ | |

Reglas adicionales aplicadas en las funciones RPC:

- Solo un propietario puede invitar, ascender, degradar o suspender a otro propietario.
- Nadie puede cambiar su propio rol ni suspender su propia cuenta.
- Toda organización conserva al menos un propietario activo.
- Los permisos del rol propietario no se modifican.
- Solo el profesional autor edita su borrador de consulta o de fórmula interna; solo quien transcribió una fórmula externa la confirma. Las adendas y las versiones nuevas quedan a nombre de quien las crea.
- `export.clinical` no está asignado a ningún rol hasta definir con el asesor quién puede exportar historias clínicas.
- Cobrar exige tener la propia caja abierta en la sede de la venta; revertir un pago en efectivo, también.
- Cerrar una caja: quien la abrió o quien tiene `cash.read_all`.
- Una venta se anula solo sin pagos vigentes, sin órdenes de laboratorio activas y sin entregas.
- Entregar con saldo pendiente exige `discount.approve` y la autorización explícita, que queda registrada.
- Exportar exige `export.data` **y** el permiso de lectura del conjunto exportado, además de un motivo.
- Los indicadores del inicio solo incluyen los datos que el rol puede leer.
