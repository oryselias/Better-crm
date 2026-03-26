# Better CRM Knowledge Vault

This `docs/` folder is the working memory for the Health CRM project.

Use it for:
- architecture decisions
- schema notes and RLS planning
- workflow maps for clinics, labs, and billing
- prompt recipes for AI extraction and patient support
- integration notes for Supabase, WhatsApp, and PDF parsing

Default operating model:
- keep always-loaded context small
- treat `docs/` as retrieval-first knowledge, not automatic inline context
- use QMD or your local second-brain to pull only the document you need

Suggested operating rhythm:
- write short ADRs when a technical decision becomes sticky
- keep schema decisions in `docs/schema/`
- put implementation plans in `docs/roadmap/`
- capture prompts, evals, and parser edge cases in `docs/prompts/`

QMD workflow:
```powershell
./scripts/qmd.ps1 update
./scripts/qmd.ps1 search "patients appointments RLS"
./scripts/qmd.ps1 get "docs/schema/data-model.md"
```
