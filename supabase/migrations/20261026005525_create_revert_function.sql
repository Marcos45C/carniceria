-- Carnicería Pro: reversión de actualizaciones masivas.
--
-- Una reversión es una operación NUEVA y auditada: crea su propio lote (tipo
-- 'reversal') y una fila de historial por corte. No modifica ni borra el
-- historial original. Si algún precio cambió después de la actualización, no
-- se revierte nada (PT422): nunca se pisan cambios posteriores en silencio.

create or replace function public.revert_bulk_price_update(
  p_request_id uuid,
  p_batch_id uuid
)
returns public.price_change_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_original public.price_change_batches;
  v_reversal public.price_change_batches;
  v_total integer;
  v_conflicts integer;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  if p_batch_id is null then
    raise exception 'Falta indicar la actualización a revertir.' using errcode = '22023';
  end if;

  -- ---------- Idempotencia: el mismo envío no se aplica dos veces ----------
  if p_request_id is not null then
    select * into v_reversal
    from public.price_change_batches
    where owner_id = v_uid and request_id = p_request_id;
    if found then
      return v_reversal;
    end if;
  end if;

  -- ---------- Bloqueo de la actualización original ----------
  -- Dos reversiones simultáneas del mismo lote se procesan una detrás de otra.
  select * into v_original
  from public.price_change_batches
  where id = p_batch_id and owner_id = v_uid
  for update;

  if not found then
    raise exception 'No se encontró la actualización.' using errcode = 'PT404';
  end if;

  if v_original.operation_type <> 'bulk_update' then
    raise exception 'Solo se pueden revertir actualizaciones masivas.' using errcode = '22023';
  end if;

  -- Si un envío idéntico terminó mientras esperábamos el bloqueo, se devuelve su resultado.
  if p_request_id is not null then
    select * into v_reversal
    from public.price_change_batches
    where owner_id = v_uid and request_id = p_request_id;
    if found then
      return v_reversal;
    end if;
  end if;

  if exists (
    select 1
    from public.price_change_batches
    where owner_id = v_uid
      and original_batch_id = v_original.id
      and operation_type = 'reversal'
  ) then
    raise exception 'Esta actualización ya fue revertida.' using errcode = 'PT410';
  end if;

  -- ---------- Bloqueo de los cortes afectados (siempre en el mismo orden) ----------
  perform 1
  from public.cuts c
  where c.owner_id = v_uid
    and c.id in (
      select h.cut_id
      from public.price_history h
      where h.batch_id = v_original.id and h.owner_id = v_uid
    )
  order by c.id
  for update of c;

  -- ---------- Comprobación de conflictos ----------
  select pg_catalog.count(*),
         pg_catalog.count(*) filter (where c.id is null or c.current_price <> h.new_price)
    into v_total, v_conflicts
  from public.price_history h
  left join public.cuts c on c.id = h.cut_id and c.owner_id = h.owner_id
  where h.batch_id = v_original.id
    and h.owner_id = v_uid
    and h.change_type = 'bulk_update';

  if v_total = 0 then
    raise exception 'La actualización no tiene cambios para revertir.' using errcode = '22023';
  end if;

  if v_conflicts > 0 then
    raise exception 'Algunos precios cambiaron después de esta actualización (%). No se puede revertir sin pisar esos cambios.', v_conflicts
      using errcode = 'PT422';
  end if;

  -- ---------- Escritura atómica: lote + precios + historial ----------
  insert into public.price_change_batches (
    owner_id, changed_by, operation_type, affected_count, original_batch_id, request_id
  )
  values (
    v_uid, v_uid, 'reversal', v_total, v_original.id, p_request_id
  )
  returning * into v_reversal;

  perform pg_catalog.set_config('app.allow_price_write', 'on', true);

  with changes as (
    select h.cut_id, h.old_price as restore_price, h.new_price as price_before
    from public.price_history h
    where h.batch_id = v_original.id
      and h.owner_id = v_uid
      and h.change_type = 'bulk_update'
  ),
  updated as (
    update public.cuts c
    set current_price = ch.restore_price
    from changes ch
    where c.id = ch.cut_id and c.owner_id = v_uid
    returning c.id as cut_id, ch.price_before as old_price, c.current_price as new_price
  )
  insert into public.price_history (
    owner_id, cut_id, old_price, new_price, changed_by, batch_id, change_type
  )
  select v_uid, u.cut_id, u.old_price, u.new_price, v_uid, v_reversal.id, 'reversal'
  from updated u;

  perform pg_catalog.set_config('app.allow_price_write', 'off', true);

  return v_reversal;
end;
$$;

revoke all on function public.revert_bulk_price_update(uuid, uuid) from public, anon;
grant execute on function public.revert_bulk_price_update(uuid, uuid) to authenticated;