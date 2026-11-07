/**
 * Backend seguro para NEXO AI (Netlify Functions).
 *
 * El navegador NUNCA ve la clave: el frontend llama a este endpoint
 * (VITE_AI_ENDPOINT=/.netlify/functions/nexo-ai) y este, a su vez, llama a la API de IA.
 *
 * Variables de entorno (panel de Netlify → Site configuration → Environment variables):
 *   ANTHROPIC_API_KEY   (obligatoria)  clave de la API de Claude
 *   AI_MODEL            (opcional)     modelo a usar; por defecto "claude-haiku-5-5"
 *   ALLOWED_ORIGIN      (recomendada)  dominio del sitio, ej. https://tudominio.com
 *   WHATSAPP_NUMBER     (opcional)     para el botón de acción de la respuesta
 *
 * Para Vercel/Cloudflare: el mismo código funciona adaptando la firma del handler.
 */

interface IncomingMessage { role: "user" | "assistant"; text: string }

const SYSTEM_PROMPT = `Eres NEXO AI, asistente comercial de NEXO DIGITAL STUDIO, una agencia que crea
landing pages, páginas web profesionales, menús digitales QR, catálogos digitales, sistemas de pedidos
por WhatsApp, microaplicaciones empresariales y automatizaciones con inteligencia artificial.
Responde SIEMPRE en español, con tono cercano y profesional, en máximo 90 palabras.
Recomienda la solución que mejor encaje con el negocio del usuario y termina invitando a pedir una
propuesta por WhatsApp. No inventes precios, plazos exactos, clientes, reseñas ni estadísticas: si
preguntan por precio o tiempo, explica que depende del alcance y que el equipo envía una propuesta.`;

const json = (status: number, body: unknown, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });

// Límite simple por IP (por instancia). Para producción con tráfico alto usa un almacén compartido.
const hits = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > windowMs) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n += 1;
  return h.n > max;
}

export default async (req: Request) => {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  const origin = req.headers.get("origin") || "";
  const corsOrigin = allowed === "*" ? "*" : allowed;

  if (req.method === "OPTIONS") return json(204, {}, corsOrigin);
  if (req.method !== "POST") return json(405, { error: "Método no permitido" }, corsOrigin);
  if (allowed !== "*" && origin && origin !== allowed) return json(403, { error: "Origen no permitido" }, corsOrigin);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: "Falta ANTHROPIC_API_KEY en el servidor" }, corsOrigin);

  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "anon";
  if (rateLimited(ip)) return json(429, { error: "Demasiadas solicitudes, intenta en un minuto." }, corsOrigin);

  let body: { message?: string; history?: IncomingMessage[] };
  try { body = await req.json(); } catch { return json(400, { error: "JSON inválido" }, corsOrigin); }

  const message = String(body.message ?? "").slice(0, 600).trim();
  if (!message) return json(400, { error: "Mensaje vacío" }, corsOrigin);

  // Historial corto y saneado; la API exige alternar roles empezando por "user".
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-8)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({ role: m.role, content: m.text.slice(0, 1200) }));
  while (history.length && history[0].role !== "user") history.shift();
  const messages = history.length && history[history.length - 1].role === "user" ? history : [...history, { role: "user" as const, content: message }];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_MODEL || "claude-haiku-5-5", max_tokens: 400, system: SYSTEM_PROMPT, messages }),
    });
    if (!res.ok) {
      console.error("AI API error", res.status, await res.text());
      return json(502, { error: "El servicio de IA no respondió" }, corsOrigin);
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    return json(200, {
      text: text || "¿Me cuentas un poco más sobre tu negocio?",
      actions: [{ label: "Pedir propuesta por WhatsApp", type: "whatsapp", value: "Hola, vengo de hablar con NEXO AI y quiero recibir una propuesta." }],
    }, corsOrigin);
  } catch (err) {
    console.error(err);
    return json(500, { error: "Error interno" }, corsOrigin);
  }
};
