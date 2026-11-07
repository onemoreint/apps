import type { AssistantProvider, AssistantReply, ChatMessage } from "./types";
import { ruleProvider } from "./ruleEngine";

/**
 * Proveedor de NEXO AI.
 *  · Sin VITE_AI_ENDPOINT → motor de reglas local (demo, sin red).
 *  · Con VITE_AI_ENDPOINT → llama a TU backend (ej. netlify/functions/nexo-ai.ts),
 *    que es el único que conoce la clave de la API. El navegador nunca la ve.
 *  · Si el backend falla, vuelve automáticamente al motor de reglas.
 */
const endpoint = import.meta.env.VITE_AI_ENDPOINT?.trim();

const remoteProvider: AssistantProvider = {
  async reply(history: ChatMessage[], input: string): Promise<AssistantReply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(endpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: input,
          history: history.slice(-10).map(({ role, text }) => ({ role, text })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<AssistantReply>;
      if (!data.text) throw new Error("Respuesta vacía");
      return { text: data.text, actions: data.actions, suggestions: data.suggestions };
    } catch (err) {
      console.warn("[NEXO AI] backend no disponible, usando reglas locales:", err);
      return ruleProvider.reply(history, input);
    } finally {
      clearTimeout(timer);
    }
  },
};

export const assistant: AssistantProvider = endpoint ? remoteProvider : ruleProvider;
export const assistantMode: "rules" | "remote" = endpoint ? "remote" : "rules";
export * from "./types";
export { initialSuggestions } from "./ruleEngine";
