# Evaluación de bienestar · José Lugo

Versión **solo salud** del Diagnóstico Salud + Dinero, pensada para el enlace de la bio de TikTok.
No habla de ingresos ni de negocio: así el tráfico de TikTok llega a una página de bienestar.

- **Enlace:** https://onemoreint.github.io/apps/evaluacion/
- HTML/CSS/JS sin dependencias, PWA (funciona sin conexión después de la primera visita).
- No pide datos de salud ni guarda nada en servidores: el nombre solo se usa en pantalla.

## Recorrido (60 segundos)
1. ¿Cómo te levantas? → 2. ¿Qué quieres mejorar primero? → 3. Rango de edad → 4. ¿Cuándo quieres empezar?
5. Nombre y país → análisis → resultado con producto sugerido, paquete de inicio y WhatsApp.

## Diferencias con `diagnostico-salud-dinero/`
- Sin preguntas de tiempo, experiencia ni meta de ingresos; sin «perfil como socio».
- Sin video de oportunidad (`CONFIG.videoYoutube` vacío).
- Aviso legal solo de salud.
- El mensaje de WhatsApp dice «Evaluación de bienestar (TikTok)» para saber de dónde llegó el prospecto.
- Las tasas de cambio se leen de `../diagnostico-salud-dinero/tasas.json` (no duplica la Action).

Carpeta nueva: no toca `diagnostico-salud-dinero/` ni las Evaluaciones de Bienestar de los distribuidores.
