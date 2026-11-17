# Angels Spa Smart · MVP 1.0

Plataforma para **Angels Spa** (Calle 10 #17-26, Girardota, Antioquia): portal público de reservas y panel administrativo para agenda, CRM de clientas, pagos, promociones y fidelización.

> **Modo demostración:** funciona sin credenciales ni servicios externos. Todos los datos, precios, horarios y fotos son **ficticios** y viven en el navegador. Nada se envía ni se cobra.

## Ejecutar localmente

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev          # http://localhost:5173
```

- Portal de clientas: `http://localhost:5173/#/`
- Reservas: `http://localhost:5173/#/reservar`
- Panel administrativo: `http://localhost:5173/#/admin`
  - Credenciales demo: `admin@demo.angelsspa` / `demo1234` (botón «Autocompletar» en la pantalla de acceso)
- Reiniciar los datos demo: Panel → Configuración → «Reiniciar datos demo».

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Compilación de producción en `dist/` (verifica tipos primero) |
| `npm run build:preview` | Genera un único `dist-preview/index.html` autocontenido para compartir la demo |
| `npm test` | Pruebas unitarias e integración (Vitest + Testing Library) |
| `npm run test:e2e` | Pruebas de navegador (Playwright, móvil y escritorio) |
| `npm run test:db` | Migraciones + pruebas de RLS y reservas en un PostgreSQL local efímero |

## Qué incluye

**Portal público:** inicio con bienvenida, catálogo de servicios, galería, promociones vigentes, ubicación, WhatsApp e Instagram; reserva en 5 pasos (servicio → fecha → horario → datos → confirmación) con validación de horario de atención, duración, bloqueos, citas existentes, duplicados y autorización de datos (Ley 1581 de 2012).

**Panel:** dashboard con indicadores calculados de los datos reales · agenda diaria/semanal/mensual · crear, editar, reprogramar, confirmar, completar, cancelar, «no asistió» · bloqueos y días de descanso · horario de atención por profesional · CRM con ficha, historial, total pagado, consentimientos, exportación CSV autorizada y supresión de datos · servicios y galería editables con fotos propias · pagos manuales (anticipo, abono, saldo; Efectivo, Transferencia, Nequi, Daviplata, Otro) con reportes por día, semana y mes · promociones · puntos de fidelización con canje e historial · mensajes de WhatsApp preparados (wa.me) · registro de acciones.

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md) — estructura, adaptadores de datos, decisiones
- [DATABASE.md](DATABASE.md) — modelo, RLS, funciones de servidor
- [TESTING.md](TESTING.md) — cómo probar y resultados
- [DEPLOYMENT.md](DEPLOYMENT.md) — pasos para producción (requieren autorización)

## Pendiente antes de usar con clientas reales

1. Precios, duraciones, horarios y fotos reales (los actuales son de ejemplo).
2. Fase 3: conectar Supabase (requiere tu autorización y un proyecto propio).
3. Validar el texto de la política de tratamiento de datos con la dueña del salón.
