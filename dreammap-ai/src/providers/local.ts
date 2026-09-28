import type { ImageAsset, LocalImageProvider } from '../core/types';

/**
 * BIBLIOTECA LOCAL — ilustraciones vectoriales propias (sin derechos de terceros).
 * Funciona sin APIs externas. Las imágenes del usuario se agregan a la misma biblioteca.
 */

type Palette = { sky1: string; sky2: string; ground: string; accent: string; ink: string };

const PALETTES: Record<string, Palette> = {
  atardecer: { sky1: '#ff9a62', sky2: '#6a3fb5', ground: '#1f2a44', accent: '#ffd36e', ink: '#141a2e' },
  mañana: { sky1: '#bfe6ff', sky2: '#fef6e4', ground: '#2f6d62', accent: '#ffb347', ink: '#23413b' },
  noche: { sky1: '#0b1030', sky2: '#27306b', ground: '#0a0d20', accent: '#ffd98a', ink: '#05070f' },
  oro: { sky1: '#1a1510', sky2: '#3a2c18', ground: '#0e0b07', accent: '#d9b76a', ink: '#080603' },
};

const W = 1600, H = 1200;

function frame(p: Palette, body: string, title: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}" viewBox="0 0 ${W} ${H}">
<title>${title}</title>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky2}"/><stop offset="1" stop-color="${p.sky1}"/></linearGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e2a4"/><stop offset=".5" stop-color="#d9b76a"/><stop offset="1" stop-color="#8f6b2a"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${body}
</svg>`;
}

const sun = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="url(#sun)" opacity=".7"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff6d8"/>`;
const hills = (p: Palette) => `<path d="M0 860 C 300 760 520 820 800 780 C 1100 740 1300 800 1600 760 L1600 1200 L0 1200Z" fill="${p.ground}" opacity=".75"/><path d="M0 960 C 400 880 700 940 1000 900 C 1250 870 1450 900 1600 880 L1600 1200 L0 1200Z" fill="${p.ground}"/>`;

