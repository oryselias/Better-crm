# Schema Reference

## clinics

| Column     | Type        | Notes                   |
| ---------- | ----------- | ----------------------- |
| id         | uuid        | PK                      |
| name       | text        | Clinic/lab display name |
| tagline    | text        | Optional tagline        |
| address    | text        | Optional address        |
| phone      | text        | Optional contact number |
| logo_url   | text        | Optional logo image URL |
| created_at | timestamptz |                         |
| updated_at | timestamptz |                         |

## profiles

| Column     | Type        | Notes                           |
| ---------- | ----------- | ------------------------------- |
| id         | uuid        | FK → auth.users                 |
| clinic_id  | uuid        | FK → clinics                    |
| role       | text        | admin \| lab_staff \| clinician |
| created_at | timestamptz |                                 |
| updated_at | timestamptz |                                 |

## patients

| Column     | Type     | Notes                              |
| ---------- | -------- | ---------------------------------- |
| id         | uuid     | PK                                 |
| clinic_id  | uuid     | FK → clinics                       |
| full_name  | text     | Required                           |
| age        | smallint |                                    |
| sex        | text     | male \| female \| other \| unknown |
| phone      | text     | Contact number                     |
| created_by | uuid     | FK → profiles                      |

## test_catalog

| Column      | Type          | Notes                       |
| ----------- | ------------- | --------------------------- |
| id          | uuid          | PK                          |
| name        | text          | e.g. "Complete Blood Count" |
| code        | text          | Simple lab-facing test code |
| category    | text          | e.g. "Hematology"           |
| price       | numeric(10,2) | Default price               |
| parameters  | jsonb         | Array of TestParameter      |
| description | text          | Optional                    |
| is_active   | bool          |                             |

### TestParameter (inside parameters jsonb)

```json
{
  "id": "uuid",
  "name": "Hemoglobin",
  "unit": "g/dl",
  "normal_range": "12.0 - 15.0",
  "male_normal_range": "13-18",
  "female_normal_range": "12-16",
  "selectOptions": ["Absent", "Present"],
  "defaultValue": "Absent",
  "formula": "{param-a} / {param-b}",
  "is_segment": false
}
```

Segment headings (no result/unit/range) use `"is_segment": true`:

```json
{ "id": "urer-seg-chemical", "name": "Chemical Examination", "unit": "", "normal_range": "", "is_segment": true }
```

## lab_reports

| Column       | Type          | Notes                                                      |
| ------------ | ------------- | ---------------------------------------------------------- |
| id           | uuid          | PK                                                         |
| clinic_id    | uuid          | FK → clinics                                               |
| patient_id   | uuid          | FK → patients                                              |
| report_no    | serial        | Auto-incrementing display number                           |
| status       | text          | pending \| completed                                       |
| tests        | jsonb         | SelectedTest[] snapshot including chosen price and results |
| discount     | numeric(5,2)  | Percentage (0-100)                                         |
| total_amount | numeric(10,2) | Sum of report test prices                                  |
| final_amount | numeric(10,2) | After discount                                             |
| notes        | text          | Optional                                                   |
| completed_at | timestamptz   | Set when status → completed                                |
| created_by   | uuid          | FK → profiles                                              |

## RLS Functions

- `current_clinic_id()` → returns the logged-in user’s clinic_id
- `has_clinic_access(target_clinic uuid)` → boolean check
- `verify_report(report_id uuid)` → scoped public lookup (SECURITY DEFINER, callable by anon)
