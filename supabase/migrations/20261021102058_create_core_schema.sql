-- Carnicería Pro: esquema base (tablas, restricciones, índices y triggers).
-- La seguridad (RLS y permisos) está en la migración siguiente.

-- ============================================================
-- Tabla cuts: cortes y su precio actual
-- ============================================================
create table public.cuts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  category text,
  unit text not null default 'kg',
  current_price numeric(12,2) not null,
  price_updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cuts_name_length check (char_length(name) between 1 and 80),
  constraint cuts_category_length check (category is null or char_length(category) between 1 and 40),
  constraint cuts_unit_valid check (unit in ('kg', 'unidad')),
  constraint cuts_price_positive check (current_price > 0),
  -- Permite claves foráneas compuestas que garantizan el mismo propietario.
  constraint cuts_id_owner_unique unique (id, owner_id)
);

-- Un mismo propietario no puede repetir nombres (ignora mayúsculas y espacios).
create unique index cuts_owner_name_unique
  on public.cuts (owner_id, lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))));

create index cuts_owner_active_idx on public.cuts (owner_id, is_active);

-- ============================================================
-- Tabla price_change_batches: actualizaciones masivas y reversiones
-- ============================================================
create table public.price_change_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  changed_by uuid not null references auth.users (id) on delete restrict,
  operation_type text not null,
  -- Con signo: positivo = aumento, negativo = reducción. Nulo en reversiones.
  percentage numeric(7,2),
  rounding_mode text,
  selection_scope text,
  affected_count integer not null,
  original_batch_id uuid,
  -- Clave de idempotencia enviada por el cliente para evitar envíos duplicados.
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint batches_id_owner_unique unique (id, owner_id),
  constraint batches_original_fk
    foreign key (original_batch_id, owner_id)
    references public.price_change_batches (id, owner_id) on delete restrict,
  constraint batches_operation_valid check (operation_type in ('bulk_update', 'reversal')),
  constraint batches_rounding_valid check (rounding_mode is null or rounding_mode in ('cents', 'peso', 'step50', 'step100')),
  constraint batches_scope_valid check (selection_scope is null or selection_scope in ('all_active', 'selected')),
  constraint batches_percentage_range check (percentage is null or (percentage <> 0 and percentage > -100 and percentage <= 1000)),
  constraint batches_count_positive check (affected_count > 0),
  constraint batches_shape check (
    (operation_type = 'bulk_update'
      and percentage is not null and rounding_mode is not null
      and selection_scope is not null and original_batch_id is null)
    or
    (operation_type = 'reversal'
      and percentage is null and rounding_mode is null
      and selection_scope is null and original_batch_id is not null)
  )
);

-- Un lote solo puede revertirse una vez.
create unique index batches_one_reversal_per_original
  on public.price_change_batches (original_batch_id)
  where operation_type = 'reversal';

create unique index batches_request_unique
  on public.price_change_batches (owner_id, request_id)
  where request_id is not null;

create index batches_owner_created_idx
  on public.price_change_batches (owner_id, created_at desc);

-- ============================================================
-- Tabla price_history: historial de cada cambio de precio
-- ============================================================
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  cut_id uuid not null,
  old_price numeric(12,2),
  new_price numeric(12,2) not null,
  changed_at timestamptz not null default now(),
  changed_by uuid not null references auth.users (id) on delete restrict,
  batch_id uuid,
  change_type text not null,
  constraint history_cut_fk
    foreign key (cut_id, owner_id)
    references public.cuts (id, owner_id) on delete restrict,
  constraint history_batch_fk
    foreign key (batch_id, owner_id)
    references public.price_change_batches (id, owner_id) on delete restrict,
  constraint history_type_valid check (change_type in ('initial', 'individual', 'bulk_update', 'reversal')),
  constraint history_new_price_positive check (new_price > 0),
  constraint history_old_price_positive check (old_price is null or old_price > 0),
  -- Solo el alta inicial no tiene precio anterior.
  constraint history_old_price_shape check ((change_type = 'initial') = (old_price is null)),
  -- No se registran cambios que dejen el mismo precio.
  constraint history_price_changed check (old_price is null or old_price <> new_price),
  -- Solo las operaciones masivas y reversiones pertenecen a un lote.
  constraint history_batch_shape check ((change_type in ('bulk_update', 'reversal')) = (batch_id is not null))
);

create index history_owner_changed_idx on public.price_history (owner_id, changed_at desc);
create index history_cut_changed_idx on public.price_history (cut_id, changed_at desc);
create index history_batch_idx on public.price_history (batch_id) where batch_id is not null;

-- ============================================================
-- Trigger de cuts: normalización, auditoría y guardia de precios
-- ============================================================
create or replace function public.cuts_guard_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'No se puede cambiar el propietario de un corte.'
      using errcode = '42501';
  end if;

  -- Normaliza espacios accidentales.
  new.name := pg_catalog.btrim(pg_catalog.regexp_replace(new.name, '\s+', ' ', 'g'));
  new.category := nullif(
    pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(new.category, ''), '\s+', ' ', 'g')),
    ''
  );
  new.updated_at := pg_catalog.now();

  -- Guardia: el precio (y su fecha) solo se escribe desde las funciones de
  -- precios, que activan este indicador dentro de su propia transacción
  -- y registran el historial.
  if tg_op = 'INSERT'
     or new.current_price is distinct from old.current_price
     or new.price_updated_at is distinct from old.price_updated_at then
    if coalesce(pg_catalog.current_setting('app.allow_price_write', true), '') <> 'on' then
      raise exception 'El precio solo puede modificarse con las funciones de precios, que registran el historial.'
        using errcode = '42501';
    end if;
  end if;

  -- La fecha de precio la asigna la base de datos y solo cambia si cambia el precio.
  if tg_op = 'UPDATE' and new.current_price is distinct from old.current_price then
    new.price_updated_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

create trigger cuts_guard_changes
  before insert or update on public.cuts
  for each row execute function public.cuts_guard_changes();

-- ============================================================
-- Triggers: el historial y los lotes son inmutables
-- ============================================================
create or replace function public.prevent_audit_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'El historial de precios no se puede modificar ni borrar.'
    using errcode = '42501';
end;
$$;

create trigger price_history_immutable
  before update or delete on public.price_history
  for each row execute function public.prevent_audit_changes();

create trigger price_history_no_truncate
  before truncate on public.price_history
  for each statement execute function public.prevent_audit_changes();

create trigger price_change_batches_immutable
  before update or delete on public.price_change_batches
  for each row execute function public.prevent_audit_changes();

create trigger price_change_batches_no_truncate
  before truncate on public.price_change_batches
  for each statement execute function public.prevent_audit_changes();