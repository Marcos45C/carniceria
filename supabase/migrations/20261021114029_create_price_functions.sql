-- Carnicería Pro: funciones para crear cortes y cambiar precios.
-- Son la ÚNICA vía del cliente para escribir precios: registran el cambio y su
-- historial en la misma transacción. La guardia del trigger (migración 1)
-- rechaza cualquier otro intento de modificar un precio.

-- ============================================================
-- Validación de precios (interna: no se expone al cliente)
-- ============================================================
create or replace function public.validate_price(p_price numeric)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_price is null
     or p_price <= 0
     or p_price > 9999999999.99
     or p_price <> pg_catalog.round(p_price, 2) then
    raise exception 'El precio debe ser mayor que 0, tener hasta 2 decimales y no superar 9.999.999.999,99.'
      using errcode = '22023';
  end if;
end;
$$;

-- ============================================================
-- create_cut: crea un corte y registra su precio inicial
-- ============================================================
create or replace function public.create_cut(
  p_name text,
  p_category text,
  p_unit text,
  p_price numeric,
  p_is_active boolean default true
)
returns public.cuts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cut public.cuts;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  perform public.validate_price(p_price);

  -- Habilita la escritura de precios solo dentro de esta transacción.
  perform pg_catalog.set_config('app.allow_price_write', 'on', true);

  insert into public.cuts (owner_id, name, category, unit, current_price, is_active)
  values (
    v_uid,
    p_name,
    p_category,
    coalesce(p_unit, 'kg'),
    p_price,
    coalesce(p_is_active, true)
  )
  returning * into v_cut;

  insert into public.price_history (owner_id, cut_id, old_price, new_price, changed_by, change_type)
  values (v_uid, v_cut.id, null, v_cut.current_price, v_uid, 'initial');

  perform pg_catalog.set_config('app.allow_price_write', 'off', true);

  return v_cut;
end;
$$;

-- ============================================================
-- set_cut_price: cambia el precio de un corte y registra el historial
-- ============================================================
create or replace function public.set_cut_price(
  p_cut_id uuid,
  p_new_price numeric,
  p_expected_price numeric default null
)
returns public.cuts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cut public.cuts;
  v_old_price numeric(12,2);
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  perform public.validate_price(p_new_price);

  -- Bloquea la fila: dos envíos simultáneos se procesan uno detrás del otro.
  select * into v_cut
  from public.cuts
  where id = p_cut_id and owner_id = v_uid
  for update;

  if not found then
    raise exception 'No se encontró el corte.' using errcode = 'PT404';
  end if;

  -- Si el usuario vio otro precio, alguien lo cambió mientras tanto.
  if p_expected_price is not null and v_cut.current_price <> p_expected_price then
    raise exception 'El precio de este corte cambió mientras lo editabas.'
      using errcode = 'PT409';
  end if;

  -- Mismo precio: no se genera un cambio innecesario en el historial.
  if v_cut.current_price = p_new_price then
    return v_cut;
  end if;

  v_old_price := v_cut.current_price;

  perform pg_catalog.set_config('app.allow_price_write', 'on', true);

  update public.cuts
  set current_price = p_new_price
  where id = v_cut.id
  returning * into v_cut;

  insert into public.price_history (owner_id, cut_id, old_price, new_price, changed_by, change_type)
  values (v_uid, v_cut.id, v_old_price, v_cut.current_price, v_uid, 'individual');

  perform pg_catalog.set_config('app.allow_price_write', 'off', true);

  return v_cut;
end;
$$;

-- ============================================================
-- Permisos: por defecto Postgres permite ejecutar a PUBLIC. Se revoca.
-- ============================================================
revoke all on function public.validate_price(numeric) from public, anon, authenticated;
revoke all on function public.create_cut(text, text, text, numeric, boolean) from public, anon;
revoke all on function public.set_cut_price(uuid, numeric, numeric) from public, anon;

grant execute on function public.create_cut(text, text, text, numeric, boolean) to authenticated;
grant execute on function public.set_cut_price(uuid, numeric, numeric) to authenticated;