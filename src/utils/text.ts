/** Para búsquedas: ignora mayúsculas, tildes y espacios repetidos. */
export function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Para detectar nombres duplicados: ignora mayúsculas y espacios accidentales. */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}