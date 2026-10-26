// Argentina no usa horario de verano: UTC-3 todo el año.
const OFFSET = '-03:00'

/** "2026-10-14" -> inicio de ese día en Argentina. */
export function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000${OFFSET}`
}

/** "2026-10-14" -> último instante de ese día en Argentina. */
export function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999${OFFSET}`
}