import { describe, expect, it } from 'vitest'
import { isSecretKey } from './keySafety'

const fakeJwt = (role: string) => `cabecera.${btoa(JSON.stringify({ role }))}.firma`

describe('isSecretKey', () => {
  it('detecta claves secretas nuevas', () => {
    expect(isSecretKey('sb_secret_abc123')).toBe(true)
  })

  it('detecta claves service_role antiguas', () => {
    expect(isSecretKey(fakeJwt('service_role'))).toBe(true)
  })

  it('acepta claves públicas', () => {
    expect(isSecretKey('sb_publishable_abc123')).toBe(false)
    expect(isSecretKey(fakeJwt('anon'))).toBe(false)
  })
})