begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'Todas las tablas de public tienen RLS activado');

-- Tablas: los usuarios autenticados solo leen; los anónimos no tienen nada.
select table_privs_are('public', 'cuts', 'authenticated', array['SELECT'],
  'cuts: authenticated solo tiene SELECT a nivel de tabla');
select table_privs_are('public', 'price_history', 'authenticated', array['SELECT'],
  'price_history: authenticated solo tiene SELECT');
select table_privs_are('public', 'price_change_batches', 'authenticated', array['SELECT'],
  'price_change_batches: authenticated solo tiene SELECT');

select table_privs_are('public', 'cuts', 'anon', array[]::text[],
  'cuts: anon no tiene permisos');
select table_privs_are('public', 'price_history', 'anon', array[]::text[],
  'price_history: anon no tiene permisos');
select table_privs_are('public', 'price_change_batches', 'anon', array[]::text[],
  'price_change_batches: anon no tiene permisos');

-- Funciones públicas: solo usuarios autenticados.
select function_privs_are('public', 'create_cut', array['text', 'text', 'text', 'numeric', 'boolean'],
  'authenticated', array['EXECUTE'], 'create_cut: authenticated puede ejecutar');
select function_privs_are('public', 'set_cut_price', array['uuid', 'numeric', 'numeric'],
  'authenticated', array['EXECUTE'], 'set_cut_price: authenticated puede ejecutar');
select function_privs_are('public', 'apply_bulk_price_update', array['uuid', 'text', 'numeric', 'text', 'jsonb'],
  'authenticated', array['EXECUTE'], 'apply_bulk_price_update: authenticated puede ejecutar');
select function_privs_are('public', 'revert_bulk_price_update', array['uuid', 'uuid'],
  'authenticated', array['EXECUTE'], 'revert_bulk_price_update: authenticated puede ejecutar');

select function_privs_are('public', 'create_cut', array['text', 'text', 'text', 'numeric', 'boolean'],
  'anon', array[]::text[], 'create_cut: anon no puede ejecutar');
select function_privs_are('public', 'set_cut_price', array['uuid', 'numeric', 'numeric'],
  'anon', array[]::text[], 'set_cut_price: anon no puede ejecutar');
select function_privs_are('public', 'apply_bulk_price_update', array['uuid', 'text', 'numeric', 'text', 'jsonb'],
  'anon', array[]::text[], 'apply_bulk_price_update: anon no puede ejecutar');
select function_privs_are('public', 'revert_bulk_price_update', array['uuid', 'uuid'],
  'anon', array[]::text[], 'revert_bulk_price_update: anon no puede ejecutar');

-- Funciones internas: nadie del cliente.
select function_privs_are('public', 'validate_price', array['numeric'],
  'authenticated', array[]::text[], 'validate_price es interna');
select function_privs_are('public', 'calculate_new_price', array['numeric', 'numeric', 'text'],
  'authenticated', array[]::text[], 'calculate_new_price es interna');

select * from finish();

rollback;