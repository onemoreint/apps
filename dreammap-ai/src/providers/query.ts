import type { AIStyle, Dream, Orientation } from '../core/types';
import type { DesignTemplate } from '../core/templates';

/** Palabras de relleno que no aportan a la búsqueda visual. */
const STOPWORDS = new Set([
  'quiero', 'quisiera', 'deseo', 'sueño', 'sueno', 'con', 'tener', 'lograr', 'ser', 'estar', 'comprar', 'conseguir', 'mi', 'mis',
  'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'al', 'a', 'y', 'e', 'en', 'para', 'por', 'me', 'gustaría', 'gustaria',
  'propio', 'propia', 'nuevo', 'nueva', 'voy', 'poder', 'hacer', 'que', 'lo', 'muy', 'mas', 'más', 'año', 'este', 'esta',
]);

const ES_EN: Record<string, string> = {
  casa: 'house', hogar: 'home', moderna: 'modern', moderno: 'modern', piscina: 'pool', mar: 'ocean', playa: 'beach',
  montaña: 'mountain', montana: 'mountain', negro: 'black', negra: 'black', blanco: 'white', blanca: 'white', rojo: 'red', roja: 'red',
  azul: 'blue', carro: 'car', auto: 'car', coche: 'car', camioneta: 'suv', moto: 'motorcycle', viaje: 'travel', viajar: 'travel',
  familia: 'family', hijos: 'children', salud: 'healthy', ejercicio: 'fitness', correr: 'running', maratón: 'marathon', maraton: 'marathon',
  dinero: 'money', libertad: 'freedom', financiera: 'financial', libro: 'book', libros: 'books', graduación: 'graduation', graduacion: 'graduation',
  universidad: 'university', oficina: 'office', negocio: 'business', empresa: 'company', perro: 'dog', gato: 'cat', boda: 'wedding',
  amor: 'love', pareja: 'couple', meditar: 'meditation', paz: 'peace', jardín: 'garden', jardin: 'garden', cocina: 'kitchen',
  apartamento: 'apartment', finca: 'farm', lago: 'lake', ciudad: 'city', vista: 'view', lujo: 'luxury', yate: 'yacht', avión: 'airplane', avion: 'airplane',
  frente: 'oceanfront', escenario: 'stage', conferencia: 'conference', público: 'audience', publico: 'audience',
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"¡!¿?.,;:()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/** "Quiero un Toyota Fortuner negro 2027" → "toyota fortuner negro 2027" */
export function buildSearchQuery(dream: Pick<Dream, 'title' | 'description' | 'location'>): string {
  const base = dream.description?.trim() || dream.title;
  const t = tokens(base);
  if (dream.location) t.push(...tokens(dream.location));
  return Array.from(new Set(t)).slice(0, 8).join(' ');
}

/** Versión en inglés (los bancos de imágenes libres indexan mayoritariamente en inglés). */
export function toEnglishQuery(q: string): string {
  const out = q.split(/\s+/).map((w) => ES_EN[w] ?? w);
  return Array.from(new Set(out)).join(' ');
}

export const AI_STYLES: { id: AIStyle; label: string; descriptor: string }[] = [
  { id: 'fotorealista', label: 'Fotorealista', descriptor: 'Fotografía fotorrealista, luz natural, lente 35 mm, alto detalle' },
  { id: 'cinematografico', label: 'Cinematográfico', descriptor: 'Fotograma cinematográfico, iluminación dramática, profundidad de campo, color grading de película' },
  { id: 'editorial', label: 'Editorial', descriptor: 'Fotografía editorial de revista, composición limpia, tonos sofisticados' },
  { id: 'luxury', label: 'Luxury', descriptor: 'Estética de lujo, materiales nobles, tonos dorados y oscuros, elegancia' },
  { id: 'minimalista', label: 'Minimalista', descriptor: 'Composición minimalista, mucho espacio negativo, paleta sobria' },
  { id: 'inspiracional', label: 'Inspiracional', descriptor: 'Escena inspiradora y luminosa, hora dorada, sensación de logro y optimismo' },
];

const TEMPLATE_MOOD: Record<string, string> = {
  luxury: 'Paleta negro y dorado.',
  minimal: 'Paleta clara y neutra.',
  vibrante: 'Colores vivos y energéticos.',
  natural: 'Tonos tierra y verdes suaves.',
  editorial: 'Contraste alto, tonos cálidos.',
};

export function buildAIPrompt(opts: {
  dream: Pick<Dream, 'title' | 'description' | 'location' | 'category'>;
  style: AIStyle;
  template?: DesignTemplate;
  orientation: Orientation;
  preferences?: string;
}): string {
  const { dream, style, template, orientation, preferences } = opts;
  const s = AI_STYLES.find((x) => x.id === style)!;
  const subject = (dream.description || dream.title).replace(/^\s*(quiero|deseo|sueño con|quisiera)\s+(tener\s+|ser\s+|lograr\s+)?/i, '').trim();
  const parts = [
    `${s.descriptor}.`,
    `Escena: ${subject}${dream.location ? `, en ${dream.location}` : ''}.`,
    template ? TEMPLATE_MOOD[template.id] ?? '' : '',
    preferences ? `Preferencias: ${preferences}.` : '',
    `Composición ${orientation === 'horizontal' ? 'horizontal' : orientation === 'cuadrado' ? 'cuadrada' : 'vertical'}, sujeto centrado para recorte en tarjeta.`,
    'Sin texto, sin logotipos, sin marcas de agua.',
  ];
  return parts.filter(Boolean).join(' ');
}
