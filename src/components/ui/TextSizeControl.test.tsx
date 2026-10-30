import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TextSizeControl } from './TextSizeControl'

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.textSize
})

describe('TextSizeControl', () => {
  it('cambia el tamaño, lo aplica y lo guarda', async () => {
    const user = userEvent.setup()
    render(<TextSizeControl variant="onLight" />)

    expect(screen.getByRole('button', { name: 'Texto normal' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Texto grande' }))

    expect(screen.getByRole('button', { name: 'Texto grande' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Texto normal' })).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.textSize).toBe('large')
    expect(window.localStorage.getItem('carniceria-pro:text-size')).toBe('large')
  })

  it('recuerda la elección guardada', () => {
    window.localStorage.setItem('carniceria-pro:text-size', 'xlarge')
    render(<TextSizeControl variant="onDark" />)

    expect(screen.getByRole('button', { name: 'Texto muy grande' })).toHaveAttribute('aria-pressed', 'true')
  })
})