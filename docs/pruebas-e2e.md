# Pruebas de extremo a extremo

Las pruebas de Playwright (`tests/e2e`) usan el navegador contra la aplicación y un backend de Supabase **local**. Nunca se ejecutan contra producción.

| Archivo | Qué cubre |
| --- | --- |
| `acceso.spec.ts` | Redirección sin sesión, errores del formulario de acceso y registro con confirmación por correo (este último necesita Mailpit). |
| `operacion.spec.ts` | Venta, pago y recibo interno; solicitud y reversión de pago con caja abierta; anulación con devolución de inventario; aprobación de descuento y conversión de cotización; control de calidad, entrega e historial de la orden; reportes y exportación registrada; solicitudes de titulares; cierre de caja; edición de permisos de rol. |
| `navegacion.spec.ts` | Con cada rol, en escritorio y móvil: cada módulo del menú y una ficha de cada listado abren sin errores ni desplazamiento horizontal, y las rutas fuera del rol responden «sin acceso». |

`operacion.spec.ts` y `navegacion.spec.ts` usan la óptica de demostración. `operacion.spec.ts` modifica datos: siembra la demo de nuevo antes de repetirla.

## Opción A: con Docker

```bash
npx supabase start
cp .env.example .env.local      # pega URL, anon key y service_role key que imprime el comando anterior
DEMO_PASSWORD=ClaveDemo2026 node --env-file=.env.local scripts/seed-demo.mjs
DEMO_PASSWORD=ClaveDemo2026 npm run test:e2e
```

## Opción B: sin Docker

`scripts/local-stack.mjs` arma una pila compatible con Supabase usando los binarios oficiales de Supabase Auth (GoTrue) y PostgREST sobre un PostgreSQL local, con un proxy en `:54321` que expone `/auth/v1` y `/rest/v1`. Sirve para entornos donde Docker no está disponible. No incluye Mailpit: las cuentas se confirman solas, así que la prueba de registro por correo se omite.

```bash
# Binarios: https://github.com/supabase/auth/releases y https://github.com/PostgREST/postgrest/releases
GOTRUE_BIN=/ruta/auth POSTGREST_BIN=/ruta/postgrest node scripts/local-stack.mjs &   # escribe .env.e2e
DEMO_PASSWORD=ClaveDemo2026 node --env-file=.env.e2e scripts/seed-demo.mjs
set -a; . ./.env.e2e; set +a; npm run build && npm start &
E2E_NO_SERVER=1 E2E_AUTOCONFIRM=1 DEMO_PASSWORD=ClaveDemo2026 npx playwright test
```

La base `opticonsulta_e2e` se borra y recrea en cada arranque de la pila. Para reiniciarla conservando las claves (y no tener que recompilar), arranca con `LOCAL_JWT_SECRET` igual al valor guardado en `.env.e2e`.

Si Playwright no puede descargar navegadores, usa uno instalado con `PW_CHROMIUM_PATH=/ruta/a/chrome`.

## Resultado de la última ejecución

9 de octubre de 2026, pila sin Docker (GoTrue 2.169.0, PostgREST 12.2.3, PostgreSQL 16), compilación de producción: **23 pruebas aprobadas y 2 omitidas** (registro por correo, en escritorio y móvil, por no haber Mailpit). La prueba de registro con Mailpit no se ha ejecutado en este entorno.
