export type ChatRole = "user" | "assistant";

export interface ChatAction {
  label: string;
  /** whatsapp: abre WhatsApp con `value` como mensaje · demo: abre un demo (#/demo/<value>) · section: desplaza a #<value> */
  type: "whatsapp" | "demo" | "section";
  value: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  actions?: ChatAction[];
  suggestions?: string[];
}

export interface AssistantReply {
  text: string;
  actions?: ChatAction[];
  suggestions?: string[];
}

/** Contrato del proveedor de respuestas: hoy reglas locales, mañana un backend con IA real. */
export interface AssistantProvider {
  reply(history: ChatMessage[], input: string): Promise<AssistantReply>;
}
