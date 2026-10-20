import { describe, expect, it } from 'vitest'
import type { Cut } from '../../types/cut'
import { filterCuts, validateCutForm } from './cutRules'

const cuts: Cut[] = [
  { id: '1', name: 'Asado de tira', category: 'Vacuno', unit: 'kg', price: 12500, priceUpdatedAt: '2026-10-14T13:20:00Z', isActive: true },
  { id: '2', name: 'Vacío', category: 'Vacuno', unit: 'kg', price: 13800, priceUpdatedAt: '2026-10-14T13:20:00Z', isActive: true },
  { id: '3', name: 'Bondiola', category: 'Cerdo', unit: 'kg', price: 8400, priceUpdatedAt: '2026-10-02T14:10:00Z', isActive: false },
]

describe('filterCuts', () => {
  it('busca sin distinguir mayúsculas ni tildes', () => {
    const result = filterCuts(cuts, { search: 'VACIO', category: '', status: 'all' })
    expect(result.map((c) => c.name)).toEqual(['Vacío'])
  })

  it('filtra por estado', () => {
    const active = filterCuts(cuts, { search: '', category: '', status: 'active' })
    const inactive = filterCuts(cuts, { search: '', category: '', status: 'inactive' })
    expect(active).toHaveLength(2)
    expect(inactive.map((c) => c.name)).toEqual(['Bondiola'])
  })

  it('filtra por categoría', () => {
    const result = filterCuts(cuts, { search: '', category: 'Cerdo', status: 'all' })
    expect(result.map((c) => c.name)).toEqual(['Bondiola'])
  })
})

describe('validateCutForm', () => {
  it('rechaza nombres duplicados ignorando mayúsculas y espacios', () => {
    const result = validateCutForm(
      { name: '  asado   DE tira ', category: '', unit: 'kg', price: '100', isActive: true },
      cuts,
      { requirePrice: true },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBeDefined()
  })

  it('permite conservar el propio nombre al editar', () => {
    const result = validateCutForm(
      { name: 'Vacío', category: 'Vacuno', unit: 'kg', price: '', isActive: true },
      cuts,
      { editingId: '2', requirePrice: false },
    )
    expect(result.ok).toBe(true)
  })

  it('acepta datos válidos y convierte el precio a centavos', () => {
    const result = validateCutForm(
      { name: 'Molida', category: '', unit: 'kg', price: '8500,50', isActive: true },
      cuts,
      { requirePrice: true },
    )
    expect(result).toEqual({
      ok: true,
      data: { name: 'Molida', category: null, unit: 'kg', isActive: true, priceCents: 850050 },
    })
  })

  it('exige un precio válido al crear', () => {
    const result = validateCutForm(
      { name: 'Molida', category: '', unit: 'kg', price: '0', isActive: true },
      cuts,
      { requirePrice: true },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.price).toBeDefined()
  })
})