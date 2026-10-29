/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Subcarpeta de publicación: '/' (dominio propio) o '/apps/dulce-pedido/app/' (GitHub Pages).
const base = process.env.VITE_BASE ?? '/';
// URL pública completa: se usa en la vista previa al compartir el enlace por WhatsApp y redes.
const publicUrl = process.env.PUBLIC_URL ?? base;

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    { name: 'public-url', transformIndexHtml: (html) => html.replaceAll('__PUBLIC_URL__', publicUrl) },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Dulce Pedido',
        short_name: 'Dulce Pedido',
        description: 'Repostería casera. Mira el catálogo y pide por WhatsApp.',
        lang: 'es-CO',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#fbf6f0',
        theme_color: '#3b2418',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // La versión nueva reemplaza a la anterior de inmediato (nadie se queda viendo una versión vieja).
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // El panel de administración no se precachea: los clientes nunca lo descargan.
        globIgnores: ['**/admin-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/public/') || url.hostname === 'images.unsplash.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fotos-catalogo',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        chunkFileNames(chunk) {
          const ids = chunk.moduleIds ?? [];
          // El panel (con la librería de Supabase) se carga aparte y no se precachea para los clientes.
          const esPanel = ids.some((id) => id.includes('/src/admin/'));
          return esPanel ? 'assets/admin-[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
