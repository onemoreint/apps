# Fase B — Base, autenticación, tenencia y RLS

Fecha: 9 de octubre de 2026.

## Qué incluye

- Proyecto Next.js 16 con TypeScript estricto, Tailwind 4, cabeceras de seguridad y manifiesto PWA (sin service worker ni caché offline de datos).
- Autenticación con Supabase Auth: registro con confirmación de correo, inicio de sesión, recuperación y cambio de contraseña, cierre de sesión. Política de contraseñas de 10 caracteres con mayúscula, minúscula y número; sesión con inactividad de 8 h y máximo de 24 h (`supabase/config.toml`).
- Bloqueo temporal tras 5 intentos fallidos en 15 minutos por correo (hash SHA-256), además de los límites por IP de Supabase. Solo el titular autenticado puede reiniciar el contador.
- Configuración inicial de la óptica (organización, parámetros, primera sede, propietario).
- Equipo: invitaciones por enlace de un solo uso (7 días, se guarda solo el hash), cambio de rol, suspensión y reactivación con confirmación.
- Configuración: datos de la óptica, parámetros (umbral de descuento, convención de cilindro, pie de recibo) y sedes.
- Auditoría de solo lectura con persona, acción y nombres de campos cambiados (nunca valores).
- 5 migraciones SQL, 65 pruebas automatizadas y una prueba de extremo a extremo para ejecutar localmente.

## Decisiones técnicas de esta fase

| Decisión | Motivo |
| --- | --- |
| TypeScript 6.0.3 en lugar de 7.0.2 (la última) | TypeScript 7 es el compilador nativo reescrito; la integración de tipos de Next.js aún depende de la API de TypeScript 6. Revisar en la Fase G. |
| `proxy.ts` en lugar de `middleware.ts` | Next.js 16 renombró la convención. |
| `getClaims()` en lugar de `getSession()` | Verifica la firma del JWT; la sesión leída de cookies no es confiable por sí sola. |
| Sin `service_role` en la aplicación | Ninguna operación de la Fase B la necesita; todo pasa por RLS o RPC con verificación interna. |
| Sin `FORCE ROW LEVEL SECURITY` | Las funciones auxiliares pertenecen a `postgres` (con BYPASSRLS en Supabase) y necesitan leer membresías sin recursión; FORCE no añade protección frente a `anon` ni `authenticated`. |
| Componentes propios con HTML nativo | Los formularios y tablas de esta fase no requieren primitivas complejas. Los diálogos, menús y selectores de fecha de la Fase C usarán Radix (vía shadcn/ui), según la Fase A. |
| Tipos de base escritos a mano | El stack de Supabase no pudo ejecutarse en el entorno de desarrollo; regenerar con `npm run db:types`. |
| Correo en `profiles` | Para identificar colegas sin exponer `auth.users`; lo mantiene un trigger y el usuario no puede editarlo. |
| Direcciones web reservadas | Una óptica llamada «login» o «api» chocaría con rutas de la aplicación; restricción en la base y en Zod. |

## Resultado de las pruebas

Ejecutadas el 9 de octubre de 2026 contra PostgreSQL 16.15 con el shim de Supabase:

| Suite | Pruebas | Resultado |
| --- | --: | --- |
| Unitarias (validaciones, redirecciones, mensajes) | 12 | Aprobadas |
| Aislamiento entre organizaciones, permisos, invitaciones, auditoría, bloqueo de acceso | 46 | Aprobadas |
| Endurecimiento del esquema (RLS, privilegios, search_path, índices) | 7 | Aprobadas |
| Extremo a extremo (Playwright) | 3 | **No ejecutadas**: el entorno no tuvo acceso a la descarga de navegadores ni a las imágenes de Supabase |

Verificación de que las pruebas detectan fallos: al sustituir la política de `organizations` por `using (true)` fallan 4 pruebas; al conceder `select` a `anon` fallan 2. Con el archivo restaurado vuelven a pasar todas.

Prueba de humo del servidor de producción (`next build` + `next start`): las páginas públicas responden 200; las privadas redirigen a `/login?next=…`; se envían CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.

Criterios de aceptación cubiertos: 1 (aislamiento entre organizaciones) completo para las tablas existentes; 2 (cajero sin acceso clínico) a nivel de permisos, a completar con las tablas clínicas en la Fase C; 13 (auditoría de operaciones sensibles) para tenencia.

## Pendientes y riesgos conocidos

1. **Probar con Supabase real.** Ejecutar `npx supabase start`, `npm run test:e2e` y revisar el *Security Advisor* de Supabase Studio. Hasta entonces, el flujo de correo y PKCE está verificado solo por diseño.
2. **Plantillas de correo de Auth** en español: pendientes de redactar en `supabase/templates` antes del piloto.
3. **CSP con `'unsafe-inline'`** en scripts y estilos: necesario para la hidratación de Next.js sin nonces. Migrar a CSP con nonce en la Fase G.
4. **Rangos clínicos y convención de cilindro**: sin valores por defecto hasta que el optómetra asesor los apruebe (bloquea la Fase C).
5. **Acceso clínico del propietario y exportación clínica**: sin asignar hasta la respuesta del asesor jurídico.
6. **Interoperabilidad RDA (Resolución 1888 de 2025)**: sigue siendo la alerta principal de la Fase A.

## Decisiones que necesito antes de la Fase C

- Respuestas del optómetra asesor sobre campos mínimos de la consulta, notación de agudeza visual y rangos de la fórmula (sección 9 de la Fase A).
- Confirmar si la Fase C incluye ya el modelo de datos preparado para RDA (códigos CIE-10 y CUPS) o si se aplaza.
