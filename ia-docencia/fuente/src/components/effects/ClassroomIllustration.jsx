/* Ilustración propia en estilo de pictograma, el lenguaje visual habitual en
   Educación Especial. La docente y sus estudiantes están al centro; la IA es
   solo el panel de material que ella prepara desde su tableta. */
export default function ClassroomIllustration() {
  return (
    <svg viewBox="0 0 560 470" role="img" aria-labelledby="ill-t" className="h-auto w-full">
      <title id="ill-t">Una docente choca la mano con un estudiante en silla de ruedas mientras otra estudiante manipula bloques en una mesa. Sobre ellos flota un panel holográfico con el material que la docente preparó desde su tableta.</title>
      <defs>
        <linearGradient id="fig" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#F5F7FF" /><stop offset="1" stopColor="#9FC4FF" /></linearGradient>
        <linearGradient id="fig2" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5FE0FF" /><stop offset="1" stopColor="#1769FF" /></linearGradient>
        <linearGradient id="fig3" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#C4A5FF" /><stop offset="1" stopColor="#8747FF" /></linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00C8FF" stopOpacity=".22" /><stop offset="1" stopColor="#8747FF" stopOpacity=".2" /></linearGradient>
        <radialGradient id="floor"><stop stopColor="#1769FF" stopOpacity=".42" /><stop offset="1" stopColor="#1769FF" stopOpacity="0" /></radialGradient>
      </defs>

      {/* Suelo con anillos */}
      <ellipse cx="285" cy="410" rx="270" ry="52" fill="url(#floor)" />
      <ellipse cx="285" cy="410" rx="232" ry="38" fill="none" stroke="#00C8FF" strokeOpacity=".5" />
      <ellipse cx="285" cy="410" rx="170" ry="26" fill="none" stroke="#00C8FF" strokeOpacity=".3" strokeDasharray="4 8" />

      {/* Conexión de la tableta al panel */}
      <path className="circuit-flow" d="M92 196V70h208" fill="none" stroke="#00C8FF" strokeWidth="2" strokeOpacity=".85" />
      <circle cx="92" cy="196" r="4" fill="#00C8FF" />
      <circle cx="300" cy="70" r="4" fill="#00C8FF" />

      {/* Panel holográfico con material accesible */}
      <g>
        <rect x="300" y="18" width="240" height="138" rx="14" fill="url(#panel)" stroke="#7FD9FF" strokeOpacity=".75" />
        <g fill="none" stroke="#E5F6FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="318" y="36" width="62" height="62" rx="10" strokeOpacity=".55" strokeWidth="1.5" />
          <rect x="389" y="36" width="62" height="62" rx="10" strokeOpacity=".55" strokeWidth="1.5" />
          <rect x="460" y="36" width="62" height="62" rx="10" strokeOpacity=".55" strokeWidth="1.5" />
          <circle cx="349" cy="58" r="10" />
          <path d="M349 68v14M338 76l11-4 11 4" />
          <path d="M420 48l5.5 11 12 1.7-8.7 8.5 2 12-10.8-5.7-10.8 5.7 2-12-8.7-8.5 12-1.7z" />
          <path d="M478 56h26a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-16l-9 8v-8h-1a4 4 0 0 1-4-4V60a4 4 0 0 1 4-4z" />
        </g>
        <g stroke="#CFE9FF" strokeWidth="5" strokeLinecap="round">
          <path d="M318 118h204" strokeOpacity=".65" />
          <path d="M318 136h132" strokeOpacity=".4" />
        </g>
      </g>

      {/* Docente */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M172 276l-8 118M196 276l10 118" stroke="url(#fig)" strokeWidth="19" />
        <path d="M184 172l-24 106h48z" fill="url(#fig)" stroke="url(#fig)" strokeWidth="14" />
        {/* brazo con tableta */}
        <path d="M176 182l-44 42-22-14" stroke="url(#fig)" strokeWidth="13" />
        <rect x="70" y="182" width="44" height="58" rx="6" fill="#0C1328" stroke="#00C8FF" strokeWidth="3" transform="rotate(-12 92 211)" />
        <path d="M82 202l22-4M84 214l16-3" stroke="#00C8FF" strokeWidth="3" />
        {/* brazo que choca la mano */}
        <path d="M194 182l50 28 26-30" stroke="url(#fig)" strokeWidth="13" />
      </g>
      <circle cx="184" cy="136" r="26" fill="url(#fig)" />
      <path d="M160 130a24 24 0 0 1 46-8c-14 2-30-2-34-8-2 6-6 12-12 16z" fill="#1769FF" />
      <circle cx="206" cy="108" r="10" fill="#1769FF" />

      {/* Estudiante en silla de ruedas */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="340" cy="372" r="38" stroke="#7FD9FF" strokeWidth="6" />
        <circle cx="340" cy="372" r="5" fill="#7FD9FF" />
        <circle cx="408" cy="396" r="13" stroke="#7FD9FF" strokeWidth="5" />
        <path d="M312 268l10 66h66l18 48" stroke="#7FD9FF" strokeWidth="6" />
        <path d="M312 268l-18-8" stroke="#7FD9FF" strokeWidth="6" />
        <rect x="322" y="238" width="28" height="92" rx="14" fill="url(#fig2)" stroke="none" />
        <path d="M340 320h48l10 46" stroke="url(#fig2)" strokeWidth="15" />
        <path d="M336 256l-30-14-30-50" stroke="url(#fig2)" strokeWidth="11" />
      </g>
      <circle cx="338" cy="212" r="21" fill="url(#fig2)" />
      {/* Manos que se encuentran */}
      <circle cx="273" cy="178" r="9" fill="#F5F7FF" />
      <g stroke="#F5F7FF" strokeWidth="2.5" strokeLinecap="round">
        <path d="M273 160v-12M258 165l-8-8M288 165l8-8" />
      </g>

      {/* Estudiante y bloques en la mesa */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M498 322l-5 76M516 322l6 76" stroke="url(#fig3)" strokeWidth="14" />
        <rect x="493" y="246" width="28" height="84" rx="14" fill="url(#fig3)" stroke="none" />
        <path d="M503 268l-30 26-16 2" stroke="url(#fig3)" strokeWidth="10" />
      </g>
      <circle cx="507" cy="222" r="20" fill="url(#fig3)" />
      <path d="M432 306h66M446 306l-4 90M486 306l4 90" stroke="#7FD9FF" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="440" y="284" width="20" height="20" rx="3" fill="#00C8FF" />
      <circle cx="473" cy="294" r="10" fill="#F5F7FF" />
    </svg>
  );
}
