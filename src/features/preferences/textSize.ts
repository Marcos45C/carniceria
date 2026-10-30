export type TextSize = 'normal' | 'large' | 'xlarge'

const STORAGE_KEY = 'carniceria-pro:text-size'

export function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large' || value === 'xlarge'
}

/** Lee la preferencia guardada. Si no hay, o el valor no es válido, usa "normal". */
export function getStoredTextSize(): TextSize {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return isTextSize(value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

export function storeTextSize(size: TextSize): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, size)
  } catch {
    // Sin almacenamiento disponible: la preferencia solo dura mientras la página esté abierta.
  }
}

/** Cambia el tamaño de toda la interfaz (ver las reglas html[data-text-size] de index.css). */
export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size
}