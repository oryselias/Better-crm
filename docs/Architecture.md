# Architecture

## Database Schema

### Core Tables

```
clinics
├── id (UUID, PK)
├── name
├── created_at
└── updated_at

profiles (extends auth.users)
├── id (UUID, PK, FK → auth.users)
├── clinic_id (FK → clinics)
├── role (admin/staff)
└── created_at

patients
├── id (UUID, PK)
├── clinic_id (FK → clinics)
├── name
├── email
├── phone
├── date_of_birth
├── created_at
└── updated_at

appointments
├── id (UUID, PK)
├── patient_id (FK → patients)
├── clinic_id (FK → clinics)
├── scheduled_at
├── status (scheduled/completed/cancelled)
├── notes
└── created_at

lab_reports
├── id (UUID, PK)
├── patient_id (FK → patients)
├── clinic_id (FK → clinics)
├── original_file (storage ref)
├── parsed_data (JSONB)
├── review_status (pending/reviewed)
├── reviewed_by (FK → profiles)
├── created_at
└── updated_at

audit_events
├── id (UUID, PK)
├── clinic_id (FK → clinics)
├── profile_id (FK → profiles)
├── action (created/updated/deleted)
├── table_name
├── record_id
├── old_data (JSONB)
├── new_data (JSONB)
└── created_at
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only see data for their clinic
- Admins can manage clinic staff
- All mutations emit audit events

## See Also

- [[Project Overview]]
- [[Tech Stack]]
- [[Current Tasks]]
