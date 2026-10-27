# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Usa la versión de pnpm fijada en "packageManager" de package.json
RUN corepack enable
WORKDIR /app

# ---------- Dependencias ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# --ignore-scripts evita descargar el binario de Supabase CLI, que el frontend no usa.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---------- Desarrollo (servidor de Vite con recarga en caliente) ----------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ---------- Pruebas ----------
FROM deps AS test
COPY . .
CMD ["pnpm", "test"]

# ---------- Build de producción ----------
FROM deps AS build
COPY . .
# Son valores PÚBLICOS (URL y clave publishable). Nunca pases claves secretas.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
# Falla con un mensaje claro si faltan (pnpm docker:preview las toma de .env.local).
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
    || (echo "ERROR: faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local" && exit 1)
RUN pnpm run build

# ---------- Vista previa del build (nginx) ----------
FROM nginx:1.27-alpine AS preview
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80