# Better CRM: Onboarding, Invites, and Authentication Flow

This document provides a detailed overview of how users are invited, signed up, and authenticated within the Better CRM system.

---

## 1. Overview
Better CRM follows an **invite-only** model. Users cannot sign up freely; they must be invited by a **Super Admin**. The onboarding process is tightly coupled with the invite system to ensure every user is linked to a specific clinic and assigned a proper role.

---

## 2. The Invite System

### Flow Summary
1. **Super Admin Creation**: A Super Admin (users with `system_role = 'super_admin'` in `user_roles`) accesses the Invite Management dashboard.
2. **Generating the Invite**: The admin provides the invitee's email, the target clinic name (for new clinics) or clinic ID (for existing ones), and the intended role (`admin`, `lab_staff`, or `clinician`).
3. **Storage**: The invite is stored in the `invites` table with a unique `token` (UUID).
4. **Link Delivery**: The invite link is generated in the format: `https://<domain>/signup?token=<UUID>`.

### Data Structure (`invites` table)
| Column | Description |
| :--- | :--- |
| `email` | The email address authorized to use this invite. |
| `token` | A unique UUID used to claim the invite. |
| `clinic_id` | (Optional) ID of an existing clinic to join. |
| `clinic_name` | (Optional) Name of a new clinic to be created upon signup. |
| `role` | The role assigned to the user (`admin`, `lab_staff`, `clinician`). |
| `expires_at` | Expiration timestamp (default: 7 days from creation). |
| `used_at` | Timestamp of when the invite was claimed. |

---

## 3. The Signup Process

The signup process consumes an invite and sets up the user's workspace.

### Steps (`app/signup/actions.ts`)
1. **Token Validation**:
   - Checks if the token exists in the `invites` table.
   - Ensures the invite hasn't been used (`used_at` is null).
   - Verifies the invite hasn't expired.
2. **Claiming the Invite**:
   - The system immediately updates `used_at` to prevent race conditions (double submission).
3. **User Creation**:
   - Creates a new user in Supabase Auth using the email from the invite and the password provided by the user.
4. **Clinic Setup**:
   - If the invite specifies a `clinic_name` (new clinic), a new entry is created in the `clinics` table.
   - If it specifies a `clinic_id`, the user is linked to that existing clinic.
5. **Profile Creation**:
   - A row is added to the `profiles` table linking the `user_id`, `clinic_id`, and `role`.
6. **Finalization**:
   - The `invites` table is updated with the `used_by` user ID.
   - The user is redirected to the `/login` page.

---

## 4. Authentication Flow

### Standard Login
- Users sign in via `/login` using their email and password.
- Upon successful authentication, they are typically redirected to the `/dashboard`.

### Google / OAuth Sign-In (`app/auth/callback/route.ts`)
1. **Provider Redirect**: The user authenticates with Google.
2. **Callback**: Google redirects back to `/auth/callback?code=...`.
3. **Session Exchange**: The server exchanges the authorization code for a Supabase session.
4. **Redirect**: The user is sent to the path specified in the `next` parameter (defaulting to `/dashboard`).

---

## 5. Onboarding & Access Control

### Post-Login Checks
Every time a user logs in, the application checks their status:
- **Clinic Linkage**: If a user is logged in but their profile does not have a `clinic_id`, they are redirected to `/onboarding`.
- **Onboarding Page (`app/onboarding/page.tsx`)**:
  - This acts as a "waiting room" or "unauthorized" state.
  - It informs the user that their account isn't linked to a clinic and directs them to contact an administrator.

### Role Hierarchy
- **Super Admin**: Manages the entire system, creates invites, and oversees all clinics. Does not necessarily belong to a specific clinic.
- **Clinic Admin**: Manages settings and staff for their specific clinic.
- **Lab Staff / Clinician**: Accesses specific features (patients, lab reports) within their assigned clinic.

---

## 6. Logic Summary Table

| Action | Entry Point | Key Logic Location |
| :--- | :--- | :--- |
| **Create Invite** | `/admin/invites` | `app/admin/invites/actions.ts` |
| **Claim Invite** | `/signup?token=...` | `app/signup/actions.ts` |
| **Login** | `/login` | Next.js / Supabase Auth integration |
| **OAuth Callback** | `/auth/callback` | `app/auth/callback/route.ts` |
| **Access Filter** | Middleware / Layouts | `app/onboarding/page.tsx` (redirect logic) |
