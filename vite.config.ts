import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: {
      // Dirección inexistente a propósito: las pruebas nunca deben llegar a un servidor real.
      VITE_SUPABASE_URL: 'http://supabase.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
    },
  },
})