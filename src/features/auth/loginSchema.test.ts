import { describe, expect, it } from 'vitest'
import { validateLogin } from './loginSchema'

describe('validateLogin', () => {
  it('acepta datos válidos y limpia espacios del correo', () => {
    expect(validateLogin({ email: '  carnicero@demo.local ', password: 'x' })).toEqual({
      ok: true,
      data: { email: 'carnicero@demo.local', password: 'x' },
    })
  })

  it('rechaza campos vacíos', () => {
    const result = validateLogin({ email: '', password: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.email).toBeDefined()
      expect(result.errors.password).toBeDefined()
    }
  })

  it('rechaza correos mal formados', () => {
    const result = validateLogin({ email: 'no-es-un-correo', password: 'x' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBe('Ingresá un correo electrónico válido.')
  })
})