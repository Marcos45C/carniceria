// Prueba de humo del entorno local: login, lectura y bloqueo de escrituras.
// Uso: pnpm db:check   (requiere .env.local y el entorno local en marcha)

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const email = process.env.DEMO_EMAIL ?? 'carnicero@demo.local'
const password = process.env.DEMO_PASSWORD ?? 'Demo1234!'

if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local')
  process.exit(1)
}

async function call(path, { token, headers, ...options } = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: response.status, body }
}

function report(ok, message) {
  console.log(`${ok ? '✅' : '❌'} ${message}`)
  if (!ok) process.exitCode = 1
}

// 1. Sin sesión no se puede leer.
const anonymous = await call('/rest/v1/cuts?select=id')
report(
  anonymous.status === 401 || anonymous.status === 403,
  `Sin sesión no se pueden leer cortes (HTTP ${anonymous.status})`,
)

// 2. Inicio de sesión con la cuenta de prueba.
const login = await call('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
})
const token = login.body?.access_token
report(Boolean(token), `Inicio de sesión de ${email} (HTTP ${login.status})`)
if (!token) process.exit(1)

// 3. Lectura con sesión.
const cuts = await call('/rest/v1/cuts?select=id,name,current_price&order=name', { token })
const rows = Array.isArray(cuts.body) ? cuts.body : []
report(cuts.status === 200 && rows.length > 0, `Lectura de cortes con sesión: ${rows.length} cortes`)
if (rows.length === 0) process.exit(1)

// 4. El precio no se puede cambiar directamente.
const priceWrite = await call(`/rest/v1/cuts?id=eq.${rows[0].id}`, {
  token,
  method: 'PATCH',
  body: JSON.stringify({ current_price: 1 }),
})
report(priceWrite.status >= 400, `Cambiar un precio directamente es rechazado (HTTP ${priceWrite.status})`)

// 5. El historial no se puede borrar.
const historyDelete = await call(`/rest/v1/price_history?cut_id=eq.${rows[0].id}`, {
  token,
  method: 'DELETE',
})
report(historyDelete.status >= 400, `Borrar historial es rechazado (HTTP ${historyDelete.status})`)