const SCENES: Record<string, (p: Palette) => string> = {
  hogar: (p) => `${sun(1180, 420, 90)}
<rect y="760" width="${W}" height="440" fill="${p.ground}"/>
<rect y="760" width="${W}" height="60" fill="${p.accent}" opacity=".25"/>
<g transform="translate(360 440)">
<rect x="0" y="120" width="620" height="260" fill="#f4f1ea"/><rect x="280" y="0" width="520" height="140" fill="#e8e2d6"/>
<rect x="-40" y="100" width="720" height="26" fill="${p.ink}"/><rect x="250" y="-20" width="590" height="24" fill="${p.ink}"/>
<rect x="40" y="170" width="220" height="170" fill="${p.sky2}" opacity=".85"/><rect x="300" y="170" width="280" height="170" fill="${p.accent}" opacity=".55"/>
<rect x="330" y="30" width="180" height="90" fill="${p.sky2}" opacity=".8"/><rect x="540" y="30" width="220" height="90" fill="${p.sky2}" opacity=".6"/>
</g>
<rect x="300" y="860" width="820" height="90" rx="10" fill="#3fc1d6"/><rect x="320" y="875" width="780" height="16" rx="8" fill="#fff" opacity=".45"/>`,
  viajes: (p) => `${sun(360, 360, 80)}
<g fill="#fff" opacity=".85"><ellipse cx="1150" cy="300" rx="160" ry="45"/><ellipse cx="1250" cy="270" rx="110" ry="50"/><ellipse cx="520" cy="560" rx="140" ry="38"/></g>
<path d="M0 900 L380 520 L620 760 L860 470 L1200 820 L1400 640 L1600 800 L1600 1200 L0 1200Z" fill="${p.ground}"/>
<path d="M860 470 L920 530 L880 540 L840 500Z M380 520 L430 570 L390 575Z" fill="#fff" opacity=".9"/>
<g transform="translate(980 420) rotate(-14)"><path d="M0 0 L300 0 Q340 0 340 20 Q340 40 300 40 L0 40 Z" fill="#fff"/><path d="M140 10 L60 -110 L100 -110 L210 10Z M140 30 L60 150 L100 150 L210 30Z M10 20 L-30 -40 L0 -40 L50 20Z" fill="#e7ecf5"/></g>
<path d="M980 470 C 800 520 600 520 420 470" stroke="#fff" stroke-width="6" stroke-dasharray="4 18" fill="none" opacity=".8"/>`,
  auto: (p) => `${sun(1250, 380, 70)}${hills(p)}
<path d="M0 1010 L1600 1010 L1600 1200 L0 1200Z" fill="${p.ink}"/><rect y="1090" width="${W}" height="10" fill="${p.accent}" opacity=".7"/>
<g transform="translate(360 760)">
<path d="M0 220 L20 150 Q40 110 120 100 L290 60 Q360 40 460 40 L640 40 Q720 40 780 100 L840 150 Q900 160 900 200 L900 240 L0 240Z" fill="${p.ink}"/>
<path d="M320 70 L460 60 L470 140 L260 140Z M500 60 L640 60 Q700 60 740 140 L510 140Z" fill="${p.sky2}" opacity=".7"/>
<circle cx="190" cy="240" r="72" fill="#111"/><circle cx="190" cy="240" r="34" fill="#9aa3b5"/><circle cx="700" cy="240" r="72" fill="#111"/><circle cx="700" cy="240" r="34" fill="#9aa3b5"/>
<rect x="860" y="170" width="40" height="20" rx="6" fill="${p.accent}"/>
</g>`,
  salud: (p) => `${sun(800, 560, 130)}${hills(p)}
<path d="M800 1200 C 780 1080 860 1020 820 900" stroke="${p.accent}" stroke-width="18" fill="none" stroke-linecap="round" opacity=".8"/>
<g transform="translate(740 600)" fill="${p.ink}"><circle cx="60" cy="0" r="34"/><path d="M50 40 L90 160 L150 220 L130 240 L60 180 L20 260 L-10 245 L30 150 L10 90 L-50 130 L-65 110 L20 40Z"/></g>`,
  familia: (p) => `${sun(800, 470, 110)}${hills(p)}
<g fill="${p.ink}" transform="translate(520 640)">
<circle cx="80" cy="0" r="46"/><path d="M30 55 H130 L150 330 H10Z"/>
<circle cx="560" cy="0" r="46"/><path d="M510 55 H610 L630 330 H490Z"/>
<circle cx="320" cy="120" r="34"/><path d="M285 162 H355 L370 330 H270Z"/>
<path d="M140 110 L285 190 M355 190 L500 110" stroke="${p.ink}" stroke-width="18" stroke-linecap="round"/>
</g>
<path d="M800 380 C 760 330 690 360 720 420 L800 490 L880 420 C 910 360 840 330 800 380Z" fill="${p.accent}" opacity=".9"/>`,
  dinero: (p) => `<rect width="${W}" height="${H}" fill="${p.ink}" opacity=".35"/>${sun(1200, 300, 60)}
${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<ellipse cx="520" cy="${980 - i * 46}" rx="180" ry="48" fill="url(#gold)" stroke="#6b4e1c" stroke-width="4"/>`).join('')}
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<ellipse cx="880" cy="${1000 - i * 46}" rx="180" ry="48" fill="url(#gold)" stroke="#6b4e1c" stroke-width="4"/>`).join('')}
${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="1220" cy="${1010 - i * 46}" rx="160" ry="44" fill="url(#gold)" stroke="#6b4e1c" stroke-width="4"/>`).join('')}
<path d="M200 1000 L520 700 L880 520 L1250 260" stroke="${p.accent}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M1250 260 L1180 270 M1250 260 L1235 330" stroke="${p.accent}" stroke-width="14" stroke-linecap="round"/>`,
  estudio: (p) => `${sun(1250, 330, 70)}
