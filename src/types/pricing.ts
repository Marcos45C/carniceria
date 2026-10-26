export type PriceOperation = 'increase' | 'decrease'

export type RoundingMode = 'cents' | 'peso' | 'step50' | 'step100'

export type SelectionScope = 'all_active' | 'selected'

export interface PreviewRow {
  cutId: string
  name: string
  unit: string
  oldPrice: number
  /** null cuando el resultado no sería un precio positivo. */
  newPrice: number | null
  difference: number | null
}

export interface PriceChange {
  cutId: string
  newPrice: number
}
export interface BulkUpdateRequest {
  /** Clave de idempotencia: reenviar la misma solicitud no la aplica dos veces. */
  requestId: string
  scope: SelectionScope
  operation: PriceOperation
  /** Centésimas de punto porcentual: 7,5 % -> 750. */
  basisPoints: number
  rounding: RoundingMode
  /** Precios que el usuario vio al calcular la vista previa. */
  expected: { id: string; price: number }[]
}

export interface BulkUpdateOutcome {
  batchId: string
  affectedCount: number
}

export interface RevertRequest {
  /** Clave de idempotencia: reenviar la misma solicitud no la aplica dos veces. */
  requestId: string
  batchId: string
}