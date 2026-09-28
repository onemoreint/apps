import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → sitio normal (dist/)
// `npm run build:single` → un único HTML autónomo (dist-single/index.html)
export default defineConfig(({ mode }) => ({
  base: './', // funciona en GitHub Pages (usuario.github.io/repo/) y en cualquier hosting
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : {},
  test: { environment: 'node' },
}))
