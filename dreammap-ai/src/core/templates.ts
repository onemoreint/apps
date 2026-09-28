/** CAPA DE DISEÑO — plantillas independientes del contenido y del formato. */

export type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  background: { type: 'solid'; color: string } | { type: 'gradient'; from: string; to: string; angle: number };
  titleColor: string;
  subtitleColor: string;
  accent: string;
  titleFont: string;
  bodyFont: string;
  titleWeight: number;
  titleUppercase: boolean;
  card: {
    radius: number; // fracción del lado corto de la celda
    border?: { color: string; width: number }; // width: fracción del lado corto del lienzo
    shadow: boolean;
    caption: 'overlay' | 'below' | 'none';
    captionColor: string;
    captionBg: string;
    captionFont: string;
  };
  /** Relación de aspecto preferida para cada celda (ancho/alto). */
  cellAspect: number;
  gapFrac: number;
  headerAlign: 'center' | 'left';
  ornament: 'none' | 'lines' | 'dots';
};

export const TEMPLATES: DesignTemplate[] = [
  {
    id: 'luxury', name: 'Luxury', description: 'Negro profundo y dorado, elegante',
    background: { type: 'gradient', from: '#15130f', to: '#050505', angle: 160 },
    titleColor: '#d9b76a', subtitleColor: '#bfb3a0', accent: '#d9b76a',
    titleFont: 'Playfair Display', bodyFont: 'Inter', titleWeight: 700, titleUppercase: true,
    card: { radius: 0.02, border: { color: '#d9b76a', width: 0.0016 }, shadow: false, caption: 'overlay', captionColor: '#f3e7c9', captionBg: 'rgba(0,0,0,0.55)', captionFont: 'Playfair Display' },
    cellAspect: 0.85, gapFrac: 0.018, headerAlign: 'center', ornament: 'lines',
  },
  {
    id: 'minimal', name: 'Minimalista', description: 'Blanco, aire y tipografía limpia',
    background: { type: 'solid', color: '#fafaf8' },
    titleColor: '#161616', subtitleColor: '#6b6b6b', accent: '#161616',
    titleFont: 'Inter', bodyFont: 'Inter', titleWeight: 700, titleUppercase: false,
    card: { radius: 0.035, shadow: false, caption: 'below', captionColor: '#262626', captionBg: 'transparent', captionFont: 'Inter' },
    cellAspect: 1, gapFrac: 0.028, headerAlign: 'left', ornament: 'none',
  },
  {
    id: 'vibrante', name: 'Vibrante', description: 'Degradado lleno de energía',
    background: { type: 'gradient', from: '#5b2bd6', to: '#ff7a45', angle: 135 },
    titleColor: '#ffffff', subtitleColor: 'rgba(255,255,255,0.85)', accent: '#ffe066',
    titleFont: 'Montserrat', bodyFont: 'Montserrat', titleWeight: 800, titleUppercase: true,
    card: { radius: 0.08, shadow: true, caption: 'overlay', captionColor: '#ffffff', captionBg: 'rgba(20,10,40,0.45)', captionFont: 'Montserrat' },
    cellAspect: 0.9, gapFrac: 0.022, headerAlign: 'center', ornament: 'dots',
  },
  {
    id: 'natural', name: 'Natural', description: 'Tonos tierra, calma y equilibrio',
    background: { type: 'solid', color: '#efe8dc' },
    titleColor: '#3f4a36', subtitleColor: '#7a6f5d', accent: '#8a9a6b',
    titleFont: 'Cormorant Garamond', bodyFont: 'Inter', titleWeight: 600, titleUppercase: false,
    card: { radius: 0.5, shadow: false, caption: 'below', captionColor: '#3f4a36', captionBg: 'transparent', captionFont: 'Cormorant Garamond' },
    cellAspect: 0.8, gapFrac: 0.03, headerAlign: 'center', ornament: 'none',
  },
  {
    id: 'editorial', name: 'Editorial', description: 'Estilo revista, contraste y ritmo',
    background: { type: 'solid', color: '#f3efe7' },
    titleColor: '#111111', subtitleColor: '#444444', accent: '#c2410c',
    titleFont: 'DM Serif Display', bodyFont: 'Inter', titleWeight: 400, titleUppercase: false,
    card: { radius: 0, border: { color: '#111111', width: 0.0012 }, shadow: false, caption: 'below', captionColor: '#111111', captionBg: 'transparent', captionFont: 'DM Serif Display' },
    cellAspect: 1.2, gapFrac: 0.02, headerAlign: 'left', ornament: 'lines',
  },
];

export function getTemplate(id: string): DesignTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export const FONT_FAMILIES = ['Playfair Display', 'Inter', 'Montserrat', 'Cormorant Garamond', 'DM Serif Display'];
