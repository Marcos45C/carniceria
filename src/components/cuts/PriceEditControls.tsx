import { Check, Loader2, Pencil, X } from 'lucide-react'
import type { InlinePriceEdit } from '../../features/cuts/useInlinePriceEdit'
import { btnSecondary, btnSuccess } from '../ui/styles'

interface PriceInputProps {
  edit: InlinePriceEdit
  cutName: string
}

export function PriceInput({ edit, cutName }: PriceInputProps) {
  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        disabled={edit.saving}
        value={edit.value}
        onChange={(event) => edit.changeValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void edit.submit()
          }
          if (event.key === 'Escape') edit.cancel()
        }}
        aria-label={`Nuevo precio de ${cutName}`}
        aria-invalid={edit.error !== null}
        className={`h-12 w-full rounded-lg border bg-white px-3 text-lg tabular-nums focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
          edit.error
            ? 'border-error-600 focus:ring-error-600'
            : 'border-gray-300 focus:ring-brand-500'
        }`}
      />
      {edit.error && (
        <p role="alert" className="mt-1 text-sm text-error-600">
          {edit.error}
        </p>
      )}
    </div>
  )
}

interface PriceActionsProps {
  edit: InlinePriceEdit
  cutName: string
  fullWidth?: boolean
  className?: string
}

export function PriceActions({ edit, cutName, fullWidth = false, className = '' }: PriceActionsProps) {
  const grow = fullWidth ? 'flex-1' : ''
  const wrapper = `flex gap-2 ${fullWidth ? 'w-full' : ''} ${className}`

  if (edit.editing) {
    return (
      <div className={wrapper}>
        <button
          type="button"
          onClick={() => void edit.submit()}
          disabled={edit.saving}
          className={`${btnSuccess} ${grow}`}
        >
          {edit.saving ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={18} aria-hidden="true" />
          )}
          {edit.saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={edit.cancel}
          disabled={edit.saving}
          className={`${btnSecondary} ${grow}`}
        >
          <X size={18} aria-hidden="true" />
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className={wrapper}>
      <button
        type="button"
        onClick={edit.start}
        aria-label={`Editar precio de ${cutName}`}
        className={`${btnSecondary} ${grow}`}
      >
        <Pencil size={18} aria-hidden="true" />
        Editar precio
      </button>
    </div>
  )
}