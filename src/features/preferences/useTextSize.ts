import { useCallback, useState } from 'react'
import { applyTextSize, getStoredTextSize, storeTextSize, type TextSize } from './textSize'

export function useTextSize() {
  const [size, setSize] = useState<TextSize>(getStoredTextSize)

  const changeSize = useCallback((next: TextSize) => {
    setSize(next)
    applyTextSize(next)
    storeTextSize(next)
  }, [])

  return { size, changeSize }
}