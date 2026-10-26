-- Carnicería Pro: actualización masiva de precios.

-- ============================================================
-- calculate_new_price (interna): precio × (1 + porcentaje / 100) con redondeo.
-- Usa aritmética entera en centavos y redondea UNA sola vez, con la mitad hacia
-- arriba. Replica exactamente calculateNewPriceCents de src/utils/pricing.ts.
-- ============================================================
create or replace function public.calculate_new_price(
  p_price numeric,
  p_percentage numeric,
  p_rounding text
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_cents bigint := pg_catalog.round(p_price * 100)::bigint;
  v_basis_points bigint := pg_catalog.round(p_percentage * 100)::bigint;
  v_step bigint;
  v_numerator bigint;
  v_denominator bigint;
begin
  v_step := case p_rounding
    when 'cents' then 1
    when 'peso' then 100
    when 'step50' then 5000
    when 'step100' then 10000
  end;

  if v_step is null then
    raise exception 'La regla de redondeo no es válida.' using errcode = '22023';
  end if;

  v_numerator := v_cents * (10000 + v_basis_points);
  v_denominator := 10000 * v_step;

  return pg_catalog.round(
    (((2 * v_numerator + v_denominator) / (2 * v_denominator)) * v_step)::numeric / 100,
    2
  );
end;
$$;

-- ============================================================
-- apply_bulk_price_update
--
-- p_percentage: con signo (positivo = aumento, negativo = reducción).
-- p_expected: arreglo JSON [{"id": uuid, "price": numeric}, ...] con los precios
--   que el usuario vio en la vista previa. Si el servidor ve otros, o cambió el
--   conjunto de cortes, se rechaza con PT412 (vista previa desactualizada).
-- p_request_id: clave de idempotencia (un reenvío devuelve el lote ya creado).
-- ============================================================
create or replace function public.apply_bulk_price_update(
  p_request_id uuid,
  p_scope text,
  p_percentage numeric,
  p_rounding_mode text,
  p_expected jsonb
)
returns public.price_change_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_batch public.price_change_batches;
  v_rows jsonb;
  v_changed integer;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  -- ---------- Validación de parámetros ----------
  if p_scope is null or p_scope not in ('all_active', 'selected') then
    raise exception 'El alcance de la actualización no es válido.' using errcode = '22023';
  end if;

  if p_rounding_mode is null or p_rounding_mode not in ('cents', 'peso', 'step50', 'step100') then
    raise exception 'La regla de redondeo no es válida.' using errcode = '22023';
  end if;

  if p_percentage is null
     or p_percentage = 0
     or p_percentage <= -100
     or p_percentage > 1000
     or p_percentage <> pg_catalog.round(p_percentage, 2) then
    raise exception 'El porcentaje no es válido.' using errcode = '22023';
  end if;

  if p_expected is null
     or pg_catalog.jsonb_typeof(p_expected) <> 'array'
     or pg_catalog.jsonb_array_length(p_expected) = 0
     or pg_catalog.jsonb_array_length(p_expected) > 5000 then
    raise exception 'La lista de precios de la vista previa no es válida.' using errcode = '22023';
  end if;

  if exists (
       select 1
       from pg_catalog.jsonb_to_recordset(p_expected) as e(id uuid, price numeric)
       where e.id is null or e.price is null
     )
     or (
       select pg_catalog.count(distinct e.id) <> pg_catalog.count(*)
       from pg_catalog.jsonb_to_recordset(p_expected) as e(id uuid, price numeric)
     ) then
    raise exception 'La lista de precios de la vista previa no es válida.' using errcode = '22023';
  end if;

  -- ---------- Idempotencia: el mismo envío no se aplica dos veces ----------
  if p_request_id is not null then
    select * into v_batch
    from public.price_change_batches
    where owner_id = v_uid and request_id = p_request_id;
    if found then
      return v_batch;
    end if;
  end if;

  -- ---------- Bloqueo de los cortes afectados y cálculo ----------
  -- Se ordena por id para bloquear siempre en el mismo orden (evita bloqueos cruzados).
  select coalesce(
           pg_catalog.jsonb_agg(
             pg_catalog.jsonb_build_object(
               'id', t.id,
               'old_price', t.current_price,
               'new_price', t.new_price
             )
           ),
           '[]'::jsonb
         )
    into v_rows
  from (
    select c.id,
           c.current_price,
           public.calculate_new_price(c.current_price, p_percentage, p_rounding_mode) as new_price
    from public.cuts c
    where c.owner_id = v_uid
      and c.is_active
      and (
        p_scope = 'all_active'
        or c.id in (select e.id from pg_catalog.jsonb_to_recordset(p_expected) as e(id uuid, price numeric))
      )
    order by c.id
    for update of c
  ) t;

  -- Si otro envío idéntico terminó mientras esperábamos los bloqueos, se devuelve su lote.
  if p_request_id is not null then
    select * into v_batch
    from public.price_change_batches
    where owner_id = v_uid and request_id = p_request_id;
    if found then
      return v_batch;
    end if;
  end if;

  -- ---------- Vista previa desactualizada ----------
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(v_rows) as r(id uuid, old_price numeric, new_price numeric)
    full join pg_catalog.jsonb_to_recordset(p_expected) as e(id uuid, price numeric)
      on e.id = r.id
    where r.id is null or e.id is null or r.old_price <> e.price
  ) then
    raise exception 'Los precios cambiaron desde que se calculó la vista previa.'
      using errcode = 'PT412';
  end if;

  -- ---------- Resultados válidos ----------
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(v_rows) as r(id uuid, old_price numeric, new_price numeric)
    where r.new_price <= 0 or r.new_price > 9999999999.99
  ) then
    raise exception 'Con ese porcentaje y redondeo algún precio quedaría en cero o fuera de rango.'
      using errcode = '22023';
  end if;

  select pg_catalog.count(*) into v_changed
  from pg_catalog.jsonb_to_recordset(v_rows) as r(id uuid, old_price numeric, new_price numeric)
  where r.new_price <> r.old_price;

  if v_changed = 0 then
    raise exception 'Con ese porcentaje y redondeo ningún precio cambiaría.'
      using errcode = '22023';
  end if;

  -- ---------- Escritura atómica: lote + precios + historial ----------
  insert into public.price_change_batches (
    owner_id, changed_by, operation_type, percentage, rounding_mode,
    selection_scope, affected_count, request_id
  )
  values (
    v_uid, v_uid, 'bulk_update', p_percentage, p_rounding_mode,
    p_scope, v_changed, p_request_id
  )
  returning * into v_batch;

  perform pg_catalog.set_config('app.allow_price_write', 'on', true);

  with changes as (
    select r.id, r.old_price, r.new_price
    from pg_catalog.jsonb_to_recordset(v_rows) as r(id uuid, old_price numeric, new_price numeric)
    where r.new_price <> r.old_price
  ),
  updated as (
    update public.cuts c
    set current_price = ch.new_price
    from changes ch
    where c.id = ch.id and c.owner_id = v_uid
    returning c.id as cut_id, ch.old_price as old_price, c.current_price as new_price
  )
  insert into public.price_history (
    owner_id, cut_id, old_price, new_price, changed_by, batch_id, change_type
  )
  select v_uid, u.cut_id, u.old_price, u.new_price, v_uid, v_batch.id, 'bulk_update'
  from updated u;

  perform pg_catalog.set_config('app.allow_price_write', 'off', true);

  return v_batch;
end;
$$;

-- ============================================================
-- Permisos
-- ============================================================
revoke all on function public.calculate_new_price(numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.apply_bulk_price_update(uuid, text, numeric, text, jsonb) from public, anon;
grant execute on function public.apply_bulk_price_update(uuid, text, numeric, text, jsonb) to authenticated;