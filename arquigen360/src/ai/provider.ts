import type { Program, Site } from '../geometry/types';
import { interpret, type Interpretation } from './localParser';

/**
 * Contrato de la IA: SOLO devuelve datos de entrada (terreno parcial + programa).
 * La geometría la produce siempre el motor determinista.
 */
export interface AIProvider {
  id: string;
  label: string;
  interpret(text: string): Promise<Interpretation>;
}

export const localProvider: AIProvider = {
  id: 'local',
  label: 'Intérprete local (sin conexión)',
  interpret: async (text) => interpret(text),
};

/**
 * Plantilla para un proveedor LLM (Claude u otro) detrás de un backend propio.
 * El backend recibe el texto y responde JSON con el esquema { site?, program }.
 * Se valida antes de aceptarlo; si falla, se usa el intérprete local.
 */
export function remoteProvider(endpoint: string): AIProvider {
  return {
    id: 'remote',
    label: 'Asistente IA (servidor)',
    async interpret(text) {
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        const data = (await res.json()) as { site?: Partial<Site>; program: Program; summary?: string[] };
        if (!data?.program?.rooms?.length) throw new Error('respuesta inválida');
        return { site: data.site, program: data.program, summary: data.summary ?? [] };
      } catch {
        return interpret(text);
      }
    },
  };
}
