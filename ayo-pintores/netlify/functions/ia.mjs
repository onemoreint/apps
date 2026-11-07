// Función de IA para la página de A y O Pintores del Oriente.
// Despliegue: Netlify. Variable de entorno requerida: ANTHROPIC_API_KEY.
// Opcional: ANTHROPIC_MODEL (por defecto claude-haiku-5-5), ALLOWED_ORIGIN.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const ORIGIN = process.env.ALLOWED_ORIGIN || "https://onemoreint.github.io";

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405, headers: cors });

  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const { input, images = [] } = body || {};
  if (!input) return json({ error: "Falta input" }, 400);

  // input puede ser texto o una lista de turnos [{role, content}]
  let messages = typeof input === "string"
    ? [{ role: "user", content: input }]
    : input.filter(m => m && (m.role === "user" || m.role === "assistant") && m.content).slice(-12);

  // Fusiona turnos consecutivos del mismo rol
  messages = messages.reduce((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content; else acc.push({ ...m });
    return acc;
  }, []);
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "El último turno debe ser del usuario" }, 400);

  // Adjunta como máximo una imagen al último turno
  const img = images.slice(0, 1).filter(i => /^image\/(jpeg|png|webp|gif)$/.test(i.type) && i.data && i.data.length < 7_000_000);
  if (img.length) {
    const last = messages[messages.length - 1];
    last.content = [
      ...img.map(i => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })),
      { type: "text", text: last.content },
    ];
  }

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, messages }),
  });

  if (!r.ok) return json({ error: "Error del servicio de IA" }, 502);
  const data = await r.json();
  const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
  return json({ text });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

export const config = { path: "/api/ia" };
