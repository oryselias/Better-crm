-- ============================================================
-- Clinic lifecycle hardening: suspend enforcement, audit log,
-- transactional clinic purge helper.
-- ============================================================

-- ── has_clinic_access: deny suspended clinics ─────────────────

CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.clinics c ON c.id = p.clinic_id
    WHERE p.id = auth.uid()
      AND p.clinic_id = target_clinic
      AND c.status <> 'suspended'
  );
$$;

-- ── admin_audit_log ───────────────────────────────────────────

CREATE TABLE public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_action_idx      ON public.admin_audit_log (action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin());

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO service_role;

-- ── purge_clinic_cascade: DB rows after auth users removed ─────

CREATE OR REPLACE FUNCTION public.purge_clinic_cascade(p_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Cannot purge clinic % while profiles still exist', p_clinic_id;
  END IF;

  DELETE FROM public.invites WHERE clinic_id = p_clinic_id;
  DELETE FROM public.clinics WHERE id = p_clinic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_clinic_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_clinic_cascade(uuid) TO service_role;

-- ── auth_email_exists: invite duplicate guard ─────────────────

CREATE OR REPLACE FUNCTION public.auth_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.auth_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO service_role;
