# Matriz de permisos

Fuente de verdad: `private.default_role_permissions` en `supabase/migrations/20261009000002_tenancy.sql`. Cada organización recibe una copia al crearse; el propietario puede ajustar los roles distintos de propietario desde la base (la pantalla de edición de roles llega en la Fase F).

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
