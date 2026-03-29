-- Seed data for Better-CRM
-- 1 clinic · 1 admin · 8 patients · 10 appointments (mixed statuses) · 4 lab reports

-- ── Clinic ────────────────────────────────────────────────────────────────────
INSERT INTO public.clinics (id, name, slug, is_active)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aether Medical Center', 'aether-medical', true)
ON CONFLICT (id) DO NOTHING;

-- ── Auth user (local dev only) ─────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'admin@aether.medical',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- ── Profile ───────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, clinic_id, role, full_name)
VALUES ('b1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'Dr. Sarah Chen')
ON CONFLICT (id) DO NOTHING;

-- ── Patients ──────────────────────────────────────────────────────────────────
INSERT INTO public.patients (id, clinic_id, external_id, full_name, date_of_birth, sex, whatsapp_number, email, medical_history, notes, created_by)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-001', 'Arjun Mehta',      '1982-03-14', 'male',    '+91 98765 43210', 'arjun.mehta@email.com',     '[]', 'Diabetic. Monitor HbA1c quarterly.',          'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-002', 'Priya Sharma',     '1990-07-22', 'female',  '+91 91234 56789', 'priya.sharma@email.com',    '[]', null,                                          'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-003', 'Ravi Nair',        '1975-11-05', 'male',    '+91 99887 76655', null,                         '[]', 'Hypertension. On beta blockers.',             'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-004', 'Sunita Patel',     '1968-01-30', 'female',  '+91 97654 32100', 'sunita.patel@email.com',    '[]', 'Post-op knee replacement follow-up.',         'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-005', 'Kiran Reddy',      '2001-09-18', 'male',    '+91 88776 55443', 'kiran.reddy@email.com',     '[]', null,                                          'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-006', 'Ananya Krishnan',  '1995-04-12', 'female',  null,              'ananya.k@email.com',        '[]', 'Mild asthma. Carry inhaler.',                 'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EXT-007', 'Mohammed Farhan',  '1988-12-03', 'male',    '+91 93333 22211', 'farhan.m@email.com',        '[]', null,                                          'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', null,       'Deepa Iyer',       '1955-06-28', 'female',  '+91 96666 11100', null,                         '[]', 'Senior patient. Requires extra assistance.',  'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ── Appointments ──────────────────────────────────────────────────────────────
INSERT INTO public.appointments (id, clinic_id, patient_id, scheduled_at, status, notes, created_by)
VALUES
  -- Upcoming
  ('d1000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000001', now() + interval '2 hours',   'scheduled',  'Quarterly HbA1c review',            'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000002', now() + interval '4 hours',   'scheduled',  'General checkup',                   'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000006', now() + interval '1 day',     'scheduled',  'Asthma management review',          'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000007', now() + interval '2 days',    'scheduled',  null,                                'b1111111-1111-1111-1111-111111111111'),
  -- In-progress today
  ('d1000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000003', now() - interval '30 minutes','checked_in',  'Hypertension follow-up',            'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000005', now() - interval '1 hour',    'checked_in',  'Sports injury consult',             'b1111111-1111-1111-1111-111111111111'),
  -- Completed / cancelled (historical)
  ('d1000000-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000004', now() - interval '1 day',     'completed',   'Knee rehab progress — good range of motion', 'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000008', now() - interval '2 days',    'completed',   'Annual wellness exam',              'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000009', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000002', now() - interval '3 days',    'cancelled',   'Patient rescheduled',               'b1111111-1111-1111-1111-111111111111'),
  ('d1000000-0000-0000-0000-000000000010', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000001', now() - interval '5 days',    'completed',   'Medication adjustment follow-up',   'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ── Lab Reports ───────────────────────────────────────────────────────────────
INSERT INTO public.lab_reports (id, clinic_id, patient_id, source_file_path, source_file_name, parser_version, parser_confidence, review_state, parsed_payload, ingested_at, created_by)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000001',
   'aether-medical/seed-report-arjun-hba1c.pdf', 'arjun-hba1c-2026-03.pdf', 'stub-v1', 0.92,
   'pending', '{"tests":[{"name":"HbA1c","value":"7.4%","flag":"high"}]}', now() - interval '1 day',
   'b1111111-1111-1111-1111-111111111111'),

  ('e1000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000003',
   'aether-medical/seed-report-ravi-lipid.pdf',  'ravi-lipid-panel-2026-03.pdf', 'stub-v1', 0.88,
   'pending', '{"tests":[{"name":"LDL","value":"142 mg/dL","flag":"high"},{"name":"HDL","value":"38 mg/dL","flag":"low"}]}', now() - interval '2 days',
   'b1111111-1111-1111-1111-111111111111'),

  ('e1000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000004',
   'aether-medical/seed-report-sunita-xray.pdf', 'sunita-knee-xray-2026-02.pdf', 'stub-v1', 0.79,
   'reviewed', '{"findings":"Post-surgical alignment within normal range."}', now() - interval '5 days',
   'b1111111-1111-1111-1111-111111111111'),

  ('e1000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-0000-0000-000000000008',
   'aether-medical/seed-report-deepa-cbc.pdf',   'deepa-cbc-2026-03.pdf',       'stub-v1', 0.95,
   'rejected', '{"error":"Partial scan — missing page 2"}', now() - interval '3 days',
   'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
