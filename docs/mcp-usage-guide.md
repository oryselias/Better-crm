# MCP Stack Usage Guide

## Context Retrieval Strategy

This document guides optimal tool selection to minimize token usage while maintaining quality.

---

## MCP Tool Selection Matrix

### Always-On MCPs (3)

| MCP | Purpose | Best For |
|-----|---------|----------|
| **qmd** | Semantic search across project docs | Finding architecture decisions, API patterns, workflow docs |
| **supabase-mcp-server** | Database operations | Schema queries, migrations, row operations |
| **github-mcp-server** | GitHub operations | PR reviews, issues, repo management |

### On-Demand MCPs (Enable When Needed)

| MCP | When to Enable | Token Impact |
|-----|---------------|--------------|
| **claude-flow** | Multi-agent tasks, swarm orchestration, memory operations | High (~50+ extra tools) |

### Disabled MCPs (Use Alternatives)

| MCP | Alternative | Why Disabled |
|-----|--------------|--------------|
| ~~obsidian-brain~~ | `qmd` for targeted queries | Full vault load is expensive |
| ~~filesystem~~ | Built-in `read_file` | Redundant with built-ins |

---

## When to Use Each Tool

### Context Retrieval

| Need | Use This | Not This |
|------|----------|----------|
| Find architecture decisions | `qmd` with semantic query | `obsidian-brain` (loads everything) |
| Read specific file | `read_file` built-in | Filesystem MCP |
| Search code patterns | `search_files` built-in | QMD (qmd is for docs) |
| Get full vault context | Enable `obsidian-brain` | `qmd` (limited to indexed) |

### Database Work

| Need | Use This | Command |
|------|----------|---------|
| Check schema | `supabase-mcp-server` | `list_tables` |
| Run migration | `supabase-mcp-server` | `apply_migration` |
| Query data | `supabase-mcp-server` | `execute_sql` |
| Get API keys | `supabase-mcp-server` | `get_publishable_keys` |

### GitHub Operations

| Need | Use This |
|------|----------|
| List/create issues | `github-mcp-server` |
| Review PR | `github-mcp-server` |
| Push files | `github-mcp-server` |
| Search code | `search_code` (built-in GitHub MCP) |

### Multi-Agent Work

| Need | Use This | When |
|------|----------|------|
| Swarm orchestration | Enable `claude-flow` | Complex multi-agent tasks |
| Agent coordination | `swarm-orchestration` skill | + claude-flow |
| Memory/embeddings | claude-flow memory tools | Long conversations |

---

## Token-Cost Awareness

### Low-Cost (Do Freely)
- `qmd` search (2-5K tokens/query)
- `read_file` specific files
- `search_files` regex patterns
- `supabase-mcp-server` queries

### Medium-Cost (Be Intentional)
- `list_tables` with verbose
- GitHub operations with pagination
- Multi-file analysis

### High-Cost (Enable Only When Needed)
- claude-flow MCP (loads 50+ tools)
- obsidian-brain full vault
- `generate_explanation` on large diffs

---

## MCP Toggle Workflow

When starting a new task:

1. **Identify task type** (frontend/backend/db/multi-agent)
2. **Enable needed MCPs** via Cline settings
3. **Use qmd** for context before reading files
4. **Work with minimal MCPs**
5. **Disable heavy MCPs** when done

### Task → MCP Mapping

```
Frontend/UI Task     → qmd (docs), built-ins
Backend API Task    → qmd + supabase (if DB)
Database Task       → supabase-mcp-server
GitHub Task         → github-mcp-server
Multi-Agent Task    → Enable claude-flow + swarm skill
Research Task       → Enable obsidian-brain + qmd
```

---

## QMD Collections Available

- `logic` - Architecture decisions, patterns
- `workflows` - Business workflows
- `integrations` - Third-party integrations
- `adr` - Architecture Decision Records
- `app` - Application structure

Query format:
```json
[
  { "type": "lex", "query": "whatsapp integration" },
  { "type": "vec", "query": "how does the messaging system work" }
]
```

---

## Common Mistakes to Avoid

1. **Don't enable claude-flow for simple tasks** - It loads 50+ tools
2. **Don't use obsidian-brain for targeted queries** - Use qmd instead
3. **Don't use qmd for code search** - Use `search_files` instead
4. **Don't read full directories** - Use `read_file` for specific files
5. **Don't run verbose DB queries unnecessarily** - They add tokens

---

## Files to Add to `.clineignore`

To allow project documentation files, add these to `.clineignore`:

```diff
 # Root-level notes
 *.md
 !docs/**/*.md
+!CLAUDE.md
+!ARCHITECTURE.md
 tasks.md
```
