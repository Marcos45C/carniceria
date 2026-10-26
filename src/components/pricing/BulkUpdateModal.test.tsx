import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CUTS } from '../../test/fixtures'
import { BulkUpdateModal } from './BulkUpdateModal'

const onApply = vi.fn()

function renderModal() {
  return render(<BulkUpdateModal cuts={FIXTURE_CUTS} onApply={onApply} onClose={vi.fn()} />)
}

beforeEach(() => {
  vi.resetAllMocks()
  onApply.mockResolvedValue({ ok: true, data: { batchId: 'batch-1', affectedCount: 2 } })
})

describe('BulkUpdateModal', () => {
  it('permite elegir solo algunos cortes', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByLabelText(/Solo los que seleccione/))
    await user.click(screen.getByRole('checkbox', { name: /Asado de tira/ }))
    await user.click(screen.getByRole('checkbox', { name: /Vacío/ }))
    await user.type(screen.getByLabelText('Porcentaje'), '10')
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar actualización' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const request = onApply.mock.calls[0][0]
    expect(request.scope).toBe('selected')
    expect(request.expected.map((item: { id: string }) => item.id).sort()).toEqual([
      'demo-01',
      'demo-02',
    ])
  })

  it('exige seleccionar al menos un corte', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByLabelText(/Solo los que seleccione/))
    await user.type(screen.getByLabelText('Porcentaje'), '10')
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccioná al menos un corte.')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('no incluye los cortes inactivos', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Porcentaje'), '10')
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }))

    expect(screen.getByText('Asado de tira')).toBeInTheDocument()
    expect(screen.queryByText('Riñón')).not.toBeInTheDocument() // inactivo
    expect(screen.queryByText('Lomo')).not.toBeInTheDocument() // inactivo
  })

  it('envía la operación y el redondeo elegidos', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Reducir' }))
    await user.type(screen.getByLabelText('Porcentaje'), '5')
    await user.selectOptions(screen.getByLabelText('Redondeo'), 'step50')
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar actualización' }))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'decrease', basisPoints: 500, rounding: 'step50' }),
    )
  })

  it('bloquea la confirmación cuando un precio nuevo no sería válido', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Reducir' }))
    await user.type(screen.getByLabelText('Porcentaje'), '99,99')
    await user.selectOptions(screen.getByLabelText('Redondeo'), 'step100')
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }))

    expect(screen.getAllByText('No válido').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Confirmar actualización' })).toBeDisabled()
    expect(onApply).not.toHaveBeenCalled()
  })
})