# Despliegue (requiere autorización explícita)

Nada de esto se ha ejecutado. Cada paso que crea cuentas, conecta servicios, usa credenciales o puede generar costos espera tu aprobación.

## 1. Demo estática (sin backend)
```bash
npm run build          # dist/ → Vercel, Netlify, GitHub Pages, Hostinger…
npm run build:preview  # un solo index.html autocontenido
```
Usa HashRouter, así que no necesita reglas de reescritura.

## 2. Producción con Supabase (Fase 3)
1. Crear proyecto Supabase (plan gratuito para empezar) en región cercana (p. ej. São Paulo).
2. `supabase link` y `supabase db push` para aplicar `supabase/migrations/` (no aplicar `supabase/tests/`).
3. Crear la cuenta de la dueña en Auth e insertar su `profiles` (rol `owner`) con el `business_id` de Angels Spa.
4. Cargar servicios, precios reales, horario y fotos (Storage con bucket público solo para catálogo).
5. Configurar en Vercel: `VITE_APP_MODE=production`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Nunca** la service_role key.
6. Implementar `src/data/supabaseAdapter.ts` (pendiente) y ejecutar `npm run test:all` + e2e contra un proyecto de staging.
7. Auth: confirmar email, contraseñas fuertes, sesión con expiración; activar protección contra filtraciones de contraseñas.
8. Entornos separados: proyecto Supabase de staging y otro de producción.

## 3. Checklist antes de publicar
- [ ] Política de datos validada por el negocio
- [ ] Precios y horarios reales cargados; seed demo deshabilitado
- [ ] Dominio y HTTPS
- [ ] Respaldo automático de la base (incluido en planes pagos de Supabase; evaluar costo)
