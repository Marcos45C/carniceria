-- =====================================================================
-- DATOS DE DEMOSTRACIÓN SOLO PARA DESARROLLO LOCAL.
-- Los cortes, precios y la cuenta de este archivo son ficticios.
-- Nunca ejecutes este archivo en producción.
-- Usuario de prueba local: carnicero@demo.local / Demo1234!
-- =====================================================================
do $$
declare
  demo_user constant uuid := '11111111-1111-1111-1111-111111111111';
  demo_email constant text := 'carnicero@demo.local';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', demo_user, 'authenticated', 'authenticated',
    demo_email, extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), demo_user, demo_user::text,
    jsonb_build_object('sub', demo_user::text, 'email', demo_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Habilita la escritura de precios solo durante esta transacción.
  perform set_config('app.allow_price_write', 'on', true);

  with new_cuts as (
    insert into public.cuts (owner_id, name, category, unit, current_price, price_updated_at, is_active)
    values
      (demo_user, 'Asado de tira',     'Vacuno',    'kg', 12500.00, '2026-10-14T13:20:00Z', true),
      (demo_user, 'Vacío',             'Vacuno',    'kg', 13800.00, '2026-10-14T13:20:00Z', true),
      (demo_user, 'Bife de chorizo',   'Vacuno',    'kg', 15200.00, '2026-10-09T12:05:00Z', true),
      (demo_user, 'Nalga',             'Vacuno',    'kg', 11900.00, '2026-10-09T12:05:00Z', true),
      (demo_user, 'Picada común',      'Vacuno',    'kg',  8900.00, '2026-09-30T15:40:00Z', true),
      (demo_user, 'Costilla de cerdo', 'Cerdo',     'kg',  7800.00, '2026-10-02T14:10:00Z', true),
      (demo_user, 'Bondiola',          'Cerdo',     'kg',  8400.00, '2026-10-02T14:10:00Z', true),
      (demo_user, 'Pechuga de pollo',  'Pollo',     'kg',  7200.00, '2026-10-16T11:30:00Z', true),
      (demo_user, 'Pollo entero',      'Pollo',     'kg',  3950.50, '2026-10-16T11:30:00Z', true),
      (demo_user, 'Chorizo',           'Embutidos', 'kg',  6900.00, '2026-09-25T16:00:00Z', true),
      (demo_user, 'Morcilla',          'Embutidos', 'kg',  5600.00, '2026-09-25T16:00:00Z', true),
      (demo_user, 'Chinchulines',      'Achuras',   'kg',  6200.00, '2026-10-05T13:45:00Z', true),
      (demo_user, 'Riñón',             'Achuras',   'kg',  3100.00, '2026-08-20T12:00:00Z', false),
      (demo_user, 'Lomo',              'Vacuno',    'kg', 17800.00, '2026-08-20T12:00:00Z', false)
    returning id, owner_id, current_price, price_updated_at
  )
  insert into public.price_history (owner_id, cut_id, old_price, new_price, changed_at, changed_by, change_type)
  select owner_id, id, null, current_price, price_updated_at, owner_id, 'initial'
  from new_cuts;
end;
$$;