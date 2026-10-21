import { z } from 'zod'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresá tu correo electrónico.')
    .email('Ingresá un correo electrónico válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

export interface LoginValues {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginValues, string>>

export type LoginValidation =
  | { ok: true; data: LoginValues }
  | { ok: false; errors: LoginFieldErrors }

export function validateLogin(values: LoginValues): LoginValidation {
  const parsed = loginSchema.safeParse(values)
  if (parsed.success) return { ok: true, data: parsed.data }

  const errors: LoginFieldErrors = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]
    if ((key === 'email' || key === 'password') && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return { ok: false, errors }
}