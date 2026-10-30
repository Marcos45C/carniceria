import { beforeEach, describe, expect, it } from 'vitest'
import { applyTextSize, getStoredTextSize, storeTextSize } from './textSize'

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.textSize
})

describe('tamaño de texto', () => {
  it('usa "normal" si no hay nada guardado', () => {
    expect(getStoredTextSize()).toBe('normal')
  })

  it('recupera el tamaño guardado', () => {
    storeTextSize('large')
    expect(getStoredTextSize()).toBe('large')
  })

  it('ignora valores guardados que no son válidos', () => {
    window.localStorage.setItem('carniceria-pro:text-size', 'gigante')
    expect(getStoredTextSize()).toBe('normal')
  })

  it('aplica el tamaño al documento', () => {
    applyTextSize('xlarge')
    expect(document.documentElement.dataset.textSize).toBe('xlarge')
  })
})