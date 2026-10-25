/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { brand } from './src/config/brand';
import { cspString, SECURITY_HEADERS } from './src/config/security';

/**
 * Seguridad en el build:
 *  - Inserta la CSP como <meta> (GitHub Pages no permite cabeceras propias). En desarrollo no se pone
 *    porque el recargado en caliente de Vite usa scripts en línea.
 *  - Genera _headers (Netlify, Cloudflare Pages) con todas las cabeceras de seguridad.
 */
function securityPlugin(): Plugin {
  return {
    name: 'radio-mix-security',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: cspString() }, injectTo: 'head-prepend' }],
    generateBundle() {
      const lines = ['/*', ...Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`), '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '/sw.js', '  Cache-Control: no-cache', ''];
      this.emitFile({ type: 'asset', fileName: '_headers', source: lines.join('\n') });
    },
  };
}

// Subcarpeta de publicación: '/' (dominio propio, Netlify/Vercel) o '/apps/radio-mix/app/' (GitHub Pages).
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    securityPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": la nueva versión se instala cuando la persona pulsa "Actualizar" (actualización controlada).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: brand.name,
        short_name: brand.shortName,
        description: brand.tagline,
        lang: 'es',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: brand.colors.background,
        theme_color: brand.colors.background,
        categories: ['music', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // hls.js solo se descarga si una emisora usa HLS; las fuentes no latinas no se precargan.
        globIgnores: ['**/hls-*.js', '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        // Nunca se cachea el audio: la radio necesita conexión y no se ofrece escucha sin conexión.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'archive.org' && url.pathname.startsWith('/metadata/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'catalogo-pistas',
              networkTimeoutSeconds: 6,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) => /(^|\.)scdn\.co$|^i\.scdn\.co$|mosaic\.scdn\.co$/.test(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'portadas',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  build: { target: 'es2020', chunkSizeWarningLimit: 700 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
