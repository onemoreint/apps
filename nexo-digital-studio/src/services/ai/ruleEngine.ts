import type { AssistantProvider, AssistantReply } from "./types";

/**
 * Motor DEMOSTRATIVO de reglas para NEXO AI.
 * Detecta la intención por palabras clave (sin tildes, en minúsculas) y responde con
 * texto + acciones. Es determinista, no requiere red y no envía datos a terceros.
 */

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ");

interface Rule {
  id: string;
  keywords: string[];
  reply: AssistantReply;
}

const DEFAULT_SUGGESTIONS = ["Quiero un menú digital", "Necesito una página web", "Quiero automatizar mi negocio", "Quiero vender más por internet"];

const rules: Rule[] = [
  {
    id: "menu",
    keywords: ["menu", "qr", "restaurante", "comida", "carta", "pedido", "pedidos", "domicilio", "cafeteria", "panaderia", "pizzeria"],
    reply: {
      text:
        "Un menú digital es ideal para ti. Tus clientes ven categorías y fotos, eligen cantidades y te envían un pedido ordenado a WhatsApp, con total, datos de entrega y método de pago. Sin comisiones por pedido y con precios que puedes actualizar sin reimprimir. ¿Quieres probar cómo se siente desde el lado del cliente?",
      actions: [
        { label: "Probar el menú demo", type: "demo", value: "menu" },
        { label: "Cotizar mi menú", type: "whatsapp", value: "Hola, NEXO AI me recomendó un menú digital con pedidos por WhatsApp. Quiero una propuesta." },
      ],
      suggestions: ["¿Funciona con código QR?", "¿Cuánto tarda?", "Tengo una tienda de ropa"],
    },
  },
  {
    id: "catalogo",
    keywords: ["catalogo", "tienda", "productos", "ropa", "ventas por whatsapp", "inventario", "emprendimiento", "accesorios"],
    reply: {
      text:
        "Para una tienda funciona muy bien un catálogo digital: productos con foto, precio y variantes, carrito y pedido directo a tu WhatsApp. Lo compartes en tu biografía de Instagram, en estados o por mensaje, y tu cliente compra sin esperar respuestas una por una.",
      actions: [
        { label: "Ver cómo funciona", type: "demo", value: "menu" },
        { label: "Quiero mi catálogo", type: "whatsapp", value: "Hola, quiero un catálogo digital con pedidos por WhatsApp para mi tienda." },
      ],
      suggestions: ["¿Puedo actualizar precios?", "Necesito una página web", "Quiero vender más por internet"],
    },
  },
  {
    id: "web",
    keywords: ["pagina web", "sitio", "web", "pagina", "corporativa", "empresa", "dominio", "presencia"],
    reply: {
      text:
        "Una página web profesional le da a tu negocio un lugar propio en internet: quién eres, qué ofreces, cómo trabajas y cómo contactarte. Si buscas captar clientes de una campaña concreta, te conviene una landing page; si quieres presencia institucional completa, un sitio corporativo.",
      actions: [
        { label: "Ver demo corporativa", type: "demo", value: "corporativa" },
        { label: "Ver demo landing", type: "demo", value: "landing" },
        { label: "Pedir propuesta", type: "whatsapp", value: "Hola, NEXO AI me orientó sobre una página web. Quiero recibir una propuesta." },
      ],
      suggestions: ["¿Qué diferencia hay con una landing?", "¿Necesito dominio?", "¿Cuánto cuesta?"],
    },
  },
  {
    id: "landing",
    keywords: ["landing", "campana", "anuncio", "pauta", "captar", "leads", "prospectos", "diferencia"],
    reply: {
      text:
        "Una landing page tiene una sola misión: convertir la visita en contacto. Va al grano con tu oferta, muestra beneficios, responde objeciones y lleva a un botón de WhatsApp. Es la compañera perfecta de tus anuncios en redes sociales.",
      actions: [
        { label: "Ver demo landing", type: "demo", value: "landing" },
        { label: "Quiero una landing", type: "whatsapp", value: "Hola, quiero una landing page para captar clientes." },
      ],
      suggestions: ["Necesito una página web", "Quiero vender más por internet"],
    },
  },
  {
    id: "automatizar",
    keywords: ["automatizar", "automatizacion", "ia", "inteligencia", "chatbot", "bot", "asistente", "microapp", "app", "aplicacion", "procesos", "tiempo"],
    reply: {
      text:
        "Podemos automatizar en tres frentes: un asistente que responde preguntas frecuentes, microapps para tareas internas (inventario, cartera, agenda, cotizaciones) y flujos que conectan formularios con WhatsApp u hojas de cálculo. Empezamos por la tarea que más tiempo te quita hoy. ¿Cuál es?",
      actions: [
        { label: "Hablar con un especialista", type: "whatsapp", value: "Hola, quiero automatizar procesos de mi negocio con inteligencia artificial. ¿Podemos conversar?" },
        { label: "Ver servicios de IA", type: "section", value: "servicios" },
      ],
      suggestions: ["Respondo los mismos mensajes todo el día", "Llevo todo en cuadernos o Excel", "¿Es seguro usar IA?"],
    },
  },
  {
    id: "repetitivo",
    keywords: ["mismos mensajes", "responder", "preguntas", "excel", "cuaderno", "cuadernos", "papel", "desorden"],
    reply: {
      text:
        "Eso tiene solución. Si respondes lo mismo muchas veces, un menú o catálogo con precios y un asistente para preguntas frecuentes reducen esa carga. Si todo está en papel o Excel, una microapp sencilla ordena la información y te da reportes al instante.",
      actions: [{ label: "Contar mi caso por WhatsApp", type: "whatsapp", value: "Hola, quiero ordenar y automatizar mi negocio. Les cuento mi caso." }],
      suggestions: ["Quiero un menú digital", "Quiero automatizar mi negocio"],
    },
  },
  {
    id: "vender",
    keywords: ["vender", "ventas", "clientes", "internet", "online", "crecer", "redes", "instagram", "facebook", "tiktok"],
    reply: {
      text:
        "Para vender más por internet, tus clientes deben encontrar rápido lo que buscan y poder comprar sin fricción. Una estrategia práctica: catálogo o menú con pedidos por WhatsApp, una landing para tus campañas y un enlace único para todas tus redes. Así cada publicación lleva a un lugar donde se puede comprar.",
      actions: [
        { label: "Ver el showroom", type: "section", value: "showroom" },
        { label: "Diseñar mi estrategia", type: "whatsapp", value: "Hola, quiero vender más por internet. ¿Qué solución me recomiendan?" },
      ],
      suggestions: ["Quiero un menú digital", "Necesito una página web"],
    },
  },
  {
    id: "precio",
    keywords: ["precio", "precios", "cuesta", "costo", "valor", "cotizar", "cotizacion", "presupuesto", "tarifa"],
    reply: {
      text:
        "El valor depende del alcance: no cuesta lo mismo un menú de una categoría que un sitio corporativo o una microapp a la medida. Cuéntame qué necesitas y el equipo te envía una propuesta clara por WhatsApp, sin compromiso.",
      actions: [{ label: "Solicitar cotización", type: "whatsapp", value: "Hola, quiero cotizar una solución digital para mi negocio." }],
      suggestions: ["Quiero un menú digital", "Necesito una página web"],
    },
  },
  {
    id: "tiempo",
    keywords: ["tarda", "demora", "tiempo", "cuando", "rapido", "entrega", "plazo"],
    reply: {
      text:
        "El tiempo depende del proyecto y de qué tan pronto tengamos tus textos y fotos. Los proyectos más concretos, como una landing o un menú, se entregan antes que un sitio con muchas secciones. En la propuesta te damos un cronograma por etapas.",
      actions: [{ label: "Ver el proceso", type: "section", value: "proceso" }],
      suggestions: ["¿Cuánto cuesta?", "¿Qué necesito para empezar?"],
    },
  },
  {
    id: "seguridad",
    keywords: ["seguro", "seguridad", "datos", "privacidad", "clave", "api"],
    reply: {
      text:
        "Sí, si se hace bien. Las conexiones con proveedores de IA se realizan desde un servidor seguro: las claves nunca quedan en la página que ve el cliente. Además, solo recolectamos los datos necesarios y explicamos su uso en la política de privacidad.",
      actions: [{ label: "Leer política de privacidad", type: "demo", value: "privacidad" }],
      suggestions: ["Quiero automatizar mi negocio"],
    },
  },
  {
    id: "empezar",
    keywords: ["empezar", "necesito para", "requisitos", "comenzar", "iniciar"],
    reply: {
      text:
        "Para empezar basta con una conversación: el nombre de tu negocio, qué vendes, algunas fotos y tus datos de contacto. Si no tienes fotos o textos, te orientamos para prepararlos.",
      actions: [{ label: "Iniciar por WhatsApp", type: "whatsapp", value: "Hola, quiero empezar mi proyecto digital. ¿Qué información necesitan?" }],
      suggestions: ["¿Cuánto tarda?", "¿Cuánto cuesta?"],
    },
  },
  {
    id: "saludo",
    keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "hey", "saludos"],
    reply: {
      text: "¡Hola! Soy NEXO AI. Cuéntame qué tipo de negocio tienes o qué te gustaría lograr, y te recomiendo la solución digital que mejor encaja.",
      suggestions: DEFAULT_SUGGESTIONS,
    },
  },
  {
    id: "gracias",
    keywords: ["gracias", "genial", "perfecto", "excelente", "listo"],
    reply: {
      text: "¡Con gusto! Cuando quieras dar el siguiente paso, el equipo está a un mensaje de distancia.",
      actions: [{ label: "Escribir por WhatsApp", type: "whatsapp", value: "Hola, vengo de hablar con NEXO AI y quiero recibir una propuesta." }],
    },
  },
];

const FALLBACK: AssistantReply = {
  text:
    "Buena pregunta. Para darte una recomendación precisa, cuéntame un poco más: ¿qué vende tu negocio y cómo te contactan hoy tus clientes? También puedes elegir una de estas opciones.",
  suggestions: DEFAULT_SUGGESTIONS,
};

export function matchRule(input: string): AssistantReply {
  const text = ` ${normalize(input)} `;
  let best: { rule: Rule; score: number } | null = null;
  for (const rule of rules) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(` ${kw} `) || (kw.includes(" ") && text.includes(kw))) score += kw.length > 5 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { rule, score };
  }
  return best ? best.rule.reply : FALLBACK;
}

export const ruleProvider: AssistantProvider = {
  async reply(_history, input) {
    // Pequeña latencia para que la experiencia se sienta natural.
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 350));
    return matchRule(input);
  },
};

export const initialSuggestions = DEFAULT_SUGGESTIONS;
