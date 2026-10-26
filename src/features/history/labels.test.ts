import { describe, expect, it } from 'vitest'
import type { PriceBatch } from '../../types/history'
import { describeBatch } from './labels'

const base: PriceBatch = {
  id: 'batch-0001-aaaa',
  operationType: 'bulk_update',
  percentage: 10,
  roundingMode: 'cents',
  selectionScope: 'all_active',
  affectedCount: 3,
  createdAt: '2026-10-15T13:20:00Z',
  changedBy: 'user-1',
  originalBatchId: null,
}

describe('describeBatch', () => {
  it('describe un aumento', () => {
    expect(describeBatch(base)).toBe('Aumento del 10%')
  })

  it('describe una reducción con decimales', () => {
    expect(describeBatch({ ...base, percentage: -7.5 })).toBe('Reducción del 7,5%')
  })

  it('describe una reversión indicando la operación original', () => {
    expect(
      describeBatch({
        ...base,
        operationType: 'reversal',
        percentage: null,
        originalBatchId: 'batch-0001-aaaa',
      }),
    ).toBe('Reversión de la operación batch-00')
  })
})