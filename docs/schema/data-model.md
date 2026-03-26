# Initial Data Model

Core entities in scope:
- clinics
- users
- patients
- appointments
- lab_reports
- invoices

Early modeling rules:
- every patient-facing record should be scoped by `clinic_id`
- lab report ingestion should preserve both raw source files and parsed structured output
- AI outputs should include parser version, confidence, and review state
- communication events should be traceable for compliance and support
