/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:preview` genera un único index.html autocontenido (vista previa portátil).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preview-single' ? [viteSingleFile()] : [])],
  build: mode === 'preview-single' ? { outDir: 'dist-preview' } : undefined,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}))
