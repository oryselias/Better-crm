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

**Duplicate email guard:** if an auth account already exists for that email, invite creation is blocked. Suspend or delete the existing clinic account first, then invite again.

## What the invite does

On signup, the flow:

1. Validates the token (must exist, not used, not expired — default 7 days).
2. Claims `used_at` immediately to prevent double-submit races.
3. Creates the Supabase auth user with email-confirmed = true.
4. Creates the clinic (if `clinic_name` invite) or reuses `clinic_id`.
5. Creates the `profiles` row with the invite's role.
6. Finalizes the invite (`used_by`, `clinic_id`).
7. Redirects to `/login`.

If any step fails after the claim, the invite is rolled back so the link can be reused.

## Revoking an invite

Click **Revoke** on an active (unused) invite row. Used invites cannot be revoked.

## Orphan invite reset

If signup fails mid-flight and an invite is stuck as **used** without a real clinic account, the admin UI shows **Reset invite**. That clears `used_at` / `used_by` so the same link works again.

## Clinic account lifecycle (`/admin/invites` → Clinic accounts)

| Action | Effect |
|--------|--------|
| **Suspend** | Sets `clinics.status = 'suspended'`. Blocks login and all clinic-scoped data access (RLS + app gates). Data and history are kept. |
| **Activate** | Restores `active`. User can sign in again with full history. |
| **Delete** | Permanent. Removes auth users, profiles, patients, lab reports, stored PDFs, and related invites. Same email can receive a new invite. |

Delete requires browser confirmation. All lifecycle actions are written to `admin_audit_log`.

## Security notes

- `invites` RLS: only super admin can read/write (SELECT/INSERT/UPDATE/DELETE).
- `user_roles` RLS: users can read their own row; only `service_role` writes.
- `is_super_admin()` is a `SECURITY DEFINER` helper that reads `user_roles`.
- `has_clinic_access()` denies reads/writes when the member's clinic is `suspended`.
- Super admin gets read-only visibility into all `clinics` and `profiles` via RLS override policies.
- Suspend is enforced at login, OAuth callback, dashboard layout, PDF API, and Postgres RLS.
- `/onboarding` no longer allows open clinic creation — it only shows a "no clinic assigned" message.

## Migrations to apply

Ensure these are applied in production:

- `20260416000000_invites_and_roles.sql` — invites, `clinics.status`, super admin
- `20260614000000_clinic_lifecycle_hardening.sql` — suspended RLS, audit log, `purge_clinic_cascade`
