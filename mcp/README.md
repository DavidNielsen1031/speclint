# Speclint MCP Server

Use Speclint directly inside Claude Desktop, Cursor, or any MCP-compatible client.
Tell your AI to refine your backlog and it calls the API automatically — no copy-paste required.

## What it does

Exposes three tools: `speclint` (lint/score), `rewrite_spec` (fix failing specs), `plan_sprint` (execution queue)

Give it a list of specs or GitHub issues. Get back structured, scored items with:
- Clean, actionable titles
- Problem statements
- Acceptance criteria (2-4 per item)
- Completeness score (0-100) across 5 dimensions
- T-shirt size estimates (XS/S/M/L/XL)
- Tags
- Clarifying assumptions (when needed)

## Quick Start

### Option 1: npx (no install)

```bash
npx speclint-mcp
```

### Option 2: Local build

```bash
cd mcp
npm install
npm run build
node dist/server.js
```

## Claude Desktop Setup

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"]
    }
  }
}
```

With a license key (Lite/Solo/Team tier):

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"],
      "env": {
        "SPECLINT_KEY": "your-license-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see "speclint" in the tools list.

## Cursor Setup

Add to your Cursor MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"]
    }
  }
}
```

## Usage Examples

Once configured, just talk to your AI naturally:

> "Refine these backlog items: fix login bug, add CSV export, improve dashboard load time"

> "Take these 10 stories and run them through Speclint. Context: we're building a B2B SaaS for HR teams."

> "Refine this backlog item as a user story with Gherkin acceptance criteria: users need to reset their password"

## Rate Limits

| Tier | Items per request | Price |
|------|-------------------|-------|
| Free | 5 | $0 — no key needed |
| Lite | 10 | $9/month |
| Solo | 25 | $29/month |
| Team | 50 | $79/month |

Get a license key at [speclint.ai/pricing](https://speclint.ai/pricing)

## Prefer automation over chat?

If you want to run Speclint in scripts, GitHub Actions, or CI pipelines — without an LLM in the loop — use the CLI instead:

```bash
npx speclint-cli "Fix login bug" --gherkin
cat backlog.txt | npx speclint-cli --user-stories --format json
```

**CLI repo:** [github.com/DavidNielsen1031/speclint-cli](https://github.com/DavidNielsen1031/speclint-cli)

## API Reference

Full API docs: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)  
OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
