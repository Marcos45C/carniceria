import { useCallback, useEffect, useState } from 'react'
import type { Result } from '../../types/result'
import type { Page } from './historyService'

export type NoFilters = Record<string, never>

/** Constante estable para listas sin filtros (evita recargar en cada render). */
export const NO_FILTERS: NoFilters = {}

export type FetchPage<T, F> = (filters: F, offset: number) => Promise<Result<Page<T>>>

interface LoadedState<T, F> {
  filters: F
  token: number
  items: T[]
  total: number
  error: string | null
}

/**
 * Lista paginada con botón "Cargar más". Se recarga sola cuando cambian los
 * filtros y expone `loading` mientras los datos mostrados no corresponden a ellos.
 */
export function usePagedList<T, F>(filters: F, fetchPage: FetchPage<T, F>) {
  const [token, setToken] = useState(0)
  const [state, setState] = useState<LoadedState<T, F> | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchPage(filters, 0).then((result) => {
      if (cancelled) return
      setMoreError(null)
      setState(
        result.ok
          ? { filters, token, items: result.data.items, total: result.data.total, error: null }
          : { filters, token, items: [], total: 0, error: result.message },
      )
    })
    return () => {
      cancelled = true
    }
  }, [filters, fetchPage, token])

  const loading = state === null || state.filters !== filters || state.token !== token

  const reload = useCallback(() => setToken((previous) => previous + 1), [])

  const loadMore = useCallback(async () => {
    if (!state || loadingMore) return
    setLoadingMore(true)
    setMoreError(null)
    const result = await fetchPage(state.filters, state.items.length)
    setLoadingMore(false)
    if (result.ok) {
      setState((previous) =>
        previous
          ? { ...previous, items: [...previous.items, ...result.data.items], total: result.data.total }
          : previous,
      )
    } else {
      setMoreError(result.message)
    }
  }, [state, loadingMore, fetchPage])

  return {
    items: state?.items ?? [],
    total: state?.total ?? 0,
    error: state?.error ?? null,
    loading,
    loadingMore,
    moreError,
    reload,
    loadMore,
  }
}