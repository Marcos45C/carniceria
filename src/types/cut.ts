export type CutUnit = 'kg' | 'unidad'

export type StatusFilter = 'active' | 'inactive' | 'all'

export interface Cut {
  id: string
  name: string
  category: string | null
  unit: CutUnit
  /** Precio actual en pesos argentinos, con dos decimales. */
  price: number
  /** Fecha ISO del último cambio real del precio (no del nombre ni la categoría). */
  priceUpdatedAt: string
  isActive: boolean
}

export interface CutFilters {
  search: string
  /** Cadena vacía = todas las categorías. */
  category: string
  status: StatusFilter
}