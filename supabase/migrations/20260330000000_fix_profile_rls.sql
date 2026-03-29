-- Fix 1: Prevent users from self-promoting their own role.
--
-- The previous UPDATE policy only blocked clinic_id changes but left `role`
-- unprotected — a lab_staff user could call the API and set role = 'admin'.
-- We add a security-definer helper to capture the role at query time (avoids
-- recursion inside the policy expression) and enforce it in `with check`.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and clinic_id = public.current_clinic_id()
  and role = public.current_user_role()
);


-- Fix 2: Allow users to read all profiles within their own clinic.
--
-- The previous SELECT policy was `using (id = auth.uid())` — own profile only.
-- This caused the audit log's `profiles(full_name)` join to return null for
-- every event not created by the current user, making all actors appear as
-- "System". Widening to clinic scope fixes audit log actor resolution while
-- keeping cross-clinic profiles invisible.

drop policy if exists "Users can view their own profile" on public.profiles;

create policy "Clinic members can view profiles in their clinic"
on public.profiles
for select
to authenticated
using (clinic_id = public.current_clinic_id());
