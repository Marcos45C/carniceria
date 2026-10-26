begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- ---------- Datos de prueba (se revierten al final) ----------
insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

do $$
begin
  perform set_config('app.allow_price_write', 'on', true);

  insert into public.cuts (id, owner_id, name, current_price, is_active) values
    ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asado',    12500,  true),
    ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chico',     101.50, true),
    ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Redondo',   200,    true),
    ('a0000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Inactivo', 5000,   false),
    ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Asado B',  2000,   true);

  perform set_config('app.allow_price_write', 'off', true);
end;
$$;

-- ---------- Cálculo y redondeo (mismos casos que src/utils/pricing.test.ts) ----------
select is(public.calculate_new_price(12500, 10, 'cents'), 13750::numeric, 'Aumento del 10 %');
select is(public.calculate_new_price(12500, -10, 'cents'), 11250::numeric, 'Reducción del 10 %');
select is(public.calculate_new_price(99.99, 10, 'cents'), 109.99::numeric, 'Redondeo a dos decimales');
select is(public.calculate_new_price(101.50, 10, 'peso'), 112::numeric, 'Redondeo al peso entero');
select is(public.calculate_new_price(150, 10, 'step50'), 150::numeric, 'Redondeo al múltiplo de $50');
select is(public.calculate_new_price(150, 10, 'step100'), 200::numeric, 'Redondeo al múltiplo de $100');
select is(public.calculate_new_price(125, 0, 'step50'), 150::numeric, 'La mitad exacta sube');

-- ---------- Como usuario A autenticado ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Redondo (200) + 10 % con paso de $100 sigue valiendo 200: no hay cambios.
select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000000', 'selected', 10, 'step100',
      '[{"id":"a0000000-0000-0000-0000-000000000003","price":200}]'::jsonb)$$,
  '22023', null,
  'Rechaza una actualización que no cambiaría ningún precio');

select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000001', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12500},
        {"id":"a0000000-0000-0000-0000-000000000002","price":101.50},
        {"id":"a0000000-0000-0000-0000-000000000003","price":200}]'::jsonb)$$,
  'Aplica un aumento del 10 % a todos los cortes activos');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  13750::numeric, 'Asado: 12500 -> 13750');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000002'),
  111.65::numeric, 'Chico: 101,50 -> 111,65');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000003'),
  220::numeric, 'Redondo: 200 -> 220');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000004'),
  5000::numeric, 'El corte inactivo no se modifica');

select is(
  (select count(*) from public.price_history where change_type = 'bulk_update'),
  3::bigint, 'Se registraron tres cambios en el historial');

select is(
  (select affected_count from public.price_change_batches where request_id = 'c0000000-0000-0000-0000-000000000001'),
  3, 'El lote registra la cantidad de cortes modificados');

-- Reenviar la misma solicitud (aunque los precios esperados ya no coincidan)
-- devuelve el lote existente y no vuelve a aplicar nada.
select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000001', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12500},
        {"id":"a0000000-0000-0000-0000-000000000002","price":101.50},
        {"id":"a0000000-0000-0000-0000-000000000003","price":200}]'::jsonb)$$,
  'Reenviar la misma solicitud no da error');

select is(
  (select count(*) from public.price_history where change_type = 'bulk_update'),
  3::bigint, 'Reenviar la misma solicitud no duplica el historial');

-- Vista previa desactualizada.
select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000002', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12500},
        {"id":"a0000000-0000-0000-0000-000000000002","price":101.50},
        {"id":"a0000000-0000-0000-0000-000000000003","price":200}]'::jsonb)$$,
  'PT412', null,
  'Detecta que los precios cambiaron desde la vista previa');

-- Alcance "seleccionados": reducción del 10 % solo para Asado, redondeo al peso.
select lives_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000003', 'selected', -10, 'peso',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":13750}]'::jsonb)$$,
  'Aplica una reducción solo a los cortes seleccionados');

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  12375::numeric, 'Asado: 13750 -> 12375');

-- Un corte inactivo no puede incluirse.
select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000004', 'selected', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000004","price":5000}]'::jsonb)$$,
  'PT412', null,
  'Un corte inactivo no entra en una actualización masiva');

-- Parámetros inválidos.
select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000005', 'all_active', 0, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12375}]'::jsonb)$$,
  '22023', null, 'Rechaza un porcentaje igual a cero');

select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000006', 'all_active', -100, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12375}]'::jsonb)$$,
  '22023', null, 'Rechaza una reducción del 100 %');

select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000007', 'all_active', 10, 'foo',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12375}]'::jsonb)$$,
  '22023', null, 'Rechaza una regla de redondeo desconocida');

select throws_ok(
  $$select public.calculate_new_price(100, 10, 'cents')$$,
  '42501', null, 'Las funciones internas no están expuestas al cliente');

-- ---------- Como usuario B ----------
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000008', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12375}]'::jsonb)$$,
  'PT412', null,
  'B no puede modificar cortes de A');

-- ---------- Sin sesión ----------
reset role;
set local role anon;

select throws_ok(
  $$select public.apply_bulk_price_update('c0000000-0000-0000-0000-000000000009', 'all_active', 10, 'cents',
      '[{"id":"a0000000-0000-0000-0000-000000000001","price":12375}]'::jsonb)$$,
  '42501', null,
  'Sin sesión no se puede ejecutar la actualización masiva');

-- ---------- Verificación final como administrador ----------
reset role;

select is(
  (select current_price::numeric from public.cuts where id = 'a0000000-0000-0000-0000-000000000001'),
  12375::numeric,
  'Los intentos fallidos no modificaron ningún precio');

select * from finish();

rollback;