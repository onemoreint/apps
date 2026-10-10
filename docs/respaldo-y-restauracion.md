# Respaldo, restauración y exportación

## Qué protege a los datos

1. **Respaldos del proveedor.** En Supabase, los planes de pago incluyen respaldos diarios y, como complemento, recuperación a un punto en el tiempo (PITR). Revisa en tu proyecto qué plan tienes y cuántos días se conservan: OptiConsulta no lo controla.
2. **Respaldo lógico propio** (este documento): una copia independiente del proveedor, verificable, que la óptica guarda bajo su control.
3. **Exportaciones CSV** desde Reportes: sirven para contabilidad o análisis, **no** son un respaldo (no incluyen historias clínicas ni permiten restaurar).

## Respaldo lógico

```bash
node scripts/backup.mjs "postgresql://postgres:[CLAVE]@[HOST]:5432/postgres" respaldos/2026-10-09
```

La cadena de conexión directa está en Supabase → Project Settings → Database. Requiere `pg_dump` y `psql` de la misma versión mayor que el servidor (o superior).

Genera dos archivos:

| Archivo | Contenido |
| --- | --- |
| `datos.dump` | Solo datos (formato personalizado de `pg_dump`) de los esquemas `public` y `private` y de las cuentas (`auth.users`, `auth.identities`). No incluye sesiones ni tokens. |
| `manifiesto.json` | Fecha, versión de `pg_dump`, huella SHA-256 de cada migración, número de filas por tabla, resultados de integridad y huella SHA-256 de `datos.dump`. |

Antes de respaldar se verifica la integridad del origen; si una historia o fórmula no coincide con su sello, el respaldo se detiene y lo informa.

**El respaldo contiene datos personales y clínicos.** Guárdalo cifrado (por ejemplo, un volumen cifrado o un archivo cifrado con una clave que no se guarde junto a él), con acceso solo para el responsable, y registra dónde está. Borra las copias que ya no correspondan a tu política de conservación, teniendo en cuenta que las historias clínicas tienen plazos de conservación propios (ver la matriz legal).

## Restauración verificada

La restauración se hace en una **base nueva**, nunca encima de la base en uso:

1. Crea un proyecto nuevo de Supabase (o una base local) y aplica **las mismas migraciones** de la versión que generó el respaldo: `npx supabase link --project-ref …` y `npx supabase db push`.
2. Ejecuta:

   ```bash
   node scripts/restore.mjs "postgresql://postgres:[CLAVE]@[HOST-NUEVO]:5432/postgres" respaldos/2026-10-09
   ```

3. El script:
   - comprueba la huella SHA-256 del archivo (rechaza un respaldo alterado o dañado);
   - comprueba que las migraciones coinciden con las del respaldo;
   - exige que la base destino no tenga ópticas ni cuentas;
   - carga los datos en **una sola transacción** con los disparadores en modo réplica, para no volver a aplicar movimientos de inventario ni duplicar auditoría;
   - compara el número de filas de cada tabla con el manifiesto y vuelve a verificar los sellos de consultas y fórmulas y que las existencias cuadren con los movimientos.
4. Solo si responde «Restauración verificada» cambia la aplicación a la nueva base (variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Si informa diferencias, no cambies nada y revisa el detalle que imprime.

Las contraseñas de las cuentas se conservan (se restaura su hash). Las sesiones abiertas no: todos vuelven a iniciar sesión.

`session_replication_role = replica` requiere el rol `postgres` del proyecto. Si tu proveedor no lo permite, la restauración se detiene con un error y no deja datos a medias (es una sola transacción).

## Simulacro

Haz un simulacro al menos cada trimestre y después de cada cambio de versión: respalda producción, restaura en un proyecto temporal, revisa el resultado y elimina el proyecto temporal. Anota fecha, responsable, tamaño del respaldo, tiempo de restauración y resultado.

La prueba automática `tests/integration/backup.test.ts` hace exactamente esto en cada ejecución de `npm run test:db`: crea datos (incluida una consulta finalizada, una fórmula validada, una venta y su pago), respalda, restaura en otra base y comprueba filas, sellos, existencias, que la auditoría siga siendo inmutable, que una alteración clínica posterior se detecte y que se rechacen un destino con datos y un respaldo modificado.

## Exportaciones CSV

Desde **Reportes**, con el permiso `export.data` y el permiso de lectura de cada conjunto. Cada exportación exige un motivo y se registra (usuario, tipo, filas, motivo y fecha) **antes** de entregar el archivo; si el registro falla, no se entrega. El registro es inmutable y lo consulta quien tiene `audit.read`.

| Conjunto | Contenido | Permiso adicional |
| --- | --- | --- |
| Ventas | número, fecha, estado, valores, pagado, saldo, anulación | `reports.financial` |
| Pagos | recibo, venta, fecha, medio, valor, referencia, reversión | `reports.financial` |
| Citas | fecha, estado, paciente, documento, teléfono, profesional, motivo | `agenda.read` |
| Pacientes | identificación y contacto, **sin datos clínicos** | `patients.read` |
| Existencias | productos con existencias por sede | `inventory.read` |

No existe exportación de historias clínicas: `export.clinical` no está asignado a ningún rol hasta que la óptica defina con su asesor quién puede hacerlo y con qué procedimiento. Los archivos usan punto y coma y UTF-8 con BOM (se abren bien en Excel en español) y neutralizan celdas que empiezan por `=`, `+`, `-` o `@`.
