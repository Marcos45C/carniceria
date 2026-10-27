## Comandos :
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build

pnpm db:test
pnpm db:check
pnpm typecheck
pnpm lint
pnpm test


# Carnicería Pro

Aplicación web responsive para que el dueño de una carnicería argentina administre los precios de sus cortes desde el teléfono o la computadora: consultar, editar, actualizar en bloque con vista previa, ver el historial completo y revertir actualizaciones masivas de forma segura.

> Los datos de demostración y las credenciales de este repositorio son **solo para desarrollo local**. Nunca se usan en producción.

## Funcionalidades

- Inicio de sesión con correo y contraseña (sin registro público; la cuenta se crea a mano).
- Listado de cortes (tabla en computadora, tarjetas en móvil) con búsqueda, filtro por categoría y por estado.
- Edición de precio en línea, con fecha del último cambio real de precio.
- Alta y edición de cortes; desactivación sin perder el historial.
- Actualización masiva por porcentaje (aumento o reducción) a todos los cortes activos o a una selección, con cuatro reglas de redondeo y **vista previa** antes de confirmar.
- Historial de precios con filtros (corte, fecha, tipo) y agrupación por operación masiva.
- Reversión de una actualización masiva, solo si ningún precio cambió después.

## Tecnologías

React · TypeScript (modo estricto) · Vite · Tailwind CSS · React Router · Zod · Lucide · Supabase (Auth + PostgreSQL + RLS) · Vitest + React Testing Library · pgTAP · Docker · GitHub Actions · Netlify · pnpm.

## Arquitectura

```text
┌────────────────────────┐        HTTPS         ┌────────────────────────────────┐
│ Navegador (React SPA)  │ ───────────────────▶ │ Supabase                       │
│  - UI y validaciones   │   clave publishable  │  - Auth (sin registro público) │
│  - cálculo de la vista │                      │  - PostgreSQL + RLS            │
│    previa              │ ◀─────────────────── │  - Funciones RPC atómicas      │
└────────────────────────┘                      └────────────────────────────────┘
        ▲ publicado en Netlify
```

- **No hay backend propio.** Supabase es el backend.
- **Los precios solo se escriben mediante funciones SQL** (`create_cut`, `set_cut_price`, `apply_bulk_price_update`, `revert_bulk_price_update`). Cada una guarda el cambio y su historial **en la misma transacción**. Un trigger rechaza cualquier otro intento de cambiar un precio, incluso desde el panel de Supabase.
- **El redondeo es idéntico en el cliente y el servidor** (aritmética entera en centavos, mitad hacia arriba), verificado con pruebas en ambos lados.
- **El historial es inmutable** (sin permisos y con triggers que lo impiden).
- **RLS** limita cada tabla al propietario. Los usuarios anónimos no tienen permisos.

Detalles de seguridad verificados por pruebas automáticas: `supabase/tests/database/`.

## Estructura del proyecto

```text
carniceria-pro/
├── .github/workflows/ci.yml     Integración continua
├── docker/nginx.conf            Servidor de la vista previa del build
├── scripts/check-supabase.mjs   Prueba de humo del entorno local
├── src/
│   ├── components/              Interfaz (cuts, history, layout, pricing, ui)
│   ├── features/                Lógica por dominio (auth, cuts, history)
│   ├── lib/                     Cliente de Supabase y validación de entorno
│   ├── pages/                   Pantallas
│   ├── routes/                  Rutas públicas y protegidas
│   ├── test/                    Configuración y datos de prueba
│   ├── types/                   Tipos (incluye los generados de la base)
│   └── utils/                   Cálculo de precios, formatos, fechas
├── supabase/
│   ├── config.toml
│   ├── migrations/              Esquema, seguridad y funciones (versionadas)
│   ├── tests/database/          Pruebas pgTAP
│   └── seed.sql                 Datos de demostración (SOLO local)
├── Dockerfile · docker-compose.yml · netlify.toml
└── .env.example
```

## Requisitos

- Node.js 22 (ver `.nvmrc`) y pnpm (versión en `packageManager` de `package.json`).
- Docker (para Supabase local).
- Git.

## Configuración local

```bash
pnpm install
pnpm approve-builds        # aprobar "supabase" (descarga el binario de la CLI)
pnpm db:start              # levanta Supabase local (la primera vez tarda)
pnpm db:status             # muestra la URL y la clave Publishable
cp .env.example .env.local # y completar con esos valores
pnpm dev                   # http://localhost:5173
```

