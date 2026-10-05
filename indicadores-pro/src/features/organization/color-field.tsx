import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'

interface ColorFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
}

/** Selector de color + campo hexadecimal sincronizados. */
export const ColorInput = forwardRef<HTMLInputElement, ColorFieldProps>(({ value, onChange, ...props }, ref) => {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-hidden
        tabIndex={-1}
        className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-surface p-1 sm:h-10"
      />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={7}
        spellCheck={false}
        className="font-mono uppercase"
        {...props}
      />
    </div>
  )
})
ColorInput.displayName = 'ColorInput'
