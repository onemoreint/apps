/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Subcarpeta de publicación: '/' (dominio propio) o '/mesaqr/' (GitHub Pages).
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'MesaQR — Menú digital',
        short_name: 'MesaQR',
        description: 'Escanea. Elige. Envía tu pedido.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#D62828',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // El chunk del panel admin no se precachea: el cliente nunca lo descarga.
        globIgnores: ['**/admin*.js', '**/AdminApp*.js', '**/demo/**'],
        runtimeCaching: [
          {
            // Fotos del menú (Storage de Supabase e imágenes demo locales)
            urlPattern: ({ url }) =>
              url.hostname === 'images.unsplash.com' ||
              url.pathname.includes('/demo/') ||
              url.pathname.includes('/storage/v1/object/public/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'menu-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
        // El panel (y sus librerías) ya se separa por la carga diferida de /dashboard.
        // Aquí solo se le pone el prefijo "admin-" para excluirlo del precache del cliente.
        chunkFileNames(chunk) {
          const ids = chunk.moduleIds ?? [];
          const adminOnly =
            ids.length > 0 &&
            ids.every((id) => /\/src\/features\/admin\/|node_modules\/(@supabase|qrcode|pngjs|dijkstrajs|tslib|iceberg-js)/.test(id));
          return adminOnly ? 'assets/admin-[name]-[hash].js' : 'assets/[name]-[hash].js';
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
