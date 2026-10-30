import { useState } from 'react'
import type { FormEvent } from 'react'
import { Beef, Eye, EyeOff, Loader2 } from 'lucide-react'
import { btnPrimary, inputBase, inputClass } from '../components/ui/styles'
import { validateLogin, type LoginFieldErrors } from '../features/auth/loginSchema'
import { useAuth } from '../features/auth/useAuth'
import { TextSizeControl } from '../components/ui/TextSizeControl'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // evita envíos duplicados

    const validation = validateLogin({ email, password })
    if (!validation.ok) {
      setFieldErrors(validation.errors)
      setFormError(null)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      const result = await signIn(validation.data.email, validation.data.password)
      if (!result.ok) {
        setFormError(result.message)
        setSubmitting(false)
      }
      // Si salió bien, la ruta pública redirige sola al detectar la sesión.
    } catch {
      setFormError('Ocurrió un error inesperado. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-brand-100 p-4 text-brand-700">
            <Beef size={36} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-brand-700">Carnicería Pro</h1>
          <p className="text-gray-600">Gestión de precios</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Ingresá a tu cuenta</h2>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error-600"
            >
              {formError}
            </p>
          )}

          <div>
            <label htmlFor="login-email" className="mb-1 block font-semibold">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.email && (
              <p id="login-email-error" role="alert" className="mt-1 text-sm text-error-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block font-semibold">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                className={`${inputBase} pl-3 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="login-password-error" role="alert" className="mt-1 text-sm text-error-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-3 text-lg`}>
            {submitting && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-gray-600">Tamaño del texto</p>
            <TextSizeControl variant="onLight" />
        </div>
      </div>
    </main>
  )
}