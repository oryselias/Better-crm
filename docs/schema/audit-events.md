# Audit Events

Health data workflows need append-only traceability early.

The first audit event shape should capture:
- `actor_id`
- `clinic_id`
- `action`
- `table_name`
- `row_id`
- `payload`
- `created_at`

Slice 1 expectation:
- audit events are generated automatically for core business tables
- application users can read audit events for their own clinic
- application users cannot update or delete historical audit records
