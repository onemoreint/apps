/**
 * CAPA DE DISEÑO — plantillas independientes del contenido y del formato.
 *
 * Cada plantilla define algo más que colores: distribución (cuadrícula, bento,
 * collage, mosaico), forma de cada foto (arco, círculo, polaroid, película…),
 * estilo de cabecera y decoraciones (cinta, chinches, destellos, textura…).
 * Estilos basados en las estéticas de mapas de sueños más populares en Pinterest.
 */

export type LayoutStyle = 'grid' | 'bento' | 'collage' | 'masonry';
export type CardShape = 'rect' | 'arch' | 'circle' | 'pill' | 'frame' | 'film';
export type CaptionMode = 'overlay' | 'below' | 'inside' | 'none';
export type HeaderStyle = 'classic' | 'script' | 'year';
export type Decor = 'tape' | 'pins' | 'sparkles' | 'stars' | 'grain' | 'words' | 'dots' | 'lines' | 'deco';
export type WordStyle = 'sticker' | 'note' | 'label';

export type Background =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }
  | { type: 'aura'; base: string; blobs: string[] }
  | { type: 'texture'; kind: 'paper' | 'cork' | 'linen'; base: string; ink: string };

export type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  /** Estética de referencia (para el usuario). */
  mood: string;
  background: Background;
  titleColor: string;
  subtitleColor: string;
  accent: string;
  titleFont: string;
  bodyFont: string;
  titleWeight: number;
  titleUppercase: boolean;
  titleItalic?: boolean;
  header: HeaderStyle;
  layout: LayoutStyle;
  card: {
    shape: CardShape;
    radius: number; // fracción del lado corto de la foto
    border?: { color: string; width: number }; // width: fracción del lado corto del lienzo
    shadow: boolean;
    caption: CaptionMode;
    captionColor: string;
    captionBg: string;
    captionFont: string;
    captionWeight: number;
    captionUppercase?: boolean;
    captionScale?: number;
    /** Marco (polaroid, impresión, tarjeta de color). */
    frameColors?: string[];
    framePad?: number; // fracción del lado corto
    captionFrac?: number; // alto del pie dentro del marco
    imageFilter?: string;
  };
  /** Rotación máxima en grados (collage). */
  tilt?: number;
  cellAspect: number;
  gapFrac: number;
  /** Aire extra alrededor del contenido (fracción del lado corto). */
  extraPad?: number;
  headerAlign: 'center' | 'left';
  decor: Decor[];
  wordStyle?: WordStyle;
  wordColors?: string[];
  tapeColors?: string[];
  pinColors?: string[];
};

