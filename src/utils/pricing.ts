import type { Cut } from '../types/cut'
import type {
  PreviewRow,
  PriceOperation,
  RoundingMode,
} from '../types/pricing'

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string }

/** Máximo de NUMERIC(12,2) expresado en centavos. */
const MAX_PRICE_CENTS = 999_999_999_999
const DECIMAL_PATTERN = /^\d+([.,]\d{1,2})?$/

export const ROUNDING_MODES: RoundingMode[] = [
  'cents',
  'peso',
  'step50',
  'step100',
]

export const ROUNDING_LABELS: Record<RoundingMode, string> = {
  cents: 'Conservar dos decimales',
  peso: 'Peso entero más cercano',
  step50: 'Múltiplo de $50 más cercano',
  step100: 'Múltiplo de $100 más cercano',
}

/** Tamaño del paso de redondeo, expresado en centavos. */
const ROUNDING_STEP_CENTS: Record<RoundingMode, bigint> = {
  cents: 1n,
  peso: 100n,
  step50: 5000n,
  step100: 10000n,
}

export function toCents(pesos: number): number {
  return Math.round(pesos * 100)
}

/**
 * Convierte el texto escrito por el usuario en centavos.
 * Acepta "12500", "12500,5" o "12500.50" (hasta 2 decimales).
 */
export function parsePriceToCents(input: string): ParseResult {
  const text = input.trim()
  if (!DECIMAL_PATTERN.test(text)) {
    return {
      ok: false,
      error: 'Ingresá solo números, con coma para los centavos. Ej.: 12500 o 12500,50',
    }
  }
  const cents = Math.round(Number(text.replace(',', '.')) * 100)
  if (cents <= 0) {
    return { ok: false, error: 'El precio debe ser mayor que 0.' }
  }
  if (cents > MAX_PRICE_CENTS) {
    return { ok: false, error: 'El precio es demasiado alto.' }
  }
  return { ok: true, value: cents }
}

/**
 * Convierte el porcentaje escrito por el usuario en centésimas de punto
 * porcentual (7,5 % -> 750). Así se evita trabajar con decimales flotantes.
 */
export function parsePercentage(
  input: string,
  operation: PriceOperation,
): ParseResult {
  const text = input.trim()
  if (!DECIMAL_PATTERN.test(text)) {
    return {
      ok: false,
      error: 'Ingresá un porcentaje válido, por ejemplo 10 o 7,5 (hasta 2 decimales).',
    }
  }
  const basisPoints = Math.round(Number(text.replace(',', '.')) * 100)
  if (basisPoints <= 0) {
    return { ok: false, error: 'El porcentaje debe ser mayor que 0.' }
  }
  if (operation === 'decrease' && basisPoints >= 10000) {
    return { ok: false, error: 'Una reducción debe ser menor al 100 %.' }
  }
  if (basisPoints > 100000) {
    return { ok: false, error: 'El porcentaje no puede superar el 1000 %.' }
  }
  return { ok: true, value: basisPoints }
}

/**
 * precio_nuevo = precio_actual × (1 ± porcentaje / 100)
 *
 * Regla de redondeo: se calcula el resultado exacto con enteros y se redondea
 * UNA sola vez al múltiplo más cercano del paso elegido. Si queda exactamente
 * a la mitad, sube (por ejemplo $125 con paso de $50 pasa a $150).
 *
 * Devuelve null si el resultado no es positivo.
 */
export function calculateNewPriceCents(
  currentCents: number,
  basisPoints: number,
  operation: PriceOperation,
  rounding: RoundingMode,
): number | null {
  const sign = operation === 'increase' ? 1n : -1n
  const factor = 10000n + sign * BigInt(basisPoints)
  const step = ROUNDING_STEP_CENTS[rounding]
  const numerator = BigInt(currentCents) * factor
  const denominator = 10000n * step
  const rounded = ((2n * numerator + denominator) / (2n * denominator)) * step
  if (rounded <= 0n) return null
  return Number(rounded)
}

export function buildPreview(
  cuts: Cut[],
  basisPoints: number,
  operation: PriceOperation,
  rounding: RoundingMode,
): PreviewRow[] {
  return cuts.map((cut) => {
    const oldCents = toCents(cut.price)
    const newCents = calculateNewPriceCents(
      oldCents,
      basisPoints,
      operation,
      rounding,
    )
    return {
      cutId: cut.id,
      name: cut.name,
      unit: cut.unit,
      oldPrice: cut.price,
      newPrice: newCents === null ? null : newCents / 100,
      difference: newCents === null ? null : (newCents - oldCents) / 100,
    }
  })
}