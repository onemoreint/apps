/**
 * Política de seguridad del contenido (CSP) y cabeceras HTTP — fuente única.
 * La usan: el build (meta CSP en index.html), los archivos de cabeceras para Netlify/Vercel/Cloudflare
 * (scripts/write-headers.mjs) y las pruebas.
 */

export const CSP_DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Solo el código propio de la app. Sin eval, sin scripts en línea, sin CDNs.
  'script-src': ["'self'"],
  // Estilos propios; 'unsafe-inline' cubre los atributos style que usan React y las librerías de interfaz.
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  // Portadas configuradas por el administrador (https) y de Spotify; data: para iconos generados.
  'img-src': ["'self'", 'https:', 'data:', 'blob:'],
  // Audio de las emisoras (solo https), data: para el desbloqueo de audio en iOS y blob: para HLS.
  'media-src': ["'self'", 'https:', 'data:', 'blob:'],
  // Metadatos de emisoras, Internet Archive, Spotify (oEmbed, OAuth, API) y listas HLS: solo https.
  'connect-src': ["'self'", 'https:'],
  // hls.js usa un worker desde blob:; el service worker es propio.
  'worker-src': ["'self'", 'blob:'],
  // Único contenido incrustado permitido: el reproductor oficial de Spotify.
  'frame-src': ['https://open.spotify.com'],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/** Directivas que los navegadores solo aceptan en cabecera HTTP, no en <meta>. */
export const HEADER_ONLY_DIRECTIVES: Record<string, string[]> = {
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

export function cspString(includeHeaderOnly = false): string {
  const all = includeHeaderOnly ? { ...CSP_DIRECTIVES, ...HEADER_ONLY_DIRECTIVES } : CSP_DIRECTIVES;
  return Object.entries(all)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ');
}

/** Cabeceras recomendadas para cualquier alojamiento que permita configurarlas. */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': cspString(true),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), autoplay=(self "https://open.spotify.com"), encrypted-media=(self "https://open.spotify.com"), fullscreen=(self "https://open.spotify.com")',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/** Contacto para reportar vulnerabilidades (también en SECURITY.md y security.txt). */
export const SECURITY_CONTACT = 'clerigman@gmail.com';
