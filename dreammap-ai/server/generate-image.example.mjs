// Ejemplo de backend para AIImageProvider de DREAMMAP AI.
// La API key vive SOLO aquí (variable de entorno), nunca en el frontend.
//
//   OPENAI_API_KEY=sk-... IMAGE_MODEL=gpt-image-1 node server/generate-image.example.mjs
//
// Luego, en la app: Generar con IA → ⚙️ Configurar → http://localhost:8787/api/generate-image
// Puede reemplazar la llamada por cualquier otro proveedor (Replicate, Stability, Gemini, uno propio…)
// manteniendo el mismo contrato: POST {prompt, style, width, height} → imagen.

import http from 'node:http';

const PORT = process.env.PORT || 8787;
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.IMAGE_MODEL || 'gpt-image-1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // restrínjalo a su dominio en producción

function sizeFor(w, h) {
  const r = w / h;
  if (r > 1.2) return '1536x1024';
  if (r < 0.83) return '1024x1536';
  return '1024x1024';
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || req.url !== '/api/generate-image') { res.statusCode = 404; return res.end(); }
  if (!KEY) { res.statusCode = 500; return res.end('Falta OPENAI_API_KEY'); }

  let body = '';
  for await (const chunk of req) body += chunk;
  const { prompt, width = 1024, height = 1024 } = JSON.parse(body || '{}');
  if (!prompt || prompt.length > 4000) { res.statusCode = 400; return res.end('Prompt inválido'); }

  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt, size: sizeFor(width, height), n: 1 }),
  });
  if (!r.ok) { res.statusCode = 502; return res.end(await r.text()); }
  const data = await r.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    res.setHeader('Content-Type', 'image/png');
    return res.end(Buffer.from(b64, 'base64'));
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ url: data.data?.[0]?.url }));
});

server.listen(PORT, () => console.log(`DREAMMAP AI · generador de imágenes en http://localhost:${PORT}/api/generate-image`));
