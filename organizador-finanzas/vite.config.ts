/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Fuente de desarrollo en web/, app publicada (un solo HTML + PWA) en app/
export default defineConfig({
  root: 'web',
  publicDir: '../public',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: '../app', emptyOutDir: true, assetsInlineLimit: 100000000 },
  test: { root: '.', include: ['src/**/*.test.ts'] },
});
