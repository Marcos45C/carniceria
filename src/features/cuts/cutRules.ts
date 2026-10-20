import { z } from 'zod'
import type { Cut, CutFilters, CutUnit } from '../../types/cut'
import { normalizeName, normalizeText } from '../../utils/text'
import { parsePriceToCents } from '../../utils/pricing'

export interface CutFormValues {
  name: string
  category: string
  unit: CutUnit
  /** Texto escrito por el usuario; solo se valida al crear un corte. */
  price: string
  isActive: boolean
}

export type CutFormErrors = Partial<
  Record<'name' | 'category' | 'unit' | 'price', string>
>

export interface ValidCutData {
  name: string
  category: string | null
  unit: CutUnit
  isActive: boolean
  /** Solo presente al crear un corte. */
  priceCents?: number
}

export type CutFormValidation =
  | { ok: true; data: ValidCutData }
  | { ok: false; errors: CutFormErrors }

const cutFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre del corte.')
    .max(80, 'Máximo 80 caracteres.'),
  category: z.string().trim().max(40, 'Máximo 40 caracteres.'),
  unit: z.enum(['kg', 'unidad']),
})

export function filterCuts(cuts: Cut[], filters: CutFilters): Cut[] {
  const search = normalizeText(filters.search)
  return cuts
    .filter((cut) => {
      if (filters.status === 'active' && !cut.isActive) return false
      if (filters.status === 'inactive' && cut.isActive) return false
      if (filters.category && cut.category !== filters.category) return false
      if (search && !normalizeText(cut.name).includes(search)) return false
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
}

export function getCategories(cuts: Cut[]): string[] {
  const categories = new Set<string>()
  for (const cut of cuts) {
    if (cut.category) categories.add(cut.category)
  }
  return [...categories].sort((a, b) => a.localeCompare(b, 'es-AR'))
}

export function validateCutForm(
  values: CutFormValues,
  cuts: Cut[],
  options: { editingId?: string; requirePrice: boolean },
): CutFormValidation {
  const errors: CutFormErrors = {}

  const parsed = cutFormSchema.safeParse(values)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in errors)) {
        errors[key as keyof CutFormErrors] = issue.message
      }
    }
  }

  if (!errors.name) {
    const normalized = normalizeName(values.name)
    const duplicated = cuts.some(
      (cut) =>
        cut.id !== options.editingId && normalizeName(cut.name) === normalized,
    )
    if (duplicated) errors.name = 'Ya existe un corte con ese nombre.'
  }

  let priceCents: number | undefined
  if (options.requirePrice) {
    const price = parsePriceToCents(values.price)
    if (price.ok) priceCents = price.value
    else errors.price = price.error
  }

  if (Object.keys(errors).length > 0 || !parsed.success) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      unit: parsed.data.unit,
      isActive: values.isActive,
      priceCents,
    },
  }
}