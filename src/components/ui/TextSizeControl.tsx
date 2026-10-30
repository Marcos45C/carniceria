import { useTextSize } from '../../features/preferences/useTextSize'
import type { TextSize } from '../../features/preferences/textSize'

interface TextSizeControlProps {
  /** onDark: sobre el encabezado borgoña. onLight: sobre fondo claro. */
  variant: 'onDark' | 'onLight'
}

const OPTIONS: { value: TextSize; label: string; glyphClass: string }[] = [
  { value: 'normal', label: 'Texto normal', glyphClass: 'text-base' },
  { value: 'large', label: 'Texto grande', glyphClass: 'text-xl' },
  { value: 'xlarge', label: 'Texto muy grande', glyphClass: 'text-2xl' },
]

const STYLES = {
  onDark: {
    active: 'bg-white text-brand-800',
    idle: 'border border-white/50 text-white hover:bg-brand-800',
  },
  onLight: {
    active: 'bg-brand-700 text-white',
    idle: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  },
}

export function TextSizeControl({ variant }: TextSizeControlProps) {
  const { size, changeSize } = useTextSize()
  const styles = STYLES[variant]

  return (
    <div role="group" aria-label="Tamaño del texto" className="flex gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={size === option.value}
          onClick={() => changeSize(option.value)}
          className={`inline-flex size-11 items-center justify-center rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-700 ${option.glyphClass} ${
            size === option.value ? styles.active : styles.idle
          }`}
        >
          A
        </button>
      ))}
    </div>
  )
}