import { useTranslation } from 'react-i18next'
import { hexToHsl, readableForeground } from '@/lib/brand'

/** Vista previa de los colores institucionales: barra lateral, encabezado y botón. */
export function BrandPreview({ name, primary, secondary }: { name: string; primary: string; secondary: string }) {
  const { t } = useTranslation()
  const valid = (c: string) => hexToHsl(c) !== null
  const p = valid(primary) ? primary : '#2563EB'
  const s = valid(secondary) ? secondary : '#0F172A'
  return (
    <div aria-label={t('org.preview')} className="overflow-hidden rounded-lg border bg-background">
      <div className="flex h-36">
        <div className="flex w-16 flex-col items-center gap-2 py-3" style={{ backgroundColor: s }}>
          <span className="size-6 rounded-md" style={{ backgroundColor: p }} />
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-7 rounded-full bg-white/25" />
          ))}
        </div>
        <div className="flex-1 p-3">
          <p className="truncate text-xs font-semibold">{name || t('org.name')}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-8 rounded border bg-surface" />
            ))}
          </div>
          <span
            className="mt-3 inline-flex h-7 items-center rounded px-2.5 text-xs font-medium"
            style={{ backgroundColor: p, color: `hsl(${readableForeground(p)})` }}
          >
            {t('org.previewButton')}
          </span>
        </div>
      </div>
    </div>
  )
}
