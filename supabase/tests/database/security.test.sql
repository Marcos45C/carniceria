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
    ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asado A', 1000),
    ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Asado B', 2000);

  insert into public.price_history (owner_id, cut_id, old_price, new_price, changed_by, change_type) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', null, 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'initial'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b0000000-0000-0000-0000-000000000001', null, 2000, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'initial');
end;
$$;

-- ---------- Como usuario A autenticado ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*) from public.cuts), 1::bigint,
  'A solo ve sus propios cortes');

select is((select count(*) from public.price_history), 1::bigint,
  'A solo ve su propio historial');

select throws_ok(
  $$update public.cuts set current_price = 1 where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'El cliente no puede cambiar el precio directamente');

select throws_ok(
  $$insert into public.cuts (owner_id, name, current_price) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nuevo', 10)$$,
  '42501', null, 'El cliente no puede insertar cortes directamente');

select lives_ok(
  $$update public.cuts set name = 'Asado A2' where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'El cliente puede editar el nombre de su corte');

select throws_ok(
  $$update public.cuts set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'El cliente no puede cambiar el propietario');

select throws_ok(
  $$delete from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'El cliente no puede borrar cortes');

select throws_ok(
  $$update public.price_history set new_price = 1$$,
  '42501', null, 'El cliente no puede editar el historial');

select lives_ok(
  $$update public.cuts set name = 'Hack' where id = 'b0000000-0000-0000-0000-000000000001'$$,
  'Editar un corte ajeno no da error, pero no afecta ninguna fila');

-- ---------- Verificaciones como administrador ----------
reset role;

select is((select name from public.cuts where id = 'b0000000-0000-0000-0000-000000000001'), 'Asado B',
  'A no pudo modificar el corte de B');

-- ---------- Usuario anónimo ----------
set local role anon;

select throws_ok(
  $$select * from public.cuts$$,
  '42501', null, 'Un usuario sin sesión no puede leer cortes');

reset role;

-- ---------- Guardias de la base de datos (incluso para postgres) ----------
do $$
begin
  perform set_config('app.allow_price_write', 'off', true);
end;
$$;

select throws_ok(
  $$update public.cuts set current_price = 1234 where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'Ni siquiera postgres puede cambiar un precio fuera de las funciones de precios');

select throws_ok(
  $$update public.price_history set new_price = 1$$,
  '42501', null, 'El historial es inmutable (update)');

select throws_ok(
  $$delete from public.price_history$$,
  '42501', null, 'El historial es inmutable (delete)');

do $$
begin
  perform set_config('app.allow_price_write', 'on', true);
end;
$$;

select throws_ok(
  $$insert into public.cuts (owner_id, name, current_price) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ' ASADO   a2 ', 500)$$,
  '23505', null, 'No se permiten nombres duplicados (ignora mayúsculas y espacios)');

select throws_ok(
  $$insert into public.cuts (owner_id, name, current_price) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gratis', 0)$$,
  '23514', null, 'No se permiten precios no positivos');

select * from finish();

rollback;