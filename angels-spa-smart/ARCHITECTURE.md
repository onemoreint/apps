# Arquitectura · Angels Spa Smart

## Stack
React 19 + TypeScript + Vite · Tailwind CSS 3 · Lucide React · Zod + React Hook Form · React Router (HashRouter: funciona en cualquier hosting estático) · Vitest + Testing Library + Playwright · Supabase (PostgreSQL, Auth, RLS) para producción.

## Estructura
```
src/
  types.ts              Tipos de dominio (citas, clientas, pagos…)
  lib/                  Lógica pura y probada: disponibilidad, teléfonos, métricas,
                        fidelización, WhatsApp, CSV, fechas (America/Bogota)
  data/
    adapter.ts          Contrato DataAdapter (la UI solo habla con esta interfaz)
    demoAdapter.ts      Implementación DEMO (localStorage, datos ficticios)
    supabaseAdapter.ts  Esqueleto de PRODUCCIÓN (Fase 3, no conectado)
    seed.ts             Datos ficticios iniciales
    schemas.ts          Validaciones Zod de formularios
    store.tsx / auth.tsx Contextos de datos y sesión
  components/ui.tsx     Sistema de diseño (botones, tarjetas, modales, estados vacíos…)
  public/               Portal de clientas y flujo de reserva
  admin/                Panel administrativo (carga diferida)
supabase/
  migrations/           Esquema, RLS y funciones de servidor
  tests/                Pruebas SQL de autorización y reservas
e2e/                    Pruebas Playwright
scripts/test-db.sh      PostgreSQL efímero para probar migraciones
```

## Decisiones clave
- **Adaptadores intercambiables.** `VITE_APP_MODE=demo|production` elige el adaptador. Los datos demo nunca se mezclan con producción: viven en otra capa y otra clave de almacenamiento.
- **Reglas de negocio duplicadas a propósito en servidor.** `lib/availability.ts` da respuesta inmediata en la UI; en producción `book_appointment()` revalida todo dentro de una transacción con bloqueo por profesional/día y una restricción `EXCLUDE` que hace imposible el solapamiento.
- **Fechas.** Fechas de calendario `YYYY-MM-DD` + minutos desde medianoche en la zona del negocio (America/Bogota) en la demo; `timestamptz` en la base de datos.
- **Multiempresa.** Todas las tablas de negocio tienen `business_id` y FK compuestas; RLS aísla cada empresa. Varias profesionales ya están soportadas (agenda y horario por profesional).
- **Sin precios inventados.** `price = null` significa «por confirmar». Los precios del seed están rotulados como ejemplo.
- **Imágenes.** Sin fotos de terceros: ilustraciones generadas en CSS/SVG rotuladas «Demostrativa» hasta que el salón suba sus fotos.

## Seguridad
- Panel protegido por ruta (demo) y por Supabase Auth + RLS (producción). La autorización real es del servidor; la ruta protegida solo es UX.
- Escritura pública únicamente por la función `book_appointment()` (validación, límite por teléfono y por negocio, campo trampa anti-bots en la UI).
- Sin secretos en el frontend: solo URL y anon key públicas de Supabase.
- Errores de dominio con mensajes claros; errores inesperados se muestran genéricos (sin trazas).
- Registro de acciones administrativas (demo: en la app; producción: triggers a `audit_logs`, no borrable).
- **localStorage no es seguro** para datos reales: el modo demo es solo para datos ficticios.

## Protección de datos (Colombia)
Autorización explícita para tratamiento (obligatoria) y separada para promociones y cumpleaños (opcionales), historial de consentimientos (`consent_records`), exportación solo de clientas autorizadas, supresión de datos personales (conserva cifras anónimas), política de tratamiento en `/privacidad` (borrador por validar).

## WhatsApp
MVP: enlaces oficiales `wa.me` con mensajes preparados (solicitud, confirmación, recordatorio, reprogramación, cancelación, promoción, cumpleaños con autorización). Nada se envía automáticamente.
Integración futura con **WhatsApp Business Platform** (Cloud API): Edge Function en Supabase con el token en secretos del servidor; plantillas aprobadas por Meta para mensajes iniciados por el negocio; registrar opt-in en `consent_records`; tabla `message_log`; cola programada para recordatorios (p. ej. 24 h antes); considerar el costo por conversación de Meta. Requiere tu autorización.
