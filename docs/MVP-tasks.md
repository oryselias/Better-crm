# Better CRM MVP Tasks

This document tracks the remaining tasks to ship the MVP, based on the backend engineering analysis and CRM alternatives research.

## ✅ Completed (P0 Security Fixes)
- [x] **Fix WhatsApp RLS Policies** — Fixed `user_clinics` → `profiles` table, added complete clinic-scoped + service_role policies
- [x] **Environment Variable Validation** — Removed insecure `verify-token` fallback in webhook route

## P0 - Must Implement (Core Features)
- [x] **PDF Report Generator** ✅ (JSON → PDF)
  - Generate professional A4 PDFs from structured lab data using pdfkit
  - Includes patient info, test results table with status badges
  - Files: `lib/reports/pdf-generator.ts`, `app/api/reports/[id]/pdf/route.ts`
  - Migration: `supabase/migrations/20260329000000_generated_pdf_url.sql`
- [ ] **PDF Data Extraction** (PDF → JSON)
  - Connect to Claude/Gemini API to extract data from incoming lab PDFs
  - Stores parsed results in `parsed_payload` column
  - File: `lib/ai/lab-parser.ts`

## P1 - Should Fix (Reliability)
- [x] **Webhook Retry Queue** ✅
  - Store failed WhatsApp messages with exponential backoff retry logic
  - Files: `supabase/functions/process-retries/index.ts`, `supabase/migrations/20260329000001_retry_queue.sql`
- [x] **Rate Limiting** ✅
  - Per-IP rate limiting on webhook (30 req/min)
  - File: `lib/rate-limiter.ts`, integrated into webhook route
- [x] **Appointment Reminders** ✅
  - Edge Function sends WhatsApp reminders 24h and 1h before appointments
  - Files: `supabase/functions/send-reminders/index.ts`

## P2 - Should Add (Feature Parity)
- [x] **Real-time Updates** ✅
  - Implement Supabase Realtime for dashboard to show live patient/appointment statuses
- [x] **Workflow Automation** ✅
  - DB triggers notify patients via WhatsApp when report status changes to "reviewed"
  - DB triggers send confirmation upon appointment creation
  - File: `supabase/migrations/20260329000002_workflow_enhancements.sql`
- [x] **Audit Dashboard** ✅
  - Enhanced UI with filters for table, action
  - File: `app/(dashboard)/audit/page.tsx`

## Strategic Research Improvements
*Derived from study of Healthcare CRM Alternatives (Twenty, Medplum, HospitalRun)*
- [ ] **[Antigravity] Data Migration & Integration (FHIR)**
  - Use FHIR standards (inspired by Medplum) for robust third-party health data synchronization
- [ ] **[Antigravity] Performance & Scalability**
  - Evaluate/Implement GraphQL for complex data querying (inspired by Twenty CRM)
- [x] **[Antigravity] Offline-First UX**
  - Design critical paths (like viewing patient history) to work offline for clinic staff with poor connectivity (inspired by HospitalRun)

---

## Quick Wins for MVP
1. **[Cline] Wire up WhatsApp reminder sending** — Use existing `whatsapp_templates` table
2. **[Antigravity] Add report parser stub with Claude API call** — Start with basic PDF text extraction
3. **[Cline] Connect audit log UI** — `/audit` page already exists, just needs data fetching
