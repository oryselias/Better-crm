# Lab Report Ingestion

The ingestion pipeline must stay reviewable from day one.

Minimum storage contract:
- raw source file path and file name
- parsed JSON payload
- parser version
- parser confidence
- review state
- reviewer identity and review timestamp when applicable

Implementation guardrails:
- do not treat AI extraction as a black box
- keep raw file storage and parsed data linked by report id
- make every report clinic-scoped with `clinic_id`
- emit audit events for insert, update, and delete operations

Slice 1 does not need OCR or parsing orchestration yet, but the schema must not block those later.
