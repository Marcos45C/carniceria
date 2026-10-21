import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const authMocks = vi.hoisted(() => ({
  subscribeToSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

const cutsMocks = vi.hoisted(() => ({
  fetchCuts: vi.fn(),
  createCut: vi.fn(),
  updateCutDetails: vi.fn(),
  setCutPrice: vi.fn(),
}))

// Reemplazan el acceso real a Supabase: estas pruebas no necesitan servidor.
vi.mock('./features/auth/authService', () => authMocks)
vi.mock('./features/cuts/cutsService', () => cutsMocks)

const demoSession = {
  user: { id: 'user-1', email: 'carnicero@demo.local' },
} as unknown as Session

let emitSession: (session: Session | null) => void = () => {}

function mockInitialSession(initial: Session | null) {
  authMocks.subscribeToSession.mockImplementation(
    (callback: (session: Session | null) => void) => {
      emitSession = callback
      callback(initial)
      return () => {}
    },
  )
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  cutsMocks.fetchCuts.mockResolvedValue({ ok: true, data: [] })
  authMocks.signOut.mockImplementation(async () => {
    emitSession(null)
  })
})

describe('rutas protegidas', () => {
  it('redirige al login cuando no hay sesión y no muestra contenido privado', async () => {
    mockInitialSession(null)
    renderApp('/')

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /actualizar precios/i })).not.toBeInTheDocument()
  })

  it('muestra el dashboard cuando hay sesión', async () => {
    mockInitialSession(demoSession)
    renderApp('/')

    expect(await screen.findByRole('button', { name: /actualizar precios/i })).toBeInTheDocument()
    expect(screen.getByText('carnicero@demo.local')).toBeInTheDocument()
  })

  it('redirige del login al dashboard si ya hay sesión', async () => {
    mockInitialSession(demoSession)
    renderApp('/login')

    expect(await screen.findByRole('button', { name: /actualizar precios/i })).toBeInTheDocument()
  })

  it('cierra la sesión y vuelve al login', async () => {
    const user = userEvent.setup()
    mockInitialSession(demoSession)
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(authMocks.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('pantalla de login', () => {
  it('valida los campos antes de llamar al servidor', async () => {
    const user = userEvent.setup()
    mockInitialSession(null)
    renderApp('/login')

    await user.type(await screen.findByLabelText('Correo electrónico'), 'no-es-un-correo')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText('Ingresá un correo electrónico válido.')).toBeInTheDocument()
    expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument()
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('muestra el error cuando las credenciales son incorrectas', async () => {
    const user = userEvent.setup()
    mockInitialSession(null)
    authMocks.signInWithPassword.mockResolvedValue({
      ok: false,
      message: 'Correo o contraseña incorrectos.',
    })
    renderApp('/login')

    await user.type(await screen.findByLabelText('Correo electrónico'), 'carnicero@demo.local')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(authMocks.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('inicia sesión y muestra el dashboard', async () => {
    const user = userEvent.setup()
    mockInitialSession(null)
    authMocks.signInWithPassword.mockImplementation(async () => {
      emitSession(demoSession)
      return { ok: true }
    })
    renderApp('/login')

    await user.type(await screen.findByLabelText('Correo electrónico'), 'carnicero@demo.local')
    await user.type(screen.getByLabelText('Contraseña'), 'Demo1234!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('button', { name: /actualizar precios/i })).toBeInTheDocument()
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith('carnicero@demo.local', 'Demo1234!')
  })

  it('permite mostrar y ocultar la contraseña', async () => {
    const user = userEvent.setup()
    mockInitialSession(null)
    renderApp('/login')

    const input = await screen.findByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})