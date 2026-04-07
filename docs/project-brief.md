# Better CRM — Project Brief

**What it is:** A lightweight, multi-clinic SaaS lab report generator for lab assistants.

**Core flow:**
1. Lab assistant logs in → sees dashboard (recent reports + "New Report" button)
2. Clicks "New Report" → 3-step wizard:
   - Step 1: Register or search patient (name, DOB, sex, phone)
   - Step 2: Search tests from clinic's test catalog and type report-specific prices when needed
   - Step 3: Enter results per parameter (value, unit, flag abnormal)
3. Submit → report detail page opens
4. Lab assistant can edit tests, prices, notes, and results again if needed
5. Download or print the generated PDF from the report detail page

**Business model:** Each clinic has its own login. Staff are members of a clinic. Multi-clinic, single-tenant-per-login.

**Tech stack:** Next.js App Router, Tailwind CSS, Supabase (Postgres + Auth + RLS), PDFKit.

**Scope (v1):**
- ✅ Patient registration (inline in wizard)
- ✅ Test catalog (clinic-specific tests + parameters + pricing)
- ✅ Lab report generation with status (pending / completed)
- ✅ Report-specific price editing during create and edit flows
- ✅ PDF output (per-parameter rows, abnormal highlighting)
- ❌ WhatsApp/SMS (not in scope)
- ❌ Appointments (not in scope)
- ❌ Billing module (not in scope)
- ❌ AI PDF parsing (not in scope)
