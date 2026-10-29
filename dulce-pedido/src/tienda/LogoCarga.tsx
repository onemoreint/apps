/**
 * Insignia animada que se muestra mientras carga la tienda o el panel.
 * Diseño original de Dulce Pedido: aro con cinta para el nombre del negocio y
 * una torta con vela al centro. Si la tienda ya tiene logo propio (guardado de
 * una visita anterior), se muestra ese logo.
 */
import { useId } from 'react';

const CHOCO = '#5a3222';
const CHOCO_2 = '#7a4a33';
const ROSA = '#e46f8c';
const ROSA_SUAVE = '#f6c9d2';
const CREMA = '#fff8ef';
const MIEL = '#f2b33d';
const TERRA = '#c4673f';

const clave = (slug: string) => `dulce-pedido:${slug}:marca`;

/** Guarda nombre y logo para la próxima pantalla de carga. */
export function recordarMarca(slug: string, nombre: string, logo: string): void {
  try {
    localStorage.setItem(clave(slug), JSON.stringify({ nombre, logo }));
  } catch {
    /* sin almacenamiento */
  }
}

function marcaGuardada(slug: string): { nombre: string; logo: string } | null {
  try {
    const v = localStorage.getItem(clave(slug));
    return v ? (JSON.parse(v) as { nombre: string; logo: string }) : null;
  } catch {
    return null;
  }
}

