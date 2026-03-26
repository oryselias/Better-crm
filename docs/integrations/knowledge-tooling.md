# Knowledge Tooling Stack

## Current State

The repo now has a working local knowledge workflow:
- `docs/` is the markdown knowledge vault
- `./scripts/qmd.ps1` runs QMD against a workspace-local index
- `.mcp.json` exposes project-scoped `qmd` and `claude-obsidian` MCP servers for Claude Code
- `.agents/skills/health-crm/` holds project-specific agent guidance

## Recommended Stack

Use these in order of value:

1. QMD
   - best for fast local repo and docs search
   - already wired for this repo through `./scripts/qmd.ps1`

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

## Claude Code Setup

The repo-level `.mcp.json` is the shared Claude Code entrypoint.

1. QMD
   - Claude Code starts `./scripts/qmd.ps1 mcp`
   - the script rewrites `.qmd/config/index.yml` on every run so the collection path stays pinned to the current repo checkout

2. Obsidian
   - open this repo root or `docs/` as your Obsidian vault
   - install and enable the Obsidian Claude Code MCP plugin
   - leave the plugin on port `22360` unless you also set `OBSIDIAN_MCP_URL`

## Operating Commands

```powershell
./scripts/qmd.ps1 update
./scripts/qmd.ps1 search "RLS clinic_id patients"
./scripts/qmd.ps1 search "lab report ingestion"
./scripts/qmd.ps1 get "docs/schema/rls-strategy.md"
```
