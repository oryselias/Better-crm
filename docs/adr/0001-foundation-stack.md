# ADR 0001: Foundation Stack

## Status
Accepted

## Context
The project needs to move quickly from concept to usable internal tooling while preserving a path to secure, clinic-scoped data access and AI-assisted workflows.

## Decision
Use:
- Next.js with the App Router for the web application shell
- Tailwind CSS for fast UI iteration
- Supabase Postgres for relational storage, auth, and row-level security
- Twilio/WhatsApp as the first communication channel

## Consequences
- We can build the admin dashboard, auth flows, and CRUD surfaces quickly.
- Tenant isolation must be designed early around `clinic_id` and RLS policies.
- AI parsing outputs should be modeled as auditable structured records, not only raw blobs.