<rect y="900" width="${W}" height="300" fill="${p.ground}"/>
<g transform="translate(420 700)"><rect width="760" height="70" rx="8" fill="#b45309"/><rect y="-70" x="30" width="700" height="70" rx="8" fill="#1d4ed8"/><rect y="-140" x="60" width="640" height="70" rx="8" fill="#047857"/><rect y="-210" x="40" width="680" height="70" rx="8" fill="#9f1239"/></g>
<g transform="translate(800 300)"><path d="M-330 90 L0 -40 L330 90 L0 220Z" fill="${p.ink}"/><path d="M-190 150 V260 Q0 340 190 260 V150 L0 220Z" fill="${p.ink}"/><path d="M270 110 V260" stroke="${p.accent}" stroke-width="10"/><circle cx="270" cy="275" r="20" fill="${p.accent}"/></g>`,
  negocio: (p) => `${sun(1200, 360, 90)}
${[[80, 520], [220, 380], [360, 600], [480, 300], [640, 460], [780, 250], [940, 420], [1080, 560], [1220, 330], [1380, 480]].map(([x, y]) => `<rect x="${x}" y="${y}" width="130" height="${1200 - y}" fill="${p.ink}" opacity=".9"/>${Array.from({ length: Math.floor((1150 - y) / 70) }, (_, k) => `<rect x="${x + 22}" y="${y + 30 + k * 70}" width="30" height="34" fill="${p.accent}" opacity="${(k + x) % 3 ? '.25' : '.8'}"/><rect x="${x + 78}" y="${y + 30 + k * 70}" width="30" height="34" fill="${p.accent}" opacity="${(k * x) % 4 ? '.25' : '.8'}"/>`).join('')}`).join('')}
<g transform="translate(1180 150) rotate(35)"><path d="M0 -120 Q50 -60 50 60 L-50 60 Q-50 -60 0 -120Z" fill="#fff"/><circle cy="-20" r="20" fill="${p.sky2}"/><path d="M-50 20 L-90 90 L-50 70Z M50 20 L90 90 L50 70Z" fill="${p.accent}"/><path d="M-30 70 Q0 190 30 70Z" fill="#ff7a45"/></g>`,
  amor: (p) => `${sun(800, 600, 140)}
