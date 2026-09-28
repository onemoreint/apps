import type { Project } from '../geometry/types';
import type { EditorCommand } from '../commands/commands';
import { interpret, type Interpretation } from './localParser';
import { parseEditRequest } from './commandParser';
import { explainLocally, type Explanation } from './explain';
import { sanitizeText } from '../schema/migrations';

/*
 * Contrato de la IA (especificación 2026, §17).
 * La IA SOLO devuelve datos estructurados:
 *   - interpretRequest → terreno parcial + programa (el motor genera la geometría)
 *   - createEditorCommands → comandos que pasan por src/commands (nunca modifica el modelo)
 *   - explainProposal → texto explicativo
 * El frontend no depende de ningún proveedor concreto (Claude, Supabase, etc.).
 */

export type StructuredIntent = Interpretation;

export interface CommandProposal {
  commands: EditorCommand[];
  /** frases que no se entendieron */
  unrecognized: string[];
}

export interface AIProvider {
  id: string;
  label: string;
  interpretRequest(input: string): Promise<StructuredIntent>;
  explainProposal(project: Project): Promise<Explanation>;
  createEditorCommands(input: string, project: Project): Promise<CommandProposal>;
}

/** Límite y limpieza de toda entrada de texto hacia la IA (§18) */
export const AI_INPUT_MAX = 2000;
export function guardInput(input: string): string {
  if (input.length > AI_INPUT_MAX) throw new Error(`El texto supera ${AI_INPUT_MAX} caracteres. Divídelo en partes.`);
  // conserva saltos de línea y puntuación; quita caracteres de control y marcas HTML
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, '').trim();
}

export const LocalRuleProvider: AIProvider = {
  id: 'local',
  label: 'Intérprete local (sin conexión)',
  interpretRequest: async (input) => interpret(guardInput(input)),
  explainProposal: async (project) => explainLocally(project),
  createEditorCommands: async (input, project) => parseEditRequest(guardInput(input), project),
};

/**
 * Adaptador futuro para un modelo de lenguaje detrás de un servidor PROPIO.
 * - La clave del proveedor vive en el servidor, nunca en este HTML.
 * - Se envían por separado la instrucción fija y los datos del usuario (separación prompt/datos).
 * - La respuesta NO se confía: los comandos pasan por el mismo pipeline de validación
 *   y el programa por el JSON Schema antes de usarse.
 * No está activo: no existe todavía un backend de ARQUIGEN.
 */
export function RemoteLLMProvider(endpoint: string): AIProvider {
  const post = async <T,>(task: string, userText: string, project?: Project): Promise<T> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        data: {
          userText: guardInput(userText),
          project: project
            ? { site: project.site, rooms: project.rooms.map((r) => ({ id: r.id, type: r.type, name: sanitizeText(r.name), x: r.x, y: r.y, width: r.width, length: r.length })) }
            : undefined,
        },
      }),
    });
    if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}.`);
    return (await res.json()) as T;
  };
  return {
    id: 'remote',
    label: 'Asistente IA (servidor)',
    interpretRequest: (input) => post<StructuredIntent>('interpret_request', input),
    explainProposal: (project) => post<Explanation>('explain_proposal', '', project),
    createEditorCommands: async (input, project) => {
      const r = await post<{ commands?: unknown[]; unrecognized?: unknown[] }>('create_editor_commands', input, project);
      return {
        commands: (Array.isArray(r.commands) ? r.commands.slice(0, 50) : []) as EditorCommand[],
        unrecognized: Array.isArray(r.unrecognized) ? r.unrecognized.map((u) => sanitizeText(u, 200)) : [],
      };
    },
  };
}

/** Proveedor activo. Cambiarlo aquí no afecta al resto de la aplicación. */
export const aiProvider: AIProvider = LocalRuleProvider;

/** compatibilidad con código anterior */
export const localProvider = { ...LocalRuleProvider, interpret: LocalRuleProvider.interpretRequest };
