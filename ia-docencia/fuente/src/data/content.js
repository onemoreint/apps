import { Accessibility, ClipboardList, Gauge, Lightbulb, FileText, Puzzle, MessagesSquare, SlidersHorizontal, Route } from "lucide-react";
import chatgpt from "../assets/logos/chatgpt.svg";
import gemini from "../assets/logos/gemini.svg";
import canva from "../assets/logos/canva.svg";
import notebooklm from "../assets/logos/notebooklm.svg";
import { DATE_FAQ } from "../config/site";

export const benefits = [
  { icon: ClipboardList, title: "Planificación", text: "Menos tiempo creando documentos desde cero." },
  { icon: Lightbulb, title: "Creatividad", text: "Nuevas ideas para actividades y experiencias educativas." },
  { icon: Accessibility, title: "Inclusión", text: "Propuestas adaptables a diferentes necesidades y ritmos de aprendizaje." },
  { icon: Gauge, title: "Productividad", text: "Organización y optimización del trabajo docente." },
];

export const modules = [
  { n: 1, title: "Descubriendo la IA", minutes: 35, color: "#00C8FF", topics: ["Qué es la inteligencia artificial.", "IA generativa aplicada a la educación.", "ChatGPT y Gemini.", "Primeras interacciones prácticas."] },
  { n: 2, title: "IA para la planificación pedagógica", minutes: 65, color: "#1E9BFF", topics: ["Diseño de planificaciones.", "Objetivos y competencias.", "Actividades de inicio, desarrollo y cierre.", "Adaptaciones y estrategias individualizadas."] },
  { n: 3, title: "Creación de recursos educativos", minutes: 55, color: "#1769FF", topics: ["Fichas didácticas.", "Cuentos y actividades.", "Materiales visuales.", "Presentaciones e infografías.", "Evaluaciones."] },
  { n: 4, title: "IA para mejorar el rendimiento docente", minutes: 45, color: "#5A57FF", topics: ["Informes pedagógicos.", "Registros de seguimiento.", "Automatización de tareas.", "Organización de contenidos.", "Optimización del tiempo."] },
  { n: 5, title: "Taller integrador", minutes: 40, color: "#8747FF", topics: ["Resolución de casos prácticos.", "Trabajo colaborativo.", "Presentación de resultados.", "Aplicación inmediata en el aula."] },
];

export const tools = [
  { name: "ChatGPT", logo: chatgpt, text: "Redacta borradores de planificaciones, propone actividades y adapta un mismo contenido a distintos niveles." },
  { name: "Google Gemini", logo: gemini, text: "Ayuda a investigar un tema, explicarlo con otras palabras y generar ideas para tus clases." },
  { name: "Canva", logo: canva, text: "Convierte tus ideas en fichas, presentaciones e infografías listas para imprimir o proyectar." },
  { name: "NotebookLM", logo: notebooklm, text: "Trabaja sobre tus propios documentos: los resume y responde preguntas a partir de esas fuentes." },
];

export const specialAreas = [
  { icon: SlidersHorizontal, text: "Adaptación de actividades según necesidades individuales." },
  { icon: Puzzle, text: "Creación de materiales accesibles." },
  { icon: Accessibility, text: "Diseño de experiencias inclusivas." },
  { icon: Route, text: "Apoyo a la planificación y seguimiento pedagógico." },
];

export const products = [
  { kind: "plan", icon: FileText, title: "Una planificación pedagógica", text: "Generada con asistencia de IA y revisada con tu criterio." },
  { kind: "ficha", icon: Puzzle, title: "Un recurso didáctico personalizado", text: "Pensado para tus estudiantes y su forma de aprender." },
  { kind: "prompts", icon: MessagesSquare, title: "Una colección de prompts", text: "Instrucciones listas para mejorar tu trabajo cotidiano." },
];

export const steps = [
  { n: 1, text: "Haz clic en el botón y únete al grupo de WhatsApp." },
  { n: 2, text: "Conoce los detalles y participa en la consulta para definir el día de realización." },
  { n: 3, text: "Confirma tu participación y prepárate para vivir cuatro horas de aprendizaje práctico." },
];

export const faqs = [
  { q: "¿Necesito conocimientos previos de inteligencia artificial?", a: "No. El curso está pensado para docentes que están comenzando a descubrir estas herramientas." },
  { q: "¿Está dirigido solamente a docentes de Educación Especial?", a: "Está especialmente orientado a docentes de Educación Especial y también a docentes de Educación Inicial con experiencia en esta modalidad." },
  { q: "¿Cuánto dura?", a: "Cuatro horas de formación intensiva y práctica." },
  { q: "¿Cuándo se realizará?", a: DATE_FAQ },
  { q: "¿Dónde se realizará?", a: "La modalidad y los detalles de participación se anunciarán en el grupo." },
  { q: "¿Necesito computadora?", a: "Se recomienda disponer de un computador o teléfono inteligente con conexión a Internet." },
  { q: "¿Tiene algún costo?", a: "Los detalles correspondientes se comunicarán a través del grupo de WhatsApp." },
  { q: "¿Recibiré certificado?", a: "Los detalles sobre certificación, si aplica, serán comunicados por los organizadores." },
];
