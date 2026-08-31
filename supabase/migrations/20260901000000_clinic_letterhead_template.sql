-- ============================================================
-- Better CRM — Clinic Letterhead Template
-- Adds template_url to clinics and sets up storage bucket.
-- ============================================================

-- ── 1. Add template_url column to clinics ────────────────────────────────────

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS template_url text;

-- ── 2. Create Storage Bucket for Clinic Templates ───────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-templates', 'clinic-templates', true)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage Policies ──────────────────────────────────────────────────────

-- Public read access for letterhead templates (used in PDF generation)
CREATE POLICY "Public template read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-templates');

-- Authenticated users can upload templates to their clinic folder
CREATE POLICY "Clinic users can upload template"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-templates'
  );

-- Authenticated users can update/delete their clinic templates
CREATE POLICY "Clinic users can update template"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'clinic-templates');

CREATE POLICY "Clinic users can delete template"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'clinic-templates');
