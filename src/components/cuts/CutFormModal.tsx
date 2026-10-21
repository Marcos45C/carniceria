import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { btnPrimary, btnSecondary, inputClass } from '../ui/styles'
import type { Cut, CutUnit } from '../../types/cut'
import type { Result } from '../../types/result'
import {
  validateCutForm,
  type CutFormErrors,
  type CutFormValues,
  type ValidCutData,
} from '../../features/cuts/cutRules'

interface CutFormModalProps {
  mode: 'create' | 'edit'
  cut?: Cut
  cuts: Cut[]
  categories: string[]
  /** Debe devolver el resultado del servidor. El padre cierra el modal si salió bien. */
  onSubmit: (data: ValidCutData) => Promise<Result<Cut>>
  onClose: () => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-error-600">
      {message}
    </p>
  )
}

export function CutFormModal({ mode, cut, cuts, categories, onSubmit, onClose }: CutFormModalProps) {
  const isCreate = mode === 'create'
  const [values, setValues] = useState<CutFormValues>({
    name: cut?.name ?? '',
    category: cut?.category ?? '',
    unit: cut?.unit ?? 'kg',
    price: '',
    isActive: cut?.isActive ?? true,
  })
  const [errors, setErrors] = useState<CutFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function setValue<K extends keyof CutFormValues>(key: K, value: CutFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // evita envíos duplicados

    const validation = validateCutForm(values, cuts, {
      editingId: cut?.id,
      requirePrice: isCreate,
    })
    if (!validation.ok) {
      setErrors(validation.errors)
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      const result = await onSubmit(validation.data)
      if (!result.ok) {
        if (result.code === '23505') setErrors({ name: result.message })
        else setFormError(result.message)
        setSubmitting(false)
      }
    } catch {
      setFormError('Ocurrió un error inesperado. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isCreate ? 'Agregar corte' : 'Editar datos del corte'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" form="cut-form" disabled={submitting} className={btnPrimary}>
            {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Guardando…' : isCreate ? 'Agregar corte' : 'Guardar cambios'}
          </button>
        </div>
      }
    >
      <form id="cut-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error-600"
          >
            {formError}
          </p>
        )}

        <div>
          <label htmlFor="cut-name" className="mb-1 block font-semibold">
            Nombre
          </label>
          <input
            id="cut-name"
            type="text"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'cut-name-error' : undefined}
            className={inputClass}
          />
          <FieldError id="cut-name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="cut-category" className="mb-1 block font-semibold">
            Categoría <span className="font-normal text-gray-600">(opcional)</span>
          </label>
          <input
            id="cut-category"
            type="text"
            list="cut-categories"
            value={values.category}
            onChange={(event) => setValue('category', event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'cut-category-error' : undefined}
            className={inputClass}
          />
          <datalist id="cut-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <FieldError id="cut-category-error" message={errors.category} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cut-unit" className="mb-1 block font-semibold">
              Unidad
            </label>
            <select
              id="cut-unit"
              value={values.unit}
              onChange={(event) => setValue('unit', event.target.value as CutUnit)}
              className={inputClass}
            >
              <option value="kg">kg</option>
              <option value="unidad">unidad</option>
            </select>
          </div>

          {isCreate && (
            <div>
              <label htmlFor="cut-price" className="mb-1 block font-semibold">
                Precio inicial
              </label>
              <input
                id="cut-price"
                type="text"
                inputMode="decimal"
                placeholder="Ej.: 12500,50"
                value={values.price}
                onChange={(event) => setValue('price', event.target.value)}
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? 'cut-price-error' : undefined}
                className={inputClass}
              />
              <FieldError id="cut-price-error" message={errors.price} />
            </div>
          )}
        </div>

        {!isCreate && (
          <p className="text-sm text-gray-600">
            El precio se modifica desde el listado, para que quede registrado en el historial.
          </p>
        )}

        <div>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValue('isActive', event.target.checked)}
              className="size-5 accent-brand-700"
            />
            Corte activo
          </label>
          <p className="text-sm text-gray-600">
            Los cortes inactivos no entran en las actualizaciones masivas. Su historial se conserva.
          </p>
        </div>
      </form>
    </Modal>
  )
}