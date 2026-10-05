import { env } from './env'

/**
 * Configuración de producto. El nombre y los colores por defecto se cambian aquí
 * (o con VITE_APP_NAME) sin tocar componentes.
 */
export const appConfig = {
  name: env.appName ?? 'INDICADORES PRO',
  shortName: 'Indicadores',
  tagline: 'Sistema inteligente para gestión, seguimiento, análisis y mejora de indicadores organizacionales',
  version: '0.1.0',
  defaultBrand: {
    primary: '#2563EB',
    secondary: '#0F172A',
  },
  status: {
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  defaultLocale: 'es',
  supportedLocales: ['es', 'en'] as const,
} as const

export type Locale = (typeof appConfig.supportedLocales)[number]
