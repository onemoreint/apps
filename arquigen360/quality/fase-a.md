# ARQUIGEN 360 · Fase A — trazabilidad

Especificación: *ARQUIGEN 360 — Actualización Maestra 2026*, §39 Fase A.
Versión de la aplicación: 2.0.0 · Esquema del proyecto: 2.0.0 · Reglas: 2026.09.0
Fecha: 2026-09-27

Cada fila: requisito → implementación → prueba → criterio de aceptación.

| # | Requisito (sección) | Implementación | Prueba | Aceptación | Estado |
|---|---|---|---|---|---|
| A1 | Versionado del modelo (§4) | `src/schema/migrations.ts` (`detectSchemaVersion`, `MIGRATIONS`, `migrate`) · `SCHEMA_VERSION` en `geometry/types.ts` | `schema.test.ts` → migra 1.x, sin aberturas, campos desconocidos, esquema más nuevo, sin versión | Proyectos 1.x abren y quedan en 2.0.0 sin perder geometría ni campos desconocidos | ✅ |
| A2 | JSON Schema (§2, §4) | `src/schema/validator.ts` (validador propio, sin dependencias) · `src/schema/projectSchema.ts` · `schema/project.schema.json` | `schema.test.ts` → proyecto nuevo válido, archivo JSON al día · `property.test.ts` → 300 casos válidos | Todo proyecto generado, importado o exportado cumple el esquema | ✅ |
| A3 | Sistema de comandos para IA (§2, §17) | `src/commands/commands.ts` (8 comandos, pipeline JSON → esquema → permiso → existe → límites → geometría → colisiones → normativa) · `ai/commandParser.ts` · `components/CommandEditor.tsx` | `commands.test.ts` → una prueba por etapa de rechazo + intérprete | La IA nunca modifica el modelo; si falla una etapa no se aplica y se muestra la razón | ✅ |
| A4 | Validación de dominio (§2) | `domainValidate` (IDs únicos, referencias huérfanas, textos limpios) · etapas de límites/geometría/colisión de comandos | `schema.test.ts` → IDs repetidos, aberturas huérfanas · `commands.test.ts` | Datos inconsistentes se rechazan o reparan con aviso explícito | ✅ |
| A5 | Centro de cumplimiento (§6, §7, §33) | `src/normative-engine/` · `components/ComplianceCenter.tsx` (vista «Normativa») · franja de estado | `compliance.test.ts` | 6 estados (PASS…UNVERIFIED); cada resultado permite ver regla, fuente, elemento afectado y explicación | ✅ |
| A6 | Matriz normativa (§5, §8, §9) | `normative-engine/rules/catalog.ts` (fuente, jurisdicción, versión, estado) · `jurisdictions/co.ts` (Valle de Aburrá) · `sources/frameworks.ts` | `compliance.test.ts` → toda regla tiene fuente/versión/estado; norma municipal nunca «cumple» sin reglas verificadas; ningún texto afirma aprobación | Sin valores normativos inventados: lo no verificado se muestra «NO VERIFICADO» | ✅ |
| A7 | Seguridad frontend (§18, §19) | `sanitizeText`, `guardInput` (2000 caracteres), `checkImportFile` (extensión, tipo, 5 MB), confirmación en acciones destructivas, sin `eval` | `schema.test.ts` (corrupto, grande, negativos, infinitos, HTML, tipos) · `commands.test.ts` (comandos inválidos y no autorizados, ID manipulado) · `scripts/verify-bundle.mjs` | Ninguna entrada externa llega al modelo sin validar; el bundle no tiene secretos ni `eval` | ✅ |
| A8 | Pruebas (§30, §31) | 53 pruebas en 6 archivos, incluidas pruebas por propiedades (300 casos aleatorios reproducibles) | `npm test` | Las 12 pruebas originales siguen pasando | ✅ |
| A9 | IndexedDB (§24) | `projects/storage.ts`: `IndexedDBAdapter` (preferido), `LocalStorageAdapter` (respaldo), migración automática de localStorage, respaldo y restauración | `storage.test.ts` (adaptador, proyectos 1.x, datos corruptos) · prueba en navegador | Los proyectos persisten tras recargar; los antiguos se mueven a IndexedDB | ✅ |
| A10 | Historial de versiones y auditoría (§21, §25, §28) | `store.ts` (`saveVersion`, `restoreVersion`, `deleteVersion`, `log`) · `projects/versions.ts` · `components/HistoryCenter.tsx` · estados del documento | `storage.test.ts` → comparación por ID · prueba en navegador | Versiones nombrables, restaurables, duplicables y comparables; eventos de IA y usuario registrados | ✅ |
| — | CI (§20) | `.github/workflows/arquigen360-ci.yml`: install → tipos → lint → pruebas → npm audit → build → verificación del HTML | Ejecución en GitHub Actions | Si falla una etapa, el flujo queda en rojo (no publica nada) | ✅ |
| — | Pie legal (§35) | `projects/legal.ts` en lámina, centro de cumplimiento e historial | revisión visual | Aparece en todas las salidas técnicas | ✅ |

## Defectos encontrados por las nuevas pruebas y corregidos

| ID | Defecto | Causa | Corrección |
|---|---|---|---|
| D-001 | Armarios con largo negativo en dormitorios muy pequeños | `Math.min(1.5, lado − 1.2)` sin límite inferior | `autoFurnish`: no coloca piezas lineales de menos de 0,40 m |
| D-002 | Superposición de 5 cm entre pasillo y baño con acceso lateral | Redondeo a 5 cm aplicado después de rotar el plano (ruido de coma flotante) | `engine.ts`: redondeo en el marco canónico, anclado al área construible |
| D-003 | Ambientes que podían salir 1–2 cm del retiro con retiros no múltiplos de 5 cm | Rejilla de 5 cm anclada al origen del lote | Rejilla anclada al borde del área construible y bordes limitados a él |

## Pendiente (fases B, C y D)

- Entidades con `createdAt`/`updatedAt` propias (§3), niveles, muros y losas como objetos (hoy se derivan de los ambientes).
- Modo Básico / Profesional (§34) y navegación móvil dedicada (§32).
- Reglas urbanísticas municipales verificadas (requiere cargar la norma de cada municipio desde fuente oficial y que un profesional la valide).
- SAST (CodeQL) y escaneo de secretos del repositorio completo.
- Auditoría y control de acceso en servidor (requiere backend).