export const TEMPLATES: DesignTemplate[] = [
  {
    id: 'scrapbook', name: 'Scrapbook Polaroid', mood: 'Collage con polaroids', description: 'Papel kraft, fotos polaroid inclinadas, cinta washi y frases escritas a mano',
    background: { type: 'texture', kind: 'paper', base: '#d9c6a5', ink: '#b59d78' },
    titleColor: '#2f2a24', subtitleColor: '#5b4f41', accent: '#c65f4a',
    titleFont: 'Caveat', bodyFont: 'Caveat', titleWeight: 700, titleUppercase: false, header: 'script', layout: 'collage',
    card: { shape: 'frame', radius: 0.004, shadow: true, caption: 'inside', captionColor: '#2f2a24', captionBg: 'transparent', captionFont: 'Caveat', captionWeight: 600, captionScale: 1.35, frameColors: ['#fbfaf6'], framePad: 0.055, captionFrac: 0.2 },
    tilt: 5, cellAspect: 0.86, gapFrac: 0.03, headerAlign: 'center',
    decor: ['tape', 'words', 'grain'], wordStyle: 'label', wordColors: ['#2f2a24'],
    tapeColors: ['rgba(241,196,160,0.78)', 'rgba(170,205,196,0.78)', 'rgba(236,178,190,0.78)', 'rgba(245,226,150,0.8)'],
  },
  {
    id: 'corcho', name: 'Tablero de corcho', mood: 'Cork board', description: 'Corcho natural, fotos impresas con chinches y notas adhesivas',
    background: { type: 'texture', kind: 'cork', base: '#b88a5a', ink: '#7e5a34' },
    titleColor: '#1f1a14', subtitleColor: '#2f261c', accent: '#d64541',
    titleFont: 'Caveat', bodyFont: 'Caveat', titleWeight: 700, titleUppercase: false, header: 'script', layout: 'collage',
    card: { shape: 'frame', radius: 0, shadow: true, caption: 'inside', captionColor: '#1f1a14', captionBg: 'transparent', captionFont: 'Caveat', captionWeight: 700, captionScale: 1.25, frameColors: ['#ffffff'], framePad: 0.035, captionFrac: 0.16 },
    tilt: 3, cellAspect: 1, gapFrac: 0.035, headerAlign: 'center',
    decor: ['pins', 'words'], wordStyle: 'note', wordColors: ['#fff27a', '#ffc2d6', '#b5f0c6', '#aee2ff'],
    pinColors: ['#d64541', '#2e86de', '#27ae60', '#f39c12', '#8e44ad'],
  },
  {
    id: 'boho', name: 'Boho de arcos', mood: 'Earthy boho', description: 'Ventanas en arco, arena, arcilla y oliva, con letra cursiva',
    background: { type: 'texture', kind: 'linen', base: '#ebe1d2', ink: '#d8cab4' },
    titleColor: '#5a3b2e', subtitleColor: '#7d6a58', accent: '#b9674b',
    titleFont: 'Fraunces', bodyFont: 'Inter', titleWeight: 500, titleUppercase: false, titleItalic: true, header: 'classic', layout: 'grid',
    card: { shape: 'arch', radius: 0.03, shadow: false, caption: 'below', captionColor: '#5a3b2e', captionBg: 'transparent', captionFont: 'Fraunces', captionWeight: 500, captionScale: 1.05 },
    cellAspect: 0.72, gapFrac: 0.035, headerAlign: 'center',
    decor: ['sparkles'], wordColors: ['#b9674b'],
  },
  {
    id: 'luxury', name: 'Luxury Deco', mood: 'Quiet luxury · Art Déco', description: 'Negro, oro y marfil con doble filete dorado y tipografía Bodoni',
    background: { type: 'gradient', from: '#16140f', to: '#050505', angle: 160 },
    titleColor: '#d9b76a', subtitleColor: '#c9bda6', accent: '#d9b76a',
    titleFont: 'Bodoni Moda', bodyFont: 'Inter', titleWeight: 600, titleUppercase: true, header: 'classic', layout: 'grid',
    card: { shape: 'arch', radius: 0.01, border: { color: '#d9b76a', width: 0.0018 }, shadow: false, caption: 'below', captionColor: '#efe3c4', captionBg: 'transparent', captionFont: 'Bodoni Moda', captionWeight: 500, captionUppercase: true, captionScale: 0.85 },
    cellAspect: 0.78, gapFrac: 0.026, extraPad: 0.03, headerAlign: 'center',
    decor: ['deco'],
  },
  {
    id: 'editorial', name: 'Editorial archivo', mood: 'Editorial en blanco y negro', description: 'Revista en blanco y negro, foto protagonista y año gigante',
    background: { type: 'solid', color: '#f2f0eb' },
    titleColor: '#0f0f0f', subtitleColor: '#3a3a3a', accent: '#d7261e',
    titleFont: 'DM Serif Display', bodyFont: 'Inter', titleWeight: 400, titleUppercase: false, header: 'year', layout: 'bento',
    card: { shape: 'rect', radius: 0, shadow: false, caption: 'below', captionColor: '#0f0f0f', captionBg: 'transparent', captionFont: 'DM Mono', captionWeight: 500, captionUppercase: true, captionScale: 0.85, imageFilter: 'grayscale(1) contrast(1.12)' },
    cellAspect: 1.1, gapFrac: 0.018, headerAlign: 'left',
    decor: ['grain', 'lines'],
  },
  {
    id: 'aura', name: 'Aura Y2K', mood: 'Aura · Y2K', description: 'Degradado aura pastel, fotos en píldora y destellos',
    background: { type: 'aura', base: '#f3eefb', blobs: ['#b9c8ff', '#ffc4de', '#c9f1ff', '#e2c9ff', '#fff0b8'] },
    titleColor: '#1d1b3a', subtitleColor: '#4a4670', accent: '#7a5cff',
    titleFont: 'Syne', bodyFont: 'Syne', titleWeight: 800, titleUppercase: false, header: 'classic', layout: 'masonry',
    card: { shape: 'pill', radius: 0.5, shadow: false, caption: 'below', captionColor: '#1d1b3a', captionBg: 'transparent', captionFont: 'Syne', captionWeight: 700, captionScale: 0.9 },
    cellAspect: 0.7, gapFrac: 0.028, headerAlign: 'left',
    decor: ['sparkles', 'words'], wordStyle: 'sticker', wordColors: ['#ffffff'],
  },
  {
    id: 'celestial', name: 'Celestial', mood: 'Celestial', description: 'Azul noche, fotos en círculo, estrellas y luna',
    background: { type: 'gradient', from: '#1b2250', to: '#070a1f', angle: 180 },
    titleColor: '#e9ecff', subtitleColor: '#aab2dd', accent: '#c9d2ff',
    titleFont: 'Cormorant Garamond', bodyFont: 'Inter', titleWeight: 600, titleUppercase: true, header: 'classic', layout: 'grid',
    card: { shape: 'circle', radius: 0.5, border: { color: '#c9d2ff', width: 0.0014 }, shadow: false, caption: 'below', captionColor: '#e9ecff', captionBg: 'transparent', captionFont: 'Cormorant Garamond', captionWeight: 600, captionScale: 1.05 },
    cellAspect: 0.85, gapFrac: 0.03, headerAlign: 'center',
    decor: ['stars'],
  },
  {
    id: 'pelicula', name: 'Película 35 mm', mood: 'Film aesthetic', description: 'Fotogramas con perforaciones, grano y tipografía de máquina',
    background: { type: 'solid', color: '#171513' },
    titleColor: '#f4efe6', subtitleColor: '#a9a196', accent: '#f0a33a',
    titleFont: 'DM Serif Display', bodyFont: 'DM Mono', titleWeight: 400, titleUppercase: false, header: 'year', layout: 'grid',
    card: { shape: 'film', radius: 0.01, shadow: false, caption: 'overlay', captionColor: '#f4efe6', captionBg: 'rgba(0,0,0,0.6)', captionFont: 'DM Mono', captionWeight: 500, captionUppercase: true, captionScale: 0.75, frameColors: ['#050505'] },
    cellAspect: 1.05, gapFrac: 0.02, headerAlign: 'left',
    decor: ['grain'],
  },
  {
    id: 'dopamina', name: 'Dopamina', mood: 'Dopamine · Pinterest board', description: 'Mosaico tipo Pinterest con tarjetas de colores vivos',
    background: { type: 'solid', color: '#fff8ec' },
    titleColor: '#141414', subtitleColor: '#3b3b3b', accent: '#ff5a36',
    titleFont: 'Syne', bodyFont: 'Syne', titleWeight: 800, titleUppercase: true, header: 'classic', layout: 'masonry',
    card: { shape: 'frame', radius: 0.06, shadow: false, caption: 'inside', captionColor: '#141414', captionBg: 'transparent', captionFont: 'Syne', captionWeight: 700, captionScale: 1, frameColors: ['#ffd23f', '#3bceac', '#ee4266', '#7aa5ff', '#ff9f1c', '#c77dff'], framePad: 0.045, captionFrac: 0.17 },
    cellAspect: 0.78, gapFrac: 0.026, headerAlign: 'left',
    decor: ['words'], wordStyle: 'sticker', wordColors: ['#141414'],
  },
  {
    id: 'minimal', name: 'Minimalista suave', mood: 'Soft minimalist', description: 'Marfil, rubor y mucho aire; tipografía limpia',
    background: { type: 'solid', color: '#f7f3ee' },
    titleColor: '#2b2622', subtitleColor: '#8a7f76', accent: '#d9a79a',
    titleFont: 'Fraunces', bodyFont: 'Inter', titleWeight: 400, titleUppercase: false, header: 'classic', layout: 'grid',
    card: { shape: 'rect', radius: 0.03, shadow: false, caption: 'below', captionColor: '#2b2622', captionBg: 'transparent', captionFont: 'Inter', captionWeight: 500, captionScale: 0.8 },
    cellAspect: 0.9, gapFrac: 0.04, extraPad: 0.02, headerAlign: 'left',
    decor: [],
  },
];

const ALIASES: Record<string, string> = { natural: 'boho', vibrante: 'dopamina' };

export function getTemplate(id: string): DesignTemplate {
  const real = ALIASES[id] ?? id;
  return TEMPLATES.find((t) => t.id === real) ?? TEMPLATES[0];
}

export const FONT_FAMILIES = ['Caveat', 'Fraunces', 'Bodoni Moda', 'DM Serif Display', 'DM Mono', 'Syne', 'Cormorant Garamond', 'Inter'];
