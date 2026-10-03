# Política de seguridad

## Reportar una vulnerabilidad

No abras un issue público. Usa **Security › Report a vulnerability** en este repositorio (aviso privado de GitHub). Incluye pasos para reproducir, impacto y versión afectada. Respondemos en un máximo de 7 días.

## Alcance

- Panel web, backend, agente Android, scripts de `tools/` y configuración de `infra/`.
- Fuera de alcance: el modo demo (datos ficticios en el navegador) y vulnerabilidades del propio Android o de servicios de Google.

## Principios del proyecto

- Solo APIs oficiales; nunca exploits ni evasión de controles.
- Contraseñas con Argon2id, tokens de corta duración, secretos por variables de entorno.
- Aislamiento por organización con Row Level Security.
- Auditoría inmutable.
- El agente de laboratorio no puede borrar el dispositivo y su receptor USB exige el permiso de sistema `DUMP`.
