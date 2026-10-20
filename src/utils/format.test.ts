import { describe, expect, it } from 'vitest'
import {
  formatPercentage,
  formatPesos,
  formatPesosSigned,
} from './format'

// Intl usa un espacio de no separación entre "$" y el número.
const normalize = (value: string) => value.replace(/\u00a0/g, ' ')

describe('formato argentino', () => {
  it('formatea importes en pesos', () => {
    expect(normalize(formatPesos(12500))).toBe('$ 12.500,00')
    expect(normalize(formatPesos(1234567.5))).toBe('$ 1.234.567,50')
  })

  it('formatea diferencias con signo', () => {
    expect(normalize(formatPesosSigned(1250))).toMatch(/^\+/)
    expect(normalize(formatPesosSigned(-1250))).toMatch(/^-/)
    expect(normalize(formatPesosSigned(1250))).toContain('1.250,00')
  })

  it('formatea porcentajes', () => {
    expect(formatPercentage(750)).toBe('7,5%')
    expect(formatPercentage(1000)).toBe('10%')
  })
})