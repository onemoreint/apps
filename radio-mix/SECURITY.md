# Política de seguridad — Radio Mix Online

## Reportar una vulnerabilidad

Escribe a **clerigman@gmail.com** con el asunto «Vulnerabilidad en Radio Mix»: descripción, pasos para reproducirla e impacto posible. No abras un *issue* público para fallos de seguridad.

| Plazo | Compromiso |
|---|---|
| 3 días hábiles | Acuse de recibo |
| 10 días hábiles | Evaluación inicial |
| Lo antes posible | Corrección de fallos graves y aviso a quien reportó |

Investigación de buena fe: no tomaremos acciones contra quien investigue sin acceder a datos de otros, sin degradar el servicio, sin atacar a terceros y dando un plazo razonable antes de divulgar. También publicado en `app/.well-known/security.txt` (RFC 9116) y en la app: `#/seguridad`.

## Versiones soportadas

Solo la versión publicada en https://onemoreint.github.io/apps/radio-mix/app/ (rama `main`).

## Medidas aplicadas

- **CSP** (fuente única: `src/config/security.ts`): `script-src 'self'`, sin `eval` ni scripts en línea, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, iframes solo de `open.spotify.com`; audio, imágenes y conexiones solo por HTTPS. Se inyecta como `<meta>` en el build (GitHub Pages no admite cabeceras).
- **Cabeceras HTTP** para alojamientos que las admiten (`app/_headers` para Netlify/Cloudflare, `vercel.json` generado con `npm run headers`): CSP con `frame-ancestors 'none'` y `upgrade-insecure-requests`, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` restrictiva, COOP.
- **Sin secretos en el cliente**: Spotify con OAuth 2.0 + PKCE y verificación de `state`; token solo en `sessionStorage`.
- **Validación de entradas**: URLs solo `https`, sin credenciales ni hosts locales/privados; emisoras sin licencia no se reproducen; catálogo importado validado y limitado a 1 MB.
- **Iframe de Spotify aislado** con `sandbox` y `allow` mínimos; enlaces externos con `noopener noreferrer`.
- **Cadena de suministro**: `npm audit` y pruebas en GitHub Actions; Dependabot semanal; dependencias fijadas con `package-lock.json`; sin scripts ni CSS de CDNs.
- **Datos personales**: no hay cuentas ni base de datos; preferencias solo en el dispositivo (ver `#/privacidad` y `#/cookies`).
- **Publicación**: requiere la cuenta de GitHub del propietario. Recomendado: verificación en dos pasos y protección de la rama `main`.

## Gestión de incidentes

Contención (retirar fuente/versión afectada) → análisis y corrección → aviso a afectados y, si hubiera datos personales comprometidos, reporte a la SIC dentro de 15 días hábiles → registro y mejora.
