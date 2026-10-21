import { describe, expect, it } from 'vitest'
import { toFriendlyDbMessage } from './cutErrors'

describe('toFriendlyDbMessage', () => {
  it('traduce nombres duplicados', () => {
    expect(toFriendlyDbMessage({ code: '23505', message: 'x' })).toBe(
      'Ya existe un corte con ese nombre.',
    )
  })

  it('traduce el conflicto de precio desactualizado', () => {
    expect(toFriendlyDbMessage({ code: 'PT409', message: 'x' })).toMatch(/cambió/)
  })

  it('traduce corte inexistente', () => {
    expect(toFriendlyDbMessage({ code: 'PT404', message: 'x' })).toMatch(/No se encontró/)
  })

  it('detecta problemas de red', () => {
    expect(toFriendlyDbMessage({ message: 'TypeError: Failed to fetch' })).toMatch(
      /No se pudo conectar/,
    )
  })

  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(toFriendlyDbMessage({ code: 'XX000', message: 'boom' })).toBe(
      'No se pudo completar la operación. Intentá de nuevo.',
    )
  })
})