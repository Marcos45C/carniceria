interface AuthErrorLike {
  code?: string
  status?: number
  message: string
}

/** Traduce los errores de Supabase Auth a mensajes comprensibles. */
export function toFriendlyAuthMessage(error: AuthErrorLike): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Tu correo todavía no fue confirmado.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Esperá un momento y volvé a intentar.'
    case 'user_banned':
      return 'Esta cuenta está deshabilitada.'
    default:
      break
  }
  if (error.status === 0 || /fetch|network/i.test(error.message)) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión.'
  }
  return 'No se pudo iniciar sesión. Intentá de nuevo.'
}