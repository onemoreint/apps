import type { LucideIcon } from "lucide-react";
import { Rocket, Globe2, QrCode, BrainCircuit, ShoppingBag, MessageCircle, Boxes, Workflow } from "lucide-react";

export type MockupKind = "landing" | "web" | "menu" | "ai";

export interface Service {
  id: string;
  letter: string;
  title: string;
  kicker: string;
  icon: LucideIcon;
  mockup: MockupKind;
  description: string;
  benefits: string[];
  features: string[];
  /** Mensaje precargado para WhatsApp. */
  waMessage: string;
}

/**
 * Servicios principales. Para agregar uno nuevo, añade un objeto a este arreglo
 * (y, si quieres un mockup distinto, un nuevo `MockupKind` en components/ServiceMockup.tsx).
 */
export const services: Service[] = [
  {
    id: "landing",
    letter: "A",
    title: "Landing Pages",
    kicker: "Captación y conversión",
    icon: Rocket,
    mockup: "landing",
    description:
      "Páginas enfocadas en una sola meta: que la visita se convierta en un cliente potencial. Mensaje claro, prueba visual y un botón que lleva directo a la conversación.",
    benefits: [
      "Un mensaje directo para cada campaña o producto",
      "Contacto inmediato por WhatsApp desde cualquier sección",
      "Ideal para pauta en redes, lanzamientos y promociones",
    ],
    features: ["Copywriting orientado a conversión", "Diseño responsive", "Formularios conectados a WhatsApp", "Carga rápida y SEO base"],
    waMessage: "Hola, me interesa una landing page para mi negocio. ¿Me pueden enviar una propuesta?",
  },
  {
    id: "web",
    letter: "B",
    title: "Páginas Web",
    kicker: "Presencia corporativa",
    icon: Globe2,
    mockup: "web",
    description:
      "Tu sitio oficial con la información que tus clientes buscan: quién eres, qué ofreces, dónde estás y cómo contactarte. Una base profesional que trabaja por ti las 24 horas.",
    benefits: [
      "Imagen profesional y coherente con tu marca",
      "Información siempre disponible y fácil de encontrar",
      "Preparada para crecer con nuevas secciones",
    ],
    features: ["Varias secciones o páginas", "Integración con mapas y redes", "Optimización para buscadores", "Política de privacidad y legales"],
    waMessage: "Hola, necesito una página web profesional para mi negocio. ¿Podemos conversar?",
  },
  {
    id: "menu",
    letter: "C",
    title: "Menús Digitales QR",
    kicker: "Pedidos sin fricción",
    icon: QrCode,
    mockup: "menu",
    description:
      "Menús y catálogos con categorías, fotografías y carrito. Tu cliente elige, ajusta cantidades y envía un pedido ordenado a tu WhatsApp, sin comisiones por pedido.",
    benefits: [
      "Pedidos claros, con totales calculados",
      "Actualizas precios y productos sin reimprimir",
      "Accesible por código QR o por enlace",
    ],
    features: ["Categorías y fotos", "Carrito con cantidades", "Entrega o recogida", "Pedido estructurado a WhatsApp"],
    waMessage: "Hola, quiero un menú digital QR con pedidos por WhatsApp para mi negocio.",
  },
  {
    id: "ai",
    letter: "D",
    title: "Inteligencia Artificial",
    kicker: "Microapps y automatización",
    icon: BrainCircuit,
    mockup: "ai",
    description:
      "Microaplicaciones a la medida, asistentes virtuales y automatizaciones para que tu negocio responda más rápido y dedique menos tiempo a tareas repetitivas.",
    benefits: [
      "Respuestas inmediatas a preguntas frecuentes",
      "Procesos internos más ordenados",
      "Herramientas propias, adaptadas a tu operación",
    ],
    features: ["Asistentes conversacionales", "Microapps web instalables", "Automatización de flujos", "Integración segura con APIs de IA"],
    waMessage: "Hola, quiero explorar soluciones de inteligencia artificial y automatización para mi negocio.",
  },
];

/** Soluciones complementarias (chips bajo los servicios). */
export const extraSolutions: { label: string; icon: LucideIcon }[] = [
  { label: "Catálogos digitales", icon: ShoppingBag },
  { label: "Pedidos por WhatsApp", icon: MessageCircle },
  { label: "Microaplicaciones empresariales", icon: Boxes },
  { label: "Automatización de procesos", icon: Workflow },
];
