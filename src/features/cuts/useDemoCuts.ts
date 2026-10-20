import { useCallback, useState } from 'react'
import type { Cut } from '../../types/cut'
import type { PriceChange } from '../../types/pricing'
import { DEMO_CUTS } from './demoData'
import type { ValidCutData } from './cutRules'

function newId(): string {
  // crypto.randomUUID no existe en http fuera de localhost (por ejemplo al
  // probar desde el celular por red local), por eso no lo usamos acá.
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Estado temporal en memoria para la Etapa 2.
 * En la Etapa 5 se reemplaza por el acceso real a Supabase.
 */
export function useDemoCuts() {
  const [cuts, setCuts] = useState<Cut[]>(DEMO_CUTS)

  const updatePrice = useCallback((id: string, newPrice: number) => {
    const now = new Date().toISOString()
    setCuts((prev) =>
      prev.map((cut) =>
        cut.id === id && cut.price !== newPrice
          ? { ...cut, price: newPrice, priceUpdatedAt: now }
          : cut,
      ),
    )
  }, [])

  const addCut = useCallback((data: ValidCutData) => {
    if (data.priceCents === undefined) return
    const now = new Date().toISOString()
    const price = data.priceCents / 100
    setCuts((prev) => [
      ...prev,
      {
        id: newId(),
        name: data.name,
        category: data.category,
        unit: data.unit,
        price,
        priceUpdatedAt: now,
        isActive: data.isActive,
      },
    ])
  }, [])

  /** Edita solo datos descriptivos: no toca el precio ni su fecha. */
  const updateCut = useCallback((id: string, data: ValidCutData) => {
    setCuts((prev) =>
      prev.map((cut) =>
        cut.id === id
          ? {
              ...cut,
              name: data.name,
              category: data.category,
              unit: data.unit,
              isActive: data.isActive,
            }
          : cut,
      ),
    )
  }, [])

  const applyBulkUpdate = useCallback((changes: PriceChange[]) => {
    const now = new Date().toISOString()
    const newPrices = new Map(changes.map((c) => [c.cutId, c.newPrice]))
    setCuts((prev) =>
      prev.map((cut) => {
        const newPrice = newPrices.get(cut.id)
        return newPrice !== undefined && newPrice !== cut.price
          ? { ...cut, price: newPrice, priceUpdatedAt: now }
          : cut
      }),
    )
  }, [])

  return { cuts, updatePrice, addCut, updateCut, applyBulkUpdate }
}