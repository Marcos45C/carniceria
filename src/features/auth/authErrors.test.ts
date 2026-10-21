import { describe, expect, it } from 'vitest'
import { toFriendlyAuthMessage } from './authErrors'

describe('toFriendlyAuthMessage', () => {
  it('traduce credenciales inválidas', () => {
    expect(toFriendlyAuthMessage({ code: 'invalid_credentials', message: 'x' })).toBe(
      'Correo o contraseña incorrectos.',
    )
  })

  it('traduce el límite de intentos', () => {
    expect(toFriendlyAuthMessage({ code: 'over_request_rate_limit', message: 'x' })).toMatch(
      /Demasiados intentos/,
    )
  })

  it('detecta problemas de red', () => {
    expect(toFriendlyAuthMessage({ status: 0, message: 'Failed to fetch' })).toMatch(
      /No se pudo conectar/,
    )
  })

  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(toFriendlyAuthMessage({ code: 'otra_cosa', message: 'boom' })).toBe(
      'No se pudo iniciar sesión. Intentá de nuevo.',
    )
  })
})