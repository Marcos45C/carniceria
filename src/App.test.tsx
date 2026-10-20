import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el nombre de la aplicación y el botón de actualizar precios', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Carnicería Pro' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /actualizar precios/i }),
    ).toBeInTheDocument()
  })

  it('filtra los cortes al buscar por nombre', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('searchbox', { name: /buscar corte/i }), 'asado')

    expect(screen.getAllByText('Asado de tira').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Vacío')).toHaveLength(0)
  })

  it('permite editar el precio de un corte', async () => {
    const user = userEvent.setup()
    render(<App />)

    // La primera coincidencia es la de la tabla; la segunda es la tarjeta móvil.
    const [editButton] = screen.getAllByRole('button', {
      name: 'Editar precio de Asado de tira',
    })
    await user.click(editButton)

    const input = screen.getByRole('textbox', { name: 'Nuevo precio de Asado de tira' })
    await user.clear(input)
    await user.type(input, '13000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getAllByText(/13\.000,00/).length).toBeGreaterThan(0)
  })
})