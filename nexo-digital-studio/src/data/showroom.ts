import type { LucideIcon } from "lucide-react";
import { Rocket, UtensilsCrossed, Building2 } from "lucide-react";

export type DemoId = "landing" | "menu" | "corporativa";

export interface ShowroomItem {
  id: DemoId;
  title: string;
  label: string;
  description: string;
  highlights: string[];
  icon: LucideIcon;
  accent: string;
}

/** Proyectos demostrativos. Para añadir uno nuevo: crea su página en src/pages/demos y regístrala en App.tsx. */
export const showroom: ShowroomItem[] = [
  {
    id: "landing",
    label: "Demo 01",
    title: "Landing Page",
    description: "Una landing de captación para un estudio de entrenamiento ficticio: oferta, beneficios, horarios y reserva por WhatsApp.",
    highlights: ["Oferta clara", "Formulario a WhatsApp", "Secciones de conversión"],
    icon: Rocket,
    accent: "from-violet-500 to-electric-500",
  },
  {
    id: "menu",
    label: "Demo 02",
    title: "Menú Digital",
    description: "Un menú navegable de un restaurante ficticio con categorías, carrito, totales, entrega o recogida y pedido completo a WhatsApp.",
    highlights: ["Carrito funcional", "Entrega o recogida", "Pedido estructurado"],
    icon: UtensilsCrossed,
    accent: "from-electric-500 to-violet-500",
  },
  {
    id: "corporativa",
    label: "Demo 03",
    title: "Página Corporativa",
    description: "Sitio institucional de una firma de ingeniería ficticia: servicios, metodología, equipo por áreas y contacto.",
    highlights: ["Navegación por secciones", "Servicios detallados", "Contacto corporativo"],
    icon: Building2,
    accent: "from-violet-400 to-electric-400",
  },
];
