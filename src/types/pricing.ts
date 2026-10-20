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