import { describe, expect, it } from 'vitest'
import type { Cut } from '../types/cut'
import {
  buildPreview,
  calculateNewPriceCents,
  parsePercentage,
  parsePriceToCents,
} from './pricing'

const cut: Cut = {
  id: '1',
  name: 'Asado de tira',
  category: 'Vacuno',
  unit: 'kg',
  price: 12500,
  priceUpdatedAt: '2026-10-14T13:20:00Z',
  isActive: true,
}

describe('calculateNewPriceCents', () => {
  it('aplica un aumento del 10 %', () => {
    expect(calculateNewPriceCents(1250000, 1000, 'increase', 'cents')).toBe(1375000)
  })

  it('aplica una reducción del 10 %', () => {
    expect(calculateNewPriceCents(1250000, 1000, 'decrease', 'cents')).toBe(1125000)
  })

  it('admite porcentajes con decimales', () => {
    expect(calculateNewPriceCents(1000000, 750, 'increase', 'cents')).toBe(1075000)
  })

  it('redondea a dos decimales', () => {
    // 99,99 × 1,10 = 109,989 -> 109,99
    expect(calculateNewPriceCents(9999, 1000, 'increase', 'cents')).toBe(10999)
  })

  it('redondea al peso entero más cercano', () => {
    // 101,50 × 1,10 = 111,65 -> 112
    expect(calculateNewPriceCents(10150, 1000, 'increase', 'peso')).toBe(11200)
  })

  it('redondea al múltiplo de $50 más cercano', () => {
    // 150 × 1,10 = 165 -> 150
    expect(calculateNewPriceCents(15000, 1000, 'increase', 'step50')).toBe(15000)
  })

  it('redondea al múltiplo de $100 más cercano', () => {
    // 150 × 1,10 = 165 -> 200
    expect(calculateNewPriceCents(15000, 1000, 'increase', 'step100')).toBe(20000)
  })

  it('cuando queda exactamente a la mitad, sube', () => {
    // 125 con paso de $50 -> 150
    expect(calculateNewPriceCents(12500, 0, 'increase', 'step50')).toBe(15000)
  })

  it('devuelve null si el resultado no es positivo', () => {
    expect(calculateNewPriceCents(100, 9999, 'decrease', 'cents')).toBeNull()
  })
})

describe('parsePercentage', () => {
  it('acepta enteros y decimales con coma o punto', () => {
    expect(parsePercentage('10', 'increase')).toEqual({ ok: true, value: 1000 })
    expect(parsePercentage('7,5', 'increase')).toEqual({ ok: true, value: 750 })
    expect(parsePercentage('7.5', 'increase')).toEqual({ ok: true, value: 750 })
  })

  it('rechaza valores inválidos', () => {
    expect(parsePercentage('', 'increase').ok).toBe(false)
    expect(parsePercentage('abc', 'increase').ok).toBe(false)
    expect(parsePercentage('0', 'increase').ok).toBe(false)
    expect(parsePercentage('-5', 'increase').ok).toBe(false)
    expect(parsePercentage('10,555', 'increase').ok).toBe(false)
  })

  it('rechaza reducciones iguales o superiores al 100 %', () => {
    expect(parsePercentage('100', 'decrease').ok).toBe(false)
    expect(parsePercentage('150', 'decrease').ok).toBe(false)
    expect(parsePercentage('99,99', 'decrease').ok).toBe(true)
  })

  it('permite aumentos del 100 % o más', () => {
    expect(parsePercentage('100', 'increase')).toEqual({ ok: true, value: 10000 })
  })
})

describe('parsePriceToCents', () => {
  it('convierte a centavos', () => {
    expect(parsePriceToCents('12500')).toEqual({ ok: true, value: 1250000 })
    expect(parsePriceToCents('12500,50')).toEqual({ ok: true, value: 1250050 })
  })

  it('rechaza precios inválidos', () => {
    expect(parsePriceToCents('0').ok).toBe(false)
    expect(parsePriceToCents('-5').ok).toBe(false)
    expect(parsePriceToCents('abc').ok).toBe(false)
    expect(parsePriceToCents('12.500,00').ok).toBe(false)
  })
})

describe('buildPreview', () => {
  it('calcula precio nuevo y diferencia', () => {
    const [row] = buildPreview([cut], 1000, 'increase', 'cents')
    expect(row.oldPrice).toBe(12500)
    expect(row.newPrice).toBe(13750)
    expect(row.difference).toBe(1250)
  })
})