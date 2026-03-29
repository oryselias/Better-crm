# ADR: Backend Engineering Analysis (First Principles)

**Date**: 2026-03-28  
**Status**: ✅ Critical Fixes Applied  
**Context**: Applying Elon's engineering rules to analyze the Health CRM backend

---

## ✅ Completed Fixes

1. **Fixed Broken RLS Policy** - Updated `user_clinics` references to `profiles`
2. **Fixed Hardcoded Verify Token** - Removed insecure fallback in webhook route
3. **Added Complete RLS Policies** - All WhatsApp tables now have proper clinic-scoped + service role policies

---

## First Principles Analysis Summary

### What Must Be True (Physics of the System)

1. **WhatsApp Integration** → Must deliver messages reliably
2. **Lab Reports** → Must parse PDFs into structured data  
3. **Clinic Isolation** → Each clinic's data must be private (HIPAA)
4. **Real-time Updates** → Staff need instant visibility
5. **Audit Trail** → Every change must be traceable

---

## Current Architecture Assessment

### ✅ What's Working Well

| Component | Status | Notes |
|-----------|--------|-------|
| API Routes | Good | Clean separation `/api/whatsapp/*` |
| WhatsApp Client | Solid | Full Meta Cloud API implementation |
| Database Schema | Strong | Clinic isolation, RLS, audit events |
| Server Actions | Clean | `actions.ts` pattern follows Next.js best practices |
| Type Safety | Good | Comprehensive TypeScript interfaces |

### ❌ Critical Issues (First Principles Violations)

#### 1. **Broken RLS Policy** (Security Critical)
```sql
-- In 20260327000000_whatsapp_integration.sql
CREATE POLICY "Users can view own clinic conversations"
  ON whatsapp_conversations FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinics WHERE user_id = auth.uid()
    )
  );
```
**Problem**: `user_clinics` table doesn't exist! References `profiles` table.

**Fix Required**:
```sql
CREATE POLICY "Clinic members can view conversations"
  ON whatsapp_conversations FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));
```

#### 2. **Hardcoded Verify Token** (Security)
```typescript
// app/api/whatsapp/webhook/route.ts
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token';
```
**Problem**: Fallback to insecure default.

**Fix**: Throw error if env var missing in production.

#### 3. **No AI Integration** (Core Feature Missing)
```typescript
// app/(dashboard)/reports/actions.ts
parser_version: "stub-v1",  // This is a placeholder!
```
**Problem**: Architecture mentions "AI Medical Scribe" but code has stub.

**Required**: Implement actual LLM PDF parsing with structured output.

#### 4. **No Background Jobs** (Scalability)
- Report parsing blocks HTTP requests
- WhatsApp message delivery has no retry queue
- Appointment reminders need scheduling

**Fix**: Add a job queue (e.g., Inngest, Trigger.dev, or Supabase Edge Functions)

#### 5. **No Rate Limiting** (Security)
- WhatsApp webhook accepts unlimited requests
- No protection against message flooding

#### 6. **Schema Drift** (Maintainability)
- `schema.prisma` doesn't match migration tables
- Prisma references `Invoice` table that doesn't exist in migrations

---

## Recommended Backend Improvements (Priority Order)

### P0 - Must Fix (Security & Correctness)

1. **Fix WhatsApp RLS Policies**
   - Add missing `user_clinics` table OR update to use `profiles`
   - Test all conversations/messages access

2. **Environment Variable Validation**
   - Fail fast if critical vars missing
   - No insecure fallbacks

3. **Implement Real Lab Report Parser**
   - Connect to Claude/Gemini API
   - Output structured JSON matching `parsed_payload` schema
   - Store confidence scores for review workflow

### P1 - Should Fix (Reliability)

4. **Add Webhook Retry Queue**
   - Failed messages → Supabase table with retry logic
   - Exponential backoff

5. **Add Rate Limiting**
   - Per-IP and per-phone-number limits
   - Supabase or middleware implementation

6. **Implement Appointment Reminders**
   - Cron job / scheduled function
   - Send WhatsApp reminders 24h and 1h before

### P2 - Should Add (Feature Parity)

7. **Real-time Updates**
   - Supabase Realtime for dashboard
   - Live patient/appointment status

8. **Workflow Automation**
   - When report status → "reviewed" → notify patient via WhatsApp
   - When appointment created → send confirmation template

9. **Audit Dashboard**
   - UI for viewing audit_events
   - Filter by table, action, actor, date

---

## Best Practices from CRM Alternatives

### What Top CRMs Do (Salesforce, HubSpot, Pipedrive)

| Feature | Implementation for Better CRM |
|---------|------------------------------|
| **Automation Triggers** | Supabase Edge Functions on INSERT/UPDATE |
| **Sequences** | `whatsapp_sessions` table with multi-step flows |
| **Lead Scoring** | Add `lead_score` column to patients |
| **Webhooks** | Supabase Realtime subscriptions |
| **Templates** | Already implemented ✓ |
| **Caching** | Add Redis for session data |
| **Search** | Full-text search with `tsvector` columns |

---

## Files That Need Changes

```
supabase/migrations/20260327000000_whatsapp_integration.sql
├── Fix RLS policies to use profiles table
└── Add missing service_role policies

lib/whatsapp/client.ts
├── Remove console.log statements (use proper logging)
└── Add request timeout handling

lib/whatsapp/handlers.ts  
├── Add actual AI patient lookup logic
├── Implement appointment booking flow
└── Add WhatsApp template message handling

app/api/whatsapp/webhook/route.ts
├── Remove insecure verify token fallback
└── Add rate limiting

app/(dashboard)/reports/actions.ts
├── Implement real AI PDF parsing
└── Store confidence scores

lib/
└── Add background-jobs.ts for reminders/notifications
```

---

## Learning Byte

**First principles thinking** means questioning every assumption:
- "We need a queue" → No, we need *reliable message delivery*
- "We need AI" → No, we need *parsed lab data that saves doctor time*
- "We need CRM features" → No, we need *faster patient throughput*

Every feature should be traceable to a core physics of the system: **deliver results, reduce friction, ensure compliance**.

---

## Related Documentation

- Sun: [[ARCHITECTURE.md]]
- [[docs/integrations/whatsapp.md]]
- [[docs/schema/database-overview.md]]
