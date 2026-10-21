import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { SignInResult } from '../../types/auth'
import { toFriendlyAuthMessage } from './authErrors'

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: toFriendlyAuthMessage(error) }
  return { ok: true }
}

/** Cierra solo la sesión de este dispositivo (no las de otros dispositivos). */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) console.error('No se pudo cerrar la sesión:', error.message)
}

/**
 * Avisa cada vez que cambia la sesión. El callback es síncrono a propósito:
 * Supabase recomienda no hacer `await` a otras funciones dentro del listener.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeToSession(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}