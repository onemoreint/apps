import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Iniciales para avatares: "José Lugo" → "JL"; "Industrias Andinas S.A.S." → "IA". */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

/** Saludo según la hora local. */
export function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 19) return 'afternoon'
  return 'evening'
}

export function uuid(): string {
  return crypto.randomUUID()
}
