-- Carnicería Pro: Row Level Security y permisos.

alter table public.cuts enable row level security;
alter table public.price_change_batches enable row level security;
alter table public.price_history enable row level security;

-- Partimos de cero: ningún permiso para anónimos ni para usuarios autenticados.
revoke all on table public.cuts from public, anon, authenticated;
revoke all on table public.price_change_batches from public, anon, authenticated;
revoke all on table public.price_history from public, anon, authenticated;

-- Lectura para usuarios autenticados (RLS la limita al propietario).
grant select on table public.cuts to authenticated;
grant select on table public.price_change_batches to authenticated;
grant select on table public.price_history to authenticated;

-- El cliente solo puede editar datos descriptivos. No puede tocar el precio,
-- su fecha, el propietario ni las marcas de auditoría. No hay INSERT ni DELETE:
-- crear cortes y cambiar precios se hará con funciones (Etapas 5 a 7).
grant update (name, category, unit, is_active) on table public.cuts to authenticated;

-- (select auth.uid()) se evalúa una sola vez por consulta (mejor rendimiento).
create policy "Propietario lee sus cortes"
  on public.cuts for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Propietario edita datos descriptivos de sus cortes"
  on public.cuts for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Propietario lee sus lotes"
  on public.price_change_batches for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Propietario lee su historial"
  on public.price_history for select to authenticated
  using (owner_id = (select auth.uid()));