create extension if not exists pgcrypto;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete restrict,
  role text not null check (role in ('admin', 'lab_staff', 'clinician')),
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  external_id text,
  full_name text not null,
  date_of_birth date,
  sex text check (sex in ('male', 'female', 'other', 'unknown')),
  whatsapp_number text,
  email text,
  medical_history jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'checked_in', 'completed', 'cancelled')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  source_file_path text not null,
  source_file_name text,
  source_file_checksum text,
  parser_version text not null,
  parser_confidence numeric(5, 4),
  review_state text not null default 'pending' check (review_state in ('pending', 'reviewed', 'rejected')),
  parsed_payload jsonb not null default '{}'::jsonb,
  extracted_summary text,
  ingested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  row_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.has_clinic_access(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_clinic = public.current_clinic_id();
$$;

create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_payload jsonb;
  target_clinic uuid;
  target_row_id uuid;
begin
  if tg_op = 'DELETE' then
    row_payload := to_jsonb(old);
    target_clinic := old.clinic_id;
    target_row_id := old.id;
  else
    row_payload := to_jsonb(new);
    target_clinic := new.clinic_id;
    target_row_id := new.id;
  end if;

  insert into public.audit_events (clinic_id, actor_id, action, table_name, row_id, payload)
  values (target_clinic, auth.uid(), tg_op, tg_table_name, target_row_id, row_payload);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger touch_clinics_updated_at
before update on public.clinics
for each row
execute function public.touch_updated_at();

create trigger touch_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

create trigger touch_patients_updated_at
before update on public.patients
for each row
execute function public.touch_updated_at();

create trigger touch_appointments_updated_at
before update on public.appointments
for each row
execute function public.touch_updated_at();

create trigger touch_lab_reports_updated_at
before update on public.lab_reports
for each row
execute function public.touch_updated_at();

create trigger audit_patients_changes
after insert or update or delete on public.patients
for each row
execute function public.audit_row_changes();

create trigger audit_appointments_changes
after insert or update or delete on public.appointments
for each row
execute function public.audit_row_changes();

create trigger audit_lab_reports_changes
after insert or update or delete on public.lab_reports
for each row
execute function public.audit_row_changes();

create index if not exists patients_clinic_id_idx on public.patients (clinic_id);
create index if not exists appointments_clinic_id_idx on public.appointments (clinic_id);
create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);
create index if not exists lab_reports_clinic_id_idx on public.lab_reports (clinic_id);
create index if not exists lab_reports_review_state_idx on public.lab_reports (review_state);
create index if not exists audit_events_clinic_id_idx on public.audit_events (clinic_id);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at desc);

grant usage on schema public to anon, authenticated;
grant select on public.clinics to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.lab_reports to authenticated;
grant select on public.audit_events to authenticated;

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.lab_reports enable row level security;
alter table public.audit_events enable row level security;

create policy "Clinics are readable by their members"
on public.clinics
for select
to authenticated
using (id = public.current_clinic_id());

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and clinic_id = public.current_clinic_id());

create policy "Clinic members can read patients"
on public.patients
for select
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can insert patients"
on public.patients
for insert
to authenticated
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can update patients"
on public.patients
for update
to authenticated
using (public.has_clinic_access(clinic_id))
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can delete patients"
on public.patients
for delete
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can read appointments"
on public.appointments
for select
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can insert appointments"
on public.appointments
for insert
to authenticated
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can update appointments"
on public.appointments
for update
to authenticated
using (public.has_clinic_access(clinic_id))
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can delete appointments"
on public.appointments
for delete
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can read reports"
on public.lab_reports
for select
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can insert reports"
on public.lab_reports
for insert
to authenticated
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can update reports"
on public.lab_reports
for update
to authenticated
using (public.has_clinic_access(clinic_id))
with check (public.has_clinic_access(clinic_id));

create policy "Clinic members can delete reports"
on public.lab_reports
for delete
to authenticated
using (public.has_clinic_access(clinic_id));

create policy "Clinic members can read audit events"
on public.audit_events
for select
to authenticated
using (public.has_clinic_access(clinic_id));
