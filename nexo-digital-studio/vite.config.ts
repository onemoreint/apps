import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" permite publicar el sitio en cualquier subcarpeta (GitHub Pages, Netlify, hosting compartido).
// outDir "../nexo" publica la versión compilada en onemoreint.github.io/apps/nexo/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: process.env.NEXO_OUT_DIR ?? "../nexo",
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
  },
  server: { host: true, port: 5173 },
});
