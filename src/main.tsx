import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { applyTextSize, getStoredTextSize } from './features/preferences/textSize'

// Aplica el tamaño de texto guardado antes de dibujar la pantalla.
applyTextSize(getStoredTextSize())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)