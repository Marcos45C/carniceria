import { afterEach, describe, expect, it, vi } from 'vitest'
import { endOfDayIso, startOfDayIso } from './dateRange'
import { formatVariation } from './format'
import { newUuid } from './uuid'

describe('newUuid', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('genera un UUID v4 válido', () => {
    expect(newUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('no repite valores', () => {
    expect(newUuid()).not.toBe(newUuid())
  })

  it('funciona sin crypto.randomUUID (http en red local)', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', {
        getRandomValues: (array: Uint8Array<ArrayBuffer>) => original.getRandomValues(array),
    })
    expect(newUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})

describe('formatVariation', () => {
  it('muestra aumentos y reducciones con signo', () => {
    expect(formatVariation(12500, 13750)).toBe('+10%')
    expect(formatVariation(13750, 12375)).toBe('-10%')
  })

  it('muestra un guion cuando no hay precio anterior', () => {
    expect(formatVariation(null, 12500)).toBe('—')
  })
})

describe('rango de fechas', () => {
  it('usa el huso horario de Argentina', () => {
    expect(startOfDayIso('2026-10-14')).toBe('2026-10-14T00:00:00.000-03:00')
    expect(endOfDayIso('2026-10-14')).toBe('2026-10-14T23:59:59.999-03:00')
  })
})