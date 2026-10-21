interface DbErrorLike {
  code?: string
  message: string
}

/** Traduce errores de PostgreSQL / PostgREST a mensajes comprensibles. */
export function toFriendlyDbMessage(error: DbErrorLike): string {
  switch (error.code) {
    case '23505':
      return 'Ya existe un corte con ese nombre.'
    case 'PT409':
      return 'El precio de este corte cambió mientras lo editabas. Se actualizó la lista: revisá el precio e intentá de nuevo.'
    case 'PT404':
    case 'PGRST116':
      return 'No se encontró el corte. Actualizá la lista e intentá de nuevo.'
    case '22023':
      return 'El precio no es válido.'
    case '23514':
      return 'Algún dato no es válido. Revisá el formulario.'
    case '42501':
    case 'PGRST301':
      return 'Tu sesión no tiene permiso para esta operación. Volvé a iniciar sesión.'
    default:
      break
  }
  if (/fetch|network/i.test(error.message)) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión.'
  }
  return 'No se pudo completar la operación. Intentá de nuevo.'
}