Cuenta de demostración local: `carnicero@demo.local` / `Demo1234!`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase (local: `http://127.0.0.1:54321`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave **publishable** (`sb_publishable_...`). Es pública por diseño; la seguridad depende de RLS. |

La aplicación **se niega a arrancar** si se usa una clave secreta (`sb_secret_...` o `service_role`). **Nunca** pongas claves secretas en el frontend ni en el repositorio.

## Supabase local con Docker

| Comando | Qué hace |
|---|---|
| `pnpm db:start` / `pnpm db:stop` | Inicia o detiene los servicios locales. |
| `pnpm db:status` | Muestra URLs y claves locales. |
| `pnpm db:reset` | Recrea la base: aplica todas las migraciones y el seed. |
| `pnpm db:types` | Regenera `src/types/database.types.ts`. |
| `pnpm db:test` | Ejecuta las pruebas pgTAP. |
| `pnpm db:check` | Prueba de humo contra el entorno local (modifica datos de prueba). |

Panel local (Studio): `http://127.0.0.1:54323`.

## Pruebas

```bash
pnpm lint
pnpm typecheck
pnpm test            # frontend (Vitest + Testing Library)
pnpm db:test         # base de datos (pgTAP): RLS, funciones, atomicidad, reversión
pnpm test:coverage   # informe de cobertura (opcional)
```

## Migraciones

```bash
pnpm exec supabase migration new nombre_descriptivo   # crea el archivo
# editar supabase/migrations/<fecha>_nombre_descriptivo.sql
pnpm db:reset      # aplica todo desde cero
pnpm db:types      # regenera los tipos
pnpm db:test
```

El esquema se reconstruye íntegramente desde `supabase/migrations/`. No hagas cambios de esquema a mano en el panel.

## Docker del frontend

```bash
pnpm docker:dev        # servidor de desarrollo en http://localhost:5173
pnpm docker:test       # pruebas dentro de un contenedor
pnpm docker:preview    # build de producción con nginx en http://localhost:8080
```

Supabase local sigue usando `pnpm db:start`. Si cambias dependencias, ejecuta `docker compose down -v` antes de volver a construir.

## Cuenta del carnicero (producción)

No existe registro público. La cuenta se crea manualmente:

1. Panel de Supabase → **Authentication → Users → Add user → Create new user**.
2. Indicar correo y contraseña y marcar **Auto Confirm User**.

## Publicación en Netlify

1. Subir el repositorio a GitHub.
2. En Supabase (producción): crear el proyecto, enlazarlo y aplicar las migraciones:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref-del-proyecto>
   pnpm exec supabase db push --dry-run
   pnpm exec supabase db push
   ```
   El seed **no** se sube a producción.
3. En Supabase → **Authentication → Configuration → Sign In / Providers**: dejar **Email** habilitado y **desactivar «Allow new users to sign up»**.
4. En Netlify: **Add new site → Import an existing project → GitHub**, elegir el repositorio. Netlify toma el comando de build (`pnpm run build`) y el directorio (`dist`) de `netlify.toml`.
5. En Netlify → **Site configuration → Environment variables**, crear `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (valores públicos de producción) y redesplegar.
6. En Supabase → **Authentication → Configuration → URL Configuration**: configurar **Site URL** con la URL publicada (y agregarla en *Redirect URLs*).
7. Crear la cuenta del carnicero (sección anterior).

### Actualizaciones posteriores

- Cambios de código: `git push` a `main`; Netlify publica solo.
- Cambios de base de datos: crear la migración, probarla localmente, aplicarla con `supabase db push` **antes** de publicar el código que la use.

## Solución de errores comunes

| Síntoma | Causa y solución |
|---|---|
| «fetch failed» / `ECONNREFUSED` en `db:*` | Supabase local no está corriendo: `pnpm db:start`. |
| «Cannot connect to the Docker daemon» | Docker no está abierto. |
| Pantalla en blanco y error de configuración | Falta o es incorrecto `.env.local`. Reiniciar `pnpm dev` tras cambiarlo. |
| El login falla con 422 | En `supabase/config.toml`, `[auth.email] enable_signup` debe ser `true`; el registro público se apaga con `[auth] enable_signup = false`. |
| `pnpm lint` falla con «does not support TS 7» | Fijar TypeScript en 6.0: `pnpm add -D typescript@~6.0.3`. |
| Tipos desactualizados (`database.types.ts`) | `pnpm db:reset && pnpm db:types`. |
| Netlify: recargar `/historial` da 404 | Falta el redirect de `netlify.toml`. |
| Netlify: la app dice «Configuración incompleta» | Faltan las variables `VITE_*`; cargarlas y redesplegar (no se aplican a despliegues ya hechos). |
| Netlify: falla por «secrets scanning» | Verificar `SECRETS_SCAN_OMIT_KEYS` en `netlify.toml`. |