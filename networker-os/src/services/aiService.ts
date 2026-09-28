// Capa de servicio de "IA". En el MVP funciona 100% local con reglas y plantillas.
// Para conectar un modelo externo más adelante: implementar la misma interfaz en un
// servicio remoto (p. ej. Supabase Edge Function) — nunca poner API keys en el frontend
// y pedir consentimiento antes de enviar datos de contactos.

import type { SituationKey } from '../domain/models';
import { SITUATIONS, type Channel, type Style } from '../domain/content/conversations';
import { checkCompliance, type ComplianceIssue } from '../domain/compliance';
import { analyzeObjection, type ObjectionAnalysis } from '../domain/content/objections';

export interface ConversationRequest {
  situation: SituationKey;
  channel: Channel;
  style: Style;
  name?: string;
  company: string;
  productCategory: string;
  variant?: number;
  now?: Date;
}

export interface ConversationResult {
  kind: 'mensaje' | 'guion';
  text: string;
  script?: { open: string; questions: string[]; close: string };
  goal: string;
  tip: string;
  avoid: string;
  channelNote: string;
  compliance: ComplianceIssue[];
  variants: number;
}

function greetingFor(style: Style, name: string | undefined, now: Date): string {
  const n = name?.trim();
  const h = now.getHours();
  const franja = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  switch (style) {
    case 'profesional':
      return n ? `${franja}, ${n}.` : `${franja}.`;
    case 'cercano':
      return n ? `¡Hola, ${n}! ¿Cómo vas?` : '¡Hola! ¿Cómo vas?';
    case 'directo':
      return n ? `${n}, ¿qué tal?` : 'Hola, ¿qué tal?';
    default:
      return n ? `Hola, ${n}.` : 'Hola.';
  }
}

const fill = (s: string, r: ConversationRequest) =>
  s.replaceAll('{empresa}', r.company).replaceAll('{categoria}', r.productCategory).replaceAll('{nombre}', r.name ?? '');

const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
};

export const localAiService = {
  generateConversation(req: ConversationRequest): ConversationResult {
    const t = SITUATIONS.find((s) => s.key === req.situation)!;
    const styled = t.styles[req.style];
    const asks = [styled.ask, ...t.altAsks];
    const v = (req.variant ?? 0) % asks.length;
    const ask = fill(asks[v], req);
    const body = fill(styled.body, req);
    const greet = greetingFor(req.style, req.name, req.now ?? new Date());

    if (req.channel === 'llamada') {
      const script = {
        open: `${greet} ${t.call.open}`,
        questions: t.call.questions.map((q) => fill(q, req)),
        close: t.call.close,
      };
      const text = `APERTURA\n${script.open}\n\nPREGUNTAS PARA ESCUCHAR\n${script.questions.map((q) => `• ${q}`).join('\n')}\n\nCIERRE\n${script.close}`;
      return {
        kind: 'guion',
        text,
        script,
        goal: t.goal,
        tip: t.tip,
        avoid: t.avoid,
        channelNote: 'En llamada, habla menos del 40% del tiempo. Las preguntas son para escuchar, no para llevar a la persona a una respuesta.',
        compliance: checkCompliance(text),
        variants: 1,
      };
    }

    const social = req.channel === 'instagram' || req.channel === 'facebook';
    const text = social ? `${greet} ${firstSentence(body)} ${ask}` : `${greet}\n\n${body}\n\n${ask}`;
    return {
      kind: 'mensaje',
      text,
      goal: t.goal,
      tip: t.tip,
      avoid: t.avoid,
      channelNote: social
        ? 'En redes sociales los mensajes cortos reciben más respuestas. Guarda el detalle para cuando la persona responda.'
        : 'En WhatsApp, un mensaje escrito corto suele funcionar mejor que un audio largo en el primer intercambio.',
      compliance: checkCompliance(text),
      variants: asks.length,
    };
  },

  analyzeObjection(text: string): ObjectionAnalysis {
    return analyzeObjection(text);
  },
};

export type AiService = typeof localAiService;
export const aiService: AiService = localAiService;
