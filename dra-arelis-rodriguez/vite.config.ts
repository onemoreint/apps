/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Subcarpeta de publicación: '/' (dominio propio, Netlify, Vercel) o
// '/apps/dra-arelis-rodriguez/app/' (GitHub Pages, lo pone scripts/build-pages.mjs).
const base = process.env.VITE_BASE ?? '/';
// URL pública completa: se usa en la vista previa al compartir el enlace (WhatsApp, redes).
const publicUrl = process.env.PUBLIC_URL ?? base;

export default defineConfig({
  base,
  plugins: [
    { name: 'public-url', transformIndexHtml: (html) => html.replaceAll('__PUBLIC_URL__', publicUrl) },
    react(),
    tailwindcss(),
  ],
  build: { target: 'es2020' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
