// Ilustraciones originales de puntas de uña (sin imágenes de terceros).
import { useId } from 'react'

export type NailShape = 'almendra' | 'cuadrada' | 'bailarina' | 'redonda' | 'stiletto'

export const SHAPES: { id: NailShape; name: string }[] = [
  { id: 'almendra', name: 'Almendra' },
  { id: 'cuadrada', name: 'Cuadrada' },
  { id: 'bailarina', name: 'Bailarina' },
  { id: 'redonda', name: 'Redonda' },
  { id: 'stiletto', name: 'Stiletto' },
]

export interface Polish {
  id: string
  name: string
  base: string
  tip?: string // francés
  dark: boolean // ¿el texto encima debe ser claro?
}

export const POLISHES: Polish[] = [
  { id: 'cereza', name: 'Rojo cereza', base: '#9B1B30', dark: true },
  { id: 'vino', name: 'Vino tinto', base: '#5A1530', dark: true },
  { id: 'empolvado', name: 'Rosa empolvado', base: '#E8B4C4', dark: false },
  { id: 'nude', name: 'Nude canela', base: '#D9A88A', dark: false },
  { id: 'frances', name: 'Francés', base: '#F2D7D3', tip: '#FFFFFF', dark: false },
  { id: 'lila', name: 'Lila', base: '#B9A3DE', dark: false },
  { id: 'noche', name: 'Azul noche', base: '#1F2A4D', dark: true },
]

const H = 150 // alto de la placa (sin la punta extra del stiletto)

function nailPath(shape: NailShape): string {
  const base = `L60,${H} Q30,${H - 16} 0,${H} Z`
  switch (shape) {
    case 'redonda':
      return `M0,${H} L0,30 Q0,0 30,0 Q60,0 60,30 ${base}`
    case 'cuadrada':
      return `M0,${H} L0,7 Q0,0 7,0 L53,0 Q60,0 60,7 ${base}`
    case 'bailarina':
      return `M0,${H} L9,9 Q10,0 19,0 L41,0 Q50,0 51,9 ${base}`
    case 'stiletto':
      return `M0,${H} L0,62 C0,34 25,10 30,-22 C35,10 60,34 60,62 ${base}`
    case 'almendra':
    default:
      return `M0,${H} L0,48 C0,20 22,1 30,-2 C38,1 60,20 60,48 ${base}`
  }
}

/** Una punta de uña con brillo. `delay` escalona la transición del color (efecto de pintado). */
export function Nail({ shape, polish, delay = 0, className }: { shape: NailShape; polish: Polish; delay?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const d = nailPath(shape)
  const t = { transition: `fill .55s cubic-bezier(.4,0,.2,1) ${delay}ms` }
  return (
    <svg viewBox="-6 -30 72 196" className={className} aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={d} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* sombra suave */}
      <path d={d} transform="translate(2 5)" fill="rgba(42,21,32,.18)" />
      <path d={d} style={{ ...t, fill: polish.base }} />
      <g clipPath={`url(#c${id})`}>
        <rect x="-10" y="-40" width="90" height={shape === 'stiletto' ? 78 : 48} style={{ ...t, fill: polish.tip ?? 'transparent' }} />
        {/* reflejo del esmalte */}
        <path d={`M10,${H - 22} C8,90 9,40 20,14`} stroke={`url(#g${id})`} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d={`M0,${H} Q30,${H - 16} 60,${H}`} stroke="rgba(42,21,32,.16)" strokeWidth="3" fill="none" />
      </g>
      {/* contorno fino: las uñas claras (francés, nude) se distinguen sobre fondo blanco */}
      <path d={d} fill="none" stroke="rgba(42,21,32,.22)" strokeWidth="1.2" />
      {polish.tip && <path d={shape === 'stiletto' ? 'M2,38 Q30,20 58,38' : 'M-2,48 Q30,32 62,48'} clipPath={`url(#c${id})`} fill="none" stroke="rgba(42,21,32,.18)" strokeWidth="1.2" />}
    </svg>
  )
}

/** Cinco puntas en abanico, como un muestrario de salón. */
export function NailFan({ shape, polish, className, small = false }: { shape: NailShape; polish: Polish; className?: string; small?: boolean }) {
  const layout = [
    { r: -16, s: 0.78, y: 34 },
    { r: -7, s: 0.94, y: 8 },
    { r: 0, s: 1, y: 0 },
    { r: 7, s: 0.94, y: 8 },
    { r: 16, s: 0.8, y: 30 },
  ]
  return (
    <div className={`flex items-end justify-center ${small ? 'gap-1' : 'gap-2 sm:gap-3'} ${className ?? ''}`}>
      {layout.map((l, i) => (
        <div key={i} style={{ transform: `translateY(${l.y}%) rotate(${l.r}deg) scale(${l.s})`, transformOrigin: '50% 100%' }} className={small ? 'w-[16%]' : 'w-[17%]'}>
          <Nail shape={shape} polish={polish} delay={i * 70} className="w-full drop-shadow-sm" />
        </div>
      ))}
    </div>
  )
}
