import { Loader2 } from 'lucide-react'

export function FullScreenLoader() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-3 text-gray-700"
    >
      <Loader2 className="animate-spin" size={24} aria-hidden="true" />
      <span>Cargando…</span>
    </div>
  )
}