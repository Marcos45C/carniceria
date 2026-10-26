import { useCallback, useEffect, useState } from 'react'
import type { Cut, CutDetailsInput, NewCutInput } from '../../types/cut'
import type { BulkUpdateOutcome, BulkUpdateRequest } from '../../types/pricing'
import type { Result } from '../../types/result'
import {
  applyBulkUpdate,
  createCut,
  fetchCuts,
  setCutPrice,
  updateCutDetails,
} from './cutsService'

export type LoadStatus = 'loading' | 'ready' | 'error'

/** Estado de los cortes. La lista solo cambia cuando el servidor confirma. */
export function useCuts() {
  const [cuts, setCuts] = useState<Cut[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyLoad = useCallback((result: Result<Cut[]>) => {
    if (result.ok) {
      setCuts(result.data)
      setLoadError(null)
      setStatus('ready')
    } else {
      setLoadError(result.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchCuts().then((result) => {
      if (!cancelled) applyLoad(result)
    })
    return () => {
      cancelled = true
    }
  }, [applyLoad])

  /** Reintento manual: vuelve a mostrar "cargando". */
  const retry = useCallback(async () => {
    setStatus('loading')
    applyLoad(await fetchCuts())
  }, [applyLoad])

  /** Actualización silenciosa: si falla, conserva lo que ya se ve. */
  const refresh = useCallback(async () => {
    const result = await fetchCuts()
    if (result.ok) setCuts(result.data)
  }, [])

  const replaceCut = useCallback((updated: Cut) => {
    setCuts((previous) => previous.map((cut) => (cut.id === updated.id ? updated : cut)))
  }, [])

  const savePrice = useCallback(
    async (id: string, newPrice: number, expectedPrice: number): Promise<Result<Cut>> => {
      const result = await setCutPrice(id, newPrice, expectedPrice)
      if (result.ok) replaceCut(result.data)
      else if (result.code === 'PT409') void refresh() // alguien cambió el precio
      return result
    },
    [replaceCut, refresh],
  )

  const addCut = useCallback(async (input: NewCutInput): Promise<Result<Cut>> => {
    const result = await createCut(input)
    if (result.ok) setCuts((previous) => [...previous, result.data])
    return result
  }, [])

  const updateCut = useCallback(
    async (id: string, details: CutDetailsInput): Promise<Result<Cut>> => {
      const result = await updateCutDetails(id, details)
      if (result.ok) replaceCut(result.data)
      return result
    },
    [replaceCut],
  )

  /**
   * Aplica una actualización masiva y recarga los cortes antes de devolver
   * el resultado, así la vista previa se recalcula con datos frescos.
   */
  const applyBulk = useCallback(
    async (request: BulkUpdateRequest): Promise<Result<BulkUpdateOutcome>> => {
      const result = await applyBulkUpdate(request)
      if (result.ok || result.code === 'PT412') await refresh()
      return result
    },
    [refresh],
  )

  return { cuts, status, loadError, retry, savePrice, addCut, updateCut, applyBulk }
}