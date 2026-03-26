# RLS Strategy

Row-level security should start with clinic isolation, not be retrofitted later.

Baseline rules:
- authenticated users belong to one or more clinics
- all mutable business tables carry `clinic_id`
- default policy posture is deny by default
- privileged actions should be explicit for admins, lab staff, and clinicians

Questions to answer before production:
- can users belong to multiple clinics
- do outside labs upload reports directly
- which records need cross-clinic visibility
