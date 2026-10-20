import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest no ejecuta el cleanup de Testing Library automáticamente
// (solo lo hace si `globals: true`), así que lo registramos acá.
afterEach(() => {
  cleanup()
})