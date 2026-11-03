// Capa de integración con un backend propio. Esta app nunca llama a un proveedor de IA directamente
// ni guarda su clave: solo habla con el backend que José configure (plantilla en /backend).

export class RemoteError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Rechaza claves de proveedor pegadas por error y direcciones inseguras. */
export function validateConfig({ url, token }) {
  const cleanUrl = (url || '').trim().replace(/\/+$/, '');
  const cleanToken = (token || '').trim();
  if (/sk-ant/i.test(cleanUrl) || /^sk-/i.test(cleanToken)) {
    throw new RemoteError('api-key', 'Eso parece una clave de API. Nunca la guardes en esta app: va como secreto en tu backend.');
  }
  if (!cleanUrl) throw new RemoteError('no-url', 'Escribe la dirección de tu backend.');
  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    throw new RemoteError('bad-url', 'La dirección del backend no es válida.');
  }
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !local) {
    throw new RemoteError('bad-url', 'El backend debe usar https://.');
  }
  return { url: cleanUrl, token: cleanToken };
}

async function request(path, config, options = {}, timeoutMs = 30000) {
  const { url, token } = validateConfig(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${url}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new RemoteError('timeout', 'El backend tardó demasiado en responder.');
    throw new RemoteError('network', 'No pude conectar con el backend. Revisa la dirección y tu internet.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) throw new RemoteError('auth', 'El backend rechazó el código de acceso.');
  if (!res.ok) throw new RemoteError('server', `El backend respondió con un error (${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new RemoteError('bad-response', 'El backend no devolvió una respuesta válida.');
  }
}

export async function checkHealth(config) {
  const data = await request('/health', config, { method: 'GET' }, 10000);
  if (!data || data.ok !== true) throw new RemoteError('bad-response', 'El backend respondió, pero no confirma que la IA esté disponible.');
  return { model: typeof data.model === 'string' ? data.model : '' };
}

export async function askRemote(config, { messages, context }) {
  const data = await request('/chat', config, {
    method: 'POST',
    body: JSON.stringify({ messages, context }),
  });
  if (!data || typeof data.reply !== 'string') throw new RemoteError('bad-response', 'El backend no devolvió texto.');
  const proposals = Array.isArray(data.proposals)
    ? data.proposals.filter((p) => p && typeof p.type === 'string' && p.params && typeof p.params === 'object').slice(0, 3)
    : [];
  return { text: data.reply.slice(0, 8000), proposals };
}
