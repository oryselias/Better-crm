-- ============================================================
-- Better CRM — Invite System + Super Admin Role
-- Option A: Email-hardcoded super admin + invite-only signup.
-- ============================================================

-- ── user_roles (separate from profiles so super admin doesn't require a clinic) ─────────────

CREATE TABLE public.user_roles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  system_role text NOT NULL CHECK (system_role IN ('user', 'super_admin')),
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX user_roles_system_role_idx ON public.user_roles (system_role);

-- ── clinics.status (future: suspended / trial) ───────────────────────────────────────────────

ALTER TABLE public.clinics
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended'));

-- ── invites ─────────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  clinic_name text,
  clinic_id   uuid REFERENCES public.clinics (id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'lab_staff', 'clinician')),
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at  timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  used_at     timestamptz,
  used_by     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT invites_target_exactly_one CHECK (
    (clinic_name IS NOT NULL AND clinic_id IS NULL) OR
    (clinic_name IS NULL     AND clinic_id IS NOT NULL)
  )
);

CREATE INDEX invites_email_unused_idx ON public.invites (email) WHERE used_at IS NULL;
CREATE INDEX invites_token_idx        ON public.invites (token);
CREATE INDEX invites_clinic_id_idx    ON public.invites (clinic_id) WHERE clinic_id IS NOT NULL;

-- ── Helper: is_super_admin() ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND system_role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────

GRANT SELECT                         ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites    ENABLE ROW LEVEL SECURITY;

-- user_roles: users read their own row; super admin can read all
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- Only service_role writes user_roles (bootstrap script, promotion flows)
-- (No authenticated write policy = no writes.)

-- invites: super admin manages fully
CREATE POLICY "Super admin manages invites"
  ON public.invites FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Super-admin visibility into tenant tables (read-only, for admin panel)
CREATE POLICY "Super admin reads all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admin reads all clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (public.is_super_admin());
