# Knowledge Tooling Stack

## Current State

The repo now has a working local knowledge workflow:
- `docs/` is the markdown knowledge vault
- `./scripts/qmd.ps1` runs QMD against a workspace-local index
- repo-local MCP config exposes project-scoped `qmd`, `supabase`, `filesystem`, and optional note/tooling servers
- `.agents/skills/health-crm/` holds project-specific agent guidance

## Recommended Stack

Use these in order of value:

1. QMD
   - best for fast local repo and docs search
   - already wired for this repo through `./scripts/qmd.ps1`
   - the canonical collection name is `better-crm`

2. Obsidian
   - best as the human-facing vault UI
   - point Obsidian at this repo or directly at `docs/`
   - use it for ADRs, schema notes, prompt evals, and implementation plans

3. `claude-obsidian`
   - use the Obsidian Claude Code MCP plugin if you want agents to read and write your vault directly
   - this repo expects the plugin's default SSE endpoint at `http://localhost:22360/sse`
   - override with `OBSIDIAN_MCP_URL` if you change the port or transport path in Obsidian

4. claude-brain
   - add only if you want heavier persistent memory across sessions and projects
   - likely overkill until the repo has more code, notes, and repeated work patterns

## Practical Recommendation

For this project today:
- keep `docs/` as the source of truth
- use QMD for retrieval
- use Obsidian as the editing and linking layer
- keep `claude-obsidian` optional until Obsidian becomes part of the daily loop
- defer `claude-brain` until the app and implementation history are larger

## Repo-Local Codex Setup

The repo-local Codex entrypoint is [`scripts/run-codex.cmd`](/Users/omkar/OneDrive/Desktop/vaults/projects/Better-crm/scripts/run-codex.cmd). It boots Codex with the repo-owned [`config.toml`](/Users/omkar/OneDrive/Desktop/vaults/projects/Better-crm/.codex-home/config.toml) so this project can use its own MCP wiring without clashing with other agents.

1. QMD
   - Claude Code starts `./scripts/qmd.ps1 mcp`
   - the script rewrites `.qmd/config/index.yml` on every run so the collection path stays pinned to the current repo checkout
   - use `npm run qmd:update` after meaningful code or docs changes
   - use `npm run qmd:embed` when you want semantic retrieval to catch up
   - use `npm run qmd:refresh` for the normal full refresh
   - QMD lookups should target the `better-crm` collection

2. Obsidian
   - open this repo root or `docs/` as your Obsidian vault
   - install and enable the Obsidian MCP plugin only if you actively use it
   - keep credentials in environment variables instead of inside repo config

## Operating Commands

```powershell
./scripts/qmd.ps1 update
./scripts/qmd.ps1 embed
./scripts/qmd.ps1 search "RLS clinic_id patients"
./scripts/qmd.ps1 search "lab report pricing pdf"
./scripts/qmd.ps1 get "docs/schema/schema-reference.md"
```
