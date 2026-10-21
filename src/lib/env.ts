import { z } from 'zod'
import { isSecretKey } from './keySafety'

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url('VITE_SUPABASE_URL debe ser una URL válida (por ejemplo http://127.0.0.1:54321).'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'Falta VITE_SUPABASE_PUBLISHABLE_KEY.')
    .refine(
      (key) => !isSecretKey(key),
      'Esa es una clave SECRETA. Usá solo la clave Publishable en el frontend.',
    ),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `- ${issue.message}`).join('\n')
  throw new Error(
    `Configuración incompleta. Revisá tu archivo .env.local (ver .env.example):\n${details}`,
  )
}

export const env = parsed.data