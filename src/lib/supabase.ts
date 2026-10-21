import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { env } from './env'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // No usamos enlaces mágicos ni OAuth, así que no hace falta leer la URL.
      detectSessionInUrl: false,
    },
  },
)