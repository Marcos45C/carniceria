import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el nombre de la aplicación', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'Carnicería Pro' }),
    ).toBeInTheDocument()
  })
})