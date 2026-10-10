# Despliegue

Guía para poner OptiConsulta en un entorno real. Antes de cargar datos reales lee la [matriz legal](matriz-legal.md) y la [lista de riesgos](riesgos.md): desplegar no convierte el producto en conforme ni habilitado.

## 1. Proyecto de Supabase

1. Crea un proyecto en https://supabase.com con una contraseña de base robusta guardada en un gestor de secretos.
2. **Región:** elige la más cercana a Colombia que ofrezca el proveedor (por ejemplo, São Paulo o Estados Unidos este). Ninguna está en Colombia: almacenar ahí datos personales es una **transferencia internacional** que la óptica debe evaluar con su asesor (ver matriz legal).
3. Plan: uno con respaldos diarios y, si es posible, PITR.
4. Vincula y aplica las migraciones desde tu equipo:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

5. Carga los catálogos oficiales (CIE-10, CUPS y tablas SISPRO) con el importador: [catalogos.md](catalogos.md).

## 2. Autenticación (panel de Supabase → Authentication)

`supabase/config.toml` define la configuración local; en el proyecto en la nube hay que replicarla a mano:

| Ajuste | Valor |
| --- | --- |
| Site URL | `https://<tu-dominio>` |
| Redirect URLs | `https://<tu-dominio>/auth/confirm` |
| Confirmación de correo | Activada |
| Contraseña | Mínimo 10 caracteres, con minúsculas, mayúsculas y dígitos |
| SMTP | **Propio** (el SMTP incluido de Supabase tiene límites muy bajos y no sirve para producción) |
| Sesiones | Tiempo de inactividad 8 h y duración máxima 24 h, si tu plan lo permite |
| Plantillas de correo | En español; el enlace debe apuntar a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` |
| Registro público | Activado solo si quieres que cualquiera cree ópticas; si no, desactívalo y crea las cuentas desde el panel |

## 3. Aplicación Next.js

Cualquier plataforma que ejecute Node 22 sirve (Vercel, un servidor propio con `npm run build && npm start` detrás de HTTPS, etc.). Variables:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon/publishable) |
| `APP_BASE_URL` | `https://<tu-dominio>` |
| `DEFAULT_TIMEZONE` | `America/Bogota` |

**No** configures `SUPABASE_SERVICE_ROLE_KEY` en el servidor web: la aplicación no la usa. Solo la necesitan los scripts administrativos (`seed-demo.mjs`), que se ejecutan desde un equipo de confianza.

Las variables `NEXT_PUBLIC_*` se incorporan al compilar: si cambias de proyecto de Supabase, vuelve a compilar. La política de seguridad de contenido (CSP) permite conexiones solo al propio dominio y a esa URL.

Ubica la aplicación en una región cercana a la base para reducir la latencia.

## 4. Primer arranque

1. Abre `https://<tu-dominio>/registro`, crea la cuenta del propietario y confirma el correo.
2. Configura la óptica (nombre, dirección web, NIT, sede).
3. Sigue la lista «Puesta en marcha» del inicio y la [guía del administrador](guia-administrador.md).

## 5. Lista de verificación antes del piloto

- [ ] Migraciones aplicadas sin errores (`npx supabase db push`) y versión de la aplicación correspondiente.
- [ ] Catálogos oficiales importados; los provisionales reemplazados.
- [ ] SMTP propio probado (registro y recuperación de contraseña).
- [ ] Texto de autorización de datos redactado por el asesor jurídico y publicado.
- [ ] Profesionales registrados y su tarjeta verificada en ReTHUS.
- [ ] Respaldo lógico y **restauración verificada** en un proyecto temporal ([respaldo-y-restauracion.md](respaldo-y-restauracion.md)).
- [ ] Revisión del asesor jurídico de la matriz legal y de la política de tratamiento de datos.
- [ ] Prueba de extremo a extremo (`npm run test:e2e`) contra un entorno de pruebas, no contra producción.
- [ ] Nadie usa la organización de demostración con datos reales.

## 6. Actualizaciones

1. Respalda y verifica la restauración.
2. Aplica las migraciones nuevas (`npx supabase db push`) **antes** de desplegar la versión de la aplicación que las usa.
3. Despliega la aplicación.
4. Recorre los módulos con un usuario de cada rol.

Las migraciones solo agregan; no se reescriben migraciones ya aplicadas.

## Anexo: aplicar las migraciones sin la CLI

Si no puedes usar `npx supabase db push`, pega cada archivo de `supabase/migrations`, en orden, en Supabase → SQL Editor. `supabase/despliegue/completar-base.sql` reúne las migraciones 0005 (parte final) a 0012 en una sola transacción. Se generó para el proyecto inicial, donde 0001–0004 y las dos primeras partes de la 0005 ya se habían aplicado por la integración de Supabase, que cancela automáticamente las sentencias con `DELETE`. Las migraciones aplicadas desde el SQL Editor no aparecen en el historial de migraciones del proyecto.

Alternativa sin copiar el archivo completo: en el SQL Editor, un bloque `DO` descarga `completar-base-cuerpo.sql` (la misma variante sin `BEGIN/COMMIT`) desde una versión fija del repositorio con la extensión `http`, comprueba su SHA-256 y lo ejecuta en una sola transacción.

### Estado del proyecto inicial (10 de octubre de 2026)

Proyecto `opticonsulta` (`edqlpytxpucixmuutayi`, región `sa-east-1`, plan gratuito): base completa. Verificado contra el esquema probado: huella idéntica de funciones (`96856b38…`) y de columnas (`19b79cb2…`), 48 tablas con RLS, ningún privilegio para `anon` salvo `login_guard` y `record_login_failure`, sin acceso al esquema `private`.

Los avisos del asesor de seguridad de Supabase sobre funciones `SECURITY DEFINER` ejecutables por `authenticated` (y esas dos por `anon`) son intencionales: son las funciones RPC de la aplicación, y cada una verifica sesión y permiso por dentro (ver `tests/integration`).

El plan gratuito no incluye respaldos diarios: usa el respaldo lógico de [respaldo-y-restauracion.md](respaldo-y-restauracion.md) o cambia de plan antes de cargar datos reales.
