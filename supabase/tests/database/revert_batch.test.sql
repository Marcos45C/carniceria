begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------- Datos de prueba (se revierten al final) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

do $$
begin
  perform set_config('app.allow_price_write', 'on', true);

  insert into public.cuts (id, owner_id, name, current_price) values
    ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asado',   1000),
    ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chico',   2000),
    ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Asado B', 5000);

  perform set_config('app.allow_price_write', 'off', true);
end;
$$;

-- ---------- Como usuario A autenticado ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000001', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":1000},
        {"id":"a0000000-0000-0000-0000-000000000002","price":2000}]'::jsonb)$$,
  'Se aplica una actualización masiva del 10 %');

select lives_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000001',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'))$$,
  'Se revierte la actualización');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  1000::numeric, 'Asado vuelve a 1000');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2000::numeric, 'Chico vuelve a 2000');

select is(
  (select affected_count from public.price_change_batches where request_id = 'd0000000-0000-0000-0000-000000000001'),
  2, 'La reversión registra la cantidad de cortes restaurados');

select is(
  (select count(*) from public.price_history h
     join public.price_change_batches b on b.id = h.batch_id
    where b.request_id = 'd0000000-0000-0000-0000-000000000001'
      and h.change_type = 'reversal' and h.old_price <> h.new_price),
  2::bigint, 'Cada corte restaurado queda registrado en el historial');

-- Reenviar la misma solicitud devuelve el resultado existente.
select lives_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000001',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'))$$,
  'Reenviar la misma solicitud no da error');

select is(
  (select count(*) from public.price_history where change_type = 'reversal'),
  2::bigint, 'Reenviar la misma solicitud no duplica el historial');

-- Una actualización no se puede revertir dos veces.
select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000002',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'))$$,
  'PT410', null, 'No se puede revertir dos veces la misma actualización');

-- Una reversión no se puede revertir.
select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000003',
      (select id from public.price_change_batches where request_id = 'd0000000-0000-0000-0000-000000000001'))$$,
  '22023', null, 'No se puede revertir una reversión');

-- ---------- Conflicto: un precio cambió después de la actualización ----------
select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000002', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":1000},
        {"id":"a0000000-0000-0000-0000-000000000002","price":2000}]'::jsonb)$$,
  'Se aplica una segunda actualización masiva');

select lives_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 1500, 1100)$$,
  'Después, se cambia a mano el precio de Asado');

select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000004',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000002'))$$,
  'PT422', null, 'No se revierte si algún precio cambió después');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2200::numeric, 'Al haber conflicto no se revirtió ni un solo corte');

select is(
  (select count(*) from public.price_change_batches
    where original_batch_id = (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000002')),
  0::bigint, 'Al haber conflicto no se creó ningún lote de reversión');

-- Resuelto el conflicto, la reversión funciona.
select lives_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 1100, 1500)$$,
  'Se restablece a mano el precio que dejó la actualización');

select lives_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000005',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000002'))$$,
  'Sin conflictos, la reversión se aplica');

select is(
  (select array_agg(current_price::numeric order by name) from public.cuts
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  array[1000, 2000]::numeric[], 'Los precios quedaron restaurados');

select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000006',
      'e0000000-0000-0000-0000-000000000000')$$,
  'PT404', null, 'Una actualización inexistente se rechaza');

-- Se guarda el id del lote para probar como otro usuario.
do $$
begin
  perform set_config(
    'test.batch_id',
    (select id::text from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'),
    false
  );
end;
$$;

-- ---------- Como usuario B ----------
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000007',
      current_setting('test.batch_id')::uuid)$$,
  'PT404', null, 'B no puede revertir actualizaciones de A');

-- ---------- Sin sesión ----------
reset role;
set local role anon;

select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000008',
      current_setting('test.batch_id')::uuid)$$,
  '42501', null, 'Sin sesión no se puede revertir');

-- ---------- Verificación final como administrador ----------
reset role;

select is(
  (select count(*) from public.price_change_batches where operation_type = 'reversal'),
  2::bigint, 'Solo existen las dos reversiones exitosas');

select * from finish();

rollback;