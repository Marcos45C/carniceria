import type { RoundingMode, SelectionScope } from './pricing'

export type ChangeType = 'initial' | 'individual' | 'bulk_update' | 'reversal'

export interface PriceHistoryEntry {
  id: string
  cutId: string
  /** null en el alta inicial. */
  oldPrice: number | null
  newPrice: number
  changedAt: string
  changedBy: string
  batchId: string | null
  changeType: ChangeType
}

export interface PriceBatch {
  id: string
  operationType: 'bulk_update' | 'reversal'
  /** Con signo: positivo = aumento. Nulo en reversiones. */
  percentage: number | null
  roundingMode: RoundingMode | null
  selectionScope: SelectionScope | null
  affectedCount: number
  createdAt: string
  changedBy: string
  originalBatchId: string | null
}

export interface HistoryFilters {
  /** Cadena vacía = todos los cortes. */
  cutId: string
  /** Formato YYYY-MM-DD; cadena vacía = sin límite. */
  dateFrom: string
  dateTo: string
  /** Cadena vacía = todos los tipos. */
  changeType: ChangeType | ''
}