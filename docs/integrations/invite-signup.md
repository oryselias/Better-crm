# Invite-only signup + super admin

Better CRM is invite-only. There is no open signup.

## Roles

- **super_admin** — global operator (you). Lives in `public.user_roles`. Not tied to any clinic. Manages invites via `/admin/invites`.
- **admin / lab_staff / clinician** — per-clinic roles. Live in `public.profiles.role`.

## First-time setup

1. Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Run migrations: `supabase db push` (or via CLI).
3. Create your auth user in Supabase Studio (Authentication → Users → Add user), using your super-admin email.
4. Promote yourself (requires Node 20.6+):
   ```bash
   npx tsx --env-file=.env.local scripts/promote-super-admin.ts you@example.com
   ```
5. Sign in at `/login`, then visit `/admin/invites`.

## Creating an invite

1. Go to `/admin/invites`.
2. Enter the clinic owner's email, clinic name, and role (`admin` by default).
3. The invite row appears with a signup link: `{BASE_URL}/signup?token=...`.
4. Copy and send the link to the invitee (email delivery is not automated yet).

## What the invite does

On signup, the flow:

1. Validates the token (must exist, not used, not expired — default 7 days).
2. Creates the Supabase auth user with email-confirmed = true.
3. Creates the clinic (if `clinic_name` invite) or reuses `clinic_id`.
4. Creates the `profiles` row with the invite's role.
5. Marks `invites.used_at` and `used_by`.
6. Redirects to `/login`.

If any step fails, the user and clinic rows are rolled back.

## Revoking an invite

Click **Revoke** on an active invite row. Used invites cannot be revoked (they represent real accounts).

## Security notes

- `invites` RLS: only super admin can read/write (SELECT/INSERT/UPDATE/DELETE).
- `user_roles` RLS: users can read their own row; only `service_role` writes.
- `is_super_admin()` is a `SECURITY DEFINER` helper that reads `user_roles`.
- Super admin gets read-only visibility into all `clinics` and `profiles` via RLS override policies.
- `/onboarding` no longer allows open clinic creation — it only shows a "no clinic assigned" message.
