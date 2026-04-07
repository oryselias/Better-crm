begin;

create extension if not exists pgtap;

select plan(5);

insert into public.clinics (id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'North Clinic'),
  ('22222222-2222-2222-2222-222222222222', 'South Clinic');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'north@example.com',
    'not_used_in_tests',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'south@example.com',
    'not_used_in_tests',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.profiles (id, clinic_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'admin');

insert into public.patients (clinic_id, full_name, created_by)
values ('22222222-2222-2222-2222-222222222222', 'South Seed Patient', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

create or replace function pg_temp.set_authenticated_user(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
end;
$$;

create or replace function pg_temp.try_insert_patient(target_clinic uuid, patient_name text)
returns boolean
language plpgsql
as $$
begin
  insert into public.patients (clinic_id, full_name, created_by)
  values (target_clinic, patient_name, auth.uid());
  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function pg_temp.try_update_patient(target_patient uuid, patient_name text)
returns boolean
language plpgsql
as $$
begin
  update public.patients
  set full_name = patient_name
  where id = target_patient;
  return found;
exception
  when others then
    return false;
end;
$$;

set local role authenticated;
select pg_temp.set_authenticated_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select ok(
  pg_temp.try_insert_patient('11111111-1111-1111-1111-111111111111', 'North Patient'),
  'North clinic user can insert a patient into their own clinic'
);

select ok(
  not pg_temp.try_insert_patient('22222222-2222-2222-2222-222222222222', 'Cross Clinic Patient'),
  'North clinic user cannot insert a patient into another clinic'
);

select is(
  (select count(*)::integer from public.patients),
  1,
  'North clinic user only sees their own clinic patients'
);

select ok(
  not pg_temp.try_update_patient(
    (select id from public.patients where clinic_id = '22222222-2222-2222-2222-222222222222' limit 1),
    'Tampered Name'
  ),
  'North clinic user cannot update another clinic patient'
);

select pg_temp.set_authenticated_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

select is(
  (select count(*)::integer from public.patients),
  1,
  'South clinic user only sees their own clinic patients'
);

select * from finish();
rollback;
