import { useState } from 'react'
import type { Cut } from '../../types/cut'
import type { Result } from '../../types/result'
import { parsePriceToCents, toCents } from '../../utils/pricing'

export type SavePrice = (
  id: string,
  newPrice: number,
  expectedPrice: number,
) => Promise<Result<Cut>>

export function useInlinePriceEdit(cut: Cut, onSave: SavePrice) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const start = () => {
    setValue(cut.price.toFixed(2).replace('.', ','))
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    if (saving) return
    setEditing(false)
    setError(null)
  }

  const changeValue = (next: string) => {
    setValue(next)
    setError(null)
  }

  const submit = async () => {
    if (saving) return // evita envíos duplicados

    const parsed = parsePriceToCents(value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    // Si el precio no cambió, no se genera ninguna modificación.
    if (parsed.value === toCents(cut.price)) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError(null)
    const result = await onSave(cut.id, parsed.value / 100, cut.price)
    setSaving(false)
    if (result.ok) setEditing(false)
    else setError(result.message)
  }

  return { editing, value, error, saving, start, cancel, changeValue, submit }
}

export type InlinePriceEdit = ReturnType<typeof useInlinePriceEdit>