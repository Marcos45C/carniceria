begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------- Datos de prueba (se revierten al final) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

do $$
begin
  perform set_config('app.allow_price_write', 'on', true);

  insert into public.cuts (id, owner_id, name, current_price) values
    ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asado A', 1000);

  insert into public.price_history (owner_id, cut_id, old_price, new_price, changed_by, change_type) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', null, 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'initial');

  perform set_config('app.allow_price_write', 'off', true);
end;
$$;

-- ---------- Como usuario A autenticado ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$select public.create_cut('Molida', '', 'kg', 8500.50)$$,
  'create_cut crea un corte');

select is(
  (select current_price::numeric from public.cuts where name = 'Molida'),
  8500.50::numeric,
  'El corte nuevo tiene el precio inicial');

select is(
  (select category from public.cuts where name = 'Molida'),
  null::text,
  'Una categoría vacía se guarda como nula');

select is(
  (select count(*) from public.price_history h
     join public.cuts c on c.id = h.cut_id
    where c.name = 'Molida' and h.change_type = 'initial'
      and h.old_price is null and h.new_price = 8500.50),
  1::bigint,
  'create_cut registra el precio inicial en el historial');

select lives_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 1250.50, 1000)$$,
  'set_cut_price cambia el precio');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  1250.50::numeric,
  'El precio quedó actualizado');

select is(
  (select count(*) from public.price_history
    where cut_id = 'a0000000-0000-0000-0000-000000000001'
      and change_type = 'individual' and old_price = 1000 and new_price = 1250.50),
  1::bigint,
  'El cambio quedó registrado en el historial');

select lives_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 1250.50, 1250.50)$$,
  'Repetir el mismo precio no da error');

select is(
  (select count(*) from public.price_history
    where cut_id = 'a0000000-0000-0000-0000-000000000001'),
  2::bigint,
  'Repetir el mismo precio no genera historial extra');

select throws_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 9999, 1000)$$,
  'PT409', null,
  'Detecta que el precio cambió desde que el usuario lo vio');

select throws_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 0, 1250.50)$$,
  '22023', null,
  'Rechaza un precio igual a cero');

select throws_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 100.123, 1250.50)$$,
  '22023', null,
  'Rechaza más de dos decimales');

select throws_ok(
  $$select public.create_cut(' MOLIDA ', '', 'kg', 100)$$,
  '23505', null,
  'No permite nombres duplicados (ignora mayúsculas y espacios)');

-- ---------- Como usuario B ----------
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 5000, 1250.50)$$,
  'PT404', null,
  'B no puede cambiar el precio de un corte de A');

select throws_ok(
  $$select public.validate_price(10)$$,
  '42501', null,
  'Las funciones internas no están expuestas al cliente');

-- ---------- Sin sesión ----------
reset role;
set local role anon;

select throws_ok(
  $$select public.set_cut_price('a0000000-0000-0000-0000-000000000001', 5000, 1250.50)$$,
  '42501', null,
  'Sin sesión no se puede ejecutar set_cut_price');

select * from finish();

rollback;