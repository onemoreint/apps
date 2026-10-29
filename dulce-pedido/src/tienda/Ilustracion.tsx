/**
 * Ilustraciones de referencia para productos sin fotografía. NO representan el
 * producto real: siempre se muestran con la etiqueta "Imagen ilustrativa".
 */
type Tipo = 'torta' | 'cupcake' | 'galleta' | 'brownie' | 'vaso' | 'caja' | 'frasco' | 'porcion';

export function tipoIlustracion(texto: string): Tipo {
  const t = texto.toLowerCase();
  if (/cupcake|muffin|ponqu/.test(t)) return 'cupcake';
  if (/galleta|cookie|alfajor/.test(t)) return 'galleta';
  if (/brownie|blondie/.test(t)) return 'brownie';
  if (/caja|combo|regalo|ancheta/.test(t)) return 'caja';
  if (/arequipe|mermelada|dulce de|tradicional|cocada|frasco/.test(t)) return 'frasco';
  if (/vaso|cheesecake|mousse|postre de|fr[ií]o|maracuy|copa/.test(t)) return 'vaso';
  if (/tres leches|porci[oó]n|individual|tajada/.test(t)) return 'porcion';
  return 'torta';
}

const FONDOS: Record<Tipo, [string, string]> = {
  torta: ['#f6e3dc', '#efcfc4'],
  cupcake: ['#f8e8e2', '#f0d2c9'],
  galleta: ['#f6ebdd', '#ecdac2'],
  brownie: ['#f3e6da', '#e6d1bf'],
  vaso: ['#fbeee0', '#f3dcc0'],
  caja: ['#f5e4e4', '#ead0d0'],
  frasco: ['#f7ecd9', '#eedcbc'],
  porcion: ['#f9efe6', '#f0dccb'],
};

const CHOCO = '#5a3222';
const CHOCO_2 = '#7a4a33';
const CREMA = '#fff8ef';
const ROSA = '#e7a99c';
const TERRA = '#c4673f';

