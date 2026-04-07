-- ============================================================
-- Better CRM — Consolidated Clean Schema (Mumbai)
-- Single source of truth. Replaces all prior incremental migrations.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tables ───────────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.clinics (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  tagline    text,
  address    text,
  phone      text,
  logo_url   text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  clinic_id  uuid NOT NULL REFERENCES public.clinics (id) ON DELETE RESTRICT,
  role       text NOT NULL CHECK (role IN ('admin', 'lab_staff', 'clinician')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.patients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  date_of_birth  date,
  sex            text CHECK (sex IN ('male', 'female', 'other', 'unknown')),
  phone          text,
  created_by     uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.test_catalog (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  code        text    NOT NULL,
  category    text,
  parameters  jsonb   NOT NULL DEFAULT '[]',
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  price       numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT test_catalog_code_unique UNIQUE (code)
);

CREATE TABLE public.clinic_test_prices (
  clinic_id  uuid         NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  test_id    uuid         NOT NULL REFERENCES public.test_catalog (id) ON DELETE CASCADE,
  price      numeric(10,2) NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz  NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (clinic_id, test_id)
);

CREATE TABLE public.lab_reports (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid    NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id   uuid    REFERENCES public.patients (id) ON DELETE SET NULL,
  report_no    int,
  status       text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  tests        jsonb   NOT NULL DEFAULT '[]',
  discount     numeric(5,2)  NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  total_amount numeric(10,2),
  final_amount numeric(10,2),
  notes        text,
  referred_by  text,
  created_by   uuid    REFERENCES public.profiles (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT lab_reports_clinic_report_no_unique UNIQUE (clinic_id, report_no)
);

-- Index on patient_id for efficient joins
CREATE INDEX lab_reports_patient_id_idx ON public.lab_reports (patient_id);

-- ── Functions ─────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_clinic = public.current_clinic_id();
$$;

-- Per-clinic sequential report numbers
CREATE OR REPLACE FUNCTION public.assign_report_no()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Advisory lock per clinic to serialize concurrent inserts
  PERFORM pg_advisory_xact_lock(hashtext('assign_report_no:' || NEW.clinic_id::text));
  SELECT COALESCE(MAX(report_no), 0) + 1
  INTO   NEW.report_no
  FROM   public.lab_reports
  WHERE  clinic_id = NEW.clinic_id;
  RETURN NEW;
END;
$$;

-- Auto-compute total_amount and final_amount from test prices
CREATE OR REPLACE FUNCTION public.compute_report_amounts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total  numeric(10,2) := 0;
  v_test   jsonb;
  v_price  numeric(10,2);
BEGIN
  FOR v_test IN SELECT * FROM jsonb_array_elements(NEW.tests) LOOP
    BEGIN
      SELECT COALESCE(ctp.price, tc.price)
      INTO   v_price
      FROM   public.test_catalog tc
      LEFT JOIN public.clinic_test_prices ctp
             ON ctp.test_id = tc.id AND ctp.clinic_id = NEW.clinic_id
      WHERE  tc.id = (v_test->>'testId')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_price := NULL; -- non-UUID testId (e.g. seed data) — skip
    END;
    v_total := v_total + COALESCE(v_price, 0);
  END LOOP;

  NEW.total_amount := v_total;
  NEW.final_amount := ROUND(v_total * (1 - COALESCE(NEW.discount, 0) / 100), 2);
  RETURN NEW;
END;
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER touch_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_test_catalog_updated_at
  BEFORE UPDATE ON public.test_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_clinic_test_prices_updated_at
  BEFORE UPDATE ON public.clinic_test_prices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_lab_reports_updated_at
  BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER set_report_no
  BEFORE INSERT ON public.lab_reports
  FOR EACH ROW
  WHEN (NEW.report_no IS NULL OR NEW.report_no = 0)
  EXECUTE FUNCTION public.assign_report_no();

CREATE TRIGGER compute_lab_report_amounts
  BEFORE INSERT OR UPDATE OF tests, discount ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.compute_report_amounts();

-- ── Indexes ─────────────────────────────────────────────────────────────────────────────────

CREATE INDEX patients_clinic_id_idx            ON public.patients (clinic_id);
CREATE INDEX lab_reports_clinic_id_idx         ON public.lab_reports (clinic_id);
CREATE INDEX lab_reports_status_idx            ON public.lab_reports (status);
CREATE INDEX lab_reports_clinic_report_no_idx  ON public.lab_reports (clinic_id, report_no);
CREATE INDEX test_catalog_code_idx             ON public.test_catalog (code);
CREATE INDEX clinic_test_prices_clinic_id_idx  ON public.clinic_test_prices (clinic_id);
CREATE INDEX clinic_test_prices_test_id_idx    ON public.clinic_test_prices (test_id);

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT                        ON public.clinics             TO authenticated;
GRANT SELECT, INSERT, UPDATE        ON public.profiles            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reports        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_catalog       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_test_prices TO authenticated;

-- anon: expose only a scoped verify RPC instead of raw table grants
CREATE OR REPLACE FUNCTION public.verify_report(p_report_id uuid)
RETURNS TABLE (report_no int, patient_name text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lr.report_no, pt.full_name, lr.status, lr.created_at
  FROM   public.lab_reports lr
  JOIN   public.patients pt ON pt.id = lr.patient_id
  WHERE  lr.id = p_report_id;
$$;
GRANT EXECUTE ON FUNCTION public.verify_report(uuid) TO anon;

GRANT SELECT ON public.clinics TO anon;

-- ── Row Level Security ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.clinics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_test_prices  ENABLE ROW LEVEL SECURITY;

-- clinics
CREATE POLICY "Clinic members can read their clinic"
  ON public.clinics FOR SELECT TO authenticated
  USING (id = public.current_clinic_id());

-- clinics — anon verify
CREATE POLICY "Public can read clinic for verification"
  ON public.clinics FOR SELECT TO anon
  USING (true);

-- profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND clinic_id = public.current_clinic_id());

-- patients
CREATE POLICY "Clinic members can read patients"
  ON public.patients FOR SELECT TO authenticated
  USING (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can insert patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can update patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (public.has_clinic_access(clinic_id))
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can delete patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_clinic_access(clinic_id));

-- patients — anon verify removed in favour of verify_report RPC (SECURITY DEFINER)

-- lab_reports
CREATE POLICY "Clinic members can read reports"
  ON public.lab_reports FOR SELECT TO authenticated
  USING (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can insert reports"
  ON public.lab_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can update reports"
  ON public.lab_reports FOR UPDATE TO authenticated
  USING (public.has_clinic_access(clinic_id))
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can delete reports"
  ON public.lab_reports FOR DELETE TO authenticated
  USING (public.has_clinic_access(clinic_id));

-- lab_reports — anon verify removed in favour of verify_report RPC (SECURITY DEFINER)

-- test_catalog (global, shared across all clinics)
CREATE POLICY "Test catalog readable by authenticated users"
  ON public.test_catalog FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Test catalog insertable by service role"
  ON public.test_catalog FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Test catalog updatable by service role"
  ON public.test_catalog FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Test catalog deletable by service role"
  ON public.test_catalog FOR DELETE TO service_role
  USING (true);

-- clinic_test_prices
CREATE POLICY "Clinic members can read their test prices"
  ON public.clinic_test_prices FOR SELECT TO authenticated
  USING (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can insert their test prices"
  ON public.clinic_test_prices FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can update their test prices"
  ON public.clinic_test_prices FOR UPDATE TO authenticated
  USING (public.has_clinic_access(clinic_id))
  WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Clinic members can delete their test prices"
  ON public.clinic_test_prices FOR DELETE TO authenticated
  USING (public.has_clinic_access(clinic_id));