export function InsigniaSvg({ nombre, className = '' }: { nombre: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  const texto = nombre.length > 18 ? nombre.slice(0, 17) + '…' : nombre;
  const tam = texto.length > 14 ? 17 : texto.length > 10 ? 21 : texto.length > 7 ? 24 : 28;
  // Si aun así no cabe en la cinta, se comprime al ancho disponible.
  const ancho = texto.length * tam * 0.56;
  const ajuste = ancho > 136 ? { textLength: 136, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={nombre}>
      <defs>
        <radialGradient id={`f${id}`} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#fffdf9" />
          <stop offset="1" stopColor="#fbeee6" />
        </radialGradient>
        <path id={`arco${id}`} d="M 52 120 A 68 68 0 0 1 188 120" />
      </defs>

      {/* Aros */}
      <circle cx="120" cy="116" r="98" fill={CHOCO} />
      <circle cx="120" cy="116" r="90" fill={`url(#f${id})`} />
      <circle cx="120" cy="116" r="83" fill="none" stroke={ROSA} strokeWidth="2.5" />
      <circle cx="120" cy="116" r="78" fill="none" stroke={ROSA_SUAVE} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />

      {/* Texto curvo superior */}
      <text fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" letterSpacing="2.4" fill={TERRA}>
        <textPath href={`#arco${id}`} startOffset="50%" textAnchor="middle">
          REPOSTERÍA CASERA
        </textPath>
      </text>

      {/* Destellos */}
      <g className="dp-destello" fill={MIEL}>
        <path d="M74 102 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
        <path d="M166 96 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
      </g>
      <g fill={ROSA}>
        <path d="M181 118 c0 -4 6 -4 6 0 c0 -4 6 -4 6 0 c0 5 -6 8 -6 9 c0 -1 -6 -4 -6 -9z" />
        <path d="M48 124 c0 -3 5 -3 5 0 c0 -3 5 -3 5 0 c0 4 -5 6 -5 7 c0 -1 -5 -3 -5 -7z" />
      </g>

      {/* Torta de dos pisos con vela */}
      <g transform="translate(120 119) scale(1.12) translate(-120 -118)">
      <g className="dp-torta">
        <ellipse cx="120" cy="150" rx="46" ry="6" fill="#ead8cb" />
        <rect x="80" y="118" width="80" height="32" rx="6" fill={CHOCO_2} />
        <rect x="80" y="133" width="80" height="4" fill={MIEL} opacity="0.9" />
        <path
          d="M80 124 C80 114 160 114 160 124 V128 C155 134 151 126 146 131 C141 136 137 126 132 131 C127 136 123 126 118 131 C113 136 109 126 104 131 C99 136 95 126 90 131 C86 134 82 130 80 128 Z"
          fill={ROSA}
        />
        <rect x="94" y="96" width="52" height="24" rx="5" fill={CHOCO} />
        <path d="M94 101 C94 93 146 93 146 101 V105 C141 110 137 102 132 107 C127 112 123 102 118 107 C113 112 109 102 104 107 C99 111 96 105 94 106 Z" fill={CREMA} />
        <circle cx="108" cy="98" r="3" fill="#c0392b" />
        <circle cx="132" cy="98" r="3" fill="#c0392b" />
        <rect x="117.5" y="83" width="5" height="12" rx="2.5" fill={CREMA} stroke={ROSA} strokeWidth="1.5" />
        <path className="dp-llama" d="M120 69 C125 75 125 80 120 82 C115 80 115 75 120 69 Z" fill={MIEL} />
      </g>
      </g>

      {/* Cinta con el nombre */}
      <path d="M22 168 L46 160 L46 196 L22 204 L32 186 Z" fill={ROSA} />
      <path d="M218 168 L194 160 L194 196 L218 204 L208 186 Z" fill={ROSA} />
      <path d="M46 160 L58 172 L46 172 Z M194 160 L182 172 L194 172 Z" fill="#9e2f4d" />
      <path d="M40 156 Q120 142 200 156 L200 190 Q120 176 40 190 Z" fill={CREMA} stroke={CHOCO} strokeWidth="4" strokeLinejoin="round" />
      <text
        x="120"
        y="176"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize={tam}
        fill={CHOCO}
        {...ajuste}
      >
        {texto}
      </text>

      {/* Estrellas */}
      <g fill={ROSA}>
        <path d="M120 198 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -3.8 -7 3.8 1.5 -7.5 -5.5 -5 7.5 -1z" />
        <circle cx="100" cy="207" r="2.5" />
        <circle cx="140" cy="207" r="2.5" />
      </g>
    </svg>
  );
}

export function PantallaCarga({ slug, texto = 'Cargando el catálogo…' }: { slug?: string; texto?: string }) {
  const marca = slug ? marcaGuardada(slug) : null;
  const nombre = marca?.nombre || 'Dulce Pedido';
  return (
    <div className="grid min-h-dvh place-items-center bg-crema px-6" role="status" aria-live="polite">
      <style>{`
        @keyframes dp-flotar { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes dp-llama { 0%,100% { transform: scale(1) rotate(-3deg) } 50% { transform: scale(1.12, 0.92) rotate(4deg) } }
        @keyframes dp-brillo { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        @keyframes dp-entrar { from { opacity: 0; transform: scale(.92) } }
        @keyframes dp-punto { 0%,80%,100% { transform: scale(.6); opacity: .4 } 40% { transform: scale(1); opacity: 1 } }
        .dp-insignia { animation: dp-entrar .45s ease-out both }
        .dp-torta { animation: dp-flotar 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
        .dp-llama { animation: dp-llama .9s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100% }
        .dp-destello { animation: dp-brillo 1.6s ease-in-out infinite }
        .dp-punto { animation: dp-punto 1.2s ease-in-out infinite }
      `}</style>
      <div className="flex flex-col items-center gap-5">
        {marca?.logo ? (
          <img src={marca.logo} alt={nombre} className="dp-insignia h-40 w-40 rounded-full object-cover shadow-[0_18px_40px_-18px_rgba(46,29,21,0.5)] ring-4 ring-papel" />
        ) : (
          <InsigniaSvg nombre={nombre} className="dp-insignia h-56 w-56 drop-shadow-[0_18px_30px_rgba(46,29,21,0.18)] sm:h-64 sm:w-64" />
        )}
        <div className="flex items-center gap-2 text-sm text-tinta-3">
          <span>{texto}</span>
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="dp-punto h-1.5 w-1.5 rounded-full bg-acento" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