${[[800, 560, 1.6], [420, 380, 0.7], [1180, 330, 0.9], [300, 820, 0.5], [1320, 800, 0.6]].map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -40 C -60 -130 -200 -80 -170 30 C -150 100 -60 150 0 210 C 60 150 150 100 170 30 C 200 -80 60 -130 0 -40Z" fill="${p.accent}" opacity="${s > 1 ? 1 : 0.7}"/>`).join('')}
${hills(p)}`,
  espiritual: (p) => `${sun(800, 420, 110)}
<rect y="820" width="${W}" height="380" fill="${p.ground}"/><rect y="820" width="${W}" height="380" fill="url(#sky)" opacity=".25"/>
<g transform="translate(800 800)" fill="${p.accent}"><path d="M0 -10 C -60 -120 -20 -220 0 -250 C 20 -220 60 -120 0 -10Z"/><path d="M0 -10 C -120 -60 -190 -170 -170 -200 C -110 -190 -30 -110 0 -10Z" opacity=".85"/><path d="M0 -10 C 120 -60 190 -170 170 -200 C 110 -190 30 -110 0 -10Z" opacity=".85"/><path d="M0 -10 C -170 -10 -270 -90 -280 -120 C -200 -130 -70 -80 0 -10Z" opacity=".6"/><path d="M0 -10 C 170 -10 270 -90 280 -120 C 200 -130 70 -80 0 -10Z" opacity=".6"/></g>
<ellipse cx="800" cy="830" rx="420" ry="16" fill="#fff" opacity=".25"/>`,
};

const CATALOG: { key: string; category: string; title: string; tags: string[]; palettes: string[] }[] = [
  { key: 'hogar', category: 'hogar', title: 'Casa moderna con piscina', tags: ['casa', 'hogar', 'piscina', 'moderna', 'mar', 'vivienda'], palettes: ['atardecer', 'mañana'] },
  { key: 'viajes', category: 'viajes', title: 'Viajar por el mundo', tags: ['viaje', 'avión', 'montañas', 'aventura', 'turismo'], palettes: ['mañana', 'atardecer'] },
  { key: 'auto', category: 'auto', title: 'Mi carro soñado', tags: ['carro', 'auto', 'camioneta', 'vehículo', 'carretera'], palettes: ['atardecer', 'noche'] },
  { key: 'salud', category: 'salud', title: 'Salud y energía', tags: ['salud', 'correr', 'ejercicio', 'bienestar', 'deporte'], palettes: ['mañana', 'atardecer'] },
  { key: 'familia', category: 'familia', title: 'Familia unida', tags: ['familia', 'hijos', 'amor', 'hogar', 'unión'], palettes: ['atardecer', 'mañana'] },
  { key: 'dinero', category: 'dinero', title: 'Libertad financiera', tags: ['dinero', 'ahorro', 'inversión', 'finanzas', 'riqueza'], palettes: ['oro', 'noche'] },
  { key: 'estudio', category: 'estudio', title: 'Graduarme', tags: ['estudio', 'graduación', 'universidad', 'libros', 'aprender'], palettes: ['mañana', 'noche'] },
  { key: 'negocio', category: 'negocio', title: 'Mi empresa crece', tags: ['negocio', 'empresa', 'emprender', 'ciudad', 'éxito'], palettes: ['noche', 'atardecer'] },
  { key: 'amor', category: 'amor', title: 'Amor y pareja', tags: ['amor', 'pareja', 'corazón', 'relación', 'boda'], palettes: ['atardecer', 'noche'] },
  { key: 'espiritual', category: 'espiritual', title: 'Paz interior', tags: ['paz', 'meditación', 'espiritual', 'calma', 'loto'], palettes: ['noche', 'mañana'] },
];

export const LIBRARY_CATEGORIES: { id: string; label: string }[] = [
  { id: 'hogar', label: 'Hogar' }, { id: 'viajes', label: 'Viajes' }, { id: 'auto', label: 'Auto' }, { id: 'salud', label: 'Salud' },
  { id: 'familia', label: 'Familia' }, { id: 'dinero', label: 'Dinero' }, { id: 'estudio', label: 'Estudio' }, { id: 'negocio', label: 'Negocio' },
  { id: 'amor', label: 'Amor' }, { id: 'espiritual', label: 'Espiritual' }, { id: 'otro', label: 'Otro' },
];

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function builtInAssets(): ImageAsset[] {
  const out: ImageAsset[] = [];
  for (const c of CATALOG) {
    c.palettes.forEach((pn, i) => {
      const svg = frame(PALETTES[pn], SCENES[c.key](PALETTES[pn]), c.title);
      out.push({
        id: `lib-${c.key}-${i}`,
        source: 'library',
        src: svgToDataUrl(svg),
        title: i === 0 ? c.title : `${c.title} · ${pn}`,
        width: W * 3,
        height: H * 3,
        vector: true,
        tags: c.tags,
        category: c.category,
        license: { name: 'Ilustración propia de DREAMMAP AI', commercialUse: true },
        createdAt: 0,
      });
    });
  }
  return out;
}

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Implementación en memoria; se sincroniza con IndexedDB desde el store. */
export class InMemoryLibrary implements LocalImageProvider {
  private items: ImageAsset[];
  constructor(initial: ImageAsset[]) { this.items = initial; }
  list() { return this.items; }
  categories() { return LIBRARY_CATEGORIES.map((c) => c.id); }
  add(a: ImageAsset) { this.items = [a, ...this.items.filter((x) => x.id !== a.id)]; }
  remove(id: string) { this.items = this.items.filter((x) => x.id !== id); }
  search(query: string, category?: string) {
    const q = norm(query).split(/\s+/).filter(Boolean);
    return this.items.filter((a) => {
      if (category && category !== 'todas' && category !== 'mias' && a.category !== category) return false;
      if (category === 'mias' && a.source === 'library') return false;
      if (!q.length) return true;
      const hay = norm([a.title, ...(a.tags ?? []), a.category ?? ''].join(' '));
      return q.some((w) => hay.includes(w));
    });
  }
}
