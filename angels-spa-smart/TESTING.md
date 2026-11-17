# Pruebas · Angels Spa Smart

## Cómo ejecutarlas
```bash
npm run typecheck   # TypeScript estricto
npm test            # Vitest: lógica + adaptador demo + interfaz (jsdom)
npm run test:db     # PostgreSQL efímero: migraciones, RLS, reservas, concurrencia
npm run test:e2e    # Playwright en móvil (Pixel 7) y escritorio
```
Si Playwright no puede descargar navegadores: `PW_CHROME_PATH=/ruta/a/chrome npm run test:e2e`.

## Resultados de la ejecución del 16-nov-2026
Todas las pruebas se ejecutaron de verdad en el entorno de desarrollo; nada se da por aprobado sin ejecutarse.

| Suite | Resultado |
|---|---|
| TypeScript (`tsc -b`) | ✅ sin errores |
| Vitest | ✅ 31/31 pruebas, 6 archivos |
| Base de datos (PostgreSQL 16) | ✅ 40/40 comprobaciones (39 de RLS y reservas + 1 de concurrencia) |
| Playwright | ✅ 6/6 (3 recorridos × móvil y escritorio) |

## Cobertura de los 10 escenarios solicitados
| # | Escenario | Dónde se prueba |
|---|---|---|
| 1 | Crear reserva | `demoAdapter.test.ts`, `App.test.tsx`, `e2e/flows.spec.ts`, SQL `book_appointment` |
| 2 | Evitar reserva duplicada/superpuesta | demo (ocupado, duplicada, límite, bloqueo), SQL (función + `EXCLUDE` + 8 reservas simultáneas → solo 1 aceptada) |
| 3 | Confirmar cita | demo, e2e (botón Confirmar), SQL `set_appointment_status` |
| 4 | Reprogramar cita | demo (libera el horario anterior, no pisa otra cita) |
| 5 | Cancelar cita | demo (libera horario, revierte puntos), SQL |
| 6 | Registrar clienta | demo (normalización y no duplicados, cumpleaños solo con autorización) |
| 7 | Consultar historial | demo (`clientStats`), e2e (ficha de clienta) |
| 8 | Registrar pago | demo (anticipo, saldo, tope, medio no habilitado), e2e, SQL (trigger de tope) |
| 9 | Consultar dashboard | demo (indicadores cambian con los datos), e2e |
| 10 | Controles de acceso | `App.test.tsx` (rutas protegidas, credenciales), e2e, SQL (anon sin acceso a datos privados, aislamiento entre empresas A/B, auditoría inmutable) |

## Hallazgos corregidos durante las pruebas
- **Móvil:** en el panel, los grids de una columna se ensanchaban con contenido largo (página de 615 px en un teléfono de 412 px) y los botones del detalle de cita quedaban tapados. Corregido con `grid-cols-1`; verificado sin desbordes en las 9 secciones del panel y en las vistas semana/mes.
- Fechas con todas las palabras en mayúscula («Lunes 16 De Noviembre»): ahora solo la primera letra.

## Limitaciones conocidas
- Las pruebas SQL usan un stub local de Supabase Auth (`auth.uid()` vía `request.jwt.claim.sub`); falta repetirlas en un proyecto Supabase de staging (Fase 3).
- El adaptador de Supabase aún no está implementado; por eso no hay pruebas de la UI contra la base real.