function Dibujo({ tipo }: { tipo: Tipo }) {
  switch (tipo) {
    case 'cupcake':
      return (
        <g>
          <path d="M72 88 L84 128 H116 L128 88 Z" fill={TERRA} />
          <path d="M80 88 L88 128 M92 88 L96 128 M104 88 L104 128 M116 88 L112 128" stroke="#a9512f" strokeWidth="2" />
          <path d="M66 90 C60 72 78 62 86 64 C88 50 112 48 116 62 C128 60 142 74 134 90 Z" fill={ROSA} />
          <path d="M80 70 C86 60 104 58 112 68" stroke={CREMA} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="50" r="7" fill="#b3332a" />
          <path d="M100 43 C102 36 108 34 110 32" stroke="#4d7a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'galleta':
      return (
        <g>
          <circle cx="86" cy="86" r="34" fill="#d9a066" />
          <circle cx="86" cy="86" r="34" fill="none" stroke="#c48a52" strokeWidth="3" />
          {[[74, 74], [96, 70], [86, 92], [70, 98], [102, 96], [80, 108]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="5" ry="4" fill={CHOCO} />
          ))}
          <circle cx="126" cy="102" r="24" fill="#e2b07a" />
          {[[118, 96], [132, 94], [126, 110]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4" ry="3.2" fill={CHOCO} />
          ))}
        </g>
      );
    case 'brownie':
      return (
        <g>
          <path d="M58 82 L100 68 L142 82 L100 96 Z" fill={CHOCO_2} />
          <path d="M58 82 V108 L100 122 V96 Z" fill={CHOCO} />
          <path d="M142 82 V108 L100 122 V96 Z" fill="#4a2819" />
          <path d="M70 80 L84 76 M96 74 L108 78 M116 80 L128 84" stroke="#9c6a4d" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="78" r="6" fill="#d9a066" />
        </g>
      );
    case 'vaso':
      return (
        <g>
          <path d="M74 48 H126 L118 126 H82 Z" fill="#ffffff" opacity="0.7" stroke="#d8c6b4" strokeWidth="2" />
          <path d="M80 104 H120 L118 124 H82 Z" fill="#c9a074" />
          <path d="M77 74 H123 L120 104 H80 Z" fill={CREMA} />
          <path d="M75 60 H125 L123 74 H77 Z" fill="#f2b33d" />
          <circle cx="92" cy="58" r="4" fill="#b3332a" />
          <path d="M100 52 C104 44 112 44 114 50" stroke="#4d7a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'caja':
      return (
        <g>
          <rect x="58" y="70" width="84" height="54" rx="4" fill={CREMA} stroke="#e1cfbd" strokeWidth="2" />
          <rect x="54" y="60" width="92" height="16" rx="4" fill="#f7efe4" stroke="#e1cfbd" strokeWidth="2" />
          <rect x="94" y="60" width="12" height="64" fill={TERRA} />
          <path d="M100 60 C86 40 70 48 80 58 C86 62 96 60 100 60 C104 60 114 62 120 58 C130 48 114 40 100 60 Z" fill={TERRA} />
          <circle cx="100" cy="60" r="5" fill="#a9512f" />
        </g>
      );
    case 'frasco':
      return (
        <g>
          <rect x="74" y="50" width="52" height="14" rx="3" fill={TERRA} />
          <path d="M70 66 H130 V118 C130 124 126 128 120 128 H80 C74 128 70 124 70 118 Z" fill="#c98a4b" />
          <rect x="80" y="84" width="40" height="22" rx="3" fill={CREMA} />
          <path d="M86 95 H114" stroke={TERRA} strokeWidth="3" strokeLinecap="round" />
          <path d="M78 72 C78 70 80 68 84 68" stroke="#e6b47e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'porcion':
      return (
        <g>
          <ellipse cx="100" cy="122" rx="54" ry="8" fill="#e6d6c6" />
          <path d="M56 116 L136 116 L136 86 L56 66 Z" fill="#f2d9a6" />
          <path d="M56 66 L136 86 L136 72 L60 56 Z" fill={CREMA} />
          <path d="M56 90 L136 102" stroke="#e8c27f" strokeWidth="4" />
          <circle cx="118" cy="72" r="6" fill="#b3332a" />
        </g>
      );
    case 'torta':
    default:
      return (
        <g>
          <ellipse cx="100" cy="124" rx="58" ry="8" fill="#e6d6c6" />
          <rect x="54" y="80" width="92" height="42" rx="6" fill={CHOCO} />
          <rect x="54" y="98" width="92" height="5" fill="#f2c9a8" />
          <path
            d="M54 86 C54 76 146 76 146 86 V92 C140 98 136 90 130 96 C124 102 120 92 114 98 C108 104 102 92 96 98 C90 104 84 92 78 98 C72 104 66 92 60 98 C56 100 54 96 54 94 Z"
            fill={ROSA}
          />
          <rect x="70" y="56" width="60" height="26" rx="5" fill={CHOCO_2} />
          <path d="M70 62 C70 54 130 54 130 62 V66 C124 72 120 64 114 70 C108 74 104 64 98 70 C92 74 88 64 82 70 C76 74 72 66 70 68 Z" fill={CREMA} />
          <rect x="98" y="38" width="4" height="16" rx="2" fill={TERRA} />
          <path d="M100 30 C104 34 104 38 100 39 C96 38 96 34 100 30 Z" fill="#f2b33d" />
        </g>
      );
  }
}

export function Ilustracion({ texto, className = '' }: { texto: string; className?: string }) {
  const tipo = tipoIlustracion(texto);
  const [a, b] = FONDOS[tipo];
  const id = `g-${tipo}`;
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Imagen ilustrativa" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#${id})`} />
      <circle cx="170" cy="22" r="30" fill="#ffffff" opacity="0.25" />
      <circle cx="22" cy="140" r="26" fill="#ffffff" opacity="0.2" />
      <Dibujo tipo={tipo} />
    </svg>
  );
}
