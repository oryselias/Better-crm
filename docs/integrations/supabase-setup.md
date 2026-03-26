# Supabase Setup

Use this checklist when connecting the Better CRM app to a real Supabase project.

## 1. Create the project
- Go to `https://database.new` or create a project from the Supabase dashboard.
- Choose the correct organization.
- Name the project something stable, for example `better-crm-dev`.
- Pick the region closest to expected clinic users.
- Save the database password in your password manager.

## 2. Copy project credentials
- In Supabase Dashboard, open the project and copy:
  - Project URL
  - Publishable key or legacy anon key
  - Service role key
- Find the project reference under `Settings > General`.

## 3. Add local env vars
- Create `.env.local` in the repo root.
- Add:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

Notes:
- If Supabase shows a publishable key instead of a legacy anon key, use that value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## 4. Link the repo to the project
From VS Code PowerShell 7 in the repo root:

```powershell
Set-Location "C:\Users\omkar\OneDrive\Desktop\Better-crm"
bunx supabase login
bunx supabase projects list
bunx supabase link --project-ref <your-project-ref>
```

## 5. Apply schema and config
Push the current repo schema to the linked project:

```powershell
bunx supabase db push
bunx supabase config push
```

The current schema lives in `supabase/migrations/20260326230500_initial_foundation.sql`.

## 6. Enable and verify auth basics
- Email + password auth is enabled by default on hosted Supabase.
- In Auth settings, set Site URL to `http://localhost:3000` for local development.
- Add any additional redirect URLs you plan to use later.
- Create the first admin user from the dashboard Auth user management screen or by signup through the app.

## 7. Create the first clinic and profile row
After the first auth user exists, open the SQL Editor and create the matching clinic and profile data.

Example flow:
```sql
insert into public.clinics (name, slug)
values ('Better CRM Dev Clinic', 'better-crm-dev-clinic')
returning id;
```

Then use the returned clinic id plus the auth user id from `Authentication > Users`:

```sql
insert into public.profiles (id, clinic_id, role, full_name)
values (
  '<AUTH_USER_UUID>',
  '<CLINIC_UUID>',
  'admin',
  'Founding Admin'
);
```

Without this profile row, auth can succeed but the app will still fail RLS checks.

## 8. Create storage for report files
- Create a private bucket for lab reports, for example `lab-reports`.
- Keep it private because uploaded reports are sensitive clinic documents.

## 9. Run the app locally
```powershell
bun run dev
```

Then open `http://localhost:3000/login`.
To verify your env and hosted project connection before signing in, also open `http://localhost:3000/setup/supabase`.

## 10. Run database tests
For a linked remote project:

```powershell
bunx supabase test db --linked
```

For local Supabase with Docker running:

```powershell
bunx supabase start
bunx supabase test db --local
```

## 11. Recommended next step after setup
- Seed one clinic and one admin profile
- Verify login
- Verify dashboard access
- Verify cross-clinic isolation with the RLS tests
