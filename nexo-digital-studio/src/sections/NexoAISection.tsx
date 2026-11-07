import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bot, Send, Sparkles, RotateCcw, ArrowUpRight, ShieldCheck, Cpu, Zap } from "lucide-react";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { TypingText } from "../components/TypingText";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { assistant, assistantMode, initialSuggestions, type ChatAction, type ChatMessage } from "../services/ai";
import { openWhatsApp } from "../services/whatsapp";
import { routeHref } from "../hooks/useHashRoute";

const uid = () => Math.random().toString(36).slice(2, 10);

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hola, soy NEXO AI. Cuéntame qué hace tu negocio o qué quieres lograr y te recomiendo la solución digital ideal.",
  suggestions: initialSuggestions,
};

const capabilities = [
  { icon: Zap, title: "Respuestas al instante", text: "Orienta a tus clientes a cualquier hora, incluso cuando no puedes contestar." },
  { icon: Cpu, title: "Lista para IA real", text: "La arquitectura permite conectar un modelo de IA desde un servidor seguro." },
  { icon: ShieldCheck, title: "Claves protegidas", text: "Las credenciales viven en el backend; nunca se exponen en el navegador." },
];

export function NexoAISection() {
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Desplaza SOLO el contenedor del chat (no la página) al llegar mensajes.
  const scrollToEnd = () => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  };
  useEffect(scrollToEnd, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking || typingId) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setThinking(true);
    const reply = await assistant.reply(history, text);
    const botMsg: ChatMessage = { id: uid(), role: "assistant", ...reply };
    setThinking(false);
    setTypingId(botMsg.id);
    setMessages((m) => [...m, botMsg]);
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  const runAction = (a: ChatAction) => {
    if (a.type === "whatsapp") openWhatsApp(a.value);
    else if (a.type === "demo") window.location.hash = a.value === "privacidad" ? routeHref.privacy() : routeHref.demo(a.value);
    else document.getElementById(a.value)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const reset = () => { setMessages([WELCOME]); setTypingId(null); setThinking(false); setInput(""); };
  const last = messages[messages.length - 1];
  const showChips = !thinking && !typingId && last.role === "assistant" && last.suggestions?.length;

  return (
    <section id="nexo-ai" aria-labelledby="ai-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute right-[-10%] top-1/3 -z-10 h-[520px] w-[520px] rounded-full bg-electric/10 blur-[140px]" />
      <div className="container-site grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading
            id="ai-title"
            align="left"
            eyebrow="Experiencia con IA"
            title={<>Tu negocio puede ser <span className="text-gradient">más inteligente.</span></>}
            intro="Conversa con NEXO AI, un asistente de demostración que entiende lo que necesitas y te sugiere el camino. Así podría atender a tus clientes un asistente diseñado para tu negocio."
          />
          <ul className="mt-9 space-y-4">
            {capabilities.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={0.1 + i * 0.08} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-electric ring-1 ring-white/10"><Icon className="h-5 w-5" /></span>
                <span>
                  <span className="block font-display text-[17px] font-semibold">{title}</span>
                  <span className="block text-[15px] text-mist">{text}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1}>
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-[36px] bg-[linear-gradient(135deg,rgba(120,87,255,0.35),rgba(40,197,255,0.25))] opacity-60 blur-2xl" />
            <div className="glass-strong relative flex h-[600px] max-h-[82vh] flex-col overflow-hidden rounded-[28px] sm:h-[620px]">
              {/* Encabezado */}
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet to-electric shadow-[0_8px_24px_-6px_rgba(120,87,255,0.9)]">
                    <Bot className="h-5 w-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-700 bg-emerald-400" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-display text-[16px] font-bold">NEXO AI</p>
                    <p className="text-[12.5px] text-mist">{assistantMode === "rules" ? "Modo demostración" : "Asistente en línea"}</p>
                  </div>
                </div>
                <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-xl text-mist ring-1 ring-white/10 transition hover:text-white" aria-label="Reiniciar conversación">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Mensajes */}
              <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5" aria-live="polite" aria-label="Conversación con NEXO AI">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[88%] ${m.role === "user" ? "" : "flex gap-2.5"}`}>
                        {m.role === "assistant" && (
                          <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-electric"><Sparkles className="h-3.5 w-3.5" /></span>
                        )}
                        <div>
                          <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "rounded-br-md bg-gradient-to-br from-violet to-violet-600 text-white" : "rounded-bl-md bg-white/[0.06] text-white/90 ring-1 ring-white/[0.06]"}`}>
                            {m.role === "assistant" && m.id === typingId ? (
                              <TypingText text={m.text} onDone={() => setTypingId(null)} />
                            ) : (
                              m.text
                            )}
                          </div>
                          {m.role === "assistant" && m.actions && m.id !== typingId && (
                            <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 flex flex-wrap gap-2">
                              {m.actions.map((a) => (
                                <button
                                  key={a.label}
                                  type="button"
                                  onClick={() => runAction(a)}
                                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition ${a.type === "whatsapp" ? "bg-[#25D366] text-[#04210f] hover:bg-[#3be07a]" : "bg-white/[0.08] text-white ring-1 ring-white/15 hover:bg-white/[0.14]"}`}
                                >
                                  {a.type === "whatsapp" ? <WhatsAppIcon className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                  {a.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {thinking && (
                  <div className="flex items-center gap-2.5" aria-label="NEXO AI está escribiendo">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-electric"><Sparkles className="h-3.5 w-3.5" /></span>
                    <div className="flex gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-3.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="h-2 w-2 rounded-full bg-electric" animate={reduced ? undefined : { y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sugerencias */}
              <div className="min-h-[58px] border-t border-white/[0.05] px-4 pt-3 sm:px-5">
                {showChips ? (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
                    {last.suggestions!.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="shrink-0 rounded-full bg-white/[0.04] px-3.5 py-2 text-[13.5px] font-semibold text-mist-300 ring-1 ring-white/10 transition hover:bg-violet/20 hover:text-white hover:ring-violet/50">
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="pb-2 text-[12.5px] text-mist-700">NEXO AI orienta; la propuesta final la prepara nuestro equipo.</p>
                )}
              </div>

              {/* Entrada */}
              <form onSubmit={onSubmit} className="flex items-center gap-2 p-3 sm:p-4">
                <label htmlFor="nexo-input" className="sr-only">Escribe tu mensaje para NEXO AI</label>
                <input
                  id="nexo-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={400}
                  autoComplete="off"
                  placeholder="Escribe lo que necesita tu negocio…"
                  className="field flex-1 rounded-full py-3"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking || !!typingId}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet to-electric text-white shadow-[0_8px_24px_-6px_rgba(120,87,255,0.9)] transition hover:scale-105 disabled:scale-100 disabled:opacity-40"
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
