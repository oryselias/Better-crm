# Better CRM Project Brief

Better CRM is an AI-first health CRM and laboratory information system for clinics that need patient records, appointments, lab report ingestion, billing readiness, and traceable patient communication.

Current slice priorities:
- ship a premium but operational admin shell in Next.js
- establish Supabase auth, schema, and row-level security early
- make every business record clinic-scoped through `clinic_id`
- preserve raw lab report source data, parsed JSON, parser metadata, and review state
- emit append-only audit events for first-slice mutations

Operating constraints:
- keep default agent context light
- store deep product and schema knowledge in `docs/`
- retrieve docs through QMD or the local second-brain only when needed
- defer Twilio, full PDF parsing, and billing workflows until later slices
