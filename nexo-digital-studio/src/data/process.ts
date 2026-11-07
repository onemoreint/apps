import type { LucideIcon } from "lucide-react";
import { Search, Compass, PenTool, Code2, Send, LifeBuoy } from "lucide-react";

export const processSteps: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Descubrimiento", icon: Search, text: "Conversamos sobre tu negocio, tus clientes y lo que necesitas lograr. Reunimos textos, fotos y referencias." },
  { title: "Estrategia", icon: Compass, text: "Definimos estructura, mensajes clave y el recorrido que hará tu cliente hasta contactarte o comprar." },
  { title: "Diseño", icon: PenTool, text: "Creamos la propuesta visual alineada con tu marca y la ajustamos contigo antes de programar." },
  { title: "Desarrollo", icon: Code2, text: "Construimos la solución, la optimizamos para móviles y probamos cada botón, formulario y pedido." },
  { title: "Publicación", icon: Send, text: "Publicamos en tu dominio o enlace, configuramos WhatsApp, metadatos y te entregamos accesos." },
  { title: "Acompañamiento", icon: LifeBuoy, text: "Te acompañamos en los primeros ajustes y te explicamos cómo actualizar tu información." },
];
