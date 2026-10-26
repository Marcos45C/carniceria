begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- ---------- Datos de prueba (se revierten al final) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local');

do $$
begin
  perform set_config('app.allow_price_write', 'on', true);

  insert into public.cuts (id, owner_id, name, current_price) values
    ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asado', 1000),
    ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chico', 2000);

  perform set_config('app.allow_price_write', 'off', true);
end;
$$;

-- Trigger de prueba: falla cuando se inserta en el historial el precio indicado en test.fail_price.
create function public.test_fail_on_price()
returns trigger
language plpgsql
as $$
declare
  v_fail text := pg_catalog.current_setting('test.fail_price', true);
begin
  if v_fail is not null and v_fail <> '' and new.new_price = v_fail::numeric then
    raise exception 'fallo simulado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger test_fail_on_price
  before insert on public.price_history
  for each row execute function public.test_fail_on_price();

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- ---------- Actualización masiva que falla en el segundo corte (2000 -> 2200) ----------
set local test.fail_price = '2200';

select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000001', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":1000},
        {"id":"a0000000-0000-0000-0000-000000000002","price":2000}]'::jsonb)$$,
  'P0001', null, 'Un fallo durante la escritura aborta la actualización');

select is((select count(*) from public.price_change_batches), 0::bigint,
  'No quedó ningún lote');
select is((select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  1000::numeric, 'El primer corte conserva su precio');
select is((select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2000::numeric, 'El segundo corte conserva su precio');
select is((select count(*) from public.price_history), 0::bigint,
  'No quedó ningún registro de historial');

-- Sin el fallo, la misma solicitud se aplica (el intento fallido no consumió la clave).
set local test.fail_price = '';

select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000001', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":1000},
        {"id":"a0000000-0000-0000-0000-000000000002","price":2000}]'::jsonb)$$,
  'Sin el fallo, la misma solicitud se aplica');

select is((select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2200::numeric, 'El segundo corte tiene el precio nuevo');

-- ---------- Reversión que falla al restaurar el segundo corte (2200 -> 2000) ----------
set local test.fail_price = '2000';

select throws_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000001',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'))$$,
  'P0001', null, 'Un fallo durante la reversión la aborta');

select is((select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2200::numeric, 'Tras el fallo, los precios siguen como estaban');
select is((select count(*) from public.price_change_batches where operation_type = 'reversal'), 0::bigint,
  'No quedó ningún lote de reversión');

set local test.fail_price = '';

select lives_ok(
  $$select public.revert_bulk_price_update('d0000000-0000-0000-0000-000000000001',
      (select id from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'))$$,
  'Sin el fallo, la misma reversión se aplica');

select is((select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  2000::numeric, 'El segundo corte quedó restaurado');

select * from finish();

rollback;