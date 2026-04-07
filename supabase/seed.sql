-- Better CRM — Seed data (local dev only)
-- Aligns with clean schema: no slug, no is_active on clinics, no full_name on profiles
-- Sex-specific params carry male_normal_range + female_normal_range only (no redundant combined string)

INSERT INTO public.clinics (id, name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aether Medical Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@aether.medical', 'not_used_in_local_seed',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, clinic_id, role)
VALUES ('b1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, clinic_id, full_name, date_of_birth, sex, phone, created_by)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Arjun Mehta',   '1982-03-14', 'male',   '9876543210', 'b1111111-1111-1111-1111-111111111111'),
  ('c1000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Priya Sharma',  '1990-07-22', 'female', '9123456789', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Test catalog
-- Rule: sex-specific params use male_normal_range + female_normal_range only.
--       normal_range only on non-sex-specific params.
INSERT INTO public.test_catalog (id, name, code, category, description, parameters, is_active, price)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'Complete Blood Count (CBC)', 'CBC', 'Hematology', 'Full blood count panel',
    '[
      {"id":"cbc-hemo",  "name":"Hemoglobin",                      "unit":"g/dL",        "male_normal_range":"13-18",   "female_normal_range":"12-16"},
      {"id":"cbc-tlc",   "name":"Total Leucocyte Count (TLC)",     "unit":"cells/cu.mm", "normal_range":"4000-11000"},
      {"id":"cbc-dlc",   "name":"Diff.Leucocyte Count (DLC)",      "unit":"",            "normal_range":""},
      {"id":"cbc-neu",   "name":"Neutrophils (Polymorphs)",        "unit":"%",           "normal_range":"50-70"},
      {"id":"cbc-lym",   "name":"Lymphocytes",                     "unit":"%",           "normal_range":"20-40"},
      {"id":"cbc-eo",    "name":"Eosinophils",                     "unit":"%",           "normal_range":"1-6"},
      {"id":"cbc-mono",  "name":"Monocytes",                       "unit":"%",           "normal_range":"2-8"},
      {"id":"cbc-baso",  "name":"Basophils",                       "unit":"%",           "normal_range":"0-2"},
      {"id":"cbc-plt",   "name":"Platelet Count",                  "unit":"Lacs/cu.mm",  "normal_range":"1.5-4.0"},
      {"id":"cbc-lpcr",  "name":"LPCR",                            "unit":"%",           "normal_range":"11.9-66.9"},
      {"id":"cbc-mpv",   "name":"MPV",                             "unit":"fL",          "normal_range":"8.6-15.5"},
      {"id":"cbc-pdw",   "name":"PDW",                             "unit":"%",           "normal_range":"8.3-25.0"},
      {"id":"cbc-pct",   "name":"PCT",                             "unit":"%",           "normal_range":"0.15-0.62"},
      {"id":"cbc-rbc",   "name":"Total RBCs",                      "unit":"mil/cu.mm",   "male_normal_range":"4.5-5.9", "female_normal_range":"4.1-5.1"},
      {"id":"cbc-mcv",   "name":"MCV (Mean Cell Volume)",          "unit":"fL",          "normal_range":"79-93"},
      {"id":"cbc-mch",   "name":"MCH (Mean Corpuscular Hb)",       "unit":"pg",          "normal_range":"26.7-31.9"},
      {"id":"cbc-mchc",  "name":"MCHC (Mean Corpuscular Hb Conc.)","unit":"g/dL",        "normal_range":"32-36"},
      {"id":"cbc-hct",   "name":"HCT (Hematocrit)",                "unit":"%",           "male_normal_range":"40-52",   "female_normal_range":"36-46"},
      {"id":"cbc-rdwsd", "name":"RDW-SD",                          "unit":"%",           "normal_range":"37.0-54.0"},
      {"id":"cbc-rdwcv", "name":"RDW-CV",                          "unit":"fL",          "normal_range":"11.5-14.5"}
    ]'::jsonb,
    true, 350
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'Liver Function Test (LFT)', 'LFT', 'Biochemistry', 'Liver enzyme panel',
    '[
      {"id":"lft-sgpt", "name":"SGPT (ALT)",           "unit":"U/L",   "normal_range":"4-36"},
      {"id":"lft-sgot", "name":"SGOT (AST)",           "unit":"U/L",   "normal_range":"8-33"},
      {"id":"lft-bil",  "name":"Bilirubin Total",      "unit":"mg/dL", "normal_range":"0.1-1.2"},
      {"id":"lft-alp",  "name":"Alkaline Phosphatase", "unit":"U/L",   "normal_range":"20-130"}
    ]'::jsonb,
    true, 400
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    'Lipid Profile', 'LIPID', 'Biochemistry', 'Cardiovascular risk lipid panel',
    '[
      {"id":"lip-tc",  "name":"Total Cholesterol", "unit":"mg/dL", "normal_range":"<200"},
      {"id":"lip-tg",  "name":"Triglycerides",     "unit":"mg/dL", "normal_range":"<150"},
      {"id":"lip-hdl", "name":"HDL Cholesterol",   "unit":"mg/dL", "male_normal_range":">=40", "female_normal_range":">=50"},
      {"id":"lip-ldl", "name":"LDL Cholesterol",   "unit":"mg/dL", "normal_range":"<100"}
    ]'::jsonb,
    true, 500
  )
ON CONFLICT (code) DO NOTHING;

-- Sample report (local dev only)
INSERT INTO public.lab_reports (id, clinic_id, patient_id, report_no, status, tests, notes, created_by)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'c1000000-0000-0000-0000-000000000001',
  1, 'pending',
  '[{
    "testId":"f1000000-0000-0000-0000-000000000001",
    "test":{
      "id":"f1000000-0000-0000-0000-000000000001","name":"Complete Blood Count (CBC)","code":"CBC",
      "category":"Hematology","is_active":true,
      "parameters":[
        {"id":"cbc-hemo","name":"Hemoglobin","unit":"g/dL","male_normal_range":"13-18","female_normal_range":"12-16"},
        {"id":"cbc-tlc","name":"Total Leucocyte Count (TLC)","unit":"cells/cu.mm","normal_range":"4000-11000"}
      ]
    },
    "results":[
      {"parameterId":"cbc-hemo","value":"12.5","isAbnormal":true},
      {"parameterId":"cbc-tlc","value":"6800","isAbnormal":false}
    ]
  }]'::jsonb,
  'Seeded local report',
  'b1111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;
