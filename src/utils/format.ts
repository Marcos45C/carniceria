const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const signedPesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  signDisplay: 'exceptZero',
})

const percent = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

const dateTime = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

/** Ejemplo: 12500 -> "$ 12.500,00" */
export function formatPesos(value: number): string {
  return pesos.format(value)
}

/** Ejemplo: 1250 -> "+$ 1.250,00" */
export function formatPesosSigned(value: number): string {
  return signedPesos.format(value)
}

/** Recibe centésimas de punto porcentual: 750 -> "7,5%" */
export function formatPercentage(basisPoints: number): string {
  return `${percent.format(basisPoints / 100)}%`
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}


const variation = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

/** Variación porcentual entre dos precios. Ejemplo: 12500 -> 13750 = "+10%". */
export function formatVariation(oldPrice: number | null, newPrice: number): string {
  if (oldPrice === null || oldPrice === 0) return '—'
  return `${variation.format(((newPrice - oldPrice) / oldPrice) * 100)}%`
}