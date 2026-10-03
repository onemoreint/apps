# Despliegue

## Panel demo (GitHub Pages)
El código vive en la rama `android-control-center` del repositorio `onemoreint/apps`. Cada push a esa rama compila el panel (`.github/workflows/web.yml`) con `VITE_BASE=/apps/android-control-center/` y deja el resultado como artefacto `panel-web`. El panel publicado está en la carpeta `android-control-center/` de la rama `main` de `onemoreint/apps`, que GitHub Pages sirve en https://onemoreint.github.io/apps/android-control-center/.

## Servidor propio (VPS) con HTTPS
Requisitos: un dominio apuntando al servidor, Docker y los puertos 80/443 abiertos.

```bash
git clone -b android-control-center https://github.com/onemoreint/apps android-control-center
cd android-control-center/infra
cp .env.example .env    # edita ACC_DOMAIN, contraseñas y orígenes CORS
docker compose up -d --build
```
Caddy obtiene el certificado TLS automáticamente, sirve el panel en `/` y envía `/api`, `/swagger-ui` y `/v3/api-docs` al backend.

## Android Management API (producción)
1. Crea un proyecto en Google Cloud y habilita **Android Management API** y **Cloud Pub/Sub**.
2. Crea una cuenta de servicio con rol *Android Management User* y descarga su clave JSON (guárdala como secreto, nunca en el repositorio).
3. Crea la enterprise con `signupUrls.create` + `enterprises.create`.
4. Crea un tema de Pub/Sub y da permiso de publicación a `android-cloud-policy@system.gserviceaccount.com`.
5. Configura `GOOGLE_APPLICATION_CREDENTIALS`, `ACC_AMAPI_PROJECT` y `ACC_PUBSUB_TOPIC` en `.env` (se usan desde la Fase 7).
