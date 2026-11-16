# Diagnóstico Salud + Dinero · José Lugo

Diagnóstico de 90 segundos que lleva al prospecto a comprar o afiliarse a ONE MORE International.

- **Enlace:** https://onemoreint.github.io/apps/diagnostico-salud-dinero/
- HTML/CSS/JS sin dependencias, PWA (funciona sin conexión después de la primera visita).
- No pide datos de salud ni guarda nada en servidores: el nombre solo se usa en pantalla.

## Recorrido
1. ¿Qué quieres mejorar? → salud, ingresos o ambas.
2. Salud: mañanas, prioridad (energía, descanso, peso, vitalidad, piel) y rango de edad.
3. Ingresos: tiempo disponible, experiencia y meta.
4. ¿Cuándo quieres empezar? → nombre y país → resultado.

## Cierre
- **Quiero empezar** → enlace de afiliación (`CONFIG.enlaceAfiliacion`).
- **WhatsApp** → mensaje ya escrito con las respuestas y una etiqueta: 🔥 Listo para empezar · 🌱 Interesado · 👀 Explorando.
- Video corto (`CONFIG.videoYoutube`), paso a paso del registro y aviso legal.

## Cómo cambiar datos
Todo está en el objeto `CONFIG` al inicio del `<script>` de `index.html`: asesor, WhatsApp, enlace, video, paquete y **testimonios** (la sección aparece sola cuando la lista tiene al menos uno).

## Fases
- [x] Fase 1: recorrido, resultado y cierre.
- [ ] Fase 2: precio en moneda local, testimonios reales y analítica.
- [ ] Fase 3: versión para cada socio (duplicación).

Esta carpeta es nueva: no toca las Evaluaciones de Bienestar existentes ni sus enlaces.
