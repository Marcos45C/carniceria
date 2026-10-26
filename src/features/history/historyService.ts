import { supabase } from '../../lib/supabase'
import type {
  ChangeType,
  HistoryFilters,
  PriceBatch,
  PriceHistoryEntry,
} from '../../types/history'
import type { Database } from '../../types/database.types'
import type { RoundingMode, SelectionScope } from '../../types/pricing'
import type { Result } from '../../types/result'
import { endOfDayIso, startOfDayIso } from '../../utils/dateRange'
import { ROUNDING_MODES } from '../../utils/pricing'
import { toFriendlyDbMessage } from '../cuts/cutErrors'
import type { NoFilters } from './usePagedList'

export const PAGE_SIZE = 50

export interface Page<T> {
  items: T[]
  total: number
}

type HistoryRow = Database['public']['Tables']['price_history']['Row']
type BatchRow = Database['public']['Tables']['price_change_batches']['Row']

const CHANGE_TYPES: ChangeType[] = ['initial', 'individual', 'bulk_update', 'reversal']

function toChangeType(value: string): ChangeType {
  return CHANGE_TYPES.find((type) => type === value) ?? 'individual'
}

function toRounding(value: string | null): RoundingMode | null {
  return ROUNDING_MODES.find((mode) => mode === value) ?? null
}

function toScope(value: string | null): SelectionScope | null {
  return value === 'all_active' || value === 'selected' ? value : null
}

function toEntry(row: HistoryRow): PriceHistoryEntry {
  return {
    id: row.id,
    cutId: row.cut_id,
    oldPrice: row.old_price === null ? null : Number(row.old_price),
    newPrice: Number(row.new_price),
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    batchId: row.batch_id,
    changeType: toChangeType(row.change_type),
  }
}

function toBatch(row: BatchRow): PriceBatch {
  return {
    id: row.id,
    operationType: row.operation_type === 'reversal' ? 'reversal' : 'bulk_update',
    percentage: row.percentage === null ? null : Number(row.percentage),
    roundingMode: toRounding(row.rounding_mode),
    selectionScope: toScope(row.selection_scope),
    affectedCount: row.affected_count,
    createdAt: row.created_at,
    changedBy: row.changed_by,
    originalBatchId: row.original_batch_id,
  }
}

function failure(error: { code?: string; message: string }): Result<never> {
  return { ok: false, message: toFriendlyDbMessage(error), code: error.code }
}

/** Una página del historial, más reciente primero, con filtros aplicados en el servidor. */
export async function fetchHistoryPage(
  filters: HistoryFilters,
  offset: number,
): Promise<Result<Page<PriceHistoryEntry>>> {
  let query = supabase.from('price_history').select('*', { count: 'exact' })
  if (filters.cutId) query = query.eq('cut_id', filters.cutId)
  if (filters.changeType) query = query.eq('change_type', filters.changeType)
  if (filters.dateFrom) query = query.gte('changed_at', startOfDayIso(filters.dateFrom))
  if (filters.dateTo) query = query.lte('changed_at', endOfDayIso(filters.dateTo))

  const { data, error, count } = await query
    .order('changed_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return failure(error)
  return { ok: true, data: { items: data.map(toEntry), total: count ?? data.length } }
}

/** Una página de operaciones masivas y reversiones, más reciente primero. */
export async function fetchBatchPage(
  _filters: NoFilters,
  offset: number,
): Promise<Result<Page<PriceBatch>>> {
  const { data, error, count } = await supabase
    .from('price_change_batches')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return failure(error)
  return { ok: true, data: { items: data.map(toBatch), total: count ?? data.length } }
}

/** Todos los cortes modificados por una misma operación. */
export async function fetchBatchEntries(batchId: string): Promise<Result<PriceHistoryEntry[]>> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('batch_id', batchId)
    .order('id')

  if (error) return failure(error)
  return { ok: true, data: data.map(toEntry) }
}