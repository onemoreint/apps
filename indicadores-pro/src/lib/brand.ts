/**
 * Aplica los colores institucionales de la organización a los tokens CSS.
 * Así botones, encabezados, sidebar y gráficos toman la marca sin cambiar componentes.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!m?.[1]) return null
  let v = m[1]
  if (v.length === 3) v = v.split('').map((c) => c + c).join('')
  const r = parseInt(v.slice(0, 2), 16) / 255
  const g = parseInt(v.slice(2, 4), 16) / 255
  const b = parseInt(v.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Texto blanco o casi negro según la luminancia del fondo (contraste legible). */
export function readableForeground(hex: string): string {
  const hsl = hexToHsl(hex)
  if (!hsl) return '0 0% 100%'
  return hsl.l > 62 ? '222 47% 11%' : '0 0% 100%'
}

const toVar = (hex: string) => {
  const hsl = hexToHsl(hex)
  return hsl ? `${hsl.h} ${hsl.s}% ${hsl.l}%` : null
}

export interface BrandColors {
  primary?: string | null
  secondary?: string | null
}

const KEYS = ['--primary', '--primary-foreground', '--ring', '--sidebar-active', '--sidebar'] as const

export function applyBrand(colors: BrandColors | null | undefined, root: HTMLElement = document.documentElement) {
  KEYS.forEach((k) => root.style.removeProperty(k))
  if (!colors) return
  const primary = colors.primary ? toVar(colors.primary) : null
  if (primary && colors.primary) {
    root.style.setProperty('--primary', primary)
    root.style.setProperty('--primary-foreground', readableForeground(colors.primary))
    root.style.setProperty('--ring', primary)
    root.style.setProperty('--sidebar-active', primary)
  }
  const secondary = colors.secondary ? hexToHsl(colors.secondary) : null
  // La barra lateral usa el color secundario solo si es oscuro, para mantener contraste.
  if (secondary && secondary.l <= 30) {
    root.style.setProperty('--sidebar', `${secondary.h} ${secondary.s}% ${secondary.l}%`)
  }
}
