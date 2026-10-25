# Pruebas de extremo a extremo

Abren la app compilada en Chromium sin interfaz, en tamaño de celular (Pixel 7), y comprueban 35 puntos: arranque, 19 categorías, pendientes sin reproducir, audio real que avanza, metadatos, reproductor ampliado, volumen, pausa/reanudar, cambio de emisora sin duplicar el reproductor, atribución CC BY, favoritos tras recargar, panel (probar conexión, fuente caída, URLs inválidas), stream en directo, fuente caída con mensaje y reconexión, manifiesto, iconos, service worker, arranque sin conexión, ausencia de secretos y de errores de JavaScript, CSP activa sin violaciones, security.txt y las 6 políticas.

Las respuestas de archive.org se sustituyen por una lista con la misma forma que la real y el audio es `tone.mp3` (MP3 real de 90 s), para no depender de la red.

```bash
VITE_BASE=/ npx vite build --outDir /tmp/rm-dist
npx vite preview --outDir /tmp/rm-dist --port 4173 &
cd e2e && npm i --no-save playwright-core @sparticuz/chromium && node run.mjs
```
