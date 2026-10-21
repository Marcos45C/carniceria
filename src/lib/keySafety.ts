/**
 * Detecta claves de servidor que NUNCA deben estar en el frontend:
 * las nuevas `sb_secret_...` y las antiguas `service_role` (JWT).
 */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  try {
    const payload = key.split('.')[1] ?? ''
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: unknown }).role === 'service_role'
  } catch {
    return false
  }
}