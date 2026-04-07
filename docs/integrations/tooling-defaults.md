# Tooling Defaults

These defaults influence delivery order even though the tool connections themselves live outside the repo.

## Core Default Stack
- QMD first for local docs/code retrieval and token savings
- Supabase MCP for schema, migrations, and RLS iteration
- Filesystem MCP for broad repo access
- Browser automation only when we explicitly need UI verification
- GitHub MCP as secondary support for repo/PR work

## Slice 1
- Supabase MCP for migrations, schema inspection, and RLS iteration
- GitHub MCP for turning implementation risks into tracked issues
- filesystem-aware tooling for the future PDF ingestion interface

## Slice 2
- Twilio MCP
- Vercel MCP
- email provider MCP such as Resend or Postmark

## Slice 3
- Stripe MCP
- Sentry MCP
