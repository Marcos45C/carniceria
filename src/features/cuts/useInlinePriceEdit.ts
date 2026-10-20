import { useState } from 'react'
import type { Cut } from '../../types/cut'
import { parsePriceToCents, toCents } from '../../utils/pricing'

export function useInlinePriceEdit(
  cut: Cut,
  onSave: (id: string, newPrice: number) => void,
) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const start = () => {
    setValue(cut.price.toFixed(2).replace('.', ','))
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(null)
  }

  const changeValue = (next: string) => {
    setValue(next)
    setError(null)
  }

  const submit = () => {
    const parsed = parsePriceToCents(value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    // Si el precio no cambió, no se genera ninguna modificación.
    if (parsed.value !== toCents(cut.price)) {
      onSave(cut.id, parsed.value / 100)
    }
    setEditing(false)
  }

  return { editing, value, error, start, cancel, changeValue, submit }
}

export type InlinePriceEdit = ReturnType<typeof useInlinePriceEdit>