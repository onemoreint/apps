import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: funciona en Vercel, Netlify y también dentro de una subcarpeta.
  base: "./",
});
