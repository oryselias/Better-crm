# Architecture

## Stack
- **Framework:** Next.js 14+ App Router (TypeScript)
- **Styling:** Tailwind CSS v4 (custom design system in `globals.css`)
- **Database:** Supabase (Postgres + Auth + RLS + Storage)
- **PDF:** PDFKit (server-side, via Next.js API route)

## Core Tables

| Table | Purpose |
|---|---|
| `clinics` | Each clinic is a tenant |
| `profiles` | Maps auth users to clinics with role |
| `patients` | Patient records (name, dob, sex, phone) |
| `test_catalog` | Clinic-specific tests with parameters and pricing |
| `lab_reports` | Report records with `tests` JSONB (SelectedTest[]) |
| `appointments` | Appointment scheduling |
| `billing` | Billing and payments |
| `audit_events` | Audit logging for compliance |

## Access Control
- RLS on all tables — every row is scoped to `clinic_id`
- `current_clinic_id()` SQL function reads the user's profile
- All queries automatically scoped to the logged-in user's clinic

## PDF Generation
- **Trigger:** GET to `/api/reports/[id]/pdf`
- **Generator:** `lib/reports/pdf-generator.ts` using PDFKit
- **Output:** Per-parameter rows grouped by test name; abnormal results in red/bold
- **Usage:** Report detail page downloads and prints the generated PDF directly

## Report JSONB Structure
Each `lab_reports.tests` row is `SelectedTest[]`:
```ts
{
  testId: string;
  test: TestCatalog;   // embedded snapshot at time of report
  price: number;
  results: {
    parameterId: string;
    value: string | number;
    isAbnormal: boolean;
  }[];
}
```

---

## What's Built ✅

### Pages & Routes
| Path | Status | Notes |
|------|--------|-------|
| `/login` | ✅ | Auth page |
| `/onboarding` | ✅ | Clinic setup for new users |
| `/dashboard` | ✅ | Main dashboard with stats |
| `/patients` | ✅ | Patient list + add patient dialog |
| `/patients/[id]` | ✅ | Patient detail view |
| `/lab-report` | ✅ | Reports list |
| `/lab-report/new` | ✅ | 3-step wizard |
| `/lab-report/[id]` | ✅ | View/edit report + PDF download |
| `/verify/[id]` | ✅ | Public report verification |
| `/setup/supabase` | ✅ | Supabase setup page |
| `/appointments` | ⚠️ | Stub (redirects to dashboard) |
| `/billing` | ⚠️ | Stub (redirects to dashboard) |
| `/audit` | ⚠️ | Stub (redirects to dashboard) |
| `/test-catalog` | ❌ | Not yet built |

### Core Features
- [x] Supabase auth + RLS
- [x] Patient CRUD
- [x] Lab report creation (3-step wizard)
- [x] Report PDF generation (PDFKit)
- [x] Public report verification
- [x] Dashboard with recent reports
- [x] Clinic onboarding flow

### Database
- [x] 20+ migrations applied
- [x] RLS policies on all tables
- [x] Clinic-scoped data isolation
- [x] Test catalog with parameters & pricing
- [x] Reference ranges per parameter

### API
- [x] `/api/reports/[id]/pdf` - PDF generation endpoint

---

## What's Left ⏳

### High Priority
| Task | Agent |
|------|-------|
| Build `/test-catalog` page | Kilo |
| Implement appointments feature | Kilo |
| Implement billing feature | Kilo |
| Implement audit log viewer | Kilo |
| Fix RLS issues on verify endpoint | Antigravity |

### Medium Priority
| Task | Agent |
|------|-------|
| Add patient search/filter | Kilo |
| Add report filters (date, status) | Kilo |
| Add report status workflow (Draft → Verified) | Kilo |
| Clinic branding (logo, colors) | Kilo |

### Lower Priority
| Task | Agent |
|------|-------|
| Add report archiving | Kilo |
| Add data export (CSV) | Kilo |
| Improve dashboard charts | Kilo |

---

## App Routes
```
/login              → Auth page ✅
/onboarding         → Clinic setup ✅
/dashboard          → Main dashboard ✅
/patients           → Patient list ✅
/patients/[id]      → Patient detail ✅
/lab-report         → Reports list ✅
/lab-report/new     → 3-step wizard ✅
/lab-report/[id]    → View/edit + PDF ✅
/verify/[id]       → Public verification ✅
/appointments      → Appointment scheduling ⚠️ (stub)
/billing            → Billing and payments ⚠️ (stub)
/audit              → Audit log ⚠️ (stub)
/test-catalog      → Test catalog management ❌ (not built)
/setup/supabase    → Supabase setup ✅
```