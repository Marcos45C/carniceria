import { Loader2 } from 'lucide-react'
import { btnSecondary } from './styles'

export function LoadingBox({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-8 text-gray-700"
    >
      <Loader2 className="animate-spin" size={22} aria-hidden="true" />
      {label}
    </div>
  )
}

interface ErrorBoxProps {
  title: string
  message: string | null
  onRetry: () => void
}

export function ErrorBox({ title, message, onRetry }: ErrorBoxProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="font-semibold text-error-600">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-700">{message}</p>}
      <button type="button" onClick={onRetry} className={`${btnSecondary} mt-3`}>
        Reintentar
      </button>
    </div>
  )
}