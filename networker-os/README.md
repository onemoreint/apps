# NETWORKER OS

**El sistema operativo inteligente para networkers.**
No solo te dice quién es tu prospecto: te ayuda a saber qué hacer después.

🔗 **App publicada:** https://onemoreint.github.io/apps/networker-os/app/

Empresa inicial: One More International (configurable desde *Configuración → Empresa*).

## Qué incluye (MVP)

| Módulo | Qué resuelve |
|---|---|
| **Inicio** | "Buenos días, José": acciones prioritarias, seguimientos, prospectos nuevos, **¿Qué hago ahora?** (top 5 con motivo), tareas del día, cuello de botella del proceso e indicadores clicables. |
| **Radar** | 🔥 Atención inmediata · 🟡 Seguimiento · 💤 Recuperación · ⭐ Potencial distribuidor · 👤 Potencial cliente, cada uno con sus señales explicadas. |
| **Contactos** | Crear, editar, eliminar, buscar y filtrar (estado, temperatura, nuevos, activos, fríos). Ordenados por prioridad. |
| **Perfil del prospecto** | Información, próxima acción (qué / por qué / cuándo), historial cronológico y registro de interacciones. |
| **Conversaciones** | 14 situaciones × 4 canales × 4 estilos. Editable, copiar, abrir en WhatsApp, registrar como enviado. Guardia de cumplimiento. |
| **Objeciones** | Detección, interpretaciones posibles, pregunta recomendada, respuesta sugerida y siguiente paso. Biblioteca de 10 objeciones. |
| **Simulador** | 6 escenarios. Evalúa escucha, empatía, claridad, preguntas, presión, comprensión y siguiente paso. Intentar de nuevo. |
| **Mi organización** | Árbol del equipo, estado de actividad, registro semanal e **Índice de Duplicación** con recomendaciones. |
| **Entrenamiento** | 5 retos diarios (se completan solos con tu actividad), racha e historial de 14 días. |
| **Configuración** | Perfil, empresa (`companyConfig`), respaldo/restauración, importador desde NETWORKER CRM (JSON/CSV), PIN opcional. |

## Decisiones técnicas

- **React 19 + TypeScript + Vite**, compilado a **un solo HTML** (funciona en GitHub Pages y sin conexión como PWA).
- **IndexedDB (Dexie)**: los datos viven solo en el dispositivo. Tablas pensadas para migrar 1:1 a Supabase/PostgreSQL.
- **Motor de reglas** (`calculateNextBestAction`): sistema de productividad, no predicción. Cada recomendación explica su motivo.
- **"IA" local**: conversaciones, objeciones y simulador funcionan con reglas y plantillas detrás de `services/aiService.ts`. Para conectar un modelo real se implementa la misma interfaz en un servicio remoto (sin API keys en el frontend y con consentimiento del usuario).
- **Cumplimiento**: detector de promesas de ingresos, afirmaciones médicas y presión psicológica aplicado a todo texto generado y a las respuestas del simulador.
- **PIN** opcional con hash PBKDF2 (nunca en texto plano). No cifra los datos.
- Los datos demo usan fechas **relativas** al día de carga, así el Radar siempre muestra prioridades vigentes. Se borran con un clic sin tocar tus datos.

## Estructura

```
src/
  app/          shell, router (hash), layout, contexto de datos y de UI, bloqueo por PIN
  pages/        Inicio, Radar, Contactos, Perfil, Conversaciones, Objeciones, Simulador, Organización, Entrenamiento, Más, Configuración
  components/   UI reutilizable (tarjetas de acción, hojas modales, iconos)
  domain/
    models.ts   modelo de datos
    engine/     motor de prioridad, radar, indicadores, índice de duplicación
    content/    bibliotecas de conversaciones, objeciones y escenarios del simulador
    compliance.ts, challenges.ts, labels.ts
  data/         Dexie (db.ts), repositorios, datos demo
  services/     aiService (capa de IA), dataService (respaldo/importación), pinService
  config/       companyConfig
tests/          motor, contenidos, cumplimiento y datos demo (Vitest)
app/            versión publicada (HTML autocontenido + manifiesto PWA)
```

## Desarrollo

```bash
npm install
npm run dev          # servidor local
npm test             # pruebas del motor y contenidos
npm run check        # tipos + pruebas + build + verificación del bundle
npm run publish:app  # verifica y copia la build a app/ (lo que publica GitHub Pages)
```

## Evolución a SaaS

1. Reemplazar `data/repositories.ts` por implementaciones Supabase (mismas firmas).
2. Autenticación y organizaciones multiusuario → el índice de duplicación pasa a usar la actividad real de cada miembro (hoy es registro semanal manual).
3. `aiService` remoto (Edge Function) para conversaciones y simulador con modelo de lenguaje, con consentimiento explícito.
4. `companyConfig` por organización (white-label para otras compañías de venta directa).
