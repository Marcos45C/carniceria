import { supabase } from '../../lib/supabase'
import type { Cut, CutDetailsInput, NewCutInput } from '../../types/cut'
import type { Database } from '../../types/database.types'
import type { BulkUpdateOutcome, BulkUpdateRequest } from '../../types/pricing'
import type { Result } from '../../types/result'
import { toFriendlyDbMessage } from './cutErrors'

type CutRow = Database['public']['Tables']['cuts']['Row']

function toCut(row: CutRow): Cut {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit === 'unidad' ? 'unidad' : 'kg',
    price: Number(row.current_price),
    priceUpdatedAt: row.price_updated_at,
    isActive: row.is_active,
  }
}

function failure(error: { code?: string; message: string }): Result<never> {
  return { ok: false, message: toFriendlyDbMessage(error), code: error.code }
}

/** Devuelve todos los cortes del usuario (activos e inactivos). */
export async function fetchCuts(): Promise<Result<Cut[]>> {
  const { data, error } = await supabase.from('cuts').select('*').order('name')
  if (error) return failure(error)
  return { ok: true, data: data.map(toCut) }
}

/** Crea un corte y registra su precio inicial en el historial (en el servidor). */
export async function createCut(input: NewCutInput): Promise<Result<Cut>> {
  const { data, error } = await supabase.rpc('create_cut', {
    p_name: input.name,
    p_category: input.category ?? '',
    p_unit: input.unit,
    p_price: input.price,
    p_is_active: input.isActive,
  })
  if (error) return failure(error)
  return { ok: true, data: toCut(data) }
}

/** Edita solo datos descriptivos. El precio y su fecha no se tocan. */
export async function updateCutDetails(
  id: string,
  details: CutDetailsInput,
): Promise<Result<Cut>> {
  const { data, error } = await supabase
    .from('cuts')
    .update({
      name: details.name,
      category: details.category,
      unit: details.unit,
      is_active: details.isActive,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return failure(error)
  return { ok: true, data: toCut(data) }
}

/**
 * Cambia el precio con la función oficial, que registra el historial.
 * `expectedPrice` es el precio que el usuario estaba viendo: si ya es otro,
 * el servidor rechaza el cambio.
 */
export async function setCutPrice(
  id: string,
  newPrice: number,
  expectedPrice: number,
): Promise<Result<Cut>> {
  const { data, error } = await supabase.rpc('set_cut_price', {
    p_cut_id: id,
    p_new_price: newPrice,
    p_expected_price: expectedPrice,
  })
  if (error) return failure(error)
  return { ok: true, data: toCut(data) }
}

/**
 * Aplica una actualización masiva. El servidor revalida todo: si los precios
 * ya no coinciden con los de la vista previa, rechaza con el código PT412.
 */
export async function applyBulkUpdate(
  request: BulkUpdateRequest,
): Promise<Result<BulkUpdateOutcome>> {
  const signedBasisPoints =
    request.operation === 'increase' ? request.basisPoints : -request.basisPoints

  const { data, error } = await supabase.rpc('apply_bulk_price_update', {
    p_request_id: request.requestId,
    p_scope: request.scope,
    p_percentage: signedBasisPoints / 100,
    p_rounding_mode: request.rounding,
    p_expected: request.expected.map((item) => ({ id: item.id, price: item.price })),
  })
  if (error) return failure(error)
  return { ok: true, data: { batchId: data.id, affectedCount: data.affected_count } }
}