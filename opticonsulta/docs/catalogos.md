# Catálogos de referencia

OptiConsulta guarda los códigos que exige el Resumen Digital de Atención (RDA) en la tabla global `public.ref_codes`. Hay tres orígenes:

| Origen | Catálogos | Estado al instalar |
| --- | --- | --- |
| Texto de la Res. 866 de 2021, tal como lo reproduce el anexo técnico de la Res. 1888 de 2025 | modalidad, grupo de servicio, entorno de atención, tipo de diagnóstico, tipo de alergia, parentesco, tipo de factor de riesgo | Sembrados por la migración 0006 |
| Provisionales para poder operar | tipo de documento (CC, CE, TI, RC, PA), sexo biológico (H, M, I) | Sembrados con `is_provisional = true`; **deben reemplazarse** por la tabla oficial antes del piloto |
| Tablas oficiales SISPRO y del Ministerio | CIE-10, CUPS, tipo de documento, sexo, identidad de género, etnia, discapacidad, país, municipio (DIVIPOLA), zona, ocupación (CUOC), EAPB, vía de ingreso, causa de la atención, condición y destino | **Vacíos.** Se cargan con el importador |

Sin CIE-10 no se puede registrar el diagnóstico principal, y sin él no se puede finalizar una consulta (salvo que el optómetra lo desactive en Ajustes clínicos). La pantalla Configuración muestra qué catálogos faltan.

> OptiConsulta no descarga estas tablas automáticamente: el portal de SISPRO no permite la lectura automatizada, y la versión vigente debe elegirla quien responde por la óptica. Las direcciones de cada tabla aparecen en el anexo técnico de la Res. 1888 de 2025.

## Importar una tabla

1. Descarga la tabla de referencia desde SISPRO (o el archivo oficial de la CIE-10 o CUPS vigente) y guárdala como CSV.
2. Revisa qué columna tiene el código y cuál el nombre (empiezan en 0).
3. Ensaya sin escribir en la base:

```bash
node scripts/import-ref-codes.mjs --catalog cie10 --file CIE10.csv \
  --source "SISPRO CIE10 descargada 2026-10-09" --code-column 0 --label-column 1 --dry-run
```

4. Si las filas rechazadas son las esperadas (encabezados extra, filas vacías), importa con la conexión directa a la base (rol `postgres`, se obtiene en el panel de Supabase):

```bash
DATABASE_URL="postgresql://postgres:...@db.<proyecto>.supabase.co:5432/postgres" \
node scripts/import-ref-codes.mjs --catalog cie10 --file CIE10.csv --source "SISPRO CIE10 descargada 2026-10-09"
```

Opciones: `--delimiter ","` si el archivo usa comas; `--no-header` si no tiene fila de encabezado.

## Qué hace el importador

- Valida cada código (letras, números, punto y guion; máximo 12 caracteres) y cada nombre (máximo 300). Informa las filas rechazadas con su número de línea.
- Inserta o actualiza los códigos del archivo y los marca como oficiales (`is_provisional = false`) con la fuente indicada.
- **Desactiva** —no borra— los códigos del catálogo que no vienen en el archivo, porque pueden estar en historias clínicas existentes. Un código desactivado ya no se puede elegir, pero los registros antiguos lo conservan.
- Todo ocurre en una transacción: si algo falla, no cambia nada.

## Si un código provisional no coincide con el oficial

Los códigos provisionales de tipo de documento y sexo se eligieron por ser los de uso común, pero no se verificaron contra SISPRO. Si la tabla oficial usa otros códigos, el importador desactivará los provisionales y los pacientes ya registrados quedarán con un código inactivo. Antes de un piloto con datos reales: importa las tablas oficiales **antes** de registrar pacientes.
