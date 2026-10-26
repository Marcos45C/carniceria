import type { ChangeType, PriceBatch } from '../../types/history'
import { formatPercentage } from '../../utils/format'

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  initial: 'Alta inicial',
  individual: 'Modificación individual',
  bulk_update: 'Actualización masiva',
  reversal: 'Reversión',
}

export const CHANGE_TYPES: ChangeType[] = ['initial', 'individual', 'bulk_update', 'reversal']

/** Descripción corta de una operación: "Aumento del 10%", "Reversión de la operación abc12345". */
export function describeBatch(batch: PriceBatch): string {
  if (batch.operationType === 'reversal') {
    return `Reversión de la operación ${batch.originalBatchId?.slice(0, 8) ?? ''}`.trim()
  }
  const percentage = formatPercentage(Math.round(Math.abs(batch.percentage ?? 0) * 100))
  return `${(batch.percentage ?? 0) >= 0 ? 'Aumento' : 'Reducción'} del ${percentage}`
}