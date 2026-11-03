# Conectar JARVIS con Claude (opcional)

La app funciona sin este backend. Solo hace falta para conversar libremente con un modelo de IA.

**Costo:** Cloudflare Workers tiene un plan gratuito, pero la API de Anthropic cobra por uso. Revisa los precios vigentes y fija un límite de gasto en tu cuenta antes de empezar.

**Estado:** el código se probó con la API de Anthropic simulada. La conexión real se comprueba al completar estos pasos.

## Pasos, sin usar Terminal

1. Crea una cuenta en [Cloudflare](https://dash.cloudflare.com) y otra en la [consola de Anthropic](https://console.anthropic.com), donde generas tu clave de API.
2. En Cloudflare abre **Workers & Pages → Create → Hello World**, ponle el nombre `jarvis` y pulsa **Deploy**.
3. Pulsa **Edit code**, reemplaza todo por el contenido de `worker.js` y pulsa **Deploy**.
4. En **Settings → Variables and Secrets** agrega:

| Nombre | Tipo | Valor |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | Tu clave de Anthropic |
| `APP_TOKEN` | Secret | Una frase larga inventada por ti: es el código de acceso |
| `ALLOWED_ORIGIN` | Text | `https://onemoreint.github.io` (sin barra ni carpeta al final) |
| `MODEL` | Text, opcional | El modelo que prefieras; por defecto `claude-sonnet-5-5` |

5. En JARVIS abre **Configuración → Inteligencia artificial**, escribe la dirección del Worker y el código de acceso, activa la casilla y pulsa **Guardar y probar la conexión**.

## Seguridad

- La clave de Anthropic queda solo en Cloudflare. Nunca la pegues en la app ni en el repositorio; JARVIS rechaza las que empiezan por `sk-`.
- El código de acceso sí se guarda en el navegador. Todas las páginas publicadas en `onemoreint.github.io` comparten el mismo almacenamiento, así que publica allí solo páginas de confianza. Si el código se expone, cámbialo en Cloudflare; el límite de gasto protege tu cuenta.
- La IA solo puede proponer acciones de una lista cerrada y no puede proponer borrados. Toda acción pasa por el botón Autorizar.
- Tus tareas, notas y preferencias solo se envían si activas la casilla para compartirlas